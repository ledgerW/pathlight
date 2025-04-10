from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware
import os
from dotenv import load_dotenv

# Import routers
from app.routers import (
    users_router,
    form_responses_router,
    results_router,
    ai_router,
    payments_router,
    web_router
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
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
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

# Create database tables on startup
@app.on_event("startup")
def on_startup():
    create_db_and_tables()
