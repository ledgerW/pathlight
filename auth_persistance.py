"""
This module previously handled file-based token storage for development mode.
It has been deprecated in favor of browser-based token storage with Authorization headers.

The functions are kept as stubs to maintain compatibility with existing code.
"""

from typing import Optional, Any

def save_auth_token(user_data: Any, session_token: str) -> None:
    """
    Stub function that previously saved authentication token to a local file.
    This functionality has been deprecated.
    
    Args:
        user_data: User data from Stytch
        session_token: The Stytch session token
    """
    print("[DEBUG] File-based token storage has been deprecated")
    pass

def load_auth_token() -> Optional[str]:
    """
    Stub function that previously loaded authentication token from a local file.
    This functionality has been deprecated.
    
    Returns:
        None always
    """
    print("[DEBUG] File-based token storage has been deprecated")
    return None

def clear_auth_token() -> None:
    """
    Stub function that previously cleared the saved authentication token file.
    This functionality has been deprecated.
    """
    print("[DEBUG] File-based token storage has been deprecated")
    pass
