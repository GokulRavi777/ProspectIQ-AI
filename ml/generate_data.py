import pandas as pd
import numpy as np
import random
from datetime import datetime, timedelta
import os
from personas import PERSONAS, RANDOM_SEED

np.random.seed(RANDOM_SEED)
random.seed(RANDOM_SEED)

N_CUSTOMERS = 1000
MONTHS = 6
END_DATE = datetime(2026, 7, 1)
START_DATE = END_DATE - timedelta(days=30 * MONTHS)

INDIAN_FIRST_NAMES = ["Aarav", "Vivaan", "Aditya", "Vihaan", "Arjun", "Sai", "Rayaan", "Ayaan", "Krishna", "Ishaan", "Shaurya", "Atharv", "Sriya", "Ananya", "Diya", "Navya", "Kavya", "Aarohi", "Anvi", "Sara"]
INDIAN_LAST_NAMES = ["Kumar", "Singh", "Sharma", "Verma", "Patel", "Reddy", "Rao", "Gupta", "Nair", "Iyer", "Joshi", "Bose", "Das", "Menon", "Pillai"]
CITIES = [("Mumbai", "Tier 1"), ("Delhi", "Tier 1"), ("Bangalore", "Tier 1"), ("Hyderabad", "Tier 1"), ("Pune", "Tier 1"), ("Jaipur", "Tier 2"), ("Lucknow", "Tier 2"), ("Bhopal", "Tier 2"), ("Indore", "Tier 2"), ("Nagpur", "Tier 2"), ("Patna", "Tier 3"), ("Meerut", "Tier 3")]

def sample_range(r):
    return random.uniform(r[0], r[1])

def sample_int_range(r):
    return random.randint(r[0], r[1])

def get_app_login_count(level):
    mapping = {
        "none": 0,
        "low": random.randint(1, 3),
        "medium": random.randint(5, 15),
        "medium_high": random.randint(15, 30),
        "high": random.randint(30, 60)
    }
    return mapping.get(level, 0)

def generate_customers():
    customers = []
    persona_names = list(PERSONAS.keys())
    weights = [p["weight"] for p in PERSONAS.values()]
    
    sampled_personas = np.random.choice(persona_names, size=N_CUSTOMERS, p=weights)
    
    for i, p_name in enumerate(sampled_personas):
        p = PERSONAS[p_name]
        
        customer_id = f"CUST{i+1:05d}"
        name = f"{random.choice(INDIAN_FIRST_NAMES)} {random.choice(INDIAN_LAST_NAMES)}"
        age = random.randint(22, 55)
        city, city_tier = random.choice(CITIES)
        
        declared_income = int(sample_range(p["monthly_income_range"]))
        declared_income = round(declared_income / 100) * 100
        
        thin_file = random.random() < p["thin_file_prob"]
        credit_score = None if thin_file else int(sample_range(p["credit_score_range"]))
        
        customers.append({
            "customer_id": customer_id,
            "name": name,
            "age": age,
            "city": city,
            "city_tier": city_tier,
            "persona": p_name,
            "declared_monthly_income": declared_income,
            "income_type": p["income_type"],
            "income_volatility": p["income_volatility"],
            "existing_emi_ratio": sample_range(p["existing_emi_ratio_range"]),
            "expense_ratio": sample_range(p["expense_ratio_range"]),
            "savings_rate": sample_range(p["savings_rate_range"]),
            "bounce_prob": p["bounce_prob"],
            "credit_score": credit_score,
            "thin_file": thin_file,
            "engagement_level": p["engagement_level"],
            "calculator_use_range": p["calculator_use_range"],
            "loan_page_visit_range": p["loan_page_visit_range"],
            "past_offer_response_prob": p["past_offer_response_prob"]
        })
        
    return pd.DataFrame(customers)

