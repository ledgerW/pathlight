from typing import List, Optional, Dict
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from app.models import Result, User, FormResponse, get_session
import uuid
from datetime import datetime

router = APIRouter(
    prefix="/api/results",
    tags=["results"],
)

@router.post("/", response_model=Result)
def create_result(result: Result, session: Session = Depends(get_session)):
    # Check if user exists
    user = session.get(User, result.user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if result already exists for this user
    statement = select(Result).where(Result.user_id == result.user_id)
    existing_result = session.exec(statement).first()
    
    # If result exists, update it
    if existing_result:
        existing_result.basic_plan = result.basic_plan
        existing_result.full_plan = result.full_plan
        session.add(existing_result)
        session.commit()
        session.refresh(existing_result)
        return existing_result
    
    # Otherwise create new result
    session.add(result)
    session.commit()
    session.refresh(result)
    return result

@router.get("/{user_id}", response_model=Result)
def get_result(user_id: uuid.UUID, session: Session = Depends(get_session)):
    # Check if user exists
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get result for this user
    statement = select(Result).where(Result.user_id == user_id)
    result = session.exec(statement).first()
    
    if not result:
        raise HTTPException(status_code=404, detail="Result not found")
    
    return result

@router.get("/{user_id}/summary", response_model=dict)
def get_result_summary(user_id: uuid.UUID, session: Session = Depends(get_session)):
    # Check if user exists
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if user has at least basic tier
    if user.payment_tier == "none":
        raise HTTPException(
            status_code=403, 
            detail="Basic payment required to access summary results"
        )
    
    # Get result for this user
    statement = select(Result).where(Result.user_id == user_id)
    result = session.exec(statement).first()
    
    if not result:
        raise HTTPException(status_code=404, detail="Result not found")
    
    # Parse the basic plan JSON
    import json
    try:
        basic_plan = json.loads(result.basic_plan)
    except (json.JSONDecodeError, TypeError):
        # Handle case where basic_plan is not valid JSON
        basic_plan = {"purpose": "", "mantra": ""}
    
    # If user has premium access and full plan is available, use the purpose and mantra from there
    from app.routers.payments.payment_utils import has_premium_access
    full_plan = {}
    if has_premium_access(user) and result.full_plan:
        try:
            full_plan = json.loads(result.full_plan)
            # Use premium content if available
            purpose = full_plan.get("purpose", basic_plan.get("purpose", ""))
            mantra = full_plan.get("mantra", basic_plan.get("mantra", ""))
        except (json.JSONDecodeError, TypeError):
            # Fall back to basic plan if full plan parsing fails
            purpose = basic_plan.get("purpose", "")
            mantra = basic_plan.get("mantra", "")
    else:
        # Use basic plan content
        purpose = basic_plan.get("purpose", "")
        mantra = basic_plan.get("mantra", "")
    
    return {
        "summary": purpose,
        "mantra": mantra,
        "basic_plan": basic_plan,
        "full_plan": full_plan if full_plan else {},
        "payment_tier": user.payment_tier
    }

@router.get("/{user_id}/full", response_model=dict)
def get_full_result(user_id: uuid.UUID, session: Session = Depends(get_session)):
    # Check if user exists
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if user has premium access (handles canceled subscriptions properly)
    from app.routers.payments.payment_utils import has_premium_access
    if not has_premium_access(user):
        raise HTTPException(
            status_code=403, 
            detail="Plan, Premium or Pursuit tier required to access full results"
        )
    
    # Get result for this user
    statement = select(Result).where(Result.user_id == user_id)
    result = session.exec(statement).first()
    
    if not result:
        raise HTTPException(status_code=404, detail="Result not found")
    
    # Parse the basic and full plan JSON
    import json
    try:
        basic_plan = json.loads(result.basic_plan)
    except (json.JSONDecodeError, TypeError):
        # Handle case where basic_plan is not valid JSON
        basic_plan = {"purpose": "", "mantra": ""}
    
    try:
        full_plan_json = json.loads(result.full_plan)
    except (json.JSONDecodeError, TypeError):
        # Handle case where full_plan is not valid JSON
        full_plan_json = {}
    
    # Structure the full plan data for better frontend display
    structured_full_plan = {
        "purpose": full_plan_json.get("purpose", ""),
        "mantra": full_plan_json.get("mantra", ""),
        "next_steps": full_plan_json.get("next_steps", ""),
        "daily_plan": full_plan_json.get("daily_plan", ""),
        "obstacles": full_plan_json.get("obstacles", "")
    }
    
    return {
        "summary": structured_full_plan.get("purpose", basic_plan.get("purpose", "")),
        "mantra": structured_full_plan.get("mantra", basic_plan.get("mantra", "")),
        "basic_plan": basic_plan,
        "full_plan": structured_full_plan,
        "payment_tier": user.payment_tier
    }

@router.get("/{user_id}/check-results", response_model=Dict)
def check_results(user_id: uuid.UUID, session: Session = Depends(get_session)):
    """Check if results exist for a user and when they were last generated"""
    # Check if user exists
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if results exist for this user
    statement = select(Result).where(Result.user_id == user_id)
    result = session.exec(statement).first()
    
    if result and result.basic_plan:
        # Format the last generated timestamp
        last_generated = result.last_generated_at.strftime("%Y-%m-%d %H:%M:%S")
        
        return {
            "has_results": True,
            "payment_tier": user.payment_tier,
            "last_generated_at": last_generated,
            "regeneration_count": result.regeneration_count
        }
    
    return {
        "has_results": False,
        "payment_tier": user.payment_tier,
        "last_generated_at": None,
        "regeneration_count": 0
    }
