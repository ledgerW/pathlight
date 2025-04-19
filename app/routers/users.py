from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
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

@router.get("/find-by-email")
def find_user_by_email(email: str, session: Session = Depends(get_session)):
    """Find a user by email address to allow returning users to continue"""
    try:
        print(f"Finding user by email: {email}")
        statement = select(User).where(User.email == email)
        user = session.exec(statement).first()
        
        if not user:
            print(f"User not found with email: {email}")
            return {"found": False}
        
        # Check if user has responses
        from app.models.models import FormResponse, Result
        responses_statement = select(FormResponse).where(FormResponse.user_id == user.id)
        has_responses = session.exec(responses_statement).first() is not None
        
        # Check if user has results
        results_statement = select(Result).where(Result.user_id == user.id)
        has_results = session.exec(results_statement).first() is not None
        
        # Return a simplified user object to avoid serialization issues
        result = {
            "found": True,
            "id": str(user.id),
            "name": user.name,
            "email": user.email,
            "progress_state": user.progress_state,
            "payment_tier": user.payment_tier,
            "has_responses": has_responses,
            "has_results": has_results
        }
        print(f"User found: {result}")
        return result
    except Exception as e:
        # Log the error for debugging
        print(f"Error finding user by email: {str(e)}")
        # Return a not found response instead of an error
        return {"found": False, "error": str(e)}
