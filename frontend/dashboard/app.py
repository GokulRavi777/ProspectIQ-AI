import streamlit as st
import requests
import pandas as pd
import json

API_URL = "http://127.0.0.1:8000"

st.set_page_config(page_title="ProspectIQ", layout="wide", initial_sidebar_state="expanded")

# Custom CSS for navy/teal/gold bank-appropriate palette
st.markdown("""
<style>
    :root {
        --primary-navy: #0B2447;
        --secondary-teal: #19376D;
        --accent-gold: #FFD700;
        --light-bg: #F0F4F8;
    }
    
    .stApp {
        background-color: var(--light-bg);
    }
    
    .kpi-card {
        background: linear-gradient(135deg, var(--primary-navy), var(--secondary-teal));
        color: white;
        padding: 20px;
        border-radius: 10px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        text-align: center;
        border-bottom: 4px solid var(--accent-gold);
        margin-bottom: 20px;
    }
    .kpi-value {
        font-size: 2rem;
        font-weight: bold;
        color: var(--accent-gold);
    }
    .kpi-label {
        font-size: 0.9rem;
        text-transform: uppercase;
        letter-spacing: 1px;
    }
    
    .tier-Hot {
        background-color: #FF4B4B;
        color: white;
        padding: 4px 12px;
        border-radius: 12px;
        font-weight: bold;
    }
    .tier-Warm {
        background-color: #FFA500;
        color: white;
        padding: 4px 12px;
        border-radius: 12px;
        font-weight: bold;
    }
    .tier-Cold {
        background-color: #808080;
        color: white;
        padding: 4px 12px;
        border-radius: 12px;
        font-weight: bold;
    }
    
    .factor-positive {
        color: #28a745;
        font-weight: bold;
    }
    .factor-negative {
        color: #dc3545;
        font-weight: bold;
    }
</style>
""", unsafe_allow_html=True)

def render_kpis():
    try:
        res = requests.get(f"{API_URL}/metrics")
        res.raise_for_status()
        metrics = res.json()
        
        c1, c2, c3, c4 = st.columns(4)
        with c1:
            st.markdown(f'<div class="kpi-card"><div class="kpi-value">{metrics["conversion_lift_multiple"]}x</div><div class="kpi-label">Conversion Lift</div></div>', unsafe_allow_html=True)
        with c2:
            st.markdown(f'<div class="kpi-card"><div class="kpi-value">{metrics["total_leads_scored"]}</div><div class="kpi-label">Leads Scored</div></div>', unsafe_allow_html=True)
        with c3:
            st.markdown(f'<div class="kpi-card"><div class="kpi-value">{metrics["thin_file_coverage_pct"] * 100:.1f}%</div><div class="kpi-label">Thin-File Coverage</div></div>', unsafe_allow_html=True)
        with c4:
            st.markdown(f'<div class="kpi-card"><div class="kpi-value">{metrics["avg_repayment_capacity_score"]:.1f}</div><div class="kpi-label">Avg Repayment Score</div></div>', unsafe_allow_html=True)
    except Exception as e:
        st.error(f"Failed to load metrics. Is the backend running? ({str(e)})")

