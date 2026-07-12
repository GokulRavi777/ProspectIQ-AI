from pydantic import BaseModel
from typing import Literal

class TopFactor(BaseModel):
    factor: str
    impact: Literal["positive", "negative"]

class Lead(BaseModel):
    customer_id: str
    name: str
    persona_label: str
    repayment_capacity_score: float
    conversion_propensity_score: float
    tier: Literal["Hot", "Warm", "Cold"]
    thin_file: bool
    recommended_product: Literal["Personal Loan", "Home Loan", "Mortgage Loan", "Auto Loan"]
    eligible_loan_amount: int
    top_factors: list[TopFactor]
    explanation_text: str

class Metrics(BaseModel):
    baseline_conversion_rate: float
    prospectiq_conversion_rate: float
    conversion_lift_multiple: float
    total_leads_scored: int
    hot_leads_count: int
    warm_leads_count: int
    cold_leads_count: int
    thin_file_customers_scored: int
    thin_file_coverage_pct: float
    avg_repayment_capacity_score: float
    model_precision: float
    model_recall: float
    model_f1: float

class SimulateInput(BaseModel):
    monthly_income: int
    income_type: Literal["Salaried", "Self-Employed", "Business"]
    existing_emi: int
    recent_calculator_visits: int
