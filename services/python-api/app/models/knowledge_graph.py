"""
Knowledge Graph SQLAlchemy models — entities and directed connections.
Stored in Postgres, visualised in Three.js force graph on the frontend.
"""
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class GraphEntity(Base):
    """A node in the knowledge graph (taxpayer, employer, document, etc.)."""
    __tablename__ = "graph_entities"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    label: Mapped[str] = mapped_column(String(255), nullable=False)
    entity_type: Mapped[str] = mapped_column(String(100), nullable=False)  # taxpayer, employer, ...
    properties: Mapped[str | None] = mapped_column(Text, nullable=True)    # JSON blob
    color: Mapped[str | None] = mapped_column(String(20), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    # Edges where this node is the source
    outgoing: Mapped[list["GraphConnection"]] = relationship(
        "GraphConnection", foreign_keys="GraphConnection.source_id", back_populates="source"
    )
    # Edges where this node is the target
    incoming: Mapped[list["GraphConnection"]] = relationship(
        "GraphConnection", foreign_keys="GraphConnection.target_id", back_populates="target"
    )


class GraphConnection(Base):
    """A directed edge between two GraphEntity nodes."""
    __tablename__ = "graph_connections"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    source_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("graph_entities.id", ondelete="CASCADE"), nullable=False, index=True
    )
    target_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("graph_entities.id", ondelete="CASCADE"), nullable=False, index=True
    )
    relationship_type: Mapped[str] = mapped_column(String(100), nullable=False)
    weight: Mapped[float | None] = mapped_column(nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    source: Mapped["GraphEntity"] = relationship(
        "GraphEntity", foreign_keys=[source_id], back_populates="outgoing"
    )
    target: Mapped["GraphEntity"] = relationship(
        "GraphEntity", foreign_keys=[target_id], back_populates="incoming"
    )
