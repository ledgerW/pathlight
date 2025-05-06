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
stripe_subscription_price_id = stripe_config["subscription_price_id"]
stripe_subscription_product_id = stripe_config["subscription_product_id"]

# Create checkout session endpoint
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
    if tier not in ["purpose", "plan", "pursuit"]:
        raise HTTPException(status_code=400, detail="Invalid tier. Must be 'purpose', 'plan', or 'pursuit'")
    
    # Check if user has already paid for this tier or higher
    # Skip this check if it's a regeneration payment or subscription
    if not is_regeneration and not is_subscription and ((tier == "purpose" and user.payment_tier in ["purpose", "plan", "pursuit"]) or \
       (tier == "plan" and user.payment_tier in ["plan", "pursuit"])):
        raise HTTPException(status_code=400, detail=f"User has already paid for {tier} tier")
    
    try:
        # Determine the success URL based on whether a magic link was sent
        success_url = ""
        if is_magic_link_sent:
            # For users who have a magic link sent, redirect to payment-success page
            # Include the user's email for the instructions
            success_url = f"{os.getenv('PROD_DOMAIN') if is_production() else os.getenv('DEV_DOMAIN')}/payment-success?user_id={user_id}&tier={tier}&email={user.email}"
        else:
            # For regular users, use the standard success page
            success_url = f"{os.getenv('PROD_DOMAIN') if is_production() else os.getenv('DEV_DOMAIN')}/success?session_id={{CHECKOUT_SESSION_ID}}&user_id={user_id}&tier={tier}"
        
        # Determine the mode and price based on tier
        mode = "subscription" if tier == "pursuit" else "payment"
        price_id = stripe_subscription_price_id if tier == "pursuit" else \
                  (stripe_full_price_id if tier == "plan" else stripe_basic_price_id)
        
        # Create Stripe checkout session
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
            cancel_url=f"{os.getenv('PROD_DOMAIN') if is_production() else os.getenv('DEV_DOMAIN')}/cancel?user_id={user_id}",
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
    force_active: bool = False,
    session: Session = Depends(get_session)
):
    # Check if user exists
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Validate tier
    if tier not in ["purpose", "plan", "pursuit"]:
        raise HTTPException(status_code=400, detail="Invalid tier. Must be 'purpose', 'plan', or 'pursuit'")
    
    try:
        # Special case for direct updates from payment_success.html
        if session_id == "direct-update" and tier == "pursuit":
            print(f"Direct update requested for user {user_id} to set tier to pursuit")
            
            # Check if the user already has a subscription ID
            if user.subscription_id:
                # Get the subscription details
                try:
                    subscription = stripe.Subscription.retrieve(user.subscription_id)
                    
                    # Update user with subscription details
                    if force_active:
                        # Force the subscription status to active
                        user.subscription_status = "active"
                        print(f"Forced subscription status to active for user {user_id}")
                    else:
                        user.subscription_status = subscription.status
                        
                    user.subscription_end_date = datetime.fromtimestamp(subscription.current_period_end)
                    user.payment_tier = "pursuit"
                    
                    session.add(user)
                    session.commit()
                    
                    print(f"Updated user {user_id} with pursuit tier and subscription details from direct update")
                    
                    return {
                        "payment_verified": True,
                        "tier": "pursuit",
                        "is_subscription": True,
                        "direct_update": True,
                        "subscription_status": user.subscription_status
                    }
                except Exception as e:
                    print(f"Error retrieving subscription: {e}")
                    
                    # If there was an error retrieving the subscription but force_active is true,
                    # set the subscription status to active anyway
                    if force_active:
                        user.subscription_status = "active"
                        print(f"Forced subscription status to active for user {user_id} after Stripe error")
            
            # If no subscription ID or error retrieving it, set the tier and possibly the subscription status
            user.payment_tier = "pursuit"
            
            # If force_active is true, ensure the subscription status is set to active
            if force_active:
                if not user.subscription_id:
                    user.subscription_id = f"subscription-{user_id}"
                user.subscription_status = "active"
                # Set subscription end date to 1 year from now if not already set
                if not user.subscription_end_date:
                    user.subscription_end_date = datetime.utcnow().replace(year=datetime.utcnow().year + 1)
                print(f"Forced subscription fields for user {user_id}: {user.subscription_id}, {user.subscription_status}")
            session.add(user)
            session.commit()
            
            print(f"Set user {user_id} payment tier to pursuit from direct update")
            
            return {
                "payment_verified": True,
                "tier": "pursuit",
                "direct_update": True
            }
        
        # Normal case - verify the checkout session
        checkout_session = stripe.checkout.Session.retrieve(session_id)
        
        # Check if the payment was successful
        if checkout_session.payment_status == "paid":
            # Check if this is a regeneration payment
            is_regeneration = False
            if checkout_session.metadata and "is_regeneration" in checkout_session.metadata:
                is_regeneration = checkout_session.metadata["is_regeneration"].lower() == "true"
            
            # Check if this is a subscription
            is_subscription = False
            if checkout_session.metadata and "is_subscription" in checkout_session.metadata:
                is_subscription = checkout_session.metadata["is_subscription"].lower() == "true"
            
            # If this is a subscription, store the subscription ID
            if is_subscription or tier == "pursuit":
                # Get the subscription details if available
                if checkout_session.subscription:
                    subscription = stripe.Subscription.retrieve(checkout_session.subscription)
                    
                    # Update user with subscription details
                    user.subscription_id = checkout_session.subscription
                    user.subscription_status = subscription.status
                    user.subscription_end_date = datetime.fromtimestamp(subscription.current_period_end)
                
                # Always set payment_tier to "pursuit" for subscription/pursuit tier
                user.payment_tier = "pursuit"
                
                session.add(user)
                session.commit()
                
                print(f"Updated user {user_id} with pursuit tier and subscription details: {user.subscription_id}, {user.subscription_status}")
            else:
                # Update the user's payment tier for one-time payments
                # If upgrading from purpose to plan, set to plan
                # If paying for purpose, set to purpose
                if tier == "plan" or user.payment_tier == "none":
                    user.payment_tier = tier
                    session.add(user)
                    session.commit()
                    
                    print(f"Updated user {user_id} with tier: {tier}")
            
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
            
            return {
                "payment_verified": True, 
                "tier": user.payment_tier, 
                "is_regeneration": is_regeneration,
                "is_subscription": is_subscription
            }
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

