"""
TaxReturn SQLAlchemy model.
Maps to the `tax_returns` table shared with the Node.js API.
"""
from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, Enum, Numeric, String, Integer, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class TaxReturn(Base):
    """Federal W-2 tax return record."""
    __tablename__ = "tax_returns"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    tax_year: Mapped[int] = mapped_column(Integer, nullable=False)
    filing_status: Mapped[str] = mapped_column(
        Enum("single", "married_filing_jointly", "married_filing_separately",
             "head_of_household", name="filing_status_enum"),
        nullable=False,
        default="single",
    )
    status: Mapped[str] = mapped_column(
        Enum("draft", "processing", "calculated", "validated", "complete", "error",
             name="return_status_enum"),
        nullable=False,
        default="draft",
    )
    total_wages: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)
    federal_tax_withheld: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)
    state_tax_withheld: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)
    social_security_wages: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)
    medicare_wages: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)
    estimated_refund: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)
    estimated_owed: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationship to W-2 documents
    w2_documents: Mapped[list["W2Document"]] = relationship(
        "W2Document", back_populates="tax_return", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<TaxReturn id={self.id} year={self.tax_year} status={self.status}>"
