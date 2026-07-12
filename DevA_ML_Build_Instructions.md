# ProspectIQ — Dev A (dev-ml) Build Instructions

**Branch:** `dev-ml` | **Owns:** `ml/` folder only | **Do not touch:** `backend/`, `frontend/`

Work through phases in order. Commit after each phase completes and runs
without errors. Push to `dev-ml` regularly (every 20-30 min of work).

---

## Phase 0 — Setup

```bash
cd ml
python -m venv .venv
.venv\Scripts\activate        # Windows
pip install pandas numpy scikit-learn
```

Confirm the contract file `shared/lead_schema.json` is present and read it
before writing any code — every output field your engine produces must match
that schema exactly (field names, types, enums).

---

## Phase 1 — Persona definitions (`ml/personas.py`)

Create 8 realistic Indian retail banking customer personas as a Python dict,
each with distributions (not fixed values) for:

- `monthly_income_range`, `income_volatility`, `income_type` (one of:
  `fixed_salary`, `variable_salary`, `business_upi`, `gig_multi_platform`)
- `existing_emi_ratio_range`, `expense_ratio_range`, `savings_rate_range`
- `bounce_prob` (probability of a bounced EMI/cheque per month)
- `engagement_level` (`none`/`low`/`medium`/`medium_high`/`high`)
- `calculator_use_range`, `loan_page_visit_range`, `past_offer_response_prob`
- `credit_score_range` (set to `(0,0)` or add `thin_file_prob` for personas
  with no/thin bureau file — this is required, not optional, for at least 2
  personas)

**Required personas (all 8):**
1. Salaried - Stable (IT/PSU) — low volatility, decent credit score
2. Salaried - Variable (Sales/Incentive-based) — medium volatility
3. Self-Employed - Thriving — UPI/business income, good repayment
4. Self-Employed - Struggling — high expense ratio, high bounce prob
5. Gig Worker (Delivery/Freelance) — multi-platform income, `thin_file_prob` ~0.5-0.6
6. Young Professional - New to Credit — high savings, `thin_file_prob` ~0.8+
7. Over-Leveraged Customer — decent income but high existing EMI ratio (0.45-0.70)
8. Dormant/Uninterested — any income level, near-zero engagement

Also define `LOAN_PRODUCTS = ["Personal Loan", "Home Loan", "Mortgage Loan", "Auto Loan"]`
and a fixed `RANDOM_SEED` for reproducibility.

**Checkpoint:** file imports cleanly, personas dict has all 8 keys with
weights summing to 1.0.

---

## Phase 2 — Data generator (`ml/generate_data.py`)

Generate three datasets for **1,000 synthetic customers**, ~6 months of
history each:

### `customers.csv` (1 row per customer)
Sample a persona per customer (weighted), derive: customer_id, name, age,
city/city_tier, persona, declared_monthly_income, income_type,
income_volatility, existing_emi_ratio, expense_ratio, savings_rate,
bounce_prob, credit_score (None if thin-file), thin_file flag,
engagement_level.

### `transactions.csv`
Per customer per month, generate:
- Income credits matching their `income_type` (single salary credit for
  fixed_salary; fixed+variable split for variable_salary; many small
  UPI/POS credits summing to target for business_upi/gig_multi_platform)
- Existing EMI debit (amount = income × existing_emi_ratio), flagged
  `existing_emi_bounced` at `bounce_prob` rate
- Expense debits (rent, utilities, groceries, discretionary, fuel,
  insurance) summing to income × expense_ratio
- Savings/RD transfer debit = income × savings_rate

