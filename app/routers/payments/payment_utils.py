import os
from typing import Dict
from datetime import datetime
from clients import is_production, initialize_stripe, get_stripe_config

# Initialize Stripe and get configuration
stripe_config = initialize_stripe()
stripe_basic_price_id = stripe_config["basic_price_id"]
stripe_basic_product_id = stripe_config["basic_product_id"]
stripe_full_price_id = stripe_config["full_price_id"]
stripe_full_product_id = stripe_config["full_product_id"]
stripe_subscription_price_id = stripe_config["subscription_price_id"]
stripe_subscription_product_id = stripe_config["subscription_product_id"]

def get_domain() -> str:
    """Get the appropriate domain based on environment"""
    return os.getenv('PROD_DOMAIN') if is_production() else os.getenv('DEV_DOMAIN')

def get_success_url(user_id, tier, is_magic_link_sent=False, email=None, is_resubscription=False) -> str:
    """
    Generate the appropriate success URL based on user state
    
    Args:
        user_id: The user's ID
        tier: The payment tier (purpose, plan, pursuit)
        is_magic_link_sent: Whether a magic link has been sent to the user
        email: The user's email (for magic link instructions)
        is_resubscription: Whether this is a resubscription
        
    Returns:
        The success URL for the Stripe checkout session
    """
    domain = get_domain()
    
    if is_resubscription:
        return f"{domain}/success?session_id={{CHECKOUT_SESSION_ID}}&user_id={user_id}&tier={tier}&is_resubscription=true"
    
    if is_magic_link_sent:
        # For users who have a magic link sent, redirect to payment-success page
        # Include the user's email for the instructions
        return f"{domain}/payment-success?user_id={user_id}&tier={tier}&email={email}"
    
    # For regular users, use the standard success page
    return f"{domain}/success?session_id={{CHECKOUT_SESSION_ID}}&user_id={user_id}&tier={tier}"

def get_cancel_url(user_id, tier="pursuit") -> str:
    """
    Generate the cancel URL for Stripe checkout
    
    Args:
        user_id: The user's ID
        tier: The payment tier (purpose, pursuit)
        
    Returns:
        The cancel URL for the Stripe checkout session
    """
    domain = get_domain()
    # When canceling from Pursuit tier, redirect to Purpose tier flow
    if tier == "pursuit":
        return f"{domain}/form?tier=purpose&user_id={user_id}"
    return f"{domain}/cancel?user_id={user_id}"

def get_price_id_and_mode(tier) -> tuple:
    """
    Get the appropriate price ID and mode based on tier
    
    Args:
        tier: The payment tier (purpose, pursuit)
        
    Returns:
        Tuple of (price_id, mode) or (None, None) for free tier
    """
    if tier == "pursuit":
        return stripe_subscription_price_id, "subscription"
    else:  # purpose tier is now free
        return None, None

def has_premium_access(user) -> bool:
    """
    Check if a user has premium (pursuit tier) access.
    
    This function properly handles canceled subscriptions by checking:
    1. If user has pursuit tier payment_tier
    2. If subscription is canceled, check if subscription_end_date is in the future
    3. If subscription is active, grant access
    
    Args:
        user: User model instance
        
    Returns:
        bool: True if user has premium access, False otherwise
    """
    # If user doesn't have pursuit tier, no premium access
    if user.payment_tier != "pursuit":
        return False
    
    # If user has pursuit tier but no subscription info, grant access (legacy users)
    if not user.subscription_id or not user.subscription_status:
        return True
    
    # If subscription is active, grant access
    if user.subscription_status == "active":
        return True
    
    # If subscription is canceled, check if still within paid period
    if user.subscription_status == "canceled":
        if user.subscription_end_date and user.subscription_end_date > datetime.utcnow():
            return True
        else:
            return False
    
    # For other subscription statuses (past_due, incomplete, etc.), deny access
    return False
