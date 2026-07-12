from fastapi import APIRouter, Request, HTTPException
from schemas import Metrics

router = APIRouter(prefix="/metrics", tags=["Metrics"])

@router.get("", response_model=Metrics)
def get_metrics(request: Request):
    metrics = request.app.state.metrics
    if not metrics:
        raise HTTPException(status_code=404, detail="Metrics not found")
    return metrics
