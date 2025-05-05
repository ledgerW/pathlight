from typing import Dict, Any, Optional
from datetime import datetime

from fastapi import APIRouter, Request, Response, Depends, HTTPException, status, Form
from fastapi.responses import RedirectResponse, JSONResponse, HTMLResponse
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel, EmailStr
from stytch.core.response_base import StytchError
from sqlmodel import Session, select

from app.models.database import get_session
from app.models.models import User, Result

# Import the Stytch client from clients.py
from clients import get_stytch_client, is_production

# Initialize the Stytch client
stytch_client = get_stytch_client()

# Initialize templates
templates = Jinja2Templates(directory="app/templates")

# Create a router for authentication endpoints
router = APIRouter(
    prefix="/auth",
    tags=["authentication"]
)

# Request models
class EmailRequest(BaseModel):
    email: EmailStr

# Cookie name constants to ensure consistency
STYTCH_COOKIE_NAME = 'stytch_session_token'
STYTCH_SESSION_JS_COOKIE_NAME = 'stytch_session_js'  # Non-HTTP-only cookie for JS access

# Debug function to log cookie operations
def log_cookie_operation(operation, settings):
    """Log cookie operations with detailed settings for debugging"""
    print(f"[DEBUG] Cookie {operation} operation with settings:")
    for key, value in settings.items():
        if key == 'value' and value and isinstance(value, str):
            # Truncate token value for security
            print(f"[DEBUG]   {key}: {value[:10]}...")
        else:
            print(f"[DEBUG]   {key}: {value}")

# Dependency to get the session cookie
async def get_cookie_session(request: Request):
    return request.cookies

async def get_authenticated_user(request: Request):
    """
    Get the authenticated user from the session.
    
    Checks multiple sources for the authentication token:
    1. Cookies
    2. Request state (set by AuthHeaderMiddleware from Authorization header)
    
    Returns None if the user is not authenticated.
    """
    print("[DEBUG] Checking authentication...")
    print(f"[DEBUG] Available cookies: {list(request.cookies.keys())}")
    
    # Track the source of the token for debugging
    token_source = None
    
    # First check if we have a token in the cookies
    stytch_session = request.cookies.get(STYTCH_COOKIE_NAME)
    if stytch_session:
        print(f"[DEBUG] Found session token in cookies: {stytch_session[:10]}...")
        token_source = "cookie"
    else:
        print(f"[DEBUG] No session token in cookies with name '{STYTCH_COOKIE_NAME}'")
        
        # Check if token is in request state (set by AuthHeaderMiddleware)
        if hasattr(request.state, 'auth_token') and request.state.auth_token:
            stytch_session = request.state.auth_token
            print(f"[DEBUG] Found session token in request state (Authorization header): {stytch_session[:10]}...")
            token_source = "auth_header"
        else:
            print("[DEBUG] No session token in request state")
    
    if not stytch_session:
        print("[DEBUG] No valid session token found")
        return None

    try:
        print(f"[DEBUG] Authenticating with Stytch using token from {token_source}: {stytch_session[:10]}...")
        
        # Use the appropriate Stytch method based on the token format
        # If the token starts with 'session-', it's a session token
        # Otherwise, it might be a JWT
        if stytch_session.startswith('session-'):
            resp = stytch_client.sessions.authenticate(session_token=stytch_session)
        else:
            # Try JWT authentication as a fallback
            try:
                resp = stytch_client.sessions.authenticate_jwt(session_jwt=stytch_session)
                print("[DEBUG] Successfully authenticated with JWT")
            except Exception as jwt_error:
                print(f"[DEBUG] JWT authentication failed, falling back to session token: {str(jwt_error)}")
                resp = stytch_client.sessions.authenticate(session_token=stytch_session)
        
        print("[DEBUG] Authentication successful")
        return resp.user
    except StytchError as e:
        print(f"[ERROR] Stytch authentication error with token from {token_source}: {str(e)}")
        
        # If the token was from an Authorization header and failed, try to recreate a session
        if token_source == "auth_header":
            print("[DEBUG] Session not found for Authorization header token, attempting to recreate session")
            
            # Check if this is a temporary token we created for anonymous users
            if stytch_session.startswith('temp-token-'):
                try:
                    # Extract the user ID from the token
                    user_id = stytch_session.replace('temp-token-', '')
                    print(f"[DEBUG] Found temporary token with user ID: {user_id}")
                    
                    # Verify this is a valid UUID
                    import uuid
                    try:
                        user_uuid = uuid.UUID(user_id)
                        print(f"[DEBUG] Valid UUID: {user_uuid}")
                        
                        # Check if this user exists in the database
                        from sqlmodel import Session, select
                        from app.models.database import get_session
                        from app.models.models import User
                        
                        db = next(get_session())
                        statement = select(User).where(User.id == user_uuid)
                        db_user = db.exec(statement).first()
                        
                        if db_user:
                            print(f"[DEBUG] Found user in database: {db_user.email}")
                            
                            # Create a minimal user object with the ID and email
                            from types import SimpleNamespace
                            minimal_user = SimpleNamespace()
                            minimal_user.user_id = user_id
                            minimal_user.emails = [SimpleNamespace(email=db_user.email)]
                            
                            return minimal_user
                    except ValueError:
                        print(f"[DEBUG] Invalid UUID in temporary token: {user_id}")
                except Exception as temp_token_error:
                    print(f"[DEBUG] Error processing temporary token: {str(temp_token_error)}")
            
            # Try to extract user information from the token
            try:
                # This is a workaround to get user info from the token
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
                    
                    print(f"[DEBUG] Extracted token payload: {data}")
                    
                    # Check if we have user data
                    if 'sub' in data:
                        user_id = data['sub']
                        print(f"[DEBUG] Extracted user ID from token: {user_id}")
                        
                        # Create a minimal user object with just the ID
                        from types import SimpleNamespace
                        minimal_user = SimpleNamespace()
                        minimal_user.user_id = user_id
                        
                        # If we have email info, add it
                        if 'email' in data:
                            minimal_user.emails = [SimpleNamespace(email=data['email'])]
                            print(f"[DEBUG] Extracted email from token: {data['email']}")
                        
                        return minimal_user
            except Exception as token_error:
                print(f"[DEBUG] Could not extract user info from token: {str(token_error)}")
        
        return None


