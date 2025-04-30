import os
import stripe
from stytch import Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def is_production():
    """Check if the application is running in production mode."""
    return os.getenv("REPLIT_DEPLOYMENT") == "1"

def get_stytch_client():
    """
    Initialize and return the Stytch client based on the current environment.
    
    In development mode, uses test credentials.
    In production mode, uses production credentials.
    """
    if is_production():
        # Production environment
        project_id = os.getenv("STYTCH_PROJECT_ID")
        secret = os.getenv("STYTCH_SECRET")
        environment = "live"
    else:
        # Development environment
        project_id = os.getenv("STYTCH_PROJECT_ID_TEST")
        secret = os.getenv("STYTCH_SECRET_TEST")
        environment = "test"
    
    # Validate credentials
    if not project_id or not secret:
        env_prefix = "" if is_production() else "_TEST"
        raise ValueError(
            f"Missing Stytch credentials. Please set STYTCH_PROJECT_ID{env_prefix} "
            f"and STYTCH_SECRET{env_prefix} environment variables."
        )
    
    return Client(
        project_id=project_id,
        secret=secret,
        environment=environment
    )

def get_stripe_config():
    """
    Get Stripe configuration based on the current environment.
    
    Returns a dictionary with all necessary Stripe keys and IDs.
    """
    if is_production():
        # Production environment
        config = {
            "secret_key": os.getenv("STRIPE_SECRET_KEY"),
            "public_key": os.getenv("STRIPE_PUBLIC_KEY"),
            "basic_price_id": os.getenv("STRIPE_BASIC_PRICE_ID"),
            "basic_product_id": os.getenv("STRIPE_BASIC_PRODUCT_ID"),
            "full_price_id": os.getenv("STRIPE_FULL_PRICE_ID"),
            "full_product_id": os.getenv("STRIPE_FULL_PRODUCT_ID"),
            "environment": "production"
        }
    else:
        # Development environment
        config = {
            "secret_key": os.getenv("STRIPE_SECRET_KEY_TEST"),
            "public_key": os.getenv("STRIPE_PUBLIC_KEY_TEST"),
            "basic_price_id": os.getenv("STRIPE_BASIC_PRICE_ID_TEST"),
            "basic_product_id": os.getenv("STRIPE_BASIC_PRODUCT_ID_TEST"),
            "full_price_id": os.getenv("STRIPE_FULL_PRICE_ID_TEST"),
            "full_product_id": os.getenv("STRIPE_FULL_PRODUCT_ID_TEST"),
            "environment": "test"
        }
    
    # Validate configuration
    missing_keys = [k for k, v in config.items() if not v and k != "environment"]
    if missing_keys:
        env_suffix = "" if is_production() else "_TEST"
        raise ValueError(
            f"Missing Stripe configuration: {', '.join(missing_keys)}. "
            f"Please check your environment variables with{env_suffix} suffix."
        )
    
    return config

def initialize_stripe():
    """
    Initialize the Stripe client with the appropriate API key.
    
    Returns the Stripe configuration dictionary.
    """
    config = get_stripe_config()
    stripe.api_key = config["secret_key"]
    return config
