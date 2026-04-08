"""
Pydantic schemas for TaxReturn request / response validation.
Generic typing keeps response envelopes reusable across the API.
"""
from datetime import datetime
from decimal import Decimal
from typing import Generic, TypeVar

from pydantic import BaseModel, ConfigDict

T = TypeVar("T")


class DataEnvelope(BaseModel, Generic[T]):
    """Generic response envelope — wraps any payload under a `data` key."""
    data: T
    success: bool = True
    message: str = "OK"


class TaxReturnBase(BaseModel):
    """Shared fields used by both create and update schemas."""
    tax_year: int
    filing_status: str = "single"


class TaxReturnCreate(TaxReturnBase):
    """Payload for POST /tax-returns."""
    user_id: str


class TaxReturnUpdate(BaseModel):
    """Partial update — all fields optional."""
    filing_status: str | None = None
    status: str | None = None
    total_wages: Decimal | None = None
    federal_tax_withheld: Decimal | None = None


class TaxReturnResponse(TaxReturnBase):
    """Full tax return serialized for API consumers."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: str
    status: str
    total_wages: Decimal
    federal_tax_withheld: Decimal
    state_tax_withheld: Decimal
    social_security_wages: Decimal
    medicare_wages: Decimal
    estimated_refund: Decimal
    estimated_owed: Decimal
    created_at: datetime
    updated_at: datetime


class TaxReturnSummary(BaseModel):
    """Dashboard summary aggregated across all returns."""
    total_returns: int
    completed_returns: int
    pending_returns: int
    total_estimated_refunds: Decimal
    total_estimated_owed: Decimal


class TaxCalculationResult(BaseModel):
    """Result of tax bracket calculation."""
    tax_return_id: int
    total_wages: Decimal
    taxable_income: Decimal
    tax_liability: Decimal
    standard_deduction: Decimal
    effective_rate: float
    marginal_rate: float
    estimated_refund: Decimal
    estimated_owed: Decimal