### `behavioral_events.csv`
Per customer, generate events across the 6-month window, **recency-biased**
(use `np.random.beta(3, 1.5)` or similar to skew event timing toward more
recent days — this matters for the intent signal later):
- `emi_calculator_used` (count from persona's `calculator_use_range`)
- `loan_product_page_view` (count from `loan_page_visit_range`)
- `app_login` (frequency mapped from `engagement_level`)
- `past_offer_responded` (probabilistic, from `past_offer_response_prob`)
- `application_abandoned` (only for medium+ engagement personas, ~12% chance)

**Checkpoint:** run the script, confirm 3 CSVs are created in `ml/data/`,
row counts are sane (~1000 customers, ~100K+ transaction rows, tens of
thousands of event rows), print persona distribution and sanity-check it
roughly matches your defined weights.

---

## Phase 3 — Feature engineering + ground truth (`ml/features.py`)

For each customer, compute from their transaction/event history:

**Repayment features (feed RCS):**
- `actual_monthly_income` = avg monthly credits (this is the key value —
  compare against `declared_monthly_income` in your pitch to show the
  "actual vs declared" insight)
- `monthly_emi_obligation` = avg monthly EMI debits
- `foir` = monthly_emi_obligation / actual_monthly_income
- `income_volatility_actual` = coefficient of variation of monthly income
- `savings_rate_actual` = avg monthly savings debit / actual_monthly_income
- `n_emi_bounces` = count of `existing_emi_bounced` transactions

**Engagement features (feed CPS):**
- `n_calculator_uses`, `n_page_visits`, `n_logins` (total counts)
- `recency_weighted_engagement` = events in last 30 days weighted 2x
- `responded_to_past_offer` (bool), `abandoned_application` (bool)

**Ground truth formula (write this exactly — it's your "we understand
banking" credibility anchor for the pitch, so keep it transparent and
document it in comments):**

```
foir_score        = clip(100 - (foir * 180), 0, 100)
stability_score    = clip(100 - (income_volatility_actual * 120), 0, 100)
savings_score       = clip(savings_rate_actual * 300, 0, 100)
bounce_penalty      = min(n_emi_bounces * 15, 60)

RCS = clip(0.45*foir_score + 0.30*stability_score + 0.25*savings_score - bounce_penalty, 0, 100)

raw_engagement = n_calculator_uses*8 + n_page_visits*5 + n_logins*1.5
                 + recency_weighted_engagement
                 + (20 if responded_to_past_offer else 0)
                 + (15 if abandoned_application else 0)

CPS = clip(raw_engagement * 1.1, 0, 100)
```

Also compute:
- `recommended_product` — most-viewed product in behavioral events, else
  fallback by income bracket
- `eligible_loan_amount` — monthly surplus (income - EMI - expenses) × 36,
  rounded to nearest 1000
- `converted` (training label) — probabilistic function of RCS × CPS with
  noise, used only for model training, not shown in final output

**Checkpoint:** run on generated data, confirm RCS/CPS distributions look
reasonable (roughly spread 0-100, not clustered at extremes), print a
sample of 10 rows and sanity check the numbers make sense given the persona
(e.g., over-leveraged customers should score low RCS).

---

## Phase 4 — Train models (`ml/train_models.py`)

Two models, both scikit-learn `GradientBoostingRegressor` /
`GradientBoostingClassifier`:

1. **RCS model** — regression, predict `repayment_capacity_score` from
   features (foir, income_volatility_actual, savings_rate_actual,
   n_emi_bounces, actual_monthly_income, thin_file flag)
2. **CPS model** — could be regression on the CPS score directly, OR a
   classifier predicting `converted` if you want a cleaner precision/recall
   story for the pitch — **use the classifier for `converted`**, since that
   gives you the precision/recall/F1 numbers for Slide 11 of the deck.

Split 70/30 train/test. Save both models to `ml/models/` (gitignored,
regenerate locally). Print and save metrics to `ml/data/metrics.json`
**overwriting the dummy file** with real numbers:
- `model_precision`, `model_recall`, `model_f1` (classifier)
- RMSE/R² for the RCS regressor (add these fields if useful)
- `baseline_conversion_rate` (mean of `converted` in the training data,
  represents "everyone gets contacted" baseline)
- `prospectiq_conversion_rate` (precision @ top-K predicted leads — e.g.,
  actual conversion rate among leads your model ranks in the top 30%)
- `conversion_lift_multiple` = prospectiq_conversion_rate / baseline_conversion_rate
- `thin_file_customers_scored` / `thin_file_coverage_pct`

**Checkpoint:** real metrics printed and saved, numbers are defensible
(don't hand-tune to hit an arbitrary target — report what the model
actually achieves; if lift is only 2x not 4x, that's still a strong
number, use the real one).

---

## Phase 5 — Scoring engine (`ml/score_engine.py`)

This is **the file backend imports/calls**. Two functions:

```python
def score_customer(customer_features: dict) -> dict:
    """
    Takes raw customer input (income, transaction summary stats, or raw
    transaction list - decide the simplest interface for a live demo),
    runs feature engineering + both models, returns a dict matching
    shared/lead_schema.json exactly.
    """

def score_batch(customers_df) -> list[dict]:
    """
    Scores all customers, used to regenerate ml/data/scored_leads.json
    """
```

**Explainability (no SHAP needed — keep it simple and fast):**
For `top_factors`, compute each feature's normalized contribution to the
score using the same weighted formula from Phase 3 (e.g., if
`foir_score` contributed 0.45 × 90 = 40.5 out of the total RCS, that's your
biggest positive factor). Rank the 3-4 largest contributors, format as
`{"factor": "Low FOIR (18%)", "impact": "positive"}`.

**Plain-English explanation (`explanation_text`):** template-based, not an
LLM call (faster, zero dependency risk for live demo):

```python
def generate_explanation(rcs, cps, tier, top_factors, thin_file):
    # Template: "[Strong/Moderate/Limited] repayment capacity with
    # [top factor phrase]. [High/Rising/Low] intent signal from
    # [engagement summary]. Recommend [action] within [timeframe]."
```

**Checkpoint:** call `score_customer()` with a sample input, confirm output
JSON matches `shared/lead_schema.json` field-for-field. This is the most
important checkpoint in the whole ML phase — get this exact before moving on.

---

## Phase 6 — Regenerate the real handoff files

```bash
python generate_data.py      # if not already run
python train_models.py       # produces real ml/data/metrics.json
```

Write a small script (or add to `train_models.py`) that calls
`score_batch()` on all 1000 customers and overwrites
`ml/data/scored_leads.json` with real scored output, sorted by combined
RCS+CPS descending.

**Commit message:** `"Real model output: scored_leads.json + metrics.json replacing dummy data"`
**Push to `dev-ml`**, then message your teammate — this is Checkpoint 1,
time to merge into `main` and have backend swap dummy data for real.

---

## Phase 7 (stretch, if time remains) — Thin-file differentiator polish

Since this is your headline differentiator for the pitch: add a summary
stat function that reports "% of scored customers with no bureau file who
received a usable RCS score" vs. "% that would be unscoreable using
bureau-only methods" — this feeds directly into Slide 11 and Slide 3 (USP)
of the deck.

---

## What NOT to do

- Don't touch anything in `backend/` or `frontend/`
- Don't edit `shared/lead_schema.json` without messaging Dev B first
- Don't install SHAP or other heavy deps not already in the environment —
  the weighted-contribution explainability approach is intentional, keep it
  lightweight and fast for a live demo
- Don't hand-tune ground truth formulas to hit a specific target metric —
  report real backtested numbers, even if less dramatic than hoped
