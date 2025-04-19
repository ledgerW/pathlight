# Stytch Authentication

Stytch is a developer platform for authentication and user management that provides flexible, secure, and user-friendly authentication solutions.

## Key Features

- **Passwordless Authentication**: Email magic links, SMS passcodes, WhatsApp passcodes
- **OAuth**: Social login with Google, Apple, Microsoft, GitHub, etc.
- **Biometric Authentication**: WebAuthn/Passkeys support
- **Multi-factor Authentication (MFA)**: Add additional security layers
- **Session Management**: Secure, configurable sessions
- **User Management**: Create, update, delete users and manage their authentication methods
- **Organizations**: B2B features for team-based access

## Project Usage Patterns

In our project, Stytch is used for:

1. User authentication via email magic links
2. Session management and token validation
3. User profile management
4. Secure access control to protected routes

## Common Patterns

### Email Magic Link Authentication

```python
import stytch
from fastapi import APIRouter, Request, Response

router = APIRouter()

# Initialize Stytch client
client = stytch.Client(
    project_id="project-live-123",
    secret="secret-live-456",
)

@router.post("/login")
async def login(request: Request):
    data = await request.json()
    email = data.get("email")
    
    try:
        # Send a magic link to the user's email
        response = client.magic_links.email.login_or_create(
            email=email,
            login_magic_link_url="https://example.com/authenticate",
            signup_magic_link_url="https://example.com/authenticate",
        )
        return {"success": True, "message": "Magic link sent"}
    except Exception as e:
        return {"error": str(e)}

@router.get("/authenticate")
async def authenticate(request: Request, response: Response, token: str):
    try:
        # Authenticate the magic link token
        auth_response = client.magic_links.authenticate(token=token)
        
        # Set session cookie
        response.set_cookie(
            key="stytch_session",
            value=auth_response.session_token,
            httponly=True,
            secure=True,
            samesite="lax",
            max_age=86400,  # 24 hours
        )
        
        return {"success": True, "user_id": auth_response.user_id}
    except Exception as e:
        return {"error": str(e)}
```

### Session Validation Middleware

```python
from fastapi import Depends, HTTPException, Request
from functools import wraps

async def get_current_user(request: Request):
    session_token = request.cookies.get("stytch_session")
    
    if not session_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    try:
        # Validate the session
        response = client.sessions.authenticate(session_token=session_token)
        return response.user
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid session")

# Use as a dependency in protected routes
@router.get("/profile")
async def get_profile(user = Depends(get_current_user)):
    return {"user_id": user.user_id, "email": user.emails[0].email}
```

### OAuth Integration

```python
@router.get("/oauth/start")
async def start_oauth(request: Request, provider: str):
    try:
        # Start OAuth flow
        redirect_url = client.oauth.start(
            provider=provider,
            redirect_url="https://example.com/oauth/callback",
        )
        return {"redirect_url": redirect_url}
    except Exception as e:
        return {"error": str(e)}

@router.get("/oauth/callback")
async def oauth_callback(request: Request, response: Response, token: str):
    try:
        # Authenticate the OAuth token
        auth_response = client.oauth.authenticate(token=token)
        
        # Set session cookie
        response.set_cookie(
            key="stytch_session",
            value=auth_response.session_token,
            httponly=True,
            secure=True,
            samesite="lax",
            max_age=86400,  # 24 hours
        )
        
        return {"success": True, "user_id": auth_response.user_id}
    except Exception as e:
        return {"error": str(e)}
```

### Logout

```python
@router.post("/logout")
async def logout(request: Request, response: Response):
    session_token = request.cookies.get("stytch_session")
    
    if session_token:
        try:
            # Revoke the session
            client.sessions.revoke(session_token=session_token)
        except Exception:
            pass
    
    # Clear the session cookie
    response.delete_cookie(key="stytch_session")
    
    return {"success": True}
```

## Project-Specific Examples

From our project's `app/routers/auth.py`:

```python
@router.post("/login")
async def login(request: Request):
    # Process login request with Stytch
    # ...
```

## Documentation Links

- [Stytch Documentation](https://stytch.com/docs)
- [Stytch API Reference](https://stytch.com/docs/api)
- [Stytch Python SDK](https://github.com/stytchauth/stytch-python)
- [Stytch Magic Links](https://stytch.com/docs/api/magic-links-overview)
- [Stytch OAuth](https://stytch.com/docs/api/oauth-overview)
- [Stytch Sessions](https://stytch.com/docs/api/session-management)
