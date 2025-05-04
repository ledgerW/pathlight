from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlmodel import Session, select
from app.models import User, get_session
import uuid

router = APIRouter(
    prefix="/api/users",
    tags=["users"],
)

@router.post("/", response_model=User)
def create_user(user: User, session: Session = Depends(get_session)):
    try:
        # Print user data for debugging
        print(f"Creating user with data: {user.dict()}")
        
        # Check if user with this email already exists
        statement = select(User).where(User.email == user.email)
        existing_user = session.exec(statement).first()
        
        if existing_user:
            # Return the existing user instead of creating a duplicate
            print(f"User with email {user.email} already exists, returning existing user")
            return existing_user
        
        session.add(user)
        session.commit()
        session.refresh(user)
        return user
    except Exception as e:
        session.rollback()
        print(f"Error creating user: {str(e)}")
        
        # Check if this is a uniqueness violation
        if "unique constraint" in str(e).lower() and "email" in str(e).lower():
            # This is a race condition - another request created the user between our check and commit
            # Try to fetch the existing user
            try:
                statement = select(User).where(User.email == user.email)
                existing_user = session.exec(statement).first()
                if existing_user:
                    return existing_user
            except:
                pass  # If this fails, fall through to the generic error
            
            # If we can't fetch the existing user, return a more specific error
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"A user with email {user.email} already exists"
            )
        
        # Return more detailed error information for other errors
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating user: {str(e)}"
        )

@router.get("/{user_id}", response_model=User)
def get_user(user_id: uuid.UUID, session: Session = Depends(get_session)):
    try:
        user = session.get(User, user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        return user
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving user: {str(e)}"
        )

@router.put("/{user_id}", response_model=User)
def update_user(user_id: uuid.UUID, user_data: User, session: Session = Depends(get_session)):
    try:
        user = session.get(User, user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Update user attributes
        user_data_dict = user_data.dict(exclude_unset=True)
        for key, value in user_data_dict.items():
            setattr(user, key, value)
        
        session.add(user)
        session.commit()
        session.refresh(user)
        return user
    except Exception as e:
        session.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating user: {str(e)}"
        )

@router.patch("/{user_id}/progress", response_model=User)
def update_progress(
    user_id: uuid.UUID, 
    progress_data: dict, 
    session: Session = Depends(get_session)
):
    try:
        print(f"Updating progress for user {user_id} with data: {progress_data}")
        
        user = session.get(User, user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Extract progress_state from the request body
        if 'progress_state' not in progress_data:
            raise HTTPException(status_code=400, detail="progress_state is required")
            
        progress_state = progress_data['progress_state']
        print(f"Setting progress_state to: {progress_state}")
        
        user.progress_state = progress_state
        session.add(user)
        session.commit()
        session.refresh(user)
        return user
    except Exception as e:
        session.rollback()
        print(f"Error updating progress: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating progress: {str(e)}"
        )

@router.patch("/{user_id}/payment-tier", response_model=User)
def update_payment_tier(
    user_id: uuid.UUID, 
    payment_tier: str, 
    session: Session = Depends(get_session)
):
    try:
        user = session.get(User, user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Validate payment tier
        if payment_tier not in ["none", "basic", "premium"]:
            raise HTTPException(status_code=400, detail="Invalid payment tier")
        
        # Don't allow downgrading from premium to basic
        if user.payment_tier == "premium" and payment_tier == "basic":
            raise HTTPException(status_code=400, detail="Cannot downgrade from premium to basic")
        
        user.payment_tier = payment_tier
        session.add(user)
        session.commit()
        session.refresh(user)
        return user
    except Exception as e:
        session.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating payment tier: {str(e)}"
        )

from pydantic import BaseModel, EmailStr
from datetime import datetime

class EmailRequest(BaseModel):
    email: EmailStr

class AnonymousUserRequest(BaseModel):
    name: str
    email: EmailStr
    dob: datetime
    progress_state: str
    payment_tier: str = "none"
    anonymous_session_id: str

@router.get("/find-by-email")
def find_user_by_email(email: Optional[str] = Query(None), session: Session = Depends(get_session)):
    """Find a user by email address to allow returning users to continue"""
    try:
        if not email:
            return {"found": False, "error": "Email is required"}
            
        print(f"Finding user by email: {email}")
        statement = select(User).where(User.email == email)
        user = session.exec(statement).first()
        
        if not user:
            print(f"User not found with email: {email}")
            return {"found": False}
        
        # Check if user has responses
        from app.models.models import FormResponse, Result
        responses_statement = select(FormResponse).where(FormResponse.user_id == user.id)
        responses = session.exec(responses_statement).all()
        has_responses = len(responses) > 0
        
        # Get response count
        response_count = len(responses)
        
        # Check if user has results
        results_statement = select(Result).where(Result.user_id == user.id)
        result_obj = session.exec(results_statement).first()
        has_results = result_obj is not None
        
        # Get formatted DOB
        dob_formatted = None
        if user.dob:
            try:
                dob_formatted = user.dob.strftime("%Y-%m-%d")
            except:
                pass
        
        # Return a detailed user object with all necessary information
        result = {
            "found": True,
            "id": str(user.id),
            "name": user.name,
            "email": user.email,
            "dob": dob_formatted,
            "progress_state": user.progress_state,
            "payment_tier": user.payment_tier,
            "has_responses": has_responses,
            "response_count": response_count,
            "has_results": has_results
        }
        
        # Add result details if available
        if result_obj:
            result["last_generated_at"] = result_obj.last_generated_at.isoformat() if result_obj.last_generated_at else None
            result["regeneration_count"] = result_obj.regeneration_count
        
        print(f"User found: {result}")
        return result
    except Exception as e:
        # Log the error for debugging
        print(f"Error finding user by email: {str(e)}")
        # Return a detailed error response
        return {"found": False, "error": str(e), "error_type": type(e).__name__}

@router.post("/from-anonymous", response_model=User)
def create_user_from_anonymous(user_data: AnonymousUserRequest, session: Session = Depends(get_session)):
    """Create a new user from anonymous responses and transfer the responses to the new user"""
    try:
        # Print user data for debugging
        print(f"Creating user from anonymous data: {user_data.dict()}")
        
        # Check if user with this email already exists
        statement = select(User).where(User.email == user_data.email)
        existing_user = session.exec(statement).first()
        
        if existing_user:
            # Return the existing user instead of creating a duplicate
            print(f"User with email {user_data.email} already exists, returning existing user")
            return existing_user
        
        # Create new user
        new_user = User(
            name=user_data.name,
            email=user_data.email,
            dob=user_data.dob,
            progress_state=user_data.progress_state,
            payment_tier=user_data.payment_tier
        )
        
        session.add(new_user)
        session.commit()
        session.refresh(new_user)
        
        # Now transfer anonymous responses to the new user
        # This will be handled by a separate function to keep the code clean
        transfer_anonymous_responses(session, user_data.anonymous_session_id, new_user.id)
        
        return new_user
    except Exception as e:
        session.rollback()
        print(f"Error creating user from anonymous: {str(e)}")
        
        # Check if this is a uniqueness violation
        if "unique constraint" in str(e).lower() and "email" in str(e).lower():
            # This is a race condition - another request created the user between our check and commit
            # Try to fetch the existing user
            try:
                statement = select(User).where(User.email == user_data.email)
                existing_user = session.exec(statement).first()
                if existing_user:
                    return existing_user
            except:
                pass  # If this fails, fall through to the generic error
            
            # If we can't fetch the existing user, return a more specific error
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"A user with email {user_data.email} already exists"
            )
        
        # Return more detailed error information for other errors
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating user from anonymous: {str(e)}"
        )

