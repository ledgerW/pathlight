import os
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
