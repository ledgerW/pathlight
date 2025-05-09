from fastapi import APIRouter, Request, HTTPException, Depends
from sqlmodel import Session, select
from app.models import User, get_session
import os
import stripe
import uuid
from datetime import datetime

router = APIRouter()

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
    except Exception as e:
        if "Invalid signature" in str(e):
            raise HTTPException(status_code=400, detail="Invalid signature")
        raise HTTPException(status_code=400, detail=str(e))
    
    print(f"Received webhook event: {event['type']}")
    
    # Handle the event
    if event["type"] == "checkout.session.completed":
        checkout_session = event["data"]["object"]
        
        # Check if this is a subscription
        if checkout_session.get("mode") == "subscription" and checkout_session.get("subscription"):
            # Get the client_reference_id which contains the user ID
            client_ref = checkout_session.get("client_reference_id")
            if client_ref and ":" in client_ref:
                user_id_str = client_ref.split(":")[0]
                
                try:
                    user_id = uuid.UUID(user_id_str)
                    
                    # Find the user
                    user = session.get(User, user_id)
                    
                    if user:
                        # Get subscription details
                        subscription = stripe.Subscription.retrieve(checkout_session.get("subscription"))
                        
                        # Update user with subscription details
                        user.subscription_id = checkout_session.get("subscription")
                        user.subscription_status = subscription.get("status")
                        user.subscription_end_date = datetime.fromtimestamp(subscription.get("current_period_end"))
                        user.payment_tier = "pursuit"  # Set to pursuit tier for subscription
                        
                        session.add(user)
                        session.commit()
                        
                        print(f"Webhook: Updated user {user_id} with pursuit tier and subscription details")
                except ValueError:
                    print(f"Invalid user ID in client reference: {client_ref}")
    
    elif event["type"] == "customer.subscription.updated":
        subscription = event["data"]["object"]
        
        # Find the user with this subscription
        statement = select(User).where(User.subscription_id == subscription.get("id"))
        user = session.exec(statement).first()
        
        if user:
            # Update subscription status
            user.subscription_status = subscription.get("status")
            user.subscription_end_date = datetime.fromtimestamp(subscription.get("current_period_end"))
            
            # Ensure payment tier is set to pursuit
            if user.payment_tier != "pursuit":
                user.payment_tier = "pursuit"
            
            # Always save the changes to the database
            session.add(user)
            session.commit()
            
            print(f"Webhook: Updated subscription status for user {user.id} to {subscription.get('status')}")
    
    elif event["type"] == "customer.subscription.deleted":
        subscription = event["data"]["object"]
        
        # Find the user with this subscription
        statement = select(User).where(User.subscription_id == subscription.get("id"))
        user = session.exec(statement).first()
        
        if user:
            # Store the old subscription ID for logging
            old_subscription_id = user.subscription_id
            
            # Update user to indicate subscription has ended
            user.subscription_status = "canceled"
            user.payment_tier = "plan"  # Downgrade to plan tier
            
            # Clear the subscription_id and subscription_end_date
            user.subscription_id = None
            user.subscription_end_date = None
            
            session.add(user)
            session.commit()
            
            print(f"Webhook: Subscription {old_subscription_id} deleted for user {user.id}")
            print(f"Webhook: User downgraded from pursuit to plan tier, subscription fields cleared")
    
    return {"status": "success"}
