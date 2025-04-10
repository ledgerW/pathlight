from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from app.models import FormResponse, User, get_session
import uuid

router = APIRouter(
    prefix="/api/form-responses",
    tags=["form-responses"],
)

@router.post("/", response_model=FormResponse)
def create_form_response(form_response: FormResponse, session: Session = Depends(get_session)):
    # Check if user exists
    user = session.get(User, form_response.user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if response for this question already exists
    statement = select(FormResponse).where(
        FormResponse.user_id == form_response.user_id,
        FormResponse.question_number == form_response.question_number
    )
    existing_response = session.exec(statement).first()
    
    # If response exists, update it
    if existing_response:
        existing_response.response = form_response.response
        session.add(existing_response)
        session.commit()
        session.refresh(existing_response)
        return existing_response
    
    # Otherwise create new response
    session.add(form_response)
    session.commit()
    session.refresh(form_response)
    
    # Update user progress if this is a new highest question
    current_progress = int(user.progress_state)
    if form_response.question_number > current_progress:
        user.progress_state = str(form_response.question_number)
        session.add(user)
        session.commit()
    
    return form_response

@router.get("/user/{user_id}", response_model=List[FormResponse])
def get_user_responses(user_id: uuid.UUID, session: Session = Depends(get_session)):
    # Check if user exists
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get all responses for this user
    statement = select(FormResponse).where(FormResponse.user_id == user_id).order_by(FormResponse.question_number)
    responses = session.exec(statement).all()
    return responses

@router.get("/user/{user_id}/question/{question_number}", response_model=FormResponse)
def get_specific_response(
    user_id: uuid.UUID, 
    question_number: int, 
    session: Session = Depends(get_session)
):
    # Check if user exists
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get specific response
    statement = select(FormResponse).where(
        FormResponse.user_id == user_id,
        FormResponse.question_number == question_number
    )
    response = session.exec(statement).first()
    
    if not response:
        raise HTTPException(status_code=404, detail="Response not found")
    
    return response
