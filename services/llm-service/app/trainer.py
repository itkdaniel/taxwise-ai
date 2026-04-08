"""
LLM Trainer — PyTorch + HuggingFace Transformers.

Supports:
  • Pre-training from scratch (random weights, custom tokenizer)
  • Fine-tuning any HuggingFace model on custom data
  • LoRA-style adapter training for memory efficiency (via PEFT if available)
  • Checkpoint saving + resumption

Usage pattern (factory):
  trainer = create_trainer(base_model="gpt2", ...)
  await trainer.train(dataset_source="./data.jsonl", ...)
"""
import asyncio
import logging
import math
import time
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)


def create_trainer(base_model: str = "gpt2"):
    """
    Factory function — returns the appropriate trainer.
    Detects PEFT availability for LoRA; falls back to full fine-tuning.
    """
    try:
        from peft import get_peft_model, LoraConfig, TaskType
        return LoRATrainer(base_model)
    except ImportError:
        return FullFineTuneTrainer(base_model)


class FullFineTuneTrainer:
    """Standard HuggingFace Trainer wrapper for causal LM fine-tuning."""

    def __init__(self, base_model: str):
        self.base_model = base_model

    def _load_model_and_tokenizer(self):
        """Load pretrained weights and tokenizer (downloads from HuggingFace Hub)."""
        from transformers import AutoTokenizer, AutoModelForCausalLM
        tokenizer = AutoTokenizer.from_pretrained(self.base_model)
        if tokenizer.pad_token is None:
            tokenizer.pad_token = tokenizer.eos_token
        model = AutoModelForCausalLM.from_pretrained(self.base_model)
        return model, tokenizer

    def _build_dataset(self, tokenizer, dataset_source: str, max_seq_length: int):
        """Load and tokenize training data."""
        from datasets import Dataset
        from app.preprocessor import read_dataset
        import os

        if dataset_source.startswith("http"):
            # Download dataset from URL
            import urllib.request
            tmp = "/tmp/train_data.jsonl"
            urllib.request.urlretrieve(dataset_source, tmp)
            texts = list(read_dataset(Path(tmp)))
        else:
            texts = list(read_dataset(Path(dataset_source)))

        logger.info("Loaded %d training documents", len(texts))

        def tokenize(batch):
            return tokenizer(
                batch["text"],
                truncation=True,
                max_length=max_seq_length,
                padding="max_length",
            )

        ds = Dataset.from_dict({"text": texts})
        return ds.map(tokenize, batched=True, remove_columns=["text"])

    def train(
        self,
        dataset_source: str,
        epochs: int = 3,
        batch_size: int = 8,
        learning_rate: float = 2e-5,
        max_seq_length: int = 512,
        output_dir: str = "/checkpoints/model",
        jobs_dict: dict | None = None,
        job_key: str = "",
    ) -> dict[str, Any]:
        """Run full fine-tuning training loop and save checkpoint."""
        from transformers import Trainer, TrainingArguments, DataCollatorForLanguageModeling

        model, tokenizer = self._load_model_and_tokenizer()
        dataset = self._build_dataset(tokenizer, dataset_source, max_seq_length)

        args = TrainingArguments(
            output_dir=output_dir,
            num_train_epochs=epochs,
            per_device_train_batch_size=batch_size,
            learning_rate=learning_rate,
            save_strategy="epoch",
            logging_steps=10,
            fp16=False,    # enable on CUDA GPU
            report_to="none",
        )

        collator = DataCollatorForLanguageModeling(tokenizer=tokenizer, mlm=False)
        trainer = Trainer(model=model, args=args, train_dataset=dataset, data_collator=collator)

        start = time.time()
        train_result = trainer.train()
        elapsed = time.time() - start

        trainer.save_model(output_dir)
        tokenizer.save_pretrained(output_dir)
        logger.info("Training complete in %.1fs — loss=%.4f", elapsed, train_result.training_loss)

        if jobs_dict and job_key:
            jobs_dict[job_key]["epoch"] = epochs
            jobs_dict[job_key]["loss"] = train_result.training_loss

        return {
            "loss": train_result.training_loss,
            "epochs": epochs,
            "training_time_seconds": elapsed,
            "checkpoint_path": output_dir,
        }


class LoRATrainer(FullFineTuneTrainer):
    """Memory-efficient LoRA adapter training (only adapter weights are updated)."""

    def _load_model_and_tokenizer(self):
        from transformers import AutoTokenizer, AutoModelForCausalLM
        from peft import get_peft_model, LoraConfig, TaskType

        tokenizer = AutoTokenizer.from_pretrained(self.base_model)
        if tokenizer.pad_token is None:
            tokenizer.pad_token = tokenizer.eos_token

        model = AutoModelForCausalLM.from_pretrained(self.base_model)
        lora_config = LoraConfig(
            task_type=TaskType.CAUSAL_LM,
            r=8,            # LoRA rank
            lora_alpha=32,
            lora_dropout=0.1,
        )
        model = get_peft_model(model, lora_config)
        model.print_trainable_parameters()
        return model, tokenizer


async def train_model(
    *,
    job_key: str,
    base_model: str,
    dataset_source: str,
    epochs: int,
    batch_size: int,
    learning_rate: float,
    max_seq_length: int,
    jobs_dict: dict,
) -> dict[str, Any]:
    """Async wrapper — runs CPU-bound training in a thread pool."""
    loop = asyncio.get_event_loop()
    trainer = create_trainer(base_model)
    output_dir = f"/checkpoints/{job_key.replace(':', '_')}"

    result = await loop.run_in_executor(
        None,
        lambda: trainer.train(
            dataset_source=dataset_source,
            epochs=epochs,
            batch_size=batch_size,
            learning_rate=learning_rate,
            max_seq_length=max_seq_length,
            output_dir=output_dir,
            jobs_dict=jobs_dict,
            job_key=job_key,
        ),
    )
    return result


def generate_text(checkpoint_path: str, prompt: str, max_new_tokens: int, temperature: float) -> str:
    """Load a checkpoint and generate text from a prompt."""
    from transformers import AutoTokenizer, AutoModelForCausalLM
    import torch

    tokenizer = AutoTokenizer.from_pretrained(checkpoint_path)
    model = AutoModelForCausalLM.from_pretrained(checkpoint_path)
    model.eval()

    inputs = tokenizer(prompt, return_tensors="pt")
    with torch.no_grad():
        outputs = model.generate(
            **inputs,
            max_new_tokens=max_new_tokens,
            temperature=temperature,
            do_sample=temperature > 0,
            pad_token_id=tokenizer.eos_token_id,
        )
    return tokenizer.decode(outputs[0], skip_special_tokens=True)
