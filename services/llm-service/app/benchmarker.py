"""
LLM Benchmarker — evaluates trained checkpoints.

Metrics computed:
  • Perplexity   — lower is better; measures how well the model predicts text
  • Accuracy     — next-token prediction accuracy on eval set
  • Throughput   — tokens generated per second
  • Memory usage — peak VRAM / RAM

These metrics are persisted back to the LLM model registry via the Python API.
"""
import math
import time
import logging
from typing import Any

logger = logging.getLogger(__name__)


def evaluate_checkpoint(checkpoint_path: str, eval_texts: list[str]) -> dict[str, Any]:
    """
    Load a trained checkpoint and compute benchmark metrics.

    Returns:
        dict with perplexity, accuracy, tokens_per_second, memory_mb
    """
    try:
        return _run_torch_eval(checkpoint_path, eval_texts)
    except ImportError:
        logger.warning("PyTorch not available — returning mock benchmark metrics")
        return _mock_benchmark(eval_texts)


def _run_torch_eval(checkpoint_path: str, eval_texts: list[str]) -> dict[str, Any]:
    """Full PyTorch evaluation — requires transformers + torch."""
    import torch
    from transformers import AutoTokenizer, AutoModelForCausalLM

    tokenizer = AutoTokenizer.from_pretrained(checkpoint_path)
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token

    model = AutoModelForCausalLM.from_pretrained(checkpoint_path)
    model.eval()

    total_loss = 0.0
    total_tokens = 0
    correct_predictions = 0
    total_predictions = 0
    start_time = time.time()

    with torch.no_grad():
        for text in eval_texts:
            inputs = tokenizer(
                text,
                return_tensors="pt",
                truncation=True,
                max_length=512,
            )
            outputs = model(**inputs, labels=inputs["input_ids"])

            loss = outputs.loss.item()
            n_tokens = inputs["input_ids"].shape[1]
            total_loss += loss * n_tokens
            total_tokens += n_tokens

            # Next-token accuracy
            logits = outputs.logits[:, :-1, :]
            labels = inputs["input_ids"][:, 1:]
            preds = logits.argmax(dim=-1)
            correct_predictions += (preds == labels).sum().item()
            total_predictions += labels.numel()

    elapsed = time.time() - start_time
    perplexity = math.exp(total_loss / total_tokens) if total_tokens > 0 else float("inf")
    accuracy = correct_predictions / total_predictions if total_predictions > 0 else 0.0
    tokens_per_second = total_tokens / elapsed if elapsed > 0 else 0.0

    # Memory usage (if CUDA available)
    memory_mb = 0.0
    if torch.cuda.is_available():
        memory_mb = torch.cuda.max_memory_allocated() / 1024 / 1024

    logger.info(
        "Benchmark complete: perplexity=%.2f accuracy=%.2f%% tok/s=%.1f",
        perplexity, accuracy * 100, tokens_per_second
    )

    return {
        "perplexity": round(perplexity, 4),
        "accuracy": round(accuracy * 100, 2),
        "tokens_per_second": round(tokens_per_second, 1),
        "memory_mb": round(memory_mb, 1),
        "total_tokens_evaluated": total_tokens,
        "eval_samples": len(eval_texts),
    }


def _mock_benchmark(eval_texts: list[str]) -> dict[str, Any]:
    """
    Deterministic mock benchmark when PyTorch is unavailable.
    Used in CI / lightweight environments.
    """
    import random
    rng = random.Random(42)
    return {
        "perplexity": round(rng.uniform(15.0, 60.0), 4),
        "accuracy": round(rng.uniform(55.0, 92.0), 2),
        "tokens_per_second": round(rng.uniform(200.0, 800.0), 1),
        "memory_mb": 0.0,
        "total_tokens_evaluated": sum(len(t.split()) for t in eval_texts),
        "eval_samples": len(eval_texts),
        "note": "Mock metrics — install PyTorch for real evaluation",
    }
