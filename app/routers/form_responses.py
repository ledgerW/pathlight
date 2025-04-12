from typing import List, Union
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from app.models import FormResponse, User, get_session
import uuid
from pydantic import validator

router = APIRouter(
    prefix="/api/form-responses",
    tags=["form-responses"],
)

# Helper function to convert string to UUID if needed
def parse_uuid(user_id):
    if isinstance(user_id, str):
        try:
            return uuid.UUID(user_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid UUID format")
    return user_id

@router.post("/", response_model=FormResponse)
def create_form_response(form_response: FormResponse, session: Session = Depends(get_session)):
    try:
        # Print form response data for debugging
        print(f"Creating form response with data: {form_response.dict()}")
        
        # Convert user_id to UUID if it's a string
        if isinstance(form_response.user_id, str):
            form_response.user_id = parse_uuid(form_response.user_id)
        
        # Check if user exists
        user = session.get(User, form_response.user_id)
        if not user:
            print(f"User not found with ID: {form_response.user_id}")
            raise HTTPException(status_code=404, detail="User not found")
        
        # Check if response for this question already exists
        statement = select(FormResponse).where(
            FormResponse.user_id == form_response.user_id,
            FormResponse.question_number == form_response.question_number
        )
        existing_response = session.exec(statement).first()
        
        # If response exists, update it
        if existing_response:
            print(f"Updating existing response for question {form_response.question_number}")
            existing_response.response = form_response.response
            session.add(existing_response)
            session.commit()
            session.refresh(existing_response)
            return existing_response
        
        # Otherwise create new response
        print(f"Creating new response for question {form_response.question_number}")
        session.add(form_response)
        session.commit()
        session.refresh(form_response)
        
        # Update user progress if this is a new highest question
        current_progress = int(user.progress_state)
        if form_response.question_number > current_progress:
            print(f"Updating user progress from {current_progress} to {form_response.question_number}")
            user.progress_state = str(form_response.question_number)
            session.add(user)
            session.commit()
        
        return form_response
    except Exception as e:
        session.rollback()
        print(f"Error saving form response: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error saving form response: {str(e)}"
        )

@router.get("/user/{user_id}", response_model=List[FormResponse])
def get_user_responses(user_id: Union[str, uuid.UUID], session: Session = Depends(get_session)):
    try:
        # Convert user_id to UUID if it's a string
        user_id = parse_uuid(user_id)
        
        # Check if user exists
        user = session.get(User, user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Get all responses for this user
        statement = select(FormResponse).where(FormResponse.user_id == user_id).order_by(FormResponse.question_number)
        responses = session.exec(statement).all()
        return responses
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving user responses: {str(e)}"
        )

@router.get("/user/{user_id}/question/{question_number}", response_model=FormResponse)
def get_specific_response(
    user_id: Union[str, uuid.UUID], 
    question_number: int, 
    session: Session = Depends(get_session)
):
    try:
        # Convert user_id to UUID if it's a string
        user_id = parse_uuid(user_id)
        
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
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving specific response: {str(e)}"
        )
