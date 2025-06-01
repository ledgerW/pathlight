from typing import Dict
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlmodel import Session, select
from app.models import User, get_session
import uuid
import stripe
from datetime import datetime, timedelta

router = APIRouter()

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
    request: Request,
    session: Session = Depends(get_session),
    session_id: str = None,
    tier: str = None,
    force_active: bool = False
):
    # Extract parameters from request body
    try:
        request_data = await request.json()
        if not session_id and 'session_id' in request_data:
            session_id = request_data['session_id']
        if not tier and 'tier' in request_data:
            tier = request_data['tier']
        if not force_active and 'force_active' in request_data:
            force_active = request_data.get('force_active', False)
    except Exception as e:
        # If there's an error parsing the JSON or no body provided, continue with query parameters
        print(f"Error parsing request body: {e}")
    
    # Ensure required parameters are present
    if not session_id or not tier:
        raise HTTPException(status_code=400, detail="Missing required parameters: session_id and tier")
    # Check if user exists
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Validate tier
    if tier not in ["purpose", "pursuit"]:
        raise HTTPException(status_code=400, detail="Invalid tier. Must be 'purpose' or 'pursuit'")
    
    try:
        # Special case for direct updates from payment_success.html or free tier
        if session_id == "direct-update" or session_id == "free-tier":
            print(f"Direct update requested for user {user_id} to set tier to {tier}")
            
            # For free tier (purpose), just update the payment tier
            if tier == "purpose" or session_id == "free-tier":
                user.payment_tier = "purpose"
                session.add(user)
                session.commit()
                
                print(f"Set user {user_id} payment tier to purpose (free tier)")
                
                return {
                    "payment_verified": True,
                    "tier": "purpose",
                    "direct_update": True,
                    "is_subscription": False
                }
            # For Pursuit tier, handle subscription details
            elif tier == "pursuit":
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
                            # Access status using dictionary syntax since Stripe returns a dict-like object
                            user.subscription_status = subscription.get("status")
                            
                        # For active subscriptions, we don't set an end date
                        # The subscription_end_date is only used for canceled subscriptions
                        if subscription.get("status") == "canceled" or subscription.get("cancel_at_period_end") == True:
                            # For canceled subscriptions, set the end date to current_period_end if available
                            current_period_end = subscription.get("current_period_end")
                            if current_period_end is not None:
                                user.subscription_end_date = datetime.fromtimestamp(current_period_end)
                            else:
                                # If current_period_end is None, set a default end date (1 month from now)
                                print(f"Warning: current_period_end is None for canceled subscription {user.subscription_id}")
                                user.subscription_end_date = datetime.utcnow() + timedelta(days=30)
                        else:
                            # For active subscriptions, clear the end date
                            user.subscription_end_date = None
                        
                        session.add(user)
                        session.commit()
                        
                        print(f"Updated user {user_id} with subscription details from direct update")
                    except Exception as e:
                        print(f"Error retrieving subscription: {e}")
                        
                        # If there was an error retrieving the subscription but force_active is true,
                        # set the subscription status to active anyway
                        if force_active:
                            user.subscription_status = "active"
                            print(f"Forced subscription status to active for user {user_id} after Stripe error")
                
                # If no subscription ID or error retrieving it, set the subscription status
                # If force_active is true, ensure the subscription status is set to active
                if force_active:
                    if not user.subscription_id:
                        user.subscription_id = f"subscription-{user_id}"
                    user.subscription_status = "active"
                    # For active subscriptions, clear the end date
                    user.subscription_end_date = None
                    print(f"Forced subscription fields for user {user_id}: {user.subscription_id}, {user.subscription_status}")
            
            # Set the payment tier for Pursuit tier
            user.payment_tier = tier
            
            # Always save the changes to the database
            session.add(user)
            session.commit()
            
            print(f"Set user {user_id} payment tier to {tier} from direct update")
            
            return {
                "payment_verified": True,
                "tier": tier,
                "direct_update": True,
                "is_subscription": tier == "pursuit"
            }
        
        # Normal case - verify the checkout session
        checkout_session = stripe.checkout.Session.retrieve(session_id)
        
        # Check if the payment was successful
        if checkout_session.get("payment_status") == "paid":
            # Check if this is a regeneration payment
            is_regeneration = False
            if checkout_session.get("metadata") and "is_regeneration" in checkout_session.get("metadata", {}):
                is_regeneration = checkout_session.get("metadata", {}).get("is_regeneration", "false").lower() == "true"
            
            # Check if this is a subscription
            is_subscription = False
            if checkout_session.get("metadata") and "is_subscription" in checkout_session.get("metadata", {}):
                is_subscription = checkout_session.get("metadata", {}).get("is_subscription", "false").lower() == "true"
            
            # If mode is subscription, treat it as a subscription
            if checkout_session.get("mode") == "subscription":
                is_subscription = True
            
            # If this is a subscription, store the subscription ID
            if is_subscription or tier == "pursuit":
                # Get the subscription details if available
                if checkout_session.get("subscription"):
                    subscription = stripe.Subscription.retrieve(checkout_session.get("subscription"))
                    
                    # Update user with subscription details
                    user.subscription_id = checkout_session.get("subscription")
                    user.subscription_status = subscription.get("status")
                    
                    # For active subscriptions, we don't set an end date
                    # The subscription_end_date is only used for canceled subscriptions
                    if subscription.get("status") == "canceled" or subscription.get("cancel_at_period_end") == True:
                        # For canceled subscriptions, set the end date to current_period_end if available
                        current_period_end = subscription.get("current_period_end")
                        if current_period_end is not None:
                            user.subscription_end_date = datetime.fromtimestamp(current_period_end)
                        else:
                            # If current_period_end is None, set a default end date (1 month from now)
                            print(f"Warning: current_period_end is None for canceled subscription {user.subscription_id}")
                            user.subscription_end_date = datetime.utcnow() + timedelta(days=30)
                    else:
                        # For active subscriptions, clear the end date
                        user.subscription_end_date = None
                
                # Always set payment_tier to "pursuit" for subscription/pursuit tier
                user.payment_tier = "pursuit"
                
                session.add(user)
                session.commit()
                
                print(f"Updated user {user_id} with pursuit tier and subscription details: {user.subscription_id}, {user.subscription_status}")
            else:
                # For purpose tier (which is now free), just update the payment tier
                if tier == "purpose":
                    user.payment_tier = "purpose"
                else:
                    # For other one-time payments (should not happen with new structure)
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
        # Log the error with more details
        error_message = f"Error in verify_payment for user {user_id}, session_id {session_id}, tier {tier}: {str(e)}"
        print(error_message)
        
        # Include the error type in the log
        import traceback
        print(f"Error type: {type(e).__name__}")
        print(f"Traceback: {traceback.format_exc()}")
        
        raise HTTPException(status_code=500, detail=error_message)
