# ProspectIQ — IDBI Innovate 2026

AI-powered lead intelligence for retail lending. Dual-score engine (Repayment
Capacity Score + Conversion Propensity Score) that identifies and explains
high-quality loan prospects — including customers traditional bureau-only
scoring misses (self-employed, gig workers, thin-file applicants).

**Problem Statement 2: Prospect Assist AI**

## Repo structure

```
prospectiq/
├── ml/                          <- Dev A (ML) owns this
│   ├── personas.py
│   ├── generate_data.py
│   ├── features.py
│   ├── train_models.py
│   ├── score_engine.py          <- exposes score_customer(), score_batch()
│   ├── data/
│   │   ├── scored_leads.json    <- THE HANDOFF FILE (committed, dummy data until real model runs)
│   │   └── metrics.json         <- headline KPIs for dashboard (dummy until real backtest)
│   └── models/                  <- saved model files (gitignored)
│
├── backend/                     <- Dev B owns this
│   ├── main.py                  <- FastAPI app
│   ├── routes/
│   │   ├── leads.py
│   │   ├── simulate.py
│   │   └── metrics.py
│   └── schemas.py               <- pydantic models matching shared/lead_schema.json
│
├── frontend/                    <- Dev B owns this (dashboard)
│   └── dashboard/
│
├── shared/
│   └── lead_schema.json         <- THE CONTRACT. Do not edit unilaterally.
│
└── README.md
```

## Branch workflow

- `main` — stable, integration points only
- `dev-ml` — Dev A's working branch
- `dev-backend` — Dev B's working branch

Merge `dev-ml` → `main` and `dev-backend` → `main` at agreed checkpoints.
Never merge the two feature branches directly into each other.

## Getting started

```bash
git clone https://github.com/GokulRavi777/ProspectIQ-AI.git
cd ProspectIQ-AI

# Set up the Python virtual environment
python -m venv venv
venv\Scripts\activate       # Windows
# source venv/bin/activate  # Mac/Linux

git checkout dev-ml       # or dev-backend
```

Dev B can start building immediately against `ml/data/scored_leads.json`
and `ml/data/metrics.json` (dummy data matching the real schema) without
waiting for Dev A's models to be trained. Swap dummy → real output at
checkpoint 1.

## The one rule

Nobody edits `shared/lead_schema.json` alone. If a field needs to change,
message the other dev first — a silent schema change is the most common way
parallel work breaks at merge time.
