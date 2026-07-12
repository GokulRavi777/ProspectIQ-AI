"""
ProspectIQ - Customer Personas Definition
"""

RANDOM_SEED = 42

LOAN_PRODUCTS = [
    "Personal Loan", 
    "Home Loan", 
    "Mortgage Loan", 
    "Auto Loan"
]

PERSONAS = {
    "Salaried - Stable (IT/PSU)": {
        "weight": 0.20,
        "monthly_income_range": (50000, 150000),
        "income_volatility": 0.05,
        "income_type": "fixed_salary",
        "existing_emi_ratio_range": (0.10, 0.30),
        "expense_ratio_range": (0.30, 0.50),
        "savings_rate_range": (0.20, 0.40),
        "bounce_prob": 0.01,
        "engagement_level": "medium",
        "calculator_use_range": (0, 2),
        "loan_page_visit_range": (1, 3),
        "past_offer_response_prob": 0.10,
        "credit_score_range": (750, 820),
        "thin_file_prob": 0.05
    },
    "Salaried - Variable (Sales/Incentive-based)": {
        "weight": 0.15,
        "monthly_income_range": (40000, 100000),
        "income_volatility": 0.25,
        "income_type": "variable_salary",
        "existing_emi_ratio_range": (0.20, 0.40),
        "expense_ratio_range": (0.35, 0.55),
        "savings_rate_range": (0.10, 0.25),
        "bounce_prob": 0.05,
        "engagement_level": "medium_high",
        "calculator_use_range": (1, 4),
        "loan_page_visit_range": (2, 5),
        "past_offer_response_prob": 0.20,
        "credit_score_range": (700, 780),
        "thin_file_prob": 0.10
    },
    "Self-Employed - Thriving": {
        "weight": 0.15,
        "monthly_income_range": (80000, 300000),
        "income_volatility": 0.30,
        "income_type": "business_upi",
        "existing_emi_ratio_range": (0.15, 0.35),
        "expense_ratio_range": (0.30, 0.50),
        "savings_rate_range": (0.15, 0.35),
        "bounce_prob": 0.02,
        "engagement_level": "medium",
        "calculator_use_range": (1, 3),
        "loan_page_visit_range": (1, 4),
        "past_offer_response_prob": 0.15,
        "credit_score_range": (720, 800),
        "thin_file_prob": 0.15
    },
    "Self-Employed - Struggling": {
        "weight": 0.10,
        "monthly_income_range": (25000, 60000),
        "income_volatility": 0.40,
        "income_type": "business_upi",
        "existing_emi_ratio_range": (0.30, 0.50),
        "expense_ratio_range": (0.50, 0.70),
        "savings_rate_range": (0.01, 0.05),
        "bounce_prob": 0.15,
        "engagement_level": "high",
        "calculator_use_range": (2, 6),
        "loan_page_visit_range": (3, 8),
        "past_offer_response_prob": 0.30,
        "credit_score_range": (600, 680),
        "thin_file_prob": 0.20
    },
    "Gig Worker (Delivery/Freelance)": {
        "weight": 0.15,
        "monthly_income_range": (15000, 40000),
        "income_volatility": 0.35,
        "income_type": "gig_multi_platform",
        "existing_emi_ratio_range": (0.10, 0.25),
        "expense_ratio_range": (0.60, 0.80),
        "savings_rate_range": (0.05, 0.15),
        "bounce_prob": 0.08,
        "engagement_level": "medium_high",
        "calculator_use_range": (1, 5),
        "loan_page_visit_range": (2, 6),
        "past_offer_response_prob": 0.25,
        "credit_score_range": (650, 720),
        "thin_file_prob": 0.60
    },
    "Young Professional - New to Credit": {
        "weight": 0.10,
        "monthly_income_range": (30000, 60000),
        "income_volatility": 0.05,
        "income_type": "fixed_salary",
        "existing_emi_ratio_range": (0.00, 0.10),
        "expense_ratio_range": (0.30, 0.50),
        "savings_rate_range": (0.40, 0.60),
        "bounce_prob": 0.01,
        "engagement_level": "high",
        "calculator_use_range": (2, 5),
        "loan_page_visit_range": (3, 7),
        "past_offer_response_prob": 0.35,
        "credit_score_range": (700, 750),
        "thin_file_prob": 0.85
    },
    "Over-Leveraged Customer": {
        "weight": 0.10,
        "monthly_income_range": (60000, 120000),
        "income_volatility": 0.10,
        "income_type": "fixed_salary",
        "existing_emi_ratio_range": (0.45, 0.70),
        "expense_ratio_range": (0.30, 0.50),
        "savings_rate_range": (0.00, 0.05),
        "bounce_prob": 0.10,
        "engagement_level": "high",
        "calculator_use_range": (3, 8),
        "loan_page_visit_range": (4, 10),
        "past_offer_response_prob": 0.40,
        "credit_score_range": (620, 700),
        "thin_file_prob": 0.05
    },
    "Dormant/Uninterested": {
        "weight": 0.05,
        "monthly_income_range": (20000, 200000),
        "income_volatility": 0.10,
        "income_type": "fixed_salary",
        "existing_emi_ratio_range": (0.05, 0.20),
        "expense_ratio_range": (0.30, 0.50),
        "savings_rate_range": (0.10, 0.30),
        "bounce_prob": 0.01,
        "engagement_level": "none",
        "calculator_use_range": (0, 0),
        "loan_page_visit_range": (0, 1),
        "past_offer_response_prob": 0.01,
        "credit_score_range": (750, 850),
        "thin_file_prob": 0.05
    }
}

if __name__ == "__main__":
    # Sanity check weights
    total_weight = sum(p["weight"] for p in PERSONAS.values())
    print(f"Total weight: {total_weight:.4f}")
    assert abs(total_weight - 1.0) < 1e-6, "Weights must sum to 1.0"
    print(f"Number of personas defined: {len(PERSONAS)}")
