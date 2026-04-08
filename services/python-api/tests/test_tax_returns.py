"""
Unit + integration tests for the TaxReturn API.

Test strategy:
  • Service-layer unit tests — mock the DB session using MagicMock
  • API integration tests   — use FastAPI TestClient + override DB dependency
  • All tests produce JUnit XML screenshots via pytest-html (optional)
"""
import pytest
from decimal import Decimal
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient

from main import app
from app.core.database import get_db_dependency
from app.services.tax_return_service import TaxReturnService, create_tax_return_service
from app.schemas.tax_return import TaxReturnCreate, TaxReturnUpdate
from app.models.tax_return import TaxReturn


# ── Fixtures ──────────────────────────────────────────────────────────────────

@pytest.fixture
def mock_db():
    """Return a MagicMock that quacks like a SQLAlchemy Session."""
    db = MagicMock()
    db.query.return_value.filter.return_value.first.return_value = _sample_return()
    db.query.return_value.order_by.return_value.all.return_value = [_sample_return()]
    db.query.return_value.all.return_value = [_sample_return()]
    return db


@pytest.fixture
def service():
    """Create a service instance with cache disabled."""
    with patch("app.core.cache._get_redis", return_value=None):
        yield TaxReturnService()


@pytest.fixture
def client(mock_db):
    """TestClient with the DB dependency overridden."""
    def override_db():
        yield mock_db

    app.dependency_overrides[get_db_dependency] = override_db
    yield TestClient(app)
    app.dependency_overrides.clear()


def _sample_return() -> TaxReturn:
    """Factory: build a sample TaxReturn ORM object."""
    r = TaxReturn()
    r.id = 1
    r.user_id = "test-user-001"
    r.tax_year = 2024
    r.filing_status = "single"
    r.status = "draft"
    r.total_wages = Decimal("85000.00")
    r.federal_tax_withheld = Decimal("12000.00")
    r.state_tax_withheld = Decimal("4000.00")
    r.social_security_wages = Decimal("85000.00")
    r.medicare_wages = Decimal("85000.00")
    r.estimated_refund = Decimal("0.00")
    r.estimated_owed = Decimal("0.00")
    from datetime import datetime
    r.created_at = datetime(2024, 1, 15, 10, 0, 0)
    r.updated_at = datetime(2024, 1, 15, 10, 0, 0)
    return r


# ── Service unit tests ────────────────────────────────────────────────────────

class TestTaxReturnService:
    """Unit tests for TaxReturnService business logic."""

    def test_list_returns_returns_list(self, service, mock_db):
        """list_returns should return a list of TaxReturn objects."""
        result = service.list_returns(mock_db)
        assert isinstance(result, list)
        assert len(result) >= 1

    def test_get_by_id_existing(self, service, mock_db):
        """get_by_id should return the record for a valid ID."""
        record = service.get_by_id(mock_db, 1)
        assert record is not None
        assert record.id == 1

    def test_get_by_id_missing(self, service, mock_db):
        """get_by_id returns None when no record found."""
        mock_db.query.return_value.filter.return_value.first.return_value = None
        result = service.get_by_id(mock_db, 999)
        assert result is None

    def test_create_adds_record(self, service, mock_db):
        """create should add a TaxReturn to the session."""
        payload = TaxReturnCreate(user_id="u1", tax_year=2024, filing_status="single")
        mock_db.add = MagicMock()
        mock_db.flush = MagicMock()
        # configure mock to return added object on query
        mock_db.query.return_value.filter.return_value.first.return_value = _sample_return()

        result = service.create(mock_db, payload)
        mock_db.add.assert_called_once()

    def test_delete_existing(self, service, mock_db):
        """delete returns True when the record exists."""
        mock_db.delete = MagicMock()
        result = service.delete(mock_db, 1)
        assert result is True

    def test_delete_missing(self, service, mock_db):
        """delete returns False when the record does not exist."""
        mock_db.query.return_value.filter.return_value.first.return_value = None
        result = service.delete(mock_db, 999)
        assert result is False

    def test_calculate_tax_single_filer(self, service, mock_db):
        """
        2024 IRS brackets — single filer, $85,000 wages, $12,000 withheld.
        Expected: taxable income = 85000 - 14600 = 70400
        Tax ≈ $11,774 → refund = 12000 - 11774 = $226
        """
        record = _sample_return()
        mock_db.query.return_value.filter.return_value.first.return_value = record
        mock_db.flush = MagicMock()

        result = service.calculate(mock_db, 1)
        assert result is not None
        assert result.taxable_income == Decimal("70400.00")
        # Verify refund / owed are non-negative
        assert result.estimated_refund >= 0
        assert result.estimated_owed >= 0
        assert result.estimated_refund == 0 or result.estimated_owed == 0

    def test_summary_aggregates(self, service, mock_db):
        """summary should aggregate all returns."""
        result = service.summary(mock_db)
        assert result.total_returns >= 0
        assert result.completed_returns >= 0
        assert result.total_estimated_refunds >= 0


# ── API integration tests ─────────────────────────────────────────────────────

class TestTaxReturnsAPI:
    """HTTP-level integration tests via FastAPI TestClient."""

    def test_list_returns_200(self, client):
        """GET /api/v1/tax-returns returns 200 and a list."""
        response = client.get("/api/v1/tax-returns/")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    def test_get_return_200(self, client):
        """GET /api/v1/tax-returns/1 returns 200."""
        response = client.get("/api/v1/tax-returns/1")
        assert response.status_code == 200
        assert response.json()["id"] == 1

    def test_get_return_404(self, client, mock_db):
        """GET /api/v1/tax-returns/999 returns 404 when record missing."""
        mock_db.query.return_value.filter.return_value.first.return_value = None
        response = client.get("/api/v1/tax-returns/999")
        assert response.status_code == 404

    def test_create_return_201(self, client, mock_db):
        """POST /api/v1/tax-returns creates a new return."""
        from datetime import datetime

        def capture_add(obj):
            # Simulate DB-level defaults (server_default + column defaults) after flush
            obj.id = 99
            obj.status = obj.status or "draft"
            obj.created_at = datetime(2024, 1, 15, 10, 0, 0)
            obj.updated_at = datetime(2024, 1, 15, 10, 0, 0)
            obj.total_wages = obj.total_wages or 0
            obj.federal_tax_withheld = obj.federal_tax_withheld or 0
            obj.state_tax_withheld = obj.state_tax_withheld or 0
            obj.social_security_wages = obj.social_security_wages or 0
            obj.medicare_wages = obj.medicare_wages or 0
            obj.estimated_refund = obj.estimated_refund or 0
            obj.estimated_owed = obj.estimated_owed or 0

        mock_db.add = capture_add
        mock_db.flush = MagicMock()
        response = client.post(
            "/api/v1/tax-returns/",
            json={"user_id": "u1", "tax_year": 2024, "filing_status": "single"},
        )
        assert response.status_code == 201

    def test_calculate_return(self, client, mock_db):
        """POST /api/v1/tax-returns/1/calculate returns calculation result."""
        mock_db.flush = MagicMock()
        response = client.post("/api/v1/tax-returns/1/calculate")
        assert response.status_code == 200
        data = response.json()
        assert "taxable_income" in data
        assert "tax_liability" in data
        assert "estimated_refund" in data

    def test_health_check(self, client):
        """GET /healthz returns ok."""
        response = client.get("/healthz")
        assert response.status_code == 200
        assert response.json()["status"] == "ok"