def render_leads():
    st.subheader("Scored Leads")
    
    with st.sidebar:
        st.header("Filters")
        tier_filter = st.selectbox("Tier", ["All", "Hot", "Warm", "Cold"])
        product_filter = st.selectbox("Product", ["All", "Personal Loan", "Home Loan", "Mortgage Loan", "Auto Loan"])
        thin_file_filter = st.radio("Thin File Status", ["All", "Yes", "No"])
        
    params = {}
    if tier_filter != "All":
        params["tier"] = tier_filter
    if product_filter != "All":
        params["product"] = product_filter
    if thin_file_filter != "All":
        params["thin_file"] = "true" if thin_file_filter == "Yes" else "false"
        
    try:
        res = requests.get(f"{API_URL}/leads", params=params)
        res.raise_for_status()
        leads = res.json()
        
        if not leads:
            st.info("No leads found matching criteria.")
            return

        for lead in leads:
            with st.expander(f"{lead['name']} ({lead['customer_id']})"):
                c1, c2, c3 = st.columns(3)
                with c1:
                    st.markdown(f"<span class='tier-{lead['tier']}'>{lead['tier']} Tier</span>", unsafe_allow_html=True)
                    st.write(f"**Persona:** {lead['persona_label']}")
                    st.write(f"**Thin File:** {'Yes' if lead['thin_file'] else 'No'}")
                with c2:
                    st.write("**Repayment Capacity (RCS):**")
                    st.progress(int(lead['repayment_capacity_score']))
                    st.write("**Conversion Propensity (CPS):**")
                    st.progress(int(lead['conversion_propensity_score']))
                with c3:
                    st.write("**Recommended Product:**")
                    st.write(f"{lead['recommended_product']}")
                    st.write(f"**Eligible Amount:** ₹{lead['eligible_loan_amount']:,}")
                
                st.divider()
                st.write("#### AI Explanation")
                st.info(lead['explanation_text'])
                st.write("**Top Factors:**")
                for factor in lead['top_factors']:
                    icon = "✅" if factor['impact'] == "positive" else "⚠️"
                    color = "factor-positive" if factor['impact'] == "positive" else "factor-negative"
                    st.markdown(f"<span class='{color}'>{icon} {factor['factor']}</span>", unsafe_allow_html=True)
                    
    except Exception as e:
        st.error(f"Failed to load leads: {str(e)}")

def render_simulate():
    st.subheader("Live Simulate New Customer")
    
    with st.form("simulate_form"):
        c1, c2 = st.columns(2)
        with c1:
            income = st.number_input("Monthly Income", min_value=0, value=50000, step=5000)
            income_type = st.selectbox("Income Type", ["Salaried", "Self-Employed", "Business"])
        with c2:
            existing_emi = st.number_input("Existing EMI", min_value=0, value=10000, step=1000)
            calc_visits = st.number_input("Recent Calculator Visits", min_value=0, value=2)
            
        submitted = st.form_submit_button("Simulate Score", type="primary")
        
        if submitted:
            payload = {
                "monthly_income": income,
                "income_type": income_type,
                "existing_emi": existing_emi,
                "recent_calculator_visits": calc_visits
            }
            
            try:
                res = requests.post(f"{API_URL}/simulate", json=payload)
                res.raise_for_status()
                lead = res.json()
                
                st.success("Simulation Complete!")
                st.write("### Result")
                c_res1, c_res2 = st.columns(2)
                with c_res1:
                    st.markdown(f"<span class='tier-{lead['tier']}'>{lead['tier']} Tier</span>", unsafe_allow_html=True)
                    st.write(f"**Recommended Product:** {lead['recommended_product']}")
                    st.write(f"**Eligible Amount:** ₹{lead['eligible_loan_amount']:,}")
                with c_res2:
                    st.write("**RCS:**")
                    st.progress(int(lead['repayment_capacity_score']))
                    st.write("**CPS:**")
                    st.progress(int(lead['conversion_propensity_score']))
                    
                st.info(lead['explanation_text'])
                st.write("**Top Factors:**")
                for factor in lead['top_factors']:
                    icon = "✅" if factor['impact'] == "positive" else "⚠️"
                    color = "factor-positive" if factor['impact'] == "positive" else "factor-negative"
                    st.markdown(f"<span class='{color}'>{icon} {factor['factor']}</span>", unsafe_allow_html=True)
                    
            except Exception as e:
                st.error(f"Simulation failed: {str(e)}")


def main():
    st.title("ProspectIQ — AI Lead Intelligence")
    render_kpis()
    
    tab1, tab2 = st.tabs(["Dashboard", "Simulate"])
    with tab1:
        render_leads()
    with tab2:
        render_simulate()

if __name__ == "__main__":
    main()
