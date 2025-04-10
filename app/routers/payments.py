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
FULL_PLAN_PRICE = 2999  # $29.99 in cents

@router.post("/{user_id}/create-checkout-session", response_model=Dict)
async def create_checkout_session(user_id: uuid.UUID, session: Session = Depends(get_session)):
    # Check if user exists
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if user has already paid
    if user.payment_complete:
        raise HTTPException(status_code=400, detail="User has already paid")
    
    try:
        # Create Stripe checkout session
        checkout_session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            line_items=[
                {
                    "price_data": {
                        "currency": "usd",
                        "product_data": {
                            "name": "Pathlight Full Life Plan",
                            "description": "Complete access to your personalized life plan and practical guide",
                        },
                        "unit_amount": FULL_PLAN_PRICE,
                    },
                    "quantity": 1,
                },
            ],
            mode="payment",
            success_url=f"{os.getenv('BASE_URL', 'http://localhost:8000')}/success?session_id={{CHECKOUT_SESSION_ID}}&user_id={user_id}",
            cancel_url=f"{os.getenv('BASE_URL', 'http://localhost:8000')}/cancel?user_id={user_id}",
            client_reference_id=str(user_id),
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
            
            # Get the user ID from the client_reference_id
            user_id = uuid.UUID(checkout_session["client_reference_id"])
            
            # Update the user's payment status
            user = session.get(User, user_id)
            if user:
                user.payment_complete = True
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
    
    return {"payment_complete": user.payment_complete}

@router.post("/{user_id}/verify-payment", response_model=Dict)
async def verify_payment(
    user_id: uuid.UUID, 
    session_id: str, 
    session: Session = Depends(get_session)
):
    # Check if user exists
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    try:
        # Verify the checkout session
        checkout_session = stripe.checkout.Session.retrieve(session_id)
        
        # Check if the payment was successful
        if checkout_session.payment_status == "paid":
            # Update the user's payment status
            user.payment_complete = True
            session.add(user)
            session.commit()
            
            return {"payment_verified": True}
        else:
            return {"payment_verified": False}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
