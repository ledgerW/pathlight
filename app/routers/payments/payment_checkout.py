from typing import Dict
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlmodel import Session
from app.models import User, get_session
import uuid
import stripe

from .payment_utils import (
    get_success_url,
    get_cancel_url,
    get_price_id_and_mode
)

router = APIRouter()

@router.post("/{user_id}/create-checkout-session/{tier}", response_model=Dict)
async def create_checkout_session(
    user_id: uuid.UUID, 
    tier: str,
    is_regeneration: bool = False,
    is_magic_link_sent: bool = False,
    is_subscription: bool = False,
    session: Session = Depends(get_session),
    request: Request = None
):
    # Check if is_regeneration was passed as a query parameter
    if request and not is_regeneration:
        query_params = request.query_params
        is_regeneration_str = query_params.get('is_regeneration', 'false').lower()
        is_regeneration = is_regeneration_str == 'true'
        
    # Check if is_magic_link_sent was passed as a query parameter
    if request and not is_magic_link_sent:
        query_params = request.query_params
        is_magic_link_str = query_params.get('is_magic_link_sent', 'false').lower()
        is_magic_link_sent = is_magic_link_str == 'true'
        
    # Check if is_subscription was passed as a query parameter
    if request and not is_subscription:
        query_params = request.query_params
        is_subscription_str = query_params.get('is_subscription', 'false').lower()
        is_subscription = is_subscription_str == 'true'
    
    # Check if user exists
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Validate tier
    if tier not in ["purpose", "pursuit"]:
        raise HTTPException(status_code=400, detail="Invalid tier. Must be 'purpose' or 'pursuit'")
    
    # Check if user has already paid for this tier or higher
    # Skip this check if it's a regeneration payment or subscription
    # Purpose tier is now free, so we only check for Pursuit tier
    if not is_regeneration and not is_subscription and tier == "pursuit" and user.payment_tier == "pursuit" and user.subscription_status == "active":
        raise HTTPException(status_code=400, detail=f"User has already paid for {tier} tier")
    
    try:
        # Get success URL based on user state
        success_url = get_success_url(
            user_id=user_id,
            tier=tier,
            is_magic_link_sent=is_magic_link_sent,
            email=user.email if is_magic_link_sent else None
        )
        
        # Get cancel URL with tier
        cancel_url = get_cancel_url(user_id, tier)
        
        # Get price ID and mode based on tier
        price_id, mode = get_price_id_and_mode(tier)
        
        # For Purpose tier (free), update user directly and return success URL
        if tier == "purpose" or price_id is None or mode is None:
            # Update user's payment tier to purpose
            user.payment_tier = "purpose"
            session.add(user)
            session.commit()
            
            # Return success URL directly without creating a checkout session
            return {"checkout_url": success_url.replace("{CHECKOUT_SESSION_ID}", "free-tier")}
        
        # For Pursuit tier, create Stripe checkout session
        checkout_session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            line_items=[
                {
                    "price": price_id,
                    "quantity": 1,
                },
            ],
            mode=mode,
            success_url=success_url,
            cancel_url=cancel_url,
            client_reference_id=f"{user_id}:{tier}",  # Include tier in reference ID
            metadata={
                "tier": tier,
                "is_regeneration": str(is_regeneration),
                "is_magic_link_sent": str(is_magic_link_sent),
                "is_subscription": str(is_subscription)
            },  # Add metadata for webhook
        )
        
        return {"checkout_url": checkout_session.url}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/config", response_model=Dict)
async def get_stripe_public_config():
    """Get Stripe publishable key based on environment"""
    from clients import get_stripe_config
    config = get_stripe_config()
    
    return {
        "publishableKey": config["public_key"]
    }
