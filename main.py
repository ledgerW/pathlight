from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware
import os
from dotenv import load_dotenv
import time
from starlette.middleware.base import BaseHTTPMiddleware

# Import custom middleware
from app.middleware import AuthHeaderMiddleware

# Import routers
from app.routers import (
    users_router,
    form_responses_router,
    results_router,
    ai_router,
    payments_router,
    web_router,
    auth_router
)

# Import database functions
from app.models import create_db_and_tables

# Load environment variables
load_dotenv()

# Create FastAPI app
app = FastAPI(
    title="Pathlight API",
    description="API for Pathlight life plan generator",
    version="0.1.0"
)

# Add CORS middleware
# When allow_credentials is True, allow_origins cannot be "*"
# Instead, we need to specify the exact origins
origins = [
    "http://localhost",
    "http://localhost:8000",
    "https://pathlight.repl.co",  # Add your production domain here
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files
app.mount("/static", StaticFiles(directory="app/static"), name="static")
app.mount("/assets", StaticFiles(directory="assets"), name="assets")

# Set up templates
templates = Jinja2Templates(directory="app/templates")

# Include routers
app.include_router(users_router)
app.include_router(form_responses_router)
app.include_router(results_router)
app.include_router(ai_router)
app.include_router(payments_router)
app.include_router(web_router)
app.include_router(auth_router)

# Add request logging middleware
class RequestLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Log request details
        path = request.url.path
        method = request.method
        
        # Only log specific paths to avoid cluttering logs
        should_log = (
            path.startswith("/auth") or 
            path.startswith("/results") or 
            path.startswith("/form")
        )
        
        if should_log:
            # Log request details
            print(f"[REQUEST] {method} {path}")
            
            # Log cookies
            cookies = request.cookies
            print(f"[REQUEST COOKIES] {list(cookies.keys())}")
            
            # Log specific cookie if it exists
            if 'stytch_session_token' in cookies:
                token = cookies['stytch_session_token']
                print(f"[REQUEST COOKIE] stytch_session_token: {token[:10]}...")
            
            # Log Authorization header if it exists
            auth_header = request.headers.get('Authorization')
            if auth_header and auth_header.startswith('Bearer '):
                token = auth_header.replace('Bearer ', '')
                print(f"[REQUEST AUTH HEADER] Bearer token: {token[:10]}...")
        
        # Process the request
        start_time = time.time()
        response = await call_next(request)
        process_time = time.time() - start_time
        
        if should_log:
            # Log response details
            print(f"[RESPONSE] {method} {path} - Status: {response.status_code} - Time: {process_time:.4f}s")
            
            # Log response cookies
            if 'set-cookie' in response.headers:
                print(f"[RESPONSE SET-COOKIE] {response.headers['set-cookie']}")
        
        return response

# Add the middlewares to the app
app.add_middleware(AuthHeaderMiddleware)  # Add this first so it runs before logging
app.add_middleware(RequestLoggingMiddleware)

# Create database tables on startup
@app.on_event("startup")
def on_startup():
    create_db_and_tables()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
