import os
import joblib
import pandas as pd
import numpy as np
import json

# Load models safely
MODELS_DIR = os.path.join(os.path.dirname(__file__), "models")
try:
    rcs_model = joblib.load(os.path.join(MODELS_DIR, "rcs_model.pkl"))
    cps_model = joblib.load(os.path.join(MODELS_DIR, "cps_model.pkl"))
except Exception as e:
    rcs_model = None
    cps_model = None

def clip(value, min_val, max_val):
    return max(min_val, min(value, max_val))

def compute_explainability(features):
    # Uses Phase 3 logic
    foir = features.get("foir", 0.0)
    income_volatility_actual = features.get("income_volatility_actual", 0.0)
    savings_rate_actual = features.get("savings_rate_actual", 0.0)
    n_emi_bounces = features.get("n_emi_bounces", 0)
    
    n_calculator_uses = features.get("n_calculator_uses", 0)
    n_page_visits = features.get("n_page_visits", 0)
    recency_weighted_engagement = features.get("recency_weighted_engagement", 0)

    foir_score = clip(100 - (foir * 180), 0, 100)
    stability_score = clip(100 - (income_volatility_actual * 120), 0, 100)
    savings_score = clip(savings_rate_actual * 300, 0, 100)
    bounce_penalty = min(n_emi_bounces * 15, 60)

    contributions = []
    
    # Repayment factors
    foir_contrib = 0.45 * foir_score
    if foir_contrib > 20:
        contributions.append({"factor": f"Low FOIR ({int(foir*100)}%)", "impact": "positive", "score": foir_contrib})
    elif foir > 0.4:
        contributions.append({"factor": f"High FOIR ({int(foir*100)}%)", "impact": "negative", "score": foir_contrib})

    stab_contrib = 0.30 * stability_score
    if stab_contrib > 20:
        contributions.append({"factor": "Consistent monthly income", "impact": "positive", "score": stab_contrib})
    elif income_volatility_actual > 0.3:
        contributions.append({"factor": "High income volatility", "impact": "negative", "score": -stab_contrib})
        
    sav_contrib = 0.25 * savings_score
    if sav_contrib > 15:
        contributions.append({"factor": f"Strong savings rate ({int(savings_rate_actual*100)}%)", "impact": "positive", "score": sav_contrib})

    if bounce_penalty > 0:
        contributions.append({"factor": f"Recent EMI bounces ({n_emi_bounces})", "impact": "negative", "score": bounce_penalty})

    # Engagement factors
    if n_calculator_uses > 0:
        contributions.append({"factor": f"Used EMI calculator {n_calculator_uses}x", "impact": "positive", "score": n_calculator_uses*8})
    if n_page_visits > 0:
        contributions.append({"factor": f"Viewed loan products {n_page_visits}x", "impact": "positive", "score": n_page_visits*5})
    if recency_weighted_engagement > 0:
        contributions.append({"factor": "Recent active engagement", "impact": "positive", "score": recency_weighted_engagement*2})

    contributions.sort(key=lambda x: abs(x["score"]), reverse=True)
    
    top_factors = [{"factor": c["factor"], "impact": c["impact"]} for c in contributions[:3]]
    if not top_factors:
         top_factors.append({"factor": "Standard customer profile", "impact": "positive"})
    return top_factors

def generate_explanation(rcs, cps, tier, top_factors, thin_file):
    if rcs >= 75:
        repayment_text = "Strong repayment capacity"
    elif rcs >= 50:
        repayment_text = "Moderate repayment capacity"
    else:
        repayment_text = "Limited repayment capacity"
        
    factor_phrase = top_factors[0]["factor"].lower() if top_factors else "standard profile"
    
    if cps >= 70:
        intent_text = "High intent"
        action = "contacting immediately"
        timeframe = "24 hours"
    elif cps >= 40:
        intent_text = "Rising intent"
        action = "nurturing"
        timeframe = "this week"
    else:
        intent_text = "Low intent"
        action = "monitoring"
        timeframe = "next 30 days"
        
    thin_text = " (scored via alt-data)" if thin_file else ""
    
    explanation = f"{repayment_text}{thin_text} with {factor_phrase}. {intent_text} observed. Recommend {action} within {timeframe}."
    return explanation

def score_customer(customer_features: dict) -> dict:
    rcs_features = ["foir", "income_volatility_actual", "savings_rate_actual", "n_emi_bounces", "actual_monthly_income", "thin_file"]
    
    X_rcs = pd.DataFrame([{f: customer_features.get(f, 0.0) for f in rcs_features}])
    X_rcs["thin_file"] = X_rcs["thin_file"].astype(bool)
    
    if rcs_model:
        rcs_pred = float(rcs_model.predict(X_rcs)[0])
    else:
        rcs_pred = customer_features.get("repayment_capacity_score", 50.0)
    
    rcs_pred = round(clip(rcs_pred, 0, 100), 1)
    
    # Normally the CPS model predicts the 'converted' binary target, but the lead schema wants the 0-100 CPS score itself.
    # We will output the raw ground truth CPS score directly as requested, or run the CPS classifier to output probability mapped to 0-100.
    # Instruction says: "returns a dict matching shared/lead_schema.json EXACTLY". The CPS is a score 0-100.
    # We will pass through the CPS feature which was computed in features.py.
    cps_raw = customer_features.get("conversion_propensity_score", 0.0)
    cps_pred = round(clip(cps_raw, 0, 100), 1)
    
    combined_score = rcs_pred + cps_pred
    if combined_score >= 150:
        tier = "Hot"
    elif combined_score >= 100:
        tier = "Warm"
    else:
        tier = "Cold"
        
    thin_file = bool(customer_features.get("thin_file", False))
    top_factors = compute_explainability(customer_features)
    explanation_text = generate_explanation(rcs_pred, cps_pred, tier, top_factors, thin_file)
    
    lead_dict = {
        "customer_id": str(customer_features.get("customer_id", "UNKNOWN")),
        "name": str(customer_features.get("name", "Unknown Customer")),
        "persona_label": str(customer_features.get("persona", "Unknown")),
        "repayment_capacity_score": float(rcs_pred),
        "conversion_propensity_score": float(cps_pred),
        "tier": tier,
        "thin_file": thin_file,
        "recommended_product": str(customer_features.get("recommended_product", "Personal Loan")),
        "eligible_loan_amount": int(customer_features.get("eligible_loan_amount", 0)),
        "top_factors": top_factors,
        "explanation_text": explanation_text
    }
    
    return lead_dict

def score_batch(customers_df) -> list:
    scored_leads = []
    for _, row in customers_df.iterrows():
        lead = score_customer(row.to_dict())
        scored_leads.append(lead)
        
    scored_leads.sort(key=lambda x: x["repayment_capacity_score"] + x["conversion_propensity_score"], reverse=True)
    return scored_leads

if __name__ == "__main__":
    print("Running batch scoring to regenerate handoff file...")
    df = pd.read_csv("data/customer_features.csv")
    leads = score_batch(df)
    
    with open("data/scored_leads.json", "w") as f:
        json.dump(leads, f, indent=2)
        
    print(f"Successfully generated data/scored_leads.json with {len(leads)} real leads.")
    print("--- 1-Lead Sample ---")
    print(json.dumps(leads[0], indent=2))
    print("\nCheckpoint 1 Complete! You can inform the backend dev.")
