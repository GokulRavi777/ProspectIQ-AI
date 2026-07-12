import json
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes import leads, metrics, simulate
from schemas import Lead, Metrics

app = FastAPI(title="ProspectIQ API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load data into memory
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "ml", "data")

def load_leads():
    try:
        with open(os.path.join(DATA_DIR, "scored_leads.json"), "r") as f:
            data = json.load(f)
            return [Lead(**item) for item in data]
    except FileNotFoundError:
        return []

def load_metrics():
    try:
        with open(os.path.join(DATA_DIR, "metrics.json"), "r") as f:
            data = json.load(f)
            return Metrics(**data)
    except FileNotFoundError:
        return None

app.state.leads = load_leads()
app.state.metrics = load_metrics()

app.include_router(leads.router)
app.include_router(metrics.router)
app.include_router(simulate.router)
