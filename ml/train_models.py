import pandas as pd
import numpy as np
import json
import os
import joblib
from sklearn.model_selection import train_test_split
from sklearn.ensemble import GradientBoostingRegressor, GradientBoostingClassifier
from sklearn.metrics import precision_score, recall_score, f1_score, mean_squared_error, r2_score
import sys

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from personas import RANDOM_SEED

def train():
    os.makedirs("models", exist_ok=True)
    
    df = pd.read_csv("data/customer_features.csv")
    
    rcs_features = ["foir", "income_volatility_actual", "savings_rate_actual", "n_emi_bounces", "actual_monthly_income", "thin_file"]
    cps_features = rcs_features + ["repayment_capacity_score", "conversion_propensity_score"]
    
    train_df, test_df = train_test_split(df, test_size=0.3, random_state=RANDOM_SEED)
    
    # 1. Train RCS Regressor
    X_train_rcs = train_df[rcs_features]
    y_train_rcs = train_df["repayment_capacity_score"]
    
    rcs_model = GradientBoostingRegressor(random_state=RANDOM_SEED)
    rcs_model.fit(X_train_rcs, y_train_rcs)
    
    X_test_rcs = test_df[rcs_features]
    y_test_rcs = test_df["repayment_capacity_score"]
    rcs_preds = rcs_model.predict(X_test_rcs)
    rmse = np.sqrt(mean_squared_error(y_test_rcs, rcs_preds))
    r2 = r2_score(y_test_rcs, rcs_preds)
    print(f"RCS Model - RMSE: {rmse:.2f}, R2: {r2:.3f}")
    
    # 2. Train CPS Classifier
    X_train_cps = train_df[cps_features]
    y_train_cps = train_df["converted"]
    
    cps_model = GradientBoostingClassifier(random_state=RANDOM_SEED)
    cps_model.fit(X_train_cps, y_train_cps)
    
    X_test_cps = test_df[cps_features]
    y_test_cps = test_df["converted"]
    cps_preds = cps_model.predict(X_test_cps)
    cps_probs = cps_model.predict_proba(X_test_cps)[:, 1]
    
    precision = precision_score(y_test_cps, cps_preds)
    recall = recall_score(y_test_cps, cps_preds)
    f1 = f1_score(y_test_cps, cps_preds)
    print(f"CPS Classifier - Precision: {precision:.3f}, Recall: {recall:.3f}, F1: {f1:.3f}")
    
    # Save models
    joblib.dump(rcs_model, "models/rcs_model.pkl")
    joblib.dump(cps_model, "models/cps_model.pkl")
    
    # Metrics
    baseline_conversion_rate = float(train_df["converted"].mean())
    
    # Conversion rate in top 30% leads (ranked by pred probability)
    test_df_results = test_df.copy()
    test_df_results["pred_prob"] = cps_probs
    top_30_cutoff = int(len(test_df_results) * 0.3)
    top_30_leads = test_df_results.nlargest(top_30_cutoff, "pred_prob")
    prospectiq_conversion_rate = float(top_30_leads["converted"].mean())
    
    conversion_lift_multiple = prospectiq_conversion_rate / baseline_conversion_rate if baseline_conversion_rate > 0 else 0
    
    total_leads = len(df)
    combined_scores = df["repayment_capacity_score"] + df["conversion_propensity_score"]
    hot_leads = int(sum(combined_scores >= 150))
    warm_leads = int(sum((combined_scores >= 100) & (combined_scores < 150)))
    cold_leads = int(sum(combined_scores < 100))
    
    thin_file_count = int(df["thin_file"].sum())
    thin_file_pct = thin_file_count / total_leads if total_leads > 0 else 0
    
    avg_rcs = float(df["repayment_capacity_score"].mean())
    
    metrics = {
        "baseline_conversion_rate": round(baseline_conversion_rate, 4),
        "prospectiq_conversion_rate": round(prospectiq_conversion_rate, 4),
        "conversion_lift_multiple": round(conversion_lift_multiple, 2),
        "total_leads_scored": total_leads,
        "hot_leads_count": hot_leads,
        "warm_leads_count": warm_leads,
        "cold_leads_count": cold_leads,
        "thin_file_customers_scored": thin_file_count,
        "thin_file_coverage_pct": round(thin_file_pct, 4),
        "avg_repayment_capacity_score": round(avg_rcs, 2),
        "model_precision": round(float(precision), 4),
        "model_recall": round(float(recall), 4),
        "model_f1": round(float(f1), 4)
    }
    
    with open("data/metrics.json", "w") as f:
        json.dump(metrics, f, indent=2)
        
    print("\nReal metrics written to data/metrics.json:")
    print(json.dumps(metrics, indent=2))

if __name__ == "__main__":
    train()