@router.post("/login_or_create_user")
async def login_or_create_user(email_request: EmailRequest, request: Request) -> Dict[str, str]:
    try:
        # Create the magic link URL with the proper base URL
        login_magic_link_url = f"{request.base_url}auth/authenticate"
        
        print(f"[DEBUG] Magic link URL: {login_magic_link_url}")
        
        # Send the magic link with explicit URLs
        resp = stytch_client.magic_links.email.login_or_create(
            email=email_request.email,
            login_magic_link_url=login_magic_link_url,
            signup_magic_link_url=login_magic_link_url
        )
        
        print(f"[DEBUG] Magic link email sent to: {email_request.email}")
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
):
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
        
        # Get the session JWT as well, which might be more compatible with some browsers
        session_jwt = None
        try:
            # Try to get the JWT from the session
            jwt_resp = stytch_client.sessions.exchange_session_token(
                session_token=resp.session_token
            )
            session_jwt = jwt_resp.session_jwt
            print(f"[DEBUG] Got session JWT: {session_jwt[:10]}...")
        except Exception as jwt_error:
            print(f"[DEBUG] Failed to get session JWT: {str(jwt_error)}")
        
        # Store session token in a HTTP-only cookie with appropriate security settings
        cookie_settings = {
            "key": STYTCH_COOKIE_NAME, 
            "value": resp.session_token,
            "httponly": True,
            "max_age": 43200 * 60,  # 30 days in seconds
            "path": "/",
            # Always set samesite to "lax" to allow cookies to be sent with same-site navigations
            # This is important for magic links which navigate from email to the site
            "samesite": "lax"
        }
        
        # Also set a non-HTTP-only cookie for JavaScript access
        js_cookie_settings = {
            "key": STYTCH_SESSION_JS_COOKIE_NAME, 
            "value": "true",  # Just a flag, not the actual token
            "httponly": False,
            "max_age": 43200 * 60,  # 30 days in seconds
            "path": "/",
            "samesite": "lax"
        }
        
        # Add secure attribute in production
        if is_production():
            cookie_settings["secure"] = True
            js_cookie_settings["secure"] = True
            print("[DEBUG] Setting production cookies with secure=True")
        
        # Log the cookie operations
        log_cookie_operation("set (http-only)", cookie_settings)
        log_cookie_operation("set (js-accessible)", js_cookie_settings)
        
        # Set the cookies
        response.set_cookie(**cookie_settings)
        response.set_cookie(**js_cookie_settings)
        
        # Extract user information
        user_id = None
        user_email = None
        
        if hasattr(resp.user, 'user_id'):
            user_id = resp.user.user_id
            
        if hasattr(resp.user, 'emails') and resp.user.emails:
            user_email = resp.user.emails[0].email
        
        # Get user from database or create if not exists
        db = next(get_session())
        
        # Determine the redirect URL based on user state
        redirect_url = "/form"  # Default redirect
        
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
                    redirect_url = f"/results/{db_user.id}"
                else:
                    # Get progress state
                    progress_state = int(db_user.progress_state)
                    
                    if progress_state > 0:
                        # If user has progress, redirect to form with user ID
                        print(f"[DEBUG] User has progress state {progress_state}, redirecting to form")
                        redirect_url = f"/form/{db_user.id}"
                    else:
                        # If user has no progress, redirect to form with user ID
                        print(f"[DEBUG] User has no progress, redirecting to form")
                        redirect_url = f"/form/{db_user.id}"
            else:
                print(f"[DEBUG] User with email {user_email} not found, redirecting to form")
        else:
            print("[DEBUG] No email found in Stytch user data, redirecting to form")
        
        # Render the authentication template with the token and redirect URL
        # This will store the token in localStorage and then redirect
        return templates.TemplateResponse(
            "authenticate.html",
            {
                "request": request,
                "session_token": resp.session_token,
                "session_created": datetime.now().isoformat(),
                "user_id": getattr(resp.user, "user_id", None) if hasattr(resp.user, "user_id") else None,
                "user_email": user_email if hasattr(resp.user, 'emails') and resp.user.emails else None,
                "redirect_url": redirect_url
            }
        )
        
    except StytchError as e:
        print(f"[ERROR] Stytch authentication error: {str(e)}")
        error_message = str(e)
        
        # Check if this is a "magic link already used" error
        if "already used or expired" in error_message:
            print("[DEBUG] Magic link already used")
            
            # Redirect to form or the specified redirect URL with a message
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
async def logout(request: Request):
    # Create a response with the logout template
    response = templates.TemplateResponse("logout.html", {"request": request})
    
    # Clear HTTP-only cookie
    cookie_clear_settings = {
        "key": STYTCH_COOKIE_NAME,
        "path": "/",
        # Always set samesite to "lax" for consistency with set operations
        "samesite": "lax"
    }
    
    # Clear JS-accessible cookie
    js_cookie_clear_settings = {
        "key": STYTCH_SESSION_JS_COOKIE_NAME,
        "path": "/",
        "samesite": "lax"
    }
    
    # Add secure setting in production
    if is_production():
        cookie_clear_settings["secure"] = True
        js_cookie_clear_settings["secure"] = True
        print("[DEBUG] Clearing production cookies with secure=True")
    
    # Log the cookie operations
    log_cookie_operation("delete (http-only)", cookie_clear_settings)
    log_cookie_operation("delete (js-accessible)", js_cookie_clear_settings)
    
    # Clear cookies on the response
    response.delete_cookie(**cookie_clear_settings)
    response.delete_cookie(**js_cookie_clear_settings)
    
    # Add a debug message to verify cookie deletion
    print("[DEBUG] Cookies should be deleted now")
    
    return response


