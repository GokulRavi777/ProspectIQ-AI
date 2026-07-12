from fastapi import APIRouter, HTTPException, Request, Query
from typing import Optional, List
from schemas import Lead

router = APIRouter(prefix="/leads", tags=["Leads"])

@router.get("", response_model=List[Lead])
def get_leads(
    request: Request,
    tier: Optional[str] = Query(None, description="Filter by tier (e.g., Hot, Warm, Cold)"),
    product: Optional[str] = Query(None, description="Filter by recommended product"),
    thin_file: Optional[bool] = Query(None, description="Filter by thin file status")
):
    leads = request.app.state.leads

    # Sort leads by combined score descending
    leads = sorted(
        leads,
        key=lambda x: x.repayment_capacity_score + x.conversion_propensity_score,
        reverse=True
    )

    if tier:
        leads = [lead for lead in leads if lead.tier == tier]
    if product:
        leads = [lead for lead in leads if lead.recommended_product == product]
    if thin_file is not None:
        leads = [lead for lead in leads if lead.thin_file == thin_file]
        
    return leads

@router.get("/{customer_id}", response_model=Lead)
def get_lead(request: Request, customer_id: str):
    leads = request.app.state.leads
    for lead in leads:
        if lead.customer_id == customer_id:
            return lead
    raise HTTPException(status_code=404, detail="Lead not found")
