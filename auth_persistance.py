import os
import json
import time
from pathlib import Path
from typing import Optional, Dict, Any

from clients import is_production

# Define the path for the token storage file
# This will be in the project root directory
TOKEN_FILE = Path("dev_auth_token.json")

def save_auth_token(user_data: Any, session_token: str) -> None:
    """
    Save authentication token to a local file in development mode.
    
    Args:
        user_data: User data from Stytch
        session_token: The Stytch session token
    """
    # Only save tokens in development mode
    if is_production():
        return
    
    # Create a dictionary with the necessary auth data
    try:
        # Extract only serializable data from user_data
        user_dict = {
            "user_id": getattr(user_data, "user_id", None),
            "email": getattr(user_data.emails[0], "email", None) if hasattr(user_data, "emails") and user_data.emails else None
        }
        
        auth_data = {
            "session_token": session_token,
            "user": user_dict,
            # Add timestamp for potential expiration checks
            "saved_at": time.time()
        }
        
        # Write to file
        with open(TOKEN_FILE, "w") as f:
            json.dump(auth_data, f, indent=2)
        print(f"[DEBUG] Auth token saved to {TOKEN_FILE}: {session_token[:10]}...")
    except Exception as e:
        print(f"[ERROR] Failed to save auth token: {str(e)}")

def load_auth_token() -> Optional[str]:
    """
    Load authentication token from local file in development mode.
    
    Returns:
        The session token if found and valid, None otherwise
    """
    # Only load tokens in development mode
    if is_production():
        print("[DEBUG] Not loading token in production mode")
        return None
    
    # Check if token file exists
    if not TOKEN_FILE.exists():
        print("[DEBUG] No token file found")
        return None
    
    try:
        with open(TOKEN_FILE, "r") as f:
            auth_data = json.load(f)
        
        token = auth_data.get("session_token")
        if token:
            print(f"[DEBUG] Loaded auth token from file: {token[:10]}...")
            return token
        else:
            print("[DEBUG] No token found in auth data")
            return None
    except Exception as e:
        print(f"[ERROR] Failed to load auth token: {str(e)}")
        return None

def clear_auth_token() -> None:
    """
    Clear the saved authentication token file.
    """
    if TOKEN_FILE.exists():
        try:
            os.remove(TOKEN_FILE)
            print(f"[DEBUG] Auth token file {TOKEN_FILE} removed")
        except Exception as e:
            print(f"[ERROR] Failed to remove auth token file: {str(e)}")
    else:
        print(f"[DEBUG] No token file to clear")