# Helper function to transfer anonymous responses to a new user
def transfer_anonymous_responses(session: Session, anonymous_session_id: str, user_id: uuid.UUID):
    """Transfer anonymous responses from localStorage to the database for a new user"""
    try:
        # This function is called by the create_user_from_anonymous endpoint
        # It will make a request to the client to get the anonymous responses
        # and then call the transfer-anonymous endpoint to save them
        
        print(f"Transferring anonymous responses from session {anonymous_session_id} to user {user_id}")
        
        # In a real implementation, we would make a request to the client
        # to get the anonymous responses from localStorage
        # For now, we'll just return True and let the client handle this
        # The client will need to call the transfer-anonymous endpoint directly
        
        # The actual implementation would look something like this:
        # responses = get_anonymous_responses_from_client(anonymous_session_id)
        # transfer_response = requests.post(
        #     f"/api/form-responses/transfer-anonymous",
        #     json={
        #         "user_id": str(user_id),
        #         "anonymous_session_id": anonymous_session_id,
        #         "responses": responses
        #     }
        # )
        # return transfer_response.json()["success"]
        
        return True
    except Exception as e:
        print(f"Error transferring anonymous responses: {str(e)}")
        return False

@router.post("/find-by-email")
def find_user_by_email_post(email_request: EmailRequest, session: Session = Depends(get_session)):
    """POST version of find-by-email endpoint"""
    # Extract email from request body
    email = email_request.email
    
    # Use the same logic as the GET endpoint
    try:
        if not email:
            return {"found": False, "error": "Email is required"}
            
        print(f"Finding user by email (POST): {email}")
        statement = select(User).where(User.email == email)
        user = session.exec(statement).first()
        
        if not user:
            print(f"User not found with email: {email}")
            return {"found": False}
        
        # Check if user has responses
        from app.models.models import FormResponse, Result
        responses_statement = select(FormResponse).where(FormResponse.user_id == user.id)
        responses = session.exec(responses_statement).all()
        has_responses = len(responses) > 0
        
        # Get response count
        response_count = len(responses)
        
        # Check if user has results
        results_statement = select(Result).where(Result.user_id == user.id)
        result_obj = session.exec(results_statement).first()
        has_results = result_obj is not None
        
        # Get formatted DOB
        dob_formatted = None
        if user.dob:
            try:
                dob_formatted = user.dob.strftime("%Y-%m-%d")
            except:
                pass
        
        # Return a detailed user object with all necessary information
        result = {
            "found": True,
            "id": str(user.id),  # Ensure ID is a string
            "name": user.name,
            "email": user.email,
            "dob": dob_formatted,
            "progress_state": user.progress_state,
            "payment_tier": user.payment_tier,
            "has_responses": has_responses,
            "response_count": response_count,
            "has_results": has_results
        }
        
        # Add result details if available
        if result_obj:
            result["last_generated_at"] = result_obj.last_generated_at.isoformat() if result_obj.last_generated_at else None
            result["regeneration_count"] = result_obj.regeneration_count
        
        print(f"User found (POST): {result}")
        return result
    except Exception as e:
        # Log the error for debugging
        print(f"Error finding user by email (POST): {str(e)}")
        # Return a detailed error response
        return {"found": False, "error": str(e), "error_type": type(e).__name__}