# Add a session check endpoint
@router.get("/check-session")
async def check_session(request: Request, response: Response):
    """
    Check if the user has a valid session.
    Returns user information if authenticated, or an error if not.
    This endpoint can be called by frontend JavaScript to verify session status.
    """
    # Log the request headers for debugging
    auth_header = request.headers.get('Authorization')
    if auth_header:
        print(f"[DEBUG] Authorization header present: {auth_header[:20]}...")
    else:
        print("[DEBUG] No Authorization header present")
    
    user = await get_authenticated_user(request)
    if user:
        # Return minimal user info (no sensitive data)
        user_data = {
            "authenticated": True,
            "user_id": getattr(user, "user_id", None)
        }
        
        # Add email if available
        if hasattr(user, "emails") and user.emails:
            user_data["email"] = user.emails[0].email
        
        # If the request came with an Authorization header but no cookie,
        # try to set the cookie from the token in the header
        if auth_header and auth_header.startswith('Bearer ') and not request.cookies.get(STYTCH_COOKIE_NAME):
            token = auth_header.replace('Bearer ', '')
            print(f"[DEBUG] Setting cookie from Authorization header token: {token[:10]}...")
            
            # Set the HTTP-only cookie
            cookie_settings = {
                "key": STYTCH_COOKIE_NAME, 
                "value": token,
                "httponly": True,
                "max_age": 43200 * 60,  # 30 days in seconds
                "path": "/",
                "samesite": "lax"
            }
            
            # Set the JS-accessible cookie
            js_cookie_settings = {
                "key": STYTCH_SESSION_JS_COOKIE_NAME, 
                "value": "true",
                "httponly": False,
                "max_age": 43200 * 60,  # 30 days in seconds
                "path": "/",
                "samesite": "lax"
            }
            
            # Add secure attribute in production
            if is_production():
                cookie_settings["secure"] = True
                js_cookie_settings["secure"] = True
            
            # Log the cookie operations
            log_cookie_operation("set from auth header (http-only)", cookie_settings)
            log_cookie_operation("set from auth header (js-accessible)", js_cookie_settings)
            
            # Set the cookies
            response.set_cookie(**cookie_settings)
            response.set_cookie(**js_cookie_settings)
            
        return user_data
    else:
        return {"authenticated": False}

# Export the get_authenticated_user function so it can be used in other modules
__all__ = ["router", "get_authenticated_user"]
