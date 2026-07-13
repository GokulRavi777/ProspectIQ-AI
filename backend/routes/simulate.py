from fastapi import APIRouter
from schemas import SimulateInput, Lead, TopFactor

router = APIRouter(prefix="/simulate", tags=["Simulate"])

@router.post("", response_model=Lead)
def simulate_lead(customer_input: SimulateInput):
    import sys
    import os
    sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../')))
    from ml.score_engine import score_customer

    foir = customer_input.existing_emi / max(1, customer_input.monthly_income)
    volatility = 0.1 if customer_input.income_type == "Salaried" else 0.4
    
    features = {
        "customer_id": "SIMULATED",
        "name": "Interactive Demo User",
        "persona": f"{customer_input.income_type} Profile",
        "actual_monthly_income": float(customer_input.monthly_income),
        "monthly_emi_obligation": float(customer_input.existing_emi),
        "foir": float(foir),
        "income_volatility_actual": float(volatility),
        "savings_rate_actual": 0.15,
        "n_emi_bounces": 0,
        "n_calculator_uses": customer_input.recent_calculator_visits,
        "n_page_visits": 2,
        "n_logins": 1,
        "recency_weighted_engagement": customer_input.recent_calculator_visits * 2,
        "thin_file": True,
        "eligible_loan_amount": int(max(0, customer_input.monthly_income - customer_input.existing_emi) * 36)
    }
    
    result = score_customer(features)
    
    # Map back to Lead schema
    return Lead(
        customer_id=result["customer_id"],
        name=result["name"],
        persona_label=result["persona_label"],
        repayment_capacity_score=result["repayment_capacity_score"],
        conversion_propensity_score=result["conversion_propensity_score"],
        tier=result["tier"],
        thin_file=result["thin_file"],
        recommended_product=result["recommended_product"],
        eligible_loan_amount=result["eligible_loan_amount"],
        top_factors=[TopFactor(factor=f["factor"], impact=f["impact"]) for f in result["top_factors"]],
        explanation_text=result["explanation_text"]
    )
