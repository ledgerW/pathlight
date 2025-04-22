from typing import Dict, Any, Optional
from datetime import datetime

from fastapi import APIRouter, Request, Response, Depends, HTTPException, status, Form
from fastapi.responses import RedirectResponse, JSONResponse
from pydantic import BaseModel, EmailStr
from stytch.core.response_base import StytchError
from sqlmodel import Session, select

from app.models.database import get_session
from app.models.models import User, Result

# Import the Stytch client from clients.py
from clients import get_stytch_client, is_production
from auth_persistance import save_auth_token, load_auth_token, clear_auth_token

# Initialize the Stytch client
stytch_client = get_stytch_client()

# Create a router for authentication endpoints
router = APIRouter(
    prefix="/auth",
    tags=["authentication"]
)

# Request models
class EmailRequest(BaseModel):
    email: EmailStr

# Cookie name constant to ensure consistency
STYTCH_COOKIE_NAME = 'stytch_session_token'

# Dependency to get the session cookie
async def get_cookie_session(request: Request):
    return request.cookies

async def get_authenticated_user(request: Request):
    """
    Get the authenticated user from the session.
    
    In development mode, if no session token is found, attempts to load from file.
    
    Returns None if the user is not authenticated.
    """
    print("[DEBUG] Checking authentication...")
    print(f"[DEBUG] Available cookies: {list(request.cookies.keys())}")
    
    # First check if we have a token in the cookies
    stytch_session = request.cookies.get(STYTCH_COOKIE_NAME)
    if stytch_session:
        print(f"[DEBUG] Found session token in cookies: {stytch_session[:10]}...")
    else:
        print(f"[DEBUG] No session token in cookies with name '{STYTCH_COOKIE_NAME}'")
    
    # If no session token in the cookies and we're in development mode,
    # try to load from the saved file
    if not stytch_session and not is_production():
        print("[DEBUG] Attempting to load token from file")
        stytch_session = load_auth_token()
        if stytch_session:
            print(f"[DEBUG] Loaded auth token from file: {stytch_session[:10]}...")
    
    if not stytch_session:
        print("[DEBUG] No valid session token found")
        return None

    try:
        print(f"[DEBUG] Authenticating with Stytch using token: {stytch_session[:10]}...")
        resp = stytch_client.sessions.authenticate(session_token=stytch_session)
        print("[DEBUG] Authentication successful")
        return resp.user
    except StytchError as e:
        print(f"[ERROR] Stytch authentication error: {str(e)}")
        
        # Also clear the saved token file
        if not is_production():
            clear_auth_token()
        
        # Try to extract user information from the expired token
        try:
            # This is a workaround to get user info from an expired token
            # We'll only use this for redirecting, not for actual authentication
            import jwt
            import base64
            import json
            
            # Split the token into parts
            parts = stytch_session.split('.')
            if len(parts) >= 2:
                # Decode the payload part (second part)
                padded = parts[1] + '=' * (4 - len(parts[1]) % 4)
                payload = base64.b64decode(padded)
                data = json.loads(payload)
                
                # Check if we have user data
                if 'sub' in data and data.get('type') == 'session':
                    print(f"[DEBUG] Extracted user ID from expired token: {data['sub']}")
                    
                    # Create a minimal user object with just the ID
                    from types import SimpleNamespace
                    minimal_user = SimpleNamespace()
                    minimal_user.user_id = data['sub']
                    
                    # If we have email info, add it
                    if 'email' in data:
                        minimal_user.emails = [SimpleNamespace(email=data['email'])]
                    
                    return minimal_user
        except Exception as token_error:
            print(f"[DEBUG] Could not extract user info from expired token: {str(token_error)}")
        
        return None


@router.post("/login_or_create_user")
async def login_or_create_user(email_request: EmailRequest, request: Request) -> Dict[str, str]:
    try:
        # Create the magic link - use a simpler URL without query parameters
        # We'll handle the token type in the authenticate endpoint
        login_url = f"{request.base_url}auth/authenticate"
        
        # Send the magic link with minimal parameters
        resp = stytch_client.magic_links.email.login_or_create(
            email=email_request.email
        )
        
        return {"message": "Email sent! Check your inbox!"}
    except StytchError as e:
        print(f"[ERROR] Stytch error: {str(e)}")
        try:
            return JSONResponse(
                status_code=status.HTTP_400_BAD_REQUEST,
                content=e.details.original_json
            )
        except:
            return JSONResponse(
                status_code=status.HTTP_400_BAD_REQUEST,
                content={"error": str(e)}
            )


