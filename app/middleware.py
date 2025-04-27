from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

class AuthHeaderMiddleware(BaseHTTPMiddleware):
    """
    Middleware to check for Authorization header and set the appropriate cookie.
    
    This helps bridge the gap between localStorage token storage and cookie-based authentication.
    """
    
    def __init__(self, app: ASGIApp):
        super().__init__(app)
    
    async def dispatch(self, request: Request, call_next):
        # Check if there's an Authorization header
        auth_header = request.headers.get('Authorization')
        if auth_header and auth_header.startswith('Bearer '):
            # Extract the token
            token = auth_header.replace('Bearer ', '')
            print(f"[DEBUG] Found token in Authorization header: {token[:10]}...")
            
            # Store it in the request state for use in get_authenticated_user
            request.state.auth_token = token
        else:
            request.state.auth_token = None
        
        # Continue processing the request
        response = await call_next(request)
        return response
