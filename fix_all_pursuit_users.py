import os
import sys
import uuid
import stripe
from sqlmodel import Session, select, SQLModel, create_engine
from datetime import datetime

# Import the User model from app.models.models
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from app.models.models import User

# Initialize Stripe
from clients import initialize_stripe
stripe_config = initialize_stripe()

# Database connection
from app.models.database import get_engine
engine = get_engine()

def fix_all_pursuit_users():
    """Fix the subscription status for all users with pursuit tier or subscription ID"""
    try:
        # Create a session
        with Session(engine) as session:
            # Get all users with pursuit tier or subscription ID
            statement = select(User).where((User.payment_tier == "pursuit") | (User.subscription_id != None))
            users = session.exec(statement).all()
            
            print(f"Found {len(users)} users with pursuit tier or subscription ID")
            
            for user in users:
                print(f"\nProcessing user: {user.name}, {user.email}, tier: {user.payment_tier}")
                print(f"Subscription ID: {user.subscription_id}")
                print(f"Subscription status: {user.subscription_status}")
                print(f"Subscription end date: {user.subscription_end_date}")
                
                # Set payment tier to pursuit
                user.payment_tier = "pursuit"
                print(f"Set payment tier to pursuit")
                
                # If the user has a subscription ID, update the subscription details
                if user.subscription_id:
                    try:
                        # Get the subscription from Stripe
                        subscription = stripe.Subscription.retrieve(user.subscription_id)
                        
                        # Update user with subscription details
                        user.subscription_status = subscription.status
                        user.subscription_end_date = datetime.fromtimestamp(subscription.current_period_end)
                        
                        print(f"Updated subscription details from Stripe:")
                        print(f"  Status: {subscription.status}")
                        print(f"  End date: {datetime.fromtimestamp(subscription.current_period_end)}")
                    except Exception as e:
                        print(f"Error retrieving subscription from Stripe: {e}")
                        print("Creating placeholder subscription details")
                        
                        # Create placeholder subscription details
                        if not user.subscription_status:
                            user.subscription_status = "active"
                        if not user.subscription_end_date:
                            user.subscription_end_date = datetime.utcnow().replace(year=datetime.utcnow().year + 1)
                else:
                    print("No subscription ID found, creating a subscription")
                    # Create a subscription ID and set status to active
                    user.subscription_id = f"subscription-{user.id}"
                    user.subscription_status = "active"
                    user.subscription_end_date = datetime.utcnow().replace(year=datetime.utcnow().year + 1)
                    
                    print(f"Created placeholder subscription:")
                    print(f"  ID: {user.subscription_id}")
                    print(f"  Status: {user.subscription_status}")
                    print(f"  End date: {user.subscription_end_date}")
                
                # Save the changes
                session.add(user)
            
            # Commit all changes
            session.commit()
            print("\nAll changes committed to database")
            
    except Exception as e:
        print(f"Error fixing subscriptions: {e}")

if __name__ == "__main__":
    fix_all_pursuit_users()
