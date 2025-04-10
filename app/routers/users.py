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
    session.add(user)
    session.commit()
    session.refresh(user)
    return user

@router.get("/{user_id}", response_model=User)
def get_user(user_id: uuid.UUID, session: Session = Depends(get_session)):
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@router.put("/{user_id}", response_model=User)
def update_user(user_id: uuid.UUID, user_data: User, session: Session = Depends(get_session)):
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

@router.patch("/{user_id}/progress", response_model=User)
def update_progress(
    user_id: uuid.UUID, 
    progress_state: str, 
    session: Session = Depends(get_session)
):
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.progress_state = progress_state
    session.add(user)
    session.commit()
    session.refresh(user)
    return user

@router.patch("/{user_id}/payment-tier", response_model=User)
def update_payment_tier(
    user_id: uuid.UUID, 
    payment_tier: str, 
    session: Session = Depends(get_session)
):
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

@router.get("/find-by-email", response_model=Optional[User])
def find_user_by_email(email: str, session: Session = Depends(get_session)):
    """Find a user by email address to allow returning users to continue"""
    statement = select(User).where(User.email == email)
    user = session.exec(statement).first()
    return user
