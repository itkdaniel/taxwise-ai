"""
LLM model registry and training job tracker.
Stores metadata; actual weights live on the filesystem / object storage.
"""
from datetime import datetime

from sqlalchemy import DateTime, Enum, Float, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class LLMModel(Base):
    """Custom-trained language model registry entry."""
    __tablename__ = "llm_models"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    base_model: Mapped[str] = mapped_column(String(255), default="gpt2")   # HuggingFace model id
    status: Mapped[str] = mapped_column(
        Enum("pending", "training", "ready", "failed", name="llm_status_enum"),
        default="pending",
    )
    checkpoint_path: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    perplexity: Mapped[float | None] = mapped_column(Float, nullable=True)  # benchmark score
    accuracy: Mapped[float | None] = mapped_column(Float, nullable=True)
    parameters_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    def __repr__(self) -> str:
        return f"<LLMModel name={self.name!r} status={self.status}>"


class TrainingJob(Base):
    """Tracks a single fine-tuning / pre-training job run."""
    __tablename__ = "training_jobs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    model_id: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    dataset_source: Mapped[str] = mapped_column(String(1024), nullable=False)  # URL or path
    epochs: Mapped[int] = mapped_column(Integer, default=3)
    batch_size: Mapped[int] = mapped_column(Integer, default=8)
    learning_rate: Mapped[float] = mapped_column(Float, default=2e-5)
    status: Mapped[str] = mapped_column(
        Enum("queued", "running", "completed", "failed", name="job_status_enum"),
        default="queued",
    )
    loss: Mapped[float | None] = mapped_column(Float, nullable=True)
    log_output: Mapped[str | None] = mapped_column(Text, nullable=True)
    started_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
