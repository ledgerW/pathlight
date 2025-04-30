from typing import Dict
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlmodel import Session, select
from app.models import User, get_session
import uuid
import os
import stripe
from datetime import datetime

router = APIRouter(
    prefix="/api/payments",
    tags=["payments"],
)

from clients import is_production, initialize_stripe, get_stripe_config

# Initialize Stripe and get configuration
stripe_config = initialize_stripe()
stripe_basic_price_id = stripe_config["basic_price_id"]
stripe_basic_product_id = stripe_config["basic_product_id"]
stripe_full_price_id = stripe_config["full_price_id"]
stripe_full_product_id = stripe_config["full_product_id"]

# Create checkout session endpoint
@router.post("/{user_id}/create-checkout-session/{tier}", response_model=Dict)
async def create_checkout_session(
    user_id: uuid.UUID, 
    tier: str,
    is_regeneration: bool = False,
    session: Session = Depends(get_session),
    request: Request = None
):
    # Check if is_regeneration was passed as a query parameter
    if request and not is_regeneration:
        query_params = request.query_params
        is_regeneration_str = query_params.get('is_regeneration', 'false').lower()
        is_regeneration = is_regeneration_str == 'true'
    # Check if user exists
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Validate tier
    if tier not in ["basic", "premium"]:
        raise HTTPException(status_code=400, detail="Invalid tier. Must be 'basic' or 'premium'")
    
    # Check if user has already paid for this tier or higher
    # Skip this check if it's a regeneration payment
    if not is_regeneration and ((tier == "basic" and user.payment_tier in ["basic", "premium"]) or \
       (tier == "premium" and user.payment_tier == "premium")):
        raise HTTPException(status_code=400, detail=f"User has already paid for {tier} tier")
    
    try:
        # Create Stripe checkout session
        checkout_session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            line_items=[
                {
                    "price": stripe_basic_price_id if tier == "basic" else stripe_full_price_id,
                    "quantity": 1,
                },
            ],
            mode="payment",
            success_url=f"{os.getenv('PROD_DOMAIN') if is_production() else os.getenv('DEV_DOMAIN')}/success?session_id={{CHECKOUT_SESSION_ID}}&user_id={user_id}&tier={tier}",
            cancel_url=f"{os.getenv('PROD_DOMAIN') if is_production() else os.getenv('DEV_DOMAIN')}/cancel?user_id={user_id}",
            client_reference_id=f"{user_id}:{tier}",  # Include tier in reference ID
            metadata={
                "tier": tier,
                "is_regeneration": str(is_regeneration)
            },  # Add tier and regeneration flag to metadata for webhook
        )
        
        return {"checkout_url": checkout_session.url}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Note: Webhook endpoint removed as we're using the redirect flow for payment verification

@router.get("/{user_id}/payment-status", response_model=Dict)
async def get_payment_status(user_id: uuid.UUID, session: Session = Depends(get_session)):
    # Check if user exists
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {
        "payment_tier": user.payment_tier,
        "has_paid": user.payment_tier != "none"
    }

@router.post("/{user_id}/verify-payment", response_model=Dict)
async def verify_payment(
    user_id: uuid.UUID, 
    session_id: str,
    tier: str,
    session: Session = Depends(get_session)
):
    # Check if user exists
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Validate tier
    if tier not in ["basic", "premium"]:
        raise HTTPException(status_code=400, detail="Invalid tier. Must be 'basic' or 'premium'")
    
    try:
        # Verify the checkout session
        checkout_session = stripe.checkout.Session.retrieve(session_id)
        
        # Check if the payment was successful
        if checkout_session.payment_status == "paid":
            # Check if this is a regeneration payment
            is_regeneration = False
            if checkout_session.metadata and "is_regeneration" in checkout_session.metadata:
                is_regeneration = checkout_session.metadata["is_regeneration"].lower() == "true"
            
            # Update the user's payment tier
            # If upgrading from basic to premium, set to premium
            # If paying for basic, set to basic
            if tier == "premium" or user.payment_tier == "none":
                user.payment_tier = tier
                session.add(user)
                session.commit()
            
            # If this is a regeneration payment, update the regeneration count
            if is_regeneration:
                from app.models.models import Result
                from sqlmodel import select
                
                # Get the user's result
                statement = select(Result).where(Result.user_id == user_id)
                result = session.exec(statement).first()
                
                if result:
                    # Increment regeneration count
                    result.regeneration_count += 1
                    # Update last generated timestamp
                    result.last_generated_at = datetime.utcnow()
                    session.add(result)
                    session.commit()
            
            return {"payment_verified": True, "tier": user.payment_tier, "is_regeneration": is_regeneration}
        else:
            return {"payment_verified": False}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/config", response_model=Dict)
async def get_stripe_public_config():
    """Get Stripe publishable key based on environment"""
    config = get_stripe_config()
    
    return {
        "publishableKey": config["public_key"]
    }

# Note: The confirm-payment-intent endpoint has been removed as we've migrated to Stripe Checkout
