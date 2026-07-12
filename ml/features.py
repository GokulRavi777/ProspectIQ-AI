import pandas as pd
import numpy as np
from datetime import datetime
import json
import os
import sys

# Ensure personas module can be imported
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from personas import LOAN_PRODUCTS, RANDOM_SEED

np.random.seed(RANDOM_SEED)

def clip(value, min_val, max_val):
    if pd.isna(value):
        return min_val
    return max(min_val, min(value, max_val))

def compute_features(customers_df, txns_df, events_df):
    features_list = []
    
    end_date = pd.to_datetime('2026-07-01')
    thirty_days_ago = end_date - pd.Timedelta(days=30)
    
    events_df['date'] = pd.to_datetime(events_df['date'])
    txns_df['date'] = pd.to_datetime(txns_df['date'])
    txns_df['month'] = txns_df['date'].dt.to_period('M')
    
    for _, row in customers_df.iterrows():
        cid = row['customer_id']
        c_txns = txns_df[txns_df['customer_id'] == cid]
        c_evts = events_df[events_df['customer_id'] == cid]
        
        # ---------------- Repayment features ----------------
        credits = c_txns[c_txns['type'] == 'credit']
        if not credits.empty:
            monthly_credits = credits.groupby('month')['amount'].sum()
            actual_monthly_income = float(monthly_credits.mean())
            if len(monthly_credits) > 1 and actual_monthly_income > 0:
                income_volatility_actual = float(monthly_credits.std() / actual_monthly_income)
                if pd.isna(income_volatility_actual):
                    income_volatility_actual = 0.0
            else:
                income_volatility_actual = 0.0
        else:
            actual_monthly_income = 0.0
            income_volatility_actual = 0.0
            
        actual_monthly_income_safe = max(1.0, actual_monthly_income)
            
        emis = c_txns[c_txns['category'].isin(['existing_emi', 'existing_emi_bounced'])]
        monthly_emi_obligation = float(emis.groupby('month')['amount'].sum().mean()) if not emis.empty else 0.0
        
        foir = monthly_emi_obligation / actual_monthly_income_safe
        
        savings = c_txns[c_txns['category'] == 'savings_transfer']
        avg_monthly_savings = float(savings.groupby('month')['amount'].sum().mean()) if not savings.empty else 0.0
        savings_rate_actual = avg_monthly_savings / actual_monthly_income_safe
        
        n_emi_bounces = len(c_txns[c_txns['category'] == 'existing_emi_bounced'])
        
        expenses = c_txns[c_txns['category'].isin(["rent", "utilities", "groceries", "discretionary", "fuel", "insurance"])]
        avg_monthly_expenses = float(expenses.groupby('month')['amount'].sum().mean()) if not expenses.empty else 0.0
        
        # ---------------- Engagement features ----------------
        n_calculator_uses = len(c_evts[c_evts['event_type'] == 'emi_calculator_used'])
        n_page_visits = len(c_evts[c_evts['event_type'] == 'loan_product_page_view'])
        n_logins = len(c_evts[c_evts['event_type'] == 'app_login'])
        
        responded_to_past_offer = bool(len(c_evts[c_evts['event_type'] == 'past_offer_responded']) > 0)
        abandoned_application = bool(len(c_evts[c_evts['event_type'] == 'application_abandoned']) > 0)
        
        recent_events = len(c_evts[c_evts['date'] >= thirty_days_ago])
        recency_weighted_engagement = recent_events * 2 
        
        # ---------------- Ground truth formula ----------------
        foir_score        = clip(100 - (foir * 180), 0, 100)
        stability_score   = clip(100 - (income_volatility_actual * 120), 0, 100)
        savings_score     = clip(savings_rate_actual * 300, 0, 100)
        bounce_penalty    = min(n_emi_bounces * 15, 60)
        
        RCS = clip(0.45*foir_score + 0.30*stability_score + 0.25*savings_score - bounce_penalty, 0, 100)
        
        raw_engagement = n_calculator_uses*8 + n_page_visits*5 + n_logins*1.5 \
                         + recency_weighted_engagement \
                         + (20 if responded_to_past_offer else 0) \
                         + (15 if abandoned_application else 0)
        CPS = clip(raw_engagement * 1.1, 0, 100)
        
        # ---------------- Eligible amount & product ----------------
        monthly_surplus = actual_monthly_income - monthly_emi_obligation - avg_monthly_expenses
        eligible_loan_amount = int(round(max(0, monthly_surplus) * 36 / 1000) * 1000)
        
        if actual_monthly_income < 30000:
            recommended_product = "Personal Loan"
        elif actual_monthly_income < 80000:
            recommended_product = "Auto Loan"
        else:
            recommended_product = "Home Loan"
            
        # ---------------- Conversion target ----------------
        base_prob = (RCS / 100) * (CPS / 100)
        noise = np.random.normal(0, 0.1)
        conv_prob = clip(base_prob + noise, 0, 1)
        converted = 1 if np.random.random() < conv_prob else 0
        
        features_list.append({
            "customer_id": cid,
            "actual_monthly_income": actual_monthly_income,
            "monthly_emi_obligation": monthly_emi_obligation,
            "foir": foir,
            "income_volatility_actual": income_volatility_actual,
            "savings_rate_actual": savings_rate_actual,
            "n_emi_bounces": n_emi_bounces,
            "n_calculator_uses": n_calculator_uses,
            "n_page_visits": n_page_visits,
            "n_logins": n_logins,
            "recency_weighted_engagement": recency_weighted_engagement,
            "responded_to_past_offer": responded_to_past_offer,
            "abandoned_application": abandoned_application,
            "repayment_capacity_score": RCS,
            "conversion_propensity_score": CPS,
            "recommended_product": recommended_product,
            "eligible_loan_amount": eligible_loan_amount,
            "converted": converted
        })
        
    return pd.DataFrame(features_list)

if __name__ == "__main__":
    customers_df = pd.read_csv("data/customers.csv")
    txns_df = pd.read_csv("data/transactions.csv")
    events_df = pd.read_csv("data/behavioral_events.csv")
    
    print("Computing features...")
    features_df = compute_features(customers_df, txns_df, events_df)
    
    full_df = pd.merge(customers_df, features_df, on="customer_id")
    full_df.to_csv("data/customer_features.csv", index=False)
    
    print("Features generated and saved to data/customer_features.csv\n")
    
    print("--- 10-Row Sample ---")
    cols_to_print = ["persona", "foir", "n_emi_bounces", "repayment_capacity_score", "conversion_propensity_score", "converted"]
    sample_df = full_df.sample(10)
    print(sample_df[cols_to_print].to_string())
    
    print("\n--- Sanity Check Distributions ---")
    print(full_df.groupby("persona")[["repayment_capacity_score", "conversion_propensity_score", "converted"]].mean().to_string())
