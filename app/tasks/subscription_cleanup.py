"""
Background task to handle subscription expiration and cleanup.

This module provides functionality to:
1. Check for expired subscriptions
2. Downgrade users from pursuit to purpose tier when their subscription ends
3. Clean up subscription data for expired subscriptions
"""

from datetime import datetime
from sqlmodel import Session, select
from app.models import User, get_session
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def cleanup_expired_subscriptions():
    """
    Check for expired subscriptions and downgrade users accordingly.
    
    This function should be run daily as a background task to:
    1. Find users with expired subscriptions (subscription_end_date < now)
    2. Downgrade them from pursuit to purpose tier
    3. Clear subscription data for expired subscriptions
    """
    session = next(get_session())
    
    try:
        # Find users with expired subscriptions
        current_time = datetime.utcnow()
        
        statement = select(User).where(
            User.payment_tier == "pursuit",
            User.subscription_status == "canceled",
            User.subscription_end_date < current_time
        )
        
        expired_users = session.exec(statement).all()
        
        logger.info(f"Found {len(expired_users)} users with expired subscriptions")
        
        for user in expired_users:
            logger.info(f"Downgrading user {user.id} from pursuit to purpose tier")
            
            # Downgrade user from pursuit to purpose tier
            user.payment_tier = "purpose"
            
            # Clear subscription data since it's expired
            user.subscription_id = None
            user.subscription_status = None
            user.subscription_end_date = None
            
            session.add(user)
        
        # Commit all changes
        session.commit()
        
        logger.info(f"Successfully downgraded {len(expired_users)} users")
        
        return {
            "success": True,
            "users_downgraded": len(expired_users),
            "message": f"Successfully processed {len(expired_users)} expired subscriptions"
        }
        
    except Exception as e:
        logger.error(f"Error during subscription cleanup: {str(e)}")
        session.rollback()
        return {
            "success": False,
            "error": str(e),
            "message": "Failed to process expired subscriptions"
        }
    
    finally:
        session.close()

def check_subscription_status():
    """
    Check and log current subscription status for monitoring.
    
    Returns a summary of subscription statuses across all users.
    """
    session = next(get_session())
    
    try:
        # Get all users with subscriptions
        statement = select(User).where(User.subscription_id.isnot(None))
        users_with_subscriptions = session.exec(statement).all()
        
        status_summary = {
            "total_subscriptions": len(users_with_subscriptions),
            "active": 0,
            "canceled": 0,
            "expired": 0,
            "other": 0
        }
        
        current_time = datetime.utcnow()
        
        for user in users_with_subscriptions:
            if user.subscription_status == "active":
                status_summary["active"] += 1
            elif user.subscription_status == "canceled":
                # Check if canceled subscription is expired
                if user.subscription_end_date and user.subscription_end_date < current_time:
                    status_summary["expired"] += 1
                else:
                    status_summary["canceled"] += 1
            else:
                status_summary["other"] += 1
        
        logger.info(f"Subscription status summary: {status_summary}")
        
        return status_summary
        
    except Exception as e:
        logger.error(f"Error checking subscription status: {str(e)}")
        return {"error": str(e)}
    
    finally:
        session.close()

if __name__ == "__main__":
    # Allow running this script directly for testing
    print("Running subscription cleanup...")
    result = cleanup_expired_subscriptions()
    print(f"Cleanup result: {result}")
    
    print("\nChecking subscription status...")
    status = check_subscription_status()
    print(f"Status summary: {status}")