# Subscription management endpoints
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
        # Cancel the subscription at period end
        subscription = stripe.Subscription.modify(
            user.subscription_id,
            cancel_at_period_end=True
        )
        
        # Update user's subscription status
        user.subscription_status = "canceled"
        session.add(user)
        session.commit()
        
        return {
            "success": True,
            "message": "Subscription will be canceled at the end of the billing period"
        }
    
    except Exception as e:
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
            if user.subscription_status != subscription.status:
                user.subscription_status = subscription.status
                session.add(user)
                session.commit()
            
            return {
                "has_subscription": True,
                "subscription_status": subscription.status,
                "current_period_end": datetime.fromtimestamp(subscription.current_period_end).isoformat(),
                "cancel_at_period_end": subscription.cancel_at_period_end
            }
        
        except Exception as e:
            return {
                "has_subscription": False,
                "error": str(e)
            }
    
    return {
        "has_subscription": False
    }

@router.post("/webhook", status_code=200)
async def webhook(request: Request, session: Session = Depends(get_session)):
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")
    
    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, os.getenv("STRIPE_WEBHOOK_SECRET")
        )
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid signature")
    
    print(f"Received webhook event: {event['type']}")
    
    # Handle the event
    if event["type"] == "checkout.session.completed":
        checkout_session = event["data"]["object"]
        
        # Check if this is a subscription
        if checkout_session.mode == "subscription" and checkout_session.subscription:
            # Get the client_reference_id which contains the user ID
            client_ref = checkout_session.client_reference_id
            if client_ref and ":" in client_ref:
                user_id_str = client_ref.split(":")[0]
                
                try:
                    user_id = uuid.UUID(user_id_str)
                    
                    # Find the user
                    user = session.get(User, user_id)
                    
                    if user:
                        # Get subscription details
                        subscription = stripe.Subscription.retrieve(checkout_session.subscription)
                        
                        # Update user with subscription details
                        user.subscription_id = checkout_session.subscription
                        user.subscription_status = subscription.status
                        user.subscription_end_date = datetime.fromtimestamp(subscription.current_period_end)
                        user.payment_tier = "pursuit"  # Set to pursuit tier for subscription
                        
                        session.add(user)
                        session.commit()
                        
                        print(f"Webhook: Updated user {user_id} with pursuit tier and subscription details")
                except ValueError:
                    print(f"Invalid user ID in client reference: {client_ref}")
    
    elif event["type"] == "customer.subscription.updated":
        subscription = event["data"]["object"]
        
        # Find the user with this subscription
        statement = select(User).where(User.subscription_id == subscription.id)
        user = session.exec(statement).first()
        
        if user:
            # Update subscription status
            user.subscription_status = subscription.status
            user.subscription_end_date = datetime.fromtimestamp(subscription.current_period_end)
            
            # Ensure payment tier is set to pursuit
            if user.payment_tier != "pursuit":
                user.payment_tier = "pursuit"
                
            session.add(user)
            session.commit()
            
            print(f"Webhook: Updated subscription status for user {user.id} to {subscription.status}")
    
    elif event["type"] == "customer.subscription.deleted":
        subscription = event["data"]["object"]
        
        # Find the user with this subscription
        statement = select(User).where(User.subscription_id == subscription.id)
        user = session.exec(statement).first()
        
        if user:
            # Update user to indicate subscription has ended
            user.subscription_status = "canceled"
            user.payment_tier = "plan"  # Downgrade to plan tier
            session.add(user)
            session.commit()
            
            print(f"Webhook: Subscription canceled for user {user.id}")
    
    return {"status": "success"}

# Note: The confirm-payment-intent endpoint has been removed as we've migrated to Stripe Checkout
