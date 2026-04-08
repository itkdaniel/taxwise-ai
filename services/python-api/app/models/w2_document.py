"""
W2Document SQLAlchemy model.
Represents an uploaded and parsed IRS W-2 wage statement.
"""
from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, Numeric, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class W2Document(Base):
    """IRS W-2 wage and tax statement."""
    __tablename__ = "w2_documents"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    tax_return_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("tax_returns.id", ondelete="CASCADE"), nullable=False, index=True
    )
    employer_name: Mapped[str] = mapped_column(String(255), nullable=False)
    employer_ein: Mapped[str | None] = mapped_column(String(20), nullable=True)
    tax_year: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[str] = mapped_column(
        Enum("pending", "processing", "extracted", "manual", "error",
             name="w2_status_enum"),
        default="pending",
    )
    wages_and_tips: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)
    federal_income_tax_withheld: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)
    social_security_wages: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)
    social_security_tax_withheld: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)
    medicare_wages: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)
    medicare_tax_withheld: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)
    state_wages: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)
    state_income_tax: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)
    object_path: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    raw_extraction_data: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationship back to parent tax return
    tax_return: Mapped["TaxReturn"] = relationship("TaxReturn", back_populates="w2_documents")

    def __repr__(self) -> str:
        return f"<W2Document id={self.id} employer={self.employer_name!r} status={self.status}>"