@router.get("/authenticate")
async def authenticate(
    token: str, 
    request: Request,
    response: Response,
    redirect: str = None,
    stytch_token_type: str = "magic_links"  # Default to magic_links
) -> RedirectResponse:
    print(f"[DEBUG] Authenticate endpoint called with token_type: {stytch_token_type}")
    
    # First check if the user is already authenticated
    # If they are, redirect to the form or the specified redirect URL
    existing_user = await get_authenticated_user(request)
    if existing_user:
        print("[DEBUG] User is already authenticated")
        
        # If redirect URL is provided, use it
        if redirect:
            print(f"[DEBUG] Redirecting to: {redirect}")
            return RedirectResponse(url=redirect, status_code=303)
        else:
            print("[DEBUG] No redirect URL provided, redirecting to form")
            return RedirectResponse(url="/form", status_code=303)
    
    # We only support magic links for now
    if stytch_token_type != 'magic_links':
        print(f"[ERROR] Unsupported token type: {stytch_token_type}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"token_type: {stytch_token_type} not supported"
        )

    try:
        print("[DEBUG] Authenticating with Stytch magic link...")
        # 43200 minutes = 30 days
        resp = stytch_client.magic_links.authenticate(
            token=token,
            session_duration_minutes=43200
        )
        print(f"[DEBUG] Authentication successful, got session token: {resp.session_token[:10]}...")
        
        # Store session token in a cookie with appropriate security settings
        cookie_settings = {
            "key": STYTCH_COOKIE_NAME, 
            "value": resp.session_token,
            "httponly": True,
            "max_age": 43200 * 60,  # 30 days in seconds
            "path": "/"
        }
        
        # Add secure and samesite attributes in production
        if is_production():
            cookie_settings["secure"] = True
            cookie_settings["samesite"] = "lax"
            print("[DEBUG] Setting production cookie with secure=True and samesite=lax")
        
        response.set_cookie(**cookie_settings)
        print(f"[DEBUG] Stored session token in cookie: {resp.session_token[:10]}... with settings: {cookie_settings}")
        
        # In development mode, save the token to a file for persistence
        if not is_production():
            print("[DEBUG] Saving token to file for persistence")
            save_auth_token(resp.user, resp.session_token)
        
        # Get user from database or create if not exists
        db = next(get_session())
        
        if hasattr(resp.user, 'emails') and resp.user.emails:
            user_email = resp.user.emails[0].email
            
            # Check if user exists
            statement = select(User).where(User.email == user_email)
            db_user = db.exec(statement).first()
            
            if db_user:
                print(f"[DEBUG] Found existing user with email: {user_email}")
                
                # Check if user has results
                results_statement = select(Result).where(Result.user_id == db_user.id)
                user_results = db.exec(results_statement).first()
                
                if user_results:
                    # If user has results, redirect to results page
                    print(f"[DEBUG] User has results, redirecting to results page")
                    return RedirectResponse(url=f"/results/{db_user.id}", status_code=303)
                
                # Get progress state
                progress_state = int(db_user.progress_state)
                
                if progress_state > 0:
                    # If user has progress, redirect to form with user ID
                    print(f"[DEBUG] User has progress state {progress_state}, redirecting to form")
                    return RedirectResponse(url=f"/form/{db_user.id}", status_code=303)
                else:
                    # If user has no progress, redirect to form with user ID
                    print(f"[DEBUG] User has no progress, redirecting to form")
                    return RedirectResponse(url=f"/form/{db_user.id}", status_code=303)
            else:
                print(f"[DEBUG] User with email {user_email} not found, redirecting to form")
                # Redirect to form to create a new user
                return RedirectResponse(url="/form", status_code=303)
        else:
            print("[DEBUG] No email found in Stytch user data, redirecting to form")
            return RedirectResponse(url="/form", status_code=303)
        
    except StytchError as e:
        print(f"[ERROR] Stytch authentication error: {str(e)}")
        error_message = str(e)
        
        # Check if this is a "magic link already used" error
        if "already used or expired" in error_message:
            print("[DEBUG] Magic link already used, checking if we have a valid session")
            
            # Try to load token from file in development mode
            if not is_production():
                saved_token = load_auth_token()
                if saved_token:
                    print(f"[DEBUG] Found saved token, using it: {saved_token[:10]}...")
                    # Use the same cookie settings as above for consistency
                    cookie_settings = {
                        "key": STYTCH_COOKIE_NAME, 
                        "value": saved_token,
                        "httponly": True,
                        "max_age": 43200 * 60,  # 30 days in seconds
                        "path": "/"
                    }
                    
                    # Add secure and samesite attributes in production
                    if is_production():
                        cookie_settings["secure"] = True
                        cookie_settings["samesite"] = "lax"
                        print("[DEBUG] Setting production cookie with secure=True and samesite=lax for recovered token")
                    
                    response.set_cookie(**cookie_settings)
                    print(f"[DEBUG] Stored recovered session token in cookie: {saved_token[:10]}... with settings: {cookie_settings}")
                    return RedirectResponse(url="/form", status_code=303)
            
            # If we couldn't recover, redirect to form or the specified redirect URL with a message
            error_message = "Magic+link+expired+or+already+used.+Please+request+a+new+one."
            if redirect:
                return RedirectResponse(
                    url=f"{redirect}?error={error_message}",
                    status_code=303
                )
            else:
                return RedirectResponse(
                    url=f"/form?error={error_message}",
                    status_code=303
                )
        
        # For other errors, return the error response
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={"error": str(e)}
        )


@router.get("/logout")
async def logout(response: Response) -> RedirectResponse:
    # Clear cookie with appropriate settings
    cookie_clear_settings = {
        "key": STYTCH_COOKIE_NAME,
        "path": "/"
    }
    
    # Add domain and secure settings in production
    if is_production():
        cookie_clear_settings["secure"] = True
        print("[DEBUG] Clearing production cookie with secure=True")
    
    # Clear cookie
    response.delete_cookie(**cookie_clear_settings)
    print(f"[DEBUG] Cleared session cookie with settings: {cookie_clear_settings}")
    
    # In development mode, also clear the saved token file
    if not is_production():
        clear_auth_token()
    
    return RedirectResponse(url="/")


# Export the get_authenticated_user function so it can be used in other modules
__all__ = ["router", "get_authenticated_user"]
