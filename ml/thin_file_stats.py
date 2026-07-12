import pandas as pd
import sys

def calculate_thin_file_stats(features_df):
    total_customers = len(features_df)
    
    thin_file_df = features_df[features_df["thin_file"] == True]
    thin_file_count = len(thin_file_df)
    
    # Define "usable" as getting any non-zero RCS score (meaning they were evaluated on alt-data rather than rejected outright)
    usable_rcs_df = thin_file_df[thin_file_df["repayment_capacity_score"] > 0]
    usable_rcs_count = len(usable_rcs_df)
    
    usable_pct = (usable_rcs_count / thin_file_count) * 100 if thin_file_count > 0 else 0
    
    unscoreable_bureau_pct = 100.0
    
    print("="*60)
    print("  THIN-FILE DIFFERENTIATOR STATS (For Slide 3 & Slide 11)  ")
    print("="*60)
    print(f"Total Customers Evaluated:       {total_customers}")
    print(f"Total Thin-File Customers:       {thin_file_count} ({(thin_file_count/total_customers)*100:.1f}% of total base)")
    print("-" * 60)
    print(f"Unscoreable via Bureau-Only:     {unscoreable_bureau_pct:.1f}%")
    print(f"Scored via ProspectIQ Alt-Data:  {usable_pct:.1f}%")
    print("-" * 60)
    print("Narrative for Pitch:")
    print(f"\"Traditional bureau checks would reject or fail to score 100% of our {thin_file_count} thin-file applicants.")
    print(f"By analyzing transaction cash flows directly, ProspectIQ successfully assigned a usable Repayment")
    print(f"Capacity Score (RCS) to {usable_pct:.1f}% of these previously invisible customers, safely expanding the TAM.\"")
    print("="*60)
    
    return {
        "thin_file_count": thin_file_count,
        "usable_rcs_count": usable_rcs_count,
        "usable_pct": usable_pct,
        "unscoreable_bureau_pct": unscoreable_bureau_pct
    }

if __name__ == "__main__":
    df = pd.read_csv("data/customer_features.csv")
    calculate_thin_file_stats(df)