def generate_transactions(customers_df):
    txns = []
    txn_id = 1
    
    for _, row in customers_df.iterrows():
        base_income = row["declared_monthly_income"]
        
        for m in range(MONTHS):
            volatility_factor = np.random.normal(1.0, row["income_volatility"])
            volatility_factor = max(0.1, volatility_factor)
            monthly_income = int(base_income * volatility_factor)
            
            month_date = START_DATE + timedelta(days=m * 30 + random.randint(0, 25))
            
            # 1. Income credits
            if row["income_type"] == "fixed_salary":
                txns.append({
                    "transaction_id": f"TXN{txn_id:07d}",
                    "customer_id": row["customer_id"],
                    "date": month_date.strftime("%Y-%m-%d"),
                    "amount": monthly_income,
                    "type": "credit",
                    "category": "salary"
                })
                txn_id += 1
            elif row["income_type"] == "variable_salary":
                fixed_part = int(monthly_income * 0.7)
                variable_part = monthly_income - fixed_part
                txns.append({
                    "transaction_id": f"TXN{txn_id:07d}", "customer_id": row["customer_id"], "date": month_date.strftime("%Y-%m-%d"), "amount": fixed_part, "type": "credit", "category": "salary"
                })
                txn_id += 1
                txns.append({
                    "transaction_id": f"TXN{txn_id:07d}", "customer_id": row["customer_id"], "date": (month_date + timedelta(days=random.randint(1,4))).strftime("%Y-%m-%d"), "amount": variable_part, "type": "credit", "category": "incentive"
                })
                txn_id += 1
            else: # business_upi or gig_multi_platform
                num_credits = random.randint(5, 15) if row["income_type"] == "gig_multi_platform" else random.randint(10, 30)
                splits = np.random.dirichlet(np.ones(num_credits)) * monthly_income
                for split in splits:
                    txns.append({
                        "transaction_id": f"TXN{txn_id:07d}", "customer_id": row["customer_id"], "date": (START_DATE + timedelta(days=m*30 + random.randint(0, 28))).strftime("%Y-%m-%d"), "amount": int(split), "type": "credit", "category": "upi_pos_credit"
                    })
                    txn_id += 1
                    
            # 2. Debits: Existing EMI
            emi_amount = int(monthly_income * row["existing_emi_ratio"])
            if emi_amount > 0:
                is_bounce = random.random() < row["bounce_prob"]
                cat = "existing_emi_bounced" if is_bounce else "existing_emi"
                txns.append({
                    "transaction_id": f"TXN{txn_id:07d}", "customer_id": row["customer_id"], "date": (START_DATE + timedelta(days=m*30 + 5)).strftime("%Y-%m-%d"), "amount": emi_amount, "type": "debit", "category": cat
                })
                txn_id += 1
            
            # 3. Debits: Expenses
            expense_total = int(monthly_income * row["expense_ratio"])
            expense_cats = ["rent", "utilities", "groceries", "discretionary", "fuel", "insurance"]
            exp_splits = np.random.dirichlet(np.ones(len(expense_cats))) * expense_total
            for cat, amt in zip(expense_cats, exp_splits):
                if amt > 0:
                    txns.append({
                        "transaction_id": f"TXN{txn_id:07d}", "customer_id": row["customer_id"], "date": (START_DATE + timedelta(days=m*30 + random.randint(1, 28))).strftime("%Y-%m-%d"), "amount": int(amt), "type": "debit", "category": cat
                    })
                    txn_id += 1
                    
            # 4. Debits: Savings
            savings_amt = int(monthly_income * row["savings_rate"])
            if savings_amt > 0:
                txns.append({
                    "transaction_id": f"TXN{txn_id:07d}", "customer_id": row["customer_id"], "date": (START_DATE + timedelta(days=m*30 + 2)).strftime("%Y-%m-%d"), "amount": savings_amt, "type": "debit", "category": "savings_transfer"
                })
                txn_id += 1
                
    return pd.DataFrame(txns)

def get_random_date_recency_biased():
    days_total = MONTHS * 30
    progress = np.random.beta(3, 1.5)
    days_forward = int(days_total * progress)
    # limit to avoid overflowing END_DATE
    days_forward = min(days_forward, days_total - 1)
    return START_DATE + timedelta(days=days_forward)

def generate_events(customers_df):
    events = []
    event_id = 1
    
    for _, row in customers_df.iterrows():
        num_calc = sample_int_range(row["calculator_use_range"])
        for _ in range(num_calc):
            events.append({
                "event_id": f"EVT{event_id:06d}", "customer_id": row["customer_id"], "date": get_random_date_recency_biased().strftime("%Y-%m-%d"), "event_type": "emi_calculator_used"
            })
            event_id += 1
            
        num_views = sample_int_range(row["loan_page_visit_range"])
        for _ in range(num_views):
            events.append({
                "event_id": f"EVT{event_id:06d}", "customer_id": row["customer_id"], "date": get_random_date_recency_biased().strftime("%Y-%m-%d"), "event_type": "loan_product_page_view"
            })
            event_id += 1
            
        num_logins = get_app_login_count(row["engagement_level"])
        for _ in range(num_logins):
            events.append({
                "event_id": f"EVT{event_id:06d}", "customer_id": row["customer_id"], "date": get_random_date_recency_biased().strftime("%Y-%m-%d"), "event_type": "app_login"
            })
            event_id += 1
            
        if random.random() < row["past_offer_response_prob"]:
            events.append({
                "event_id": f"EVT{event_id:06d}", "customer_id": row["customer_id"], "date": get_random_date_recency_biased().strftime("%Y-%m-%d"), "event_type": "past_offer_responded"
            })
            event_id += 1
            
        if row["engagement_level"] in ["medium", "medium_high", "high"]:
            if random.random() < 0.12:
                events.append({
                    "event_id": f"EVT{event_id:06d}", "customer_id": row["customer_id"], "date": get_random_date_recency_biased().strftime("%Y-%m-%d"), "event_type": "application_abandoned"
                })
                event_id += 1

    return pd.DataFrame(events)

if __name__ == "__main__":
    os.makedirs("data", exist_ok=True)
    
    print("Generating customers...")
    customers_df = generate_customers()
    
    print("Generating transactions...")
    txns_df = generate_transactions(customers_df)
    
    print("Generating behavioral events...")
    events_df = generate_events(customers_df)
    
    cols_to_save = [
        "customer_id", "name", "age", "city", "city_tier", "persona", 
        "declared_monthly_income", "income_type", "existing_emi_ratio", 
        "expense_ratio", "savings_rate", "bounce_prob", "credit_score", 
        "thin_file", "engagement_level"
    ]
    customers_df[cols_to_save].to_csv("data/customers.csv", index=False)
    txns_df.to_csv("data/transactions.csv", index=False)
    events_df.to_csv("data/behavioral_events.csv", index=False)
    
    print("Done!")
    print(f"Customers: {len(customers_df)}")
    print(f"Transactions: {len(txns_df)}")
    print(f"Events: {len(events_df)}")
    
    print("\nPersona Distribution:")
    dist = customers_df["persona"].value_counts(normalize=True)
    for p, perc in dist.items():
        print(f"  {p}: {perc:.3f} (target ~ {PERSONAS[p]['weight']:.3f})")
