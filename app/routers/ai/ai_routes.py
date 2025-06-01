from typing import Dict
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlmodel import Session, select
from app.models import User, FormResponse, Result, get_session
import uuid
import json
from datetime import datetime
from app.prompts import get_zodiac_sign

from .ai_generation import generate_purpose, generate_plan

router = APIRouter()

@router.post("/{user_id}/generate-basic", response_model=Dict)
async def generate_basic_results(
    user_id: uuid.UUID, 
    request: Request,
    session: Session = Depends(get_session)
):
    """Generate basic results (summary and mantra) after answering the first 5 questions"""
    # Check if user exists
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get responses for this user
    statement = select(FormResponse).where(FormResponse.user_id == user_id).order_by(FormResponse.question_number)
    responses = session.exec(statement).all()
    
    # Check if user has answered at least 5 questions
    if not responses or len(responses) < 5:
        raise HTTPException(
            status_code=400, 
            detail=f"Incomplete responses. {len(responses)}/5 questions answered for basic results."
        )
    
    # Only use the first 5 questions for basic results
    first_five_responses = [r for r in responses if r.question_number <= 5]
    
    # Get user's zodiac sign
    zodiac_info = get_zodiac_sign(user.dob)
    
    try:
        # Generate purpose using the traceable function
        summary_output = generate_purpose(user, zodiac_info, first_five_responses)
        
        # Convert to JSON string for storage
        basic_plan_json = json.dumps(summary_output.model_dump())
        
        # Create or update result in database
        existing_result = session.exec(select(Result).where(Result.user_id == user_id)).first()
        
        if existing_result:
            # Update existing result
            existing_result.basic_plan = basic_plan_json
            existing_result.last_generated_at = datetime.utcnow()
            # Increment regeneration count if this is not the first generation
            if existing_result.basic_plan:
                existing_result.regeneration_count += 1
            session.add(existing_result)
        else:
            # Create new result with empty full_plan
            new_result = Result(
                user_id=user_id,
                basic_plan=basic_plan_json,
                full_plan="",  # Empty full plan until premium tier
                last_generated_at=datetime.utcnow()
            )
            session.add(new_result)
        
        session.commit()
        
        # Update user payment tier if not already set
        if user.payment_tier == "none":
            user.payment_tier = "basic"
            session.add(user)
            session.commit()
        
        # Check if this is a background request and pass the header back in the response
        is_background = request.headers.get('X-Background-Request') == 'true'
        
        response_data = {
            "success": True,
            "summary": summary_output.model_dump(),
            "message": "Basic results generated successfully"
        }
        
        # Create a Response object to be able to set headers
        from fastapi.responses import JSONResponse
        response = JSONResponse(content=response_data)
        
        # If this is a background request, set the header in the response
        if is_background:
            response.headers['X-Background-Request'] = 'true'
        
        return response
    
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error generating basic results: {str(e)}"
        )

@router.post("/{user_id}/generate-premium", response_model=Dict)
async def generate_premium_results(
    user_id: uuid.UUID, 
    request: Request,
    session: Session = Depends(get_session)
):
    """Generate premium results (full path and plan) after answering all 25 questions"""
    # Check if user exists
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if user has premium access (handles canceled subscriptions properly)
    from app.routers.payments.payment_utils import has_premium_access
    if not has_premium_access(user):
        raise HTTPException(
            status_code=403,
            detail="Premium or Pursuit tier required to generate full results"
        )
    
    # Get all responses for this user
    statement = select(FormResponse).where(FormResponse.user_id == user_id).order_by(FormResponse.question_number)
    responses = session.exec(statement).all()
    
    # Check if user has answered all 25 questions
    if not responses or len(responses) < 25:
        raise HTTPException(
            status_code=400, 
            detail=f"Incomplete responses. {len(responses)}/25 questions answered for premium results."
        )
    
    # Get user's zodiac sign
    zodiac_info = get_zodiac_sign(user.dob)
    
    try:
        # Get existing result to preserve basic plan
        existing_result = session.exec(select(Result).where(Result.user_id == user_id)).first()
        existing_basic_plan = existing_result.basic_plan if existing_result else None
        
        # Generate plan using the traceable function
        basic_plan_json, full_plan_output = generate_plan(user, zodiac_info, responses, existing_basic_plan)
        
        # Convert to JSON string for storage
        full_plan_json = json.dumps(full_plan_output.model_dump())
        
        # Create or update result in database
        if existing_result:
            # Update existing result
            existing_result.full_plan = full_plan_json
            existing_result.last_generated_at = datetime.utcnow()
            # Increment regeneration count if this is not the first generation
            if existing_result.full_plan:
                existing_result.regeneration_count += 1
            session.add(existing_result)
        else:
            # Create new result
            new_result = Result(
                user_id=user_id,
                basic_plan=basic_plan_json,
                full_plan=full_plan_json,
                last_generated_at=datetime.utcnow()
            )
            session.add(new_result)
        
        session.commit()
        
        # Check if this is a background request and pass the header back in the response
        is_background = request.headers.get('X-Background-Request') == 'true'
        
        response_data = {
            "success": True,
            "message": "Premium results generated successfully"
        }
        
        # Create a Response object to be able to set headers
        from fastapi.responses import JSONResponse
        response = JSONResponse(content=response_data)
        
        # If this is a background request, set the header in the response
        if is_background:
            response.headers['X-Background-Request'] = 'true'
        
        return response
    
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error generating premium results: {str(e)}"
        )
