"""
Tax Returns REST router — registered under /api/v1/tax-returns.
Depends on TaxReturnService injected via FastAPI's Depends().
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db_dependency
from app.schemas.tax_return import (
    TaxReturnCreate,
    TaxReturnResponse,
    TaxReturnUpdate,
    TaxReturnSummary,
    TaxCalculationResult,
    DataEnvelope,
)
from app.services.tax_return_service import TaxReturnService, create_tax_return_service

router = APIRouter(prefix="/tax-returns", tags=["Tax Returns"])


def get_service() -> TaxReturnService:
    """Dependency — replaces service with mock in tests via app.dependency_overrides."""
    return create_tax_return_service()


@router.get("/summary", response_model=TaxReturnSummary)
def get_summary(
    db: Session = Depends(get_db_dependency),
    svc: TaxReturnService = Depends(get_service),
):
    """Return aggregated dashboard summary across all tax returns."""
    return svc.summary(db)


@router.get("/", response_model=list[TaxReturnResponse])
def list_returns(
    user_id: str | None = None,
    db: Session = Depends(get_db_dependency),
    svc: TaxReturnService = Depends(get_service),
):
    """List all tax returns, optionally filtered by user_id."""
    return svc.list_returns(db, user_id)


@router.get("/{return_id}", response_model=TaxReturnResponse)
def get_return(
    return_id: int,
    db: Session = Depends(get_db_dependency),
    svc: TaxReturnService = Depends(get_service),
):
    """Fetch a single tax return by ID."""
    record = svc.get_by_id(db, return_id)
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tax return not found")
    return record


@router.post("/", response_model=TaxReturnResponse, status_code=status.HTTP_201_CREATED)
def create_return(
    payload: TaxReturnCreate,
    db: Session = Depends(get_db_dependency),
    svc: TaxReturnService = Depends(get_service),
):
    """Create a new tax return record."""
    return svc.create(db, payload)


@router.patch("/{return_id}", response_model=TaxReturnResponse)
def update_return(
    return_id: int,
    payload: TaxReturnUpdate,
    db: Session = Depends(get_db_dependency),
    svc: TaxReturnService = Depends(get_service),
):
    """Partially update a tax return."""
    record = svc.update(db, return_id, payload)
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tax return not found")
    return record


@router.delete("/{return_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_return(
    return_id: int,
    db: Session = Depends(get_db_dependency),
    svc: TaxReturnService = Depends(get_service),
):
    """Delete a tax return and all its W-2 documents."""
    if not svc.delete(db, return_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tax return not found")


@router.post("/{return_id}/calculate", response_model=TaxCalculationResult)
def calculate_return(
    return_id: int,
    db: Session = Depends(get_db_dependency),
    svc: TaxReturnService = Depends(get_service),
):
    """Run 2024 IRS bracket calculation and persist estimated refund/owed."""
    result = svc.calculate(db, return_id)
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tax return not found")
    return result
