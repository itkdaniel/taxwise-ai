"""
TaxReturn business logic.
Calls are cached where appropriate; cache is invalidated on mutations.
"""
from decimal import Decimal
from typing import Protocol

from sqlalchemy.orm import Session

from app.core.cache import cached, invalidate_prefix
from app.models.tax_return import TaxReturn
from app.schemas.tax_return import (
    TaxReturnCreate,
    TaxReturnUpdate,
    TaxReturnSummary,
    TaxCalculationResult,
)


# ── 2024 IRS tax brackets (single) ────────────────────────────────────────────
_BRACKETS_SINGLE = [
    (11_600,  0.10),
    (47_150,  0.12),
    (100_525, 0.22),
    (191_950, 0.24),
    (243_725, 0.32),
    (609_350, 0.35),
    (float("inf"), 0.37),
]
_STANDARD_DEDUCTION_SINGLE = Decimal("14600")
_STANDARD_DEDUCTION_MFJ = Decimal("29200")


class TaxReturnServiceInterface(Protocol):
    """Interface / contract so alternate implementations can be injected."""

    def list_returns(self, db: Session, user_id: str | None = None) -> list[TaxReturn]: ...
    def get_by_id(self, db: Session, return_id: int) -> TaxReturn | None: ...
    def create(self, db: Session, payload: TaxReturnCreate) -> TaxReturn: ...
    def update(self, db: Session, return_id: int, payload: TaxReturnUpdate) -> TaxReturn | None: ...
    def delete(self, db: Session, return_id: int) -> bool: ...
    def calculate(self, db: Session, return_id: int) -> TaxCalculationResult | None: ...
    def summary(self, db: Session) -> TaxReturnSummary: ...


class TaxReturnService:
    """
    Concrete implementation of TaxReturnServiceInterface.
    All read methods are cached; all write methods invalidate relevant prefixes.
    """

    @cached("tax_returns_list", ttl=120)
    def list_returns(self, db: Session, user_id: str | None = None) -> list[TaxReturn]:
        q = db.query(TaxReturn)
        if user_id:
            q = q.filter(TaxReturn.user_id == user_id)
        return q.order_by(TaxReturn.created_at.desc()).all()

    def get_by_id(self, db: Session, return_id: int) -> TaxReturn | None:
        return db.query(TaxReturn).filter(TaxReturn.id == return_id).first()

    def create(self, db: Session, payload: TaxReturnCreate) -> TaxReturn:
        record = TaxReturn(**payload.model_dump())
        db.add(record)
        db.flush()
        invalidate_prefix("tax_returns_list")
        invalidate_prefix("tax_summary")
        return record

    def update(self, db: Session, return_id: int, payload: TaxReturnUpdate) -> TaxReturn | None:
        record = self.get_by_id(db, return_id)
        if not record:
            return None
        for field, value in payload.model_dump(exclude_none=True).items():
            setattr(record, field, value)
        db.flush()
        invalidate_prefix("tax_returns_list")
        return record

    def delete(self, db: Session, return_id: int) -> bool:
        record = self.get_by_id(db, return_id)
        if not record:
            return False
        db.delete(record)
        invalidate_prefix("tax_returns_list")
        invalidate_prefix("tax_summary")
        return True

    def calculate(self, db: Session, return_id: int) -> TaxCalculationResult | None:
        """Apply 2024 IRS tax brackets and persist estimated refund/owed."""
        record = self.get_by_id(db, return_id)
        if not record:
            return None

        is_mfj = record.filing_status == "married_filing_jointly"
        deduction = _STANDARD_DEDUCTION_MFJ if is_mfj else _STANDARD_DEDUCTION_SINGLE
        taxable = max(Decimal("0"), record.total_wages - deduction)

        # Calculate tax through progressive brackets
        tax = Decimal("0")
        prev_limit = Decimal("0")
        marginal = 0.10
        for limit, rate in _BRACKETS_SINGLE:
            bracket_limit = Decimal(str(limit))
            if taxable <= prev_limit:
                break
            taxable_in_bracket = min(taxable, bracket_limit) - prev_limit
            tax += taxable_in_bracket * Decimal(str(rate))
            marginal = rate
            prev_limit = bracket_limit

        effective = float(tax / taxable) if taxable else 0.0
        withheld = record.federal_tax_withheld
        refund = max(Decimal("0"), withheld - tax)
        owed = max(Decimal("0"), tax - withheld)

        # Persist calculation results
        record.estimated_refund = refund
        record.estimated_owed = owed
        record.status = "calculated"
        db.flush()

        return TaxCalculationResult(
            tax_return_id=return_id,
            total_wages=record.total_wages,
            taxable_income=taxable,
            tax_liability=tax,
            standard_deduction=deduction,
            effective_rate=round(effective * 100, 2),
            marginal_rate=round(marginal * 100, 2),
            estimated_refund=refund,
            estimated_owed=owed,
        )

    @cached("tax_summary", ttl=300)
    def summary(self, db: Session) -> TaxReturnSummary:
        all_returns = db.query(TaxReturn).all()
        return TaxReturnSummary(
            total_returns=len(all_returns),
            completed_returns=sum(1 for r in all_returns if r.status == "complete"),
            pending_returns=sum(1 for r in all_returns if r.status in ("draft", "processing")),
            total_estimated_refunds=sum((r.estimated_refund for r in all_returns), Decimal("0")),
            total_estimated_owed=sum((r.estimated_owed for r in all_returns), Decimal("0")),
        )


# ── Factory function ───────────────────────────────────────────────────────────
def create_tax_return_service() -> TaxReturnService:
    """Factory — returns a concrete service instance (swap for mock in tests)."""
    return TaxReturnService()
