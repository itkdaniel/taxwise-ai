"""
TaxWise AI — LLM Microservice
─────────────────────────────
Provides endpoints for:
  • Custom LLM training from scratch (PyTorch / HuggingFace Transformers)
  • Fine-tuning on scraped/preprocessed data
  • Benchmarking (perplexity, accuracy, throughput)
  • Data preprocessing for arbitrary structured + unstructured data

Architecture:
  main.py (FastAPI)
    ├── /train        — start training job (background)
    ├── /preprocess   — clean and tokenize raw data
    ├── /benchmark    — evaluate a checkpoint
    └── /generate     — run inference

Run locally:
  uvicorn main:app --reload --port 9000

Docker build includes PyTorch + Transformers (~3 GB image).
"""
import logging
import os
from pathlib import Path

import structlog
from fastapi import FastAPI, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

logging.basicConfig(level=logging.INFO)
structlog.configure(wrapper_class=structlog.make_filtering_bound_logger(logging.INFO))
logger = structlog.get_logger(__name__)

app = FastAPI(title="TaxWise LLM Service", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

# ── In-memory job store ────────────────────────────────────────────────────────
_jobs: dict[str, dict] = {}

CHECKPOINTS_DIR = Path(os.getenv("CHECKPOINTS_DIR", "/checkpoints"))
CHECKPOINTS_DIR.mkdir(parents=True, exist_ok=True)


# ── Schemas ───────────────────────────────────────────────────────────────────
class TrainRequest(BaseModel):
    model_id: int
    job_id: int
    dataset_source: str          # URL or file path (JSONL with {"text": "..."} lines)
    base_model: str = "gpt2"    # any HuggingFace model id
    epochs: int = 3
    batch_size: int = 8
    learning_rate: float = 2e-5
    max_seq_length: int = 512


class PreprocessRequest(BaseModel):
    text: str
    language: str = "en"
    remove_html: bool = True
    lowercase: bool = False


class BenchmarkRequest(BaseModel):
    model_id: int
    checkpoint_path: str
    eval_texts: list[str]


class GenerateRequest(BaseModel):
    checkpoint_path: str
    prompt: str
    max_new_tokens: int = 200
    temperature: float = 0.7


# ── Health ────────────────────────────────────────────────────────────────────
@app.get("/healthz")
def health():
    return {"status": "ok", "service": "llm-service"}


# ── Preprocess ────────────────────────────────────────────────────────────────
@app.post("/preprocess")
def preprocess(req: PreprocessRequest):
    """
    Clean and normalize raw text for LLM training.
    Handles HTML, whitespace, and basic quality filtering.
    """
    from app.preprocessor import clean_text
    cleaned = clean_text(req.text, remove_html=req.remove_html, lowercase=req.lowercase)
    tokens = cleaned.split()
    return {
        "original_length": len(req.text),
        "cleaned_length": len(cleaned),
        "token_count": len(tokens),
        "text": cleaned,
    }


# ── Train ─────────────────────────────────────────────────────────────────────
@app.post("/train", status_code=202)
async def start_training(req: TrainRequest, background_tasks: BackgroundTasks):
    """
    Launch a PyTorch fine-tuning job in the background.
    Progress is tracked in _jobs dict (use GET /jobs/{job_id} to poll).
    """
    job_key = f"{req.model_id}:{req.job_id}"
    _jobs[job_key] = {"status": "running", "epoch": 0, "loss": None}
    background_tasks.add_task(_train_background, job_key, req)
    return {"job_key": job_key, "status": "queued"}


@app.get("/jobs/{model_id}/{job_id}")
def get_job_status(model_id: int, job_id: int):
    """Poll training job progress."""
    key = f"{model_id}:{job_id}"
    job = _jobs.get(key)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return {"job_key": key, **job}


# ── Benchmark ─────────────────────────────────────────────────────────────────
@app.post("/benchmark")
def benchmark(req: BenchmarkRequest):
    """
    Compute perplexity and throughput for a trained checkpoint.
    Lower perplexity → better model.
    """
    from app.benchmarker import evaluate_checkpoint
    result = evaluate_checkpoint(req.checkpoint_path, req.eval_texts)
    return {
        "model_id": req.model_id,
        "checkpoint": req.checkpoint_path,
        **result,
    }


# ── Generate ──────────────────────────────────────────────────────────────────
@app.post("/generate")
def generate(req: GenerateRequest):
    """Run inference on a trained checkpoint."""
    from app.trainer import generate_text
    output = generate_text(req.checkpoint_path, req.prompt, req.max_new_tokens, req.temperature)
    return {"prompt": req.prompt, "generated": output}


# ── Background training task ──────────────────────────────────────────────────
async def _train_background(job_key: str, req: TrainRequest) -> None:
    """Orchestrate dataset download → preprocess → PyTorch training → save checkpoint."""
    from app.trainer import train_model
    try:
        result = await train_model(
            job_key=job_key,
            base_model=req.base_model,
            dataset_source=req.dataset_source,
            epochs=req.epochs,
            batch_size=req.batch_size,
            learning_rate=req.learning_rate,
            max_seq_length=req.max_seq_length,
            jobs_dict=_jobs,
        )
        _jobs[job_key] = {"status": "completed", **result}
    except Exception as exc:
        logger.error("Training failed", job=job_key, error=str(exc))
        _jobs[job_key] = {"status": "failed", "error": str(exc)}
