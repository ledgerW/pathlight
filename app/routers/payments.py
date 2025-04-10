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

# Initialize Stripe
stripe_secret_key = os.getenv("STRIPE_SECRET_KEY_TEST")
stripe.api_key = stripe_secret_key

# Define product prices
BASIC_PLAN_PRICE = 99    # $0.99 in cents
PREMIUM_PLAN_PRICE = 749  # $7.49 in cents

@router.post("/{user_id}/create-checkout-session/{tier}", response_model=Dict)
async def create_checkout_session(
    user_id: uuid.UUID, 
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
    
    # Check if user has already paid for this tier or higher
    if (tier == "basic" and user.payment_tier in ["basic", "premium"]) or \
       (tier == "premium" and user.payment_tier == "premium"):
        raise HTTPException(status_code=400, detail=f"User has already paid for {tier} tier")
    
    try:
        # Set price based on tier
        price = BASIC_PLAN_PRICE if tier == "basic" else PREMIUM_PLAN_PRICE
        
        # Set product name and description based on tier
        if tier == "basic":
            product_name = "Pathlight Basic Insight"
            product_description = "Access to your personalized summary and mantra"
        else:
            product_name = "Pathlight Premium Life Plan"
            product_description = "Complete access to your personalized life plan and practical guide"
        
        # Create Stripe checkout session
        checkout_session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            line_items=[
                {
                    "price_data": {
                        "currency": "usd",
                        "product_data": {
                            "name": product_name,
                            "description": product_description,
                        },
                        "unit_amount": price,
                    },
                    "quantity": 1,
                },
            ],
            mode="payment",
            success_url=f"{os.getenv('BASE_URL', 'http://localhost:8000')}/success?session_id={{CHECKOUT_SESSION_ID}}&user_id={user_id}&tier={tier}",
            cancel_url=f"{os.getenv('BASE_URL', 'http://localhost:8000')}/cancel?user_id={user_id}",
            client_reference_id=f"{user_id}:{tier}",  # Include tier in reference ID
            metadata={"tier": tier},  # Add tier to metadata for webhook
        )
        
        return {"checkout_url": checkout_session.url}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/webhook", status_code=200)
async def webhook_received(request: Request, session: Session = Depends(get_session)):
    webhook_secret = os.getenv("STRIPE_WEBHOOK_SECRET")
    
    # Get the webhook data
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")
    
    try:
        # Verify the webhook signature
        event = stripe.Webhook.construct_event(
            payload, sig_header, webhook_secret
        )
        
        # Handle the checkout.session.completed event
        if event["type"] == "checkout.session.completed":
            checkout_session = event["data"]["object"]
            
            # Get the user ID and tier from the client_reference_id
            ref_parts = checkout_session["client_reference_id"].split(":")
            user_id = uuid.UUID(ref_parts[0])
            tier = checkout_session.get("metadata", {}).get("tier") or (ref_parts[1] if len(ref_parts) > 1 else "basic")
            
            # Update the user's payment tier
            user = session.get(User, user_id)
            if user:
                user.payment_tier = tier
                session.add(user)
                session.commit()
        
        return {"status": "success"}
    
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

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
            # Update the user's payment tier
            # If upgrading from basic to premium, set to premium
            # If paying for basic, set to basic
            if tier == "premium" or user.payment_tier == "none":
                user.payment_tier = tier
                session.add(user)
                session.commit()
            
            return {"payment_verified": True, "tier": user.payment_tier}
        else:
            return {"payment_verified": False}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
