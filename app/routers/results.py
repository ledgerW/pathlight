from typing import List, Optional
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
        existing_result.summary = result.summary
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
    
    # Get result for this user
    statement = select(Result).where(Result.user_id == user_id)
    result = session.exec(statement).first()
    
    if not result:
        raise HTTPException(status_code=404, detail="Result not found")
    
    return {"summary": result.summary}

@router.get("/{user_id}/full", response_model=dict)
def get_full_result(user_id: uuid.UUID, session: Session = Depends(get_session)):
    # Check if user exists
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if user has paid
    if not user.payment_complete:
        raise HTTPException(
            status_code=403, 
            detail="Payment required to access full results"
        )
    
    # Get result for this user
    statement = select(Result).where(Result.user_id == user_id)
    result = session.exec(statement).first()
    
    if not result:
        raise HTTPException(status_code=404, detail="Result not found")
    
    return {"full_plan": result.full_plan}
