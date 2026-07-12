# ProspectIQ — Dev B (dev-backend) Build Instructions

**Branch:** `dev-backend` | **Owns:** `backend/` and `frontend/` folders |
**Do not touch:** `ml/` (except reading its `data/*.json` output files)

You can start immediately — `ml/data/scored_leads.json` and
`ml/data/metrics.json` already exist with realistic dummy data matching the
real schema. Build everything against these; swap to real data at
Checkpoint 1 with zero code changes (same schema).

---

## Phase 0 — Setup

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install fastapi uvicorn pydantic
```

Read `shared/lead_schema.json` first — every response your API returns must
match it exactly.

---

## Phase 1 — Pydantic schemas (`backend/schemas.py`)

Translate `shared/lead_schema.json` into pydantic models:

```python
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
```

**Checkpoint:** models import cleanly, match the JSON structure exactly
(load `ml/data/scored_leads.json` and validate the first record parses
into `Lead` without error).

---

## Phase 2 — FastAPI app skeleton (`backend/main.py`)

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="ProspectIQ API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # fine for hackathon demo, tighten if time allows
    allow_methods=["*"],
    allow_headers=["*"],
)

# include routers from routes/ here
```

Load `ml/data/scored_leads.json` and `ml/data/metrics.json` into memory
**once at startup** (not per-request) — this is what makes the dashboard
fast and demo-safe with no live inference dependency for the main view.

**Checkpoint:** `uvicorn main:app --reload`, confirm it starts without
errors, visit `/docs` (FastAPI's auto-generated Swagger UI) to see the
skeleton.

---

## Phase 3 — Core endpoints (`backend/routes/leads.py`, `metrics.py`)

### `GET /leads`
Returns the full ranked list (already sorted by Dev A, or sort here by
`repayment_capacity_score + conversion_propensity_score` descending).
Support optional query params: `?tier=Hot`, `?product=Home Loan`,
`?thin_file=true` for filtering — useful for the dashboard's filter UI and
for demoing the thin-file differentiator live.

### `GET /leads/{customer_id}`
Returns a single lead record, 404 if not found.

### `GET /metrics`
Returns the metrics object as-is from `ml/data/metrics.json`.

**Checkpoint:** hit all three endpoints via `/docs` or curl, confirm
responses match the `Lead`/`Metrics` schemas exactly, filtering works.

---

## Phase 4 — Simulate endpoint (`backend/routes/simulate.py`)

**This is the integration risk point — coordinate directly with Dev A when
you reach this phase, don't build it in isolation.**

```python
@router.post("/simulate")
def simulate_lead(customer_input: SimulateInput) -> Lead:
    # calls ml.score_engine.score_customer(customer_input.dict())
    # returns a Lead matching the schema
```

Agree with Dev A on the exact shape of `SimulateInput` — likely something
simple for a live demo form: monthly income, income type (dropdown),
existing EMI amount, recent calculator/page-visit counts. Keep the input
form SHORT (5-8 fields max) — this is a live demo interaction, not a full
application form.

If Dev A's `score_customer()` isn't ready yet, stub this endpoint to return
a realistic-looking fake response matching the schema, so the dashboard's
simulate UI can be built and tested independently. Swap the stub for the
real call once Dev A's function is ready.

**Checkpoint:** `/simulate` returns a valid `Lead` object for a test input,
either from the real scoring engine or a stub — dashboard doesn't care
which, as long as the shape is right.

---

## Phase 5 — Dashboard (`frontend/dashboard/`)

**Recommendation: Streamlit** for speed (single Python file, no separate
build step, fast to iterate) unless your team is significantly stronger in
React and has time to spare. Streamlit gets you a professional-looking
result fastest for a hackathon timeline.

```bash
pip install streamlit requests pandas
```

Build in this order:

### 5a. KPI strip (top of page)
Pull from `/metrics`. Show 3-4 hero numbers as large stat cards:
conversion lift multiple, total leads scored, thin-file coverage %,
avg repayment confidence. Use a clean 2-3 color palette (navy/teal/gold —
bank-appropriate), not default Streamlit rainbow.

### 5b. Ranked lead table
Pull from `/leads`. Display as cards or a styled table:
- Tier as a colored badge (Hot = red/orange, Warm = amber, Cold = grey-blue)
- RCS and CPS as small gauge/progress bars, not raw numbers alone
- Recommended product + eligible amount
- Filter controls: tier, product, thin-file toggle (wire to the query
  params from Phase 3)

### 5c. Lead detail panel
Click/select a lead → show `top_factors` as horizontal bars (positive =
one color, negative = another) + `explanation_text` prominently displayed.
This is the "why should I trust this AI" moment for judges — make it clean
and readable, not a dense data dump.

### 5d. Live simulate widget
A short input form (5-8 fields per Phase 4) → POST to `/simulate` → display
the returned score with the same visual treatment as 5c, live, no page
reload. **This is your single most important demo interaction** — spend
disproportionate polish time here.

**Checkpoint:** full dashboard runs end-to-end against real backend
endpoints, all 4 sections working, visually clean (no default Streamlit
gray boxes everywhere — add custom CSS via `st.markdown` if needed for a
more polished look).

---

## Phase 6 — Demo resilience

- Add try/except around all API calls in the dashboard with a graceful
  fallback message, not a stack trace, if something fails mid-demo
- Test the full flow on a fresh `git clone` to make sure there's no
  hidden local-only dependency
- Take screenshots of the working dashboard once stable — needed for
  Slide 6 and Slide 10 of the pitch deck
- Optional but recommended: record a 60-90 second backup screen recording
  of the full demo flow in case live wifi/API fails during judging

---

## Sync points with Dev A

- **Checkpoint 1**: Dev A pushes real `scored_leads.json` + `metrics.json`
  to `dev-ml` → merge both branches into `main` → pull `main`, confirm
  dashboard now shows real numbers with zero code changes
- **Checkpoint 2**: wire `/simulate` to the real `score_customer()` function
  together — this is the one place to actively pair rather than work solo
- **Final hour**: joint rehearsal of the full demo flow, screenshot capture
  for the deck, fix any last visual issues

---

## What NOT to do

- Don't touch anything in `ml/` except reading its `data/*.json` files
- Don't edit `shared/lead_schema.json` without messaging Dev A first
- Don't build the simulate endpoint's live-scoring logic yourself — that's
  Dev A's function, backend just calls it
- Don't over-invest in auth/deployment infra — local demo + screenshots is
  the target, not a production deployment
