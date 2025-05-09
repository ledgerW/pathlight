from typing import Dict
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from app.models import User, get_session
import uuid
import os
import stripe
from datetime import datetime

from .payment_utils import get_domain

router = APIRouter()

@router.post("/{user_id}/cancel-subscription", response_model=Dict)
async def cancel_subscription(
    user_id: uuid.UUID,
    session: Session = Depends(get_session)
):
    # Check if user exists
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if user has an active subscription
    if not user.subscription_id:
        raise HTTPException(status_code=400, detail="User does not have an active subscription")
    
    try:
        # Store the subscription ID for Stripe API call
        subscription_id = user.subscription_id
        
        # Cancel the subscription at period end
        subscription = stripe.Subscription.modify(
            subscription_id,
            cancel_at_period_end=True
        )
        
        # Update user's subscription status
        user.subscription_status = "canceled"
        
        # Downgrade payment tier from "pursuit" to "plan"
        if user.payment_tier == "pursuit":
            user.payment_tier = "plan"
        
        # Store the subscription end date from Stripe
        if subscription.get("cancel_at_period_end") and subscription.get("current_period_end"):
            # If canceling at period end, keep the end date
            user.subscription_end_date = datetime.fromtimestamp(subscription.get("current_period_end"))
        else:
            # Otherwise, clear the subscription end date
            user.subscription_end_date = None
        
        # Keep track of when the subscription was canceled
        print(f"Canceling subscription {subscription_id} for user {user_id}")
        print(f"Downgrading user from pursuit to plan tier")
        
        session.add(user)
        session.commit()
        
        return {
            "success": True,
            "message": "Subscription will be canceled at the end of the billing period",
            "payment_tier": user.payment_tier,
            "subscription_status": user.subscription_status,
            "subscription_end_date": user.subscription_end_date.isoformat() if user.subscription_end_date else None
        }
    
    except Exception as e:
        print(f"Error canceling subscription: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{user_id}/subscription-status", response_model=Dict)
async def get_subscription_status(
    user_id: uuid.UUID,
    session: Session = Depends(get_session)
):
    # Check if user exists
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # If user has a subscription ID, get the latest status from Stripe
    if user.subscription_id:
        try:
            subscription = stripe.Subscription.retrieve(user.subscription_id)
            
            # Update user's subscription status if it has changed
            if user.subscription_status != subscription.get("status"):
                user.subscription_status = subscription.get("status")
                session.add(user)
                session.commit()
            
            return {
                "has_subscription": True,
                "subscription_status": subscription.get("status"),
                "current_period_end": datetime.fromtimestamp(subscription.get("current_period_end")).isoformat(),
                "cancel_at_period_end": subscription.get("cancel_at_period_end"),
                "payment_tier": user.payment_tier
            }
        
        except Exception as e:
            return {
                "has_subscription": False,
                "error": str(e),
                "payment_tier": user.payment_tier
            }
    
    return {
        "has_subscription": False,
        "payment_tier": user.payment_tier
    }

@router.post("/{user_id}/resubscribe", response_model=Dict)
async def resubscribe(
    user_id: uuid.UUID,
    session: Session = Depends(get_session)
):
    """
    Endpoint to resubscribe a user who previously canceled their subscription.
    Creates a new checkout session for the pursuit tier.
    """
    # Check if user exists
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if user had a subscription before
    if not user.subscription_id or user.subscription_status != "canceled":
        raise HTTPException(
            status_code=400, 
            detail="User does not have a canceled subscription to reactivate"
        )
    
    try:
        # Get domain for success URL
        domain = get_domain()
        
        # Create a custom success URL that includes is_resubscription=true
        success_url = f"{domain}/success?session_id={{CHECKOUT_SESSION_ID}}&user_id={user_id}&tier=pursuit&is_resubscription=true"
        
        # Create a Stripe checkout session directly
        from .payment_utils import stripe_subscription_price_id
        
        checkout_session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            line_items=[
                {
                    "price": stripe_subscription_price_id,
                    "quantity": 1,
                },
            ],
            mode="subscription",
            success_url=success_url,
            cancel_url=f"{domain}/account/{user_id}",
            client_reference_id=f"{user_id}:pursuit",
            metadata={
                "tier": "pursuit",
                "is_regeneration": "false",
                "is_magic_link_sent": "false",
                "is_subscription": "true",
                "is_resubscription": "true"
            },
        )
        
        print(f"Created resubscription checkout session for user {user_id}")
        
        return {
            "success": True,
            "message": "Resubscription checkout session created",
            "session_id": checkout_session.get("id"),
            "checkout_url": checkout_session.get("url")
        }
    
    except Exception as e:
        print(f"Error creating resubscription checkout session: {e}")
        raise HTTPException(status_code=500, detail=str(e))
