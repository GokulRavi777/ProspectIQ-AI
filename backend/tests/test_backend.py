import sys
import os
import pytest
from fastapi.testclient import TestClient

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from main import app
from schemas import Lead, SimulateInput

client = TestClient(app)

def test_schema_validation():
    # Test valid lead
    valid_data = {
        "customer_id": "CUST001",
        "name": "Test User",
        "persona_label": "Test",
        "repayment_capacity_score": 80.0,
        "conversion_propensity_score": 75.0,
        "tier": "Hot",
        "thin_file": False,
        "recommended_product": "Personal Loan",
        "eligible_loan_amount": 50000,
        "top_factors": [{"factor": "Test", "impact": "positive"}],
        "explanation_text": "Test"
    }
    lead = Lead(**valid_data)
    assert lead.repayment_capacity_score == 80.0

    # Test invalid scores
    invalid_data = valid_data.copy()
    invalid_data["repayment_capacity_score"] = 150.0
    with pytest.raises(ValueError):
        Lead(**invalid_data)

def test_get_leads_pagination():
    response = client.get("/leads?limit=2&skip=0")
    # if there are no leads in data file, it might return []
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) <= 2

def test_simulate_endpoint():
    payload = {
        "monthly_income": 50000,
        "income_type": "Salaried",
        "existing_emi": 10000,
        "recent_calculator_visits": 2
    }
    response = client.post("/simulate", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "repayment_capacity_score" in data
    assert "conversion_propensity_score" in data
    assert 0 <= data["repayment_capacity_score"] <= 100
    assert 0 <= data["conversion_propensity_score"] <= 100
