from fastapi import APIRouter
from schemas import SimulateInput, Lead, TopFactor

router = APIRouter(prefix="/simulate", tags=["Simulate"])

@router.post("", response_model=Lead)
def simulate_lead(customer_input: SimulateInput):
    # Stub response until Dev A implements the scoring engine
    # In the future, this will call ml.score_engine.score_customer
    
    return Lead(
        customer_id="SIMULATED",
        name="Simulated User",
        persona_label=f"Simulated {customer_input.income_type}",
        repayment_capacity_score=85.0,
        conversion_propensity_score=70.0,
        tier="Hot",
        thin_file=True,
        recommended_product="Personal Loan",
        eligible_loan_amount=max(50000, customer_input.monthly_income * 10 - customer_input.existing_emi * 5),
        top_factors=[
            TopFactor(factor="Stable Simulated Income", impact="positive"),
            TopFactor(factor="Recent Activity", impact="positive")
        ],
        explanation_text="This is a stubbed response for the simulate endpoint, based on the provided inputs."
    )
