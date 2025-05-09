import os
from typing import Dict
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

def get_cancel_url(user_id) -> str:
    """
    Generate the cancel URL for Stripe checkout
    
    Args:
        user_id: The user's ID
        
    Returns:
        The cancel URL for the Stripe checkout session
    """
    domain = get_domain()
    return f"{domain}/cancel?user_id={user_id}"

def get_price_id_and_mode(tier) -> tuple:
    """
    Get the appropriate price ID and mode based on tier
    
    Args:
        tier: The payment tier (purpose, plan, pursuit)
        
    Returns:
        Tuple of (price_id, mode)
    """
    if tier == "pursuit":
        return stripe_subscription_price_id, "subscription"
    elif tier == "plan":
        return stripe_full_price_id, "payment"
    else:  # purpose tier
        return stripe_basic_price_id, "payment"
