from fastapi import APIRouter, Request, Depends, HTTPException
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.templating import Jinja2Templates
from sqlmodel import Session, select
from app.models import User, Result, get_session
import uuid
import os

router = APIRouter(tags=["web"])

# Set up templates
templates = Jinja2Templates(directory="app/templates")

@router.get("/", response_class=HTMLResponse)
async def index(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@router.get("/form", response_class=HTMLResponse)
async def form(request: Request):
    return templates.TemplateResponse("form.html", {"request": request})

@router.get("/form/{user_id}", response_class=HTMLResponse)
async def form_with_user(request: Request, user_id: uuid.UUID, session: Session = Depends(get_session)):
    # Check if user exists
    user = session.get(User, user_id)
    if not user:
        return RedirectResponse(url="/form")
    
    return templates.TemplateResponse("form.html", {"request": request, "user_id": user_id})

@router.get("/results/{user_id}", response_class=HTMLResponse)
async def results(request: Request, user_id: uuid.UUID, session: Session = Depends(get_session)):
    # Check if user exists
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if results exist
    statement = select(Result).where(Result.user_id == user_id)
    result = session.exec(statement).first()
    
    if not result:
        # If no results, redirect to form
        return RedirectResponse(url=f"/form/{user_id}")
    
    return templates.TemplateResponse(
        "results.html", 
        {"request": request, "user_id": str(user_id), "payment_complete": user.payment_complete}
    )

@router.get("/success", response_class=HTMLResponse)
async def success(request: Request, session_id: str, user_id: uuid.UUID):
    return templates.TemplateResponse(
        "success.html", 
        {"request": request, "session_id": session_id, "user_id": user_id}
    )

@router.get("/cancel", response_class=HTMLResponse)
async def cancel(request: Request, user_id: uuid.UUID):
    return templates.TemplateResponse(
        "cancel.html", 
        {"request": request, "user_id": user_id}
    )
