from fastapi import APIRouter, Request, Depends, HTTPException
from fastapi.responses import HTMLResponse, RedirectResponse, FileResponse
from fastapi.templating import Jinja2Templates
from sqlmodel import Session, select
from app.models import User, Result, get_session
import uuid
import os
import pathlib

from app.routers.auth import get_authenticated_user

router = APIRouter(tags=["web"])

# Set up templates
templates = Jinja2Templates(directory="app/templates")

# SEO routes
@router.get("/robots.txt", response_class=FileResponse)
async def get_robots_txt():
    """Serve robots.txt file"""
    return FileResponse("app/static/robots.txt", media_type="text/plain")

@router.get("/sitemap.xml", response_class=FileResponse)
async def get_sitemap_xml():
    """Serve sitemap.xml file"""
    return FileResponse("app/static/sitemap.xml", media_type="application/xml")

@router.get("/favicon.ico", response_class=FileResponse)
async def get_favicon():
    """Serve favicon.ico file (using the existing PNG favicon)"""
    return FileResponse("app/static/images/pathlight_favicon.png", media_type="image/x-icon")

@router.get("/research", response_class=HTMLResponse)
async def research(request: Request):
    """Show the research page with information about the 25 questions methodology"""
    return templates.TemplateResponse("research.html", {"request": request})

# Blog routes
@router.get("/blog", response_class=HTMLResponse)
async def blog_index(request: Request, category: str = None, tag: str = None, page: int = 1):
    """Show the blog index page with optional category or tag filtering"""
    return templates.TemplateResponse("blog/index.html", {
        "request": request,
        "category": category,
        "tag": tag,
        "page": page
    })

@router.get("/blog/posts/{post_slug}", response_class=HTMLResponse)
async def blog_post(request: Request, post_slug: str):
    """Show a specific blog post"""
    # In a real implementation, we would fetch the post data from a database
    # For now, we'll just render the template directly
    try:
        return templates.TemplateResponse(f"blog/posts/{post_slug}.html", {
            "request": request,
            "post_slug": post_slug
        })
    except Exception as e:
        # If the post doesn't exist, redirect to the blog index
        print(f"Blog post not found: {post_slug}, error: {str(e)}")
        return RedirectResponse(url="/blog", status_code=303)

# Guides routes
@router.get("/guides", response_class=HTMLResponse)
async def guides_index(request: Request, category: str = None, page: int = 1):
    """Show the guides index page with optional category filtering"""
    return templates.TemplateResponse("guides/index.html", {
        "request": request,
        "category": category,
        "page": page
    })

@router.get("/guides/items/{guide_slug}", response_class=HTMLResponse)
async def guide_item(request: Request, guide_slug: str):
    """Show a specific guide"""
    # In a real implementation, we would fetch the guide data from a database
    # For now, we'll just render the template directly
    try:
        return templates.TemplateResponse(f"guides/items/{guide_slug}.html", {
            "request": request,
            "guide_slug": guide_slug
        })
    except Exception as e:
        # If the guide doesn't exist, redirect to the guides index
        print(f"Guide not found: {guide_slug}, error: {str(e)}")
        return RedirectResponse(url="/guides", status_code=303)

# FAQ routes
@router.get("/faq", response_class=HTMLResponse)
async def faq_index(request: Request):
    """Show the FAQ index page"""
    return templates.TemplateResponse("faq/index.html", {
        "request": request
    })

@router.get("/faq/categories/{category}", response_class=HTMLResponse)
async def faq_category(request: Request, category: str):
    """Show a specific FAQ category"""
    try:
        return templates.TemplateResponse(f"faq/categories/{category}.html", {
            "request": request,
            "category": category
        })
    except Exception as e:
        # If the category doesn't exist, redirect to the FAQ index
        print(f"FAQ category not found: {category}, error: {str(e)}")
        return RedirectResponse(url="/faq", status_code=303)

@router.get("/", response_class=HTMLResponse)
async def index(request: Request):
    """
    Show the home page or redirect to user's results/form if authenticated
    
    If the user is authenticated via Stytch, try to find their account
    and redirect to their results or form page
    """
    # Check if user is authenticated
    stytch_user = await get_authenticated_user(request)
    
    if stytch_user and hasattr(stytch_user, 'emails') and stytch_user.emails:
        # User is authenticated, check if they exist in our database
        db = next(get_session())
        user_email = stytch_user.emails[0].email
        
        statement = select(User).where(User.email == user_email)
        db_user = db.exec(statement).first()
        
        if db_user:
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
                # User exists with progress, redirect to their form with progress
                print(f"[DEBUG] User has progress, redirecting to form page")
                return RedirectResponse(url=f"/form/{db_user.id}", status_code=303)
            
            # User exists but has no progress or results, redirect to their form
            return RedirectResponse(url=f"/form/{db_user.id}", status_code=303)
    
    # If not authenticated or user not found, show the home page
    return templates.TemplateResponse("index.html", {"request": request})

@router.get("/register", response_class=HTMLResponse)
async def register(request: Request):
    """Redirect to form page as we're using the form for registration now"""
    return RedirectResponse(url="/form")

@router.get("/login", response_class=HTMLResponse)
async def login(request: Request, redirect: str = None):
    """
    Show the login page with magic link form or redirect if already authenticated
    
    If the user is already authenticated, redirect to their results or form page
    """
    # Check if user is authenticated
    stytch_user = await get_authenticated_user(request)
    
    if stytch_user and hasattr(stytch_user, 'emails') and stytch_user.emails:
        # User is authenticated, check if they exist in our database
        db = next(get_session())
        user_email = stytch_user.emails[0].email
        
        statement = select(User).where(User.email == user_email)
        db_user = db.exec(statement).first()
        
        if db_user:
            # If redirect URL is provided, use it
            if redirect:
                print(f"[DEBUG] Redirecting to: {redirect}")
                return RedirectResponse(url=redirect, status_code=303)
            
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
                # User exists with progress, redirect to their form with progress
                print(f"[DEBUG] User has progress, redirecting to form page")
                return RedirectResponse(url=f"/form/{db_user.id}", status_code=303)
    
    # If not authenticated or user not found, show the login page
    return templates.TemplateResponse("login.html", {"request": request, "redirect": redirect})

@router.get("/form", response_class=HTMLResponse)
async def form(request: Request):
    """
    Show the form page for new users or authenticated users
    
    If the user is authenticated via Stytch, try to find their account
    and redirect to their form with progress
    """
    # Check if user is authenticated
    stytch_user = await get_authenticated_user(request)
    
    if stytch_user and hasattr(stytch_user, 'emails') and stytch_user.emails:
        # User is authenticated, check if they exist in our database
        db = next(get_session())
        user_email = stytch_user.emails[0].email
        
        statement = select(User).where(User.email == user_email)
        db_user = db.exec(statement).first()
        
        if db_user:
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
                # User exists with progress, redirect to their form with progress
                return RedirectResponse(url=f"/form/{db_user.id}", status_code=303)
            else:
                # User exists but has no progress, redirect to their form
                return RedirectResponse(url=f"/form/{db_user.id}", status_code=303)
    
    # If not authenticated or user not found, show the form for new users
    return templates.TemplateResponse("form.html", {"request": request})

@router.get("/form/{user_id}", response_class=HTMLResponse)
async def form_with_user(request: Request, user_id: uuid.UUID, session: Session = Depends(get_session)):
    # Check if user exists
    user = session.get(User, user_id)
    if not user:
        return RedirectResponse(url="/register")
    
    # Check if user is authenticated
    stytch_user = await get_authenticated_user(request)
    
    # If user is not authenticated, redirect to login
    if not stytch_user:
        return RedirectResponse(url=f"/login?redirect=/form/{user_id}", status_code=303)
    
    # If user is authenticated, check if the email matches
    if stytch_user and hasattr(stytch_user, 'emails') and stytch_user.emails:
        stytch_email = stytch_user.emails[0].email
        
        # If the authenticated user's email doesn't match the requested user's email,
        # redirect to their own form
        if stytch_email != user.email:
            # Find the user with the authenticated email
            statement = select(User).where(User.email == stytch_email)
            auth_user = session.exec(statement).first()
            
            if auth_user:
                return RedirectResponse(url=f"/form/{auth_user.id}", status_code=303)
    
    # Get current progress
    progress = int(user.progress_state)
    
    # Determine if user is in basic or premium phase
    phase = "basic" if progress < 5 else "premium"
    
    # Check if user has completed basic phase and paid
    basic_complete = progress >= 5 and user.payment_tier != "none"
    
    # Check if user has completed premium phase
    premium_complete = progress >= 25
    
    return templates.TemplateResponse(
        "form.html", 
        {
            "request": request, 
            "user_id": user_id,
            "progress": progress,
            "phase": phase,
            "basic_complete": basic_complete,
            "premium_complete": premium_complete,
            "payment_tier": user.payment_tier
        }
    )

@router.get("/results/{user_id}", response_class=HTMLResponse)
async def results(
    request: Request, 
    user_id: uuid.UUID, 
    payment_success: bool = False,
    tier: str = None,
    session: Session = Depends(get_session)
):
    # Check if user exists
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if user is authenticated
    stytch_user = await get_authenticated_user(request)
    
    # If user is not authenticated, redirect to login
    if not stytch_user:
        return RedirectResponse(url=f"/login?redirect=/results/{user_id}", status_code=303)
    
    # If user is authenticated, check if the email matches
    if stytch_user and hasattr(stytch_user, 'emails') and stytch_user.emails:
        stytch_email = stytch_user.emails[0].email
        
        # If the authenticated user's email doesn't match the requested user's email,
        # redirect to their own results or form
        if stytch_email != user.email:
            # Find the user with the authenticated email
            statement = select(User).where(User.email == stytch_email)
            auth_user = session.exec(statement).first()
            
            if auth_user:
                # Check if authenticated user has results
                auth_results_statement = select(Result).where(Result.user_id == auth_user.id)
                auth_results = session.exec(auth_results_statement).first()
                
                if auth_results:
                    return RedirectResponse(url=f"/results/{auth_user.id}", status_code=303)
                else:
                    return RedirectResponse(url=f"/form/{auth_user.id}", status_code=303)
    
    # If payment was successful, update the user's payment tier
    if payment_success and tier and tier in ["basic", "premium"]:
        # Only update if the new tier is higher than the current tier
        if (tier == "premium" or user.payment_tier == "none"):
            user.payment_tier = tier
            session.add(user)
            session.commit()
            
            # Log the payment success
            print(f"[DEBUG] Payment successful for user {user_id}, tier: {tier}")
    
    # Check if results exist
    statement = select(Result).where(Result.user_id == user_id)
    result = session.exec(statement).first()
    
    if not result:
        # If no results, redirect to form
        return RedirectResponse(url=f"/form/{user_id}")
    
    # Get current progress
    progress = int(user.progress_state)
    
    return templates.TemplateResponse(
        "results.html", 
        {
            "request": request, 
            "user_id": str(user_id), 
            "payment_tier": user.payment_tier,
            "progress": progress,
            "show_upgrade": user.payment_tier == "basic" and progress >= 5
        }
    )

@router.get("/success", response_class=HTMLResponse)
async def success(request: Request, session_id: str, user_id: uuid.UUID, tier: str):
    return templates.TemplateResponse(
        "success.html", 
        {"request": request, "session_id": session_id, "user_id": user_id, "tier": tier}
    )

@router.get("/payment-success", response_class=HTMLResponse)
async def payment_success(request: Request, user_id: uuid.UUID, tier: str, email: str):
    """Show a success page after payment with instructions to check email for magic link"""
    return templates.TemplateResponse(
        "payment_success.html", 
        {"request": request, "user_id": user_id, "tier": tier, "email": email}
    )

@router.get("/account/{user_id}", response_class=HTMLResponse)
async def account(request: Request, user_id: uuid.UUID, session: Session = Depends(get_session)):
    """Show the account page for a user"""
    # Check if user exists
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if user is authenticated
    stytch_user = await get_authenticated_user(request)
    
    # If user is not authenticated, redirect to login
    if not stytch_user:
        return RedirectResponse(url=f"/login?redirect=/account/{user_id}", status_code=303)
    
    # If user is authenticated, check if the email matches
    if stytch_user and hasattr(stytch_user, 'emails') and stytch_user.emails:
        stytch_email = stytch_user.emails[0].email
        
        # If the authenticated user's email doesn't match the requested user's email,
        # redirect to their own account
        if stytch_email != user.email:
            # Find the user with the authenticated email
            statement = select(User).where(User.email == stytch_email)
            auth_user = session.exec(statement).first()
            
            if auth_user:
                return RedirectResponse(url=f"/account/{auth_user.id}", status_code=303)
    
    return templates.TemplateResponse(
        "account.html", 
        {
            "request": request, 
            "user": user,
            "user_id": user_id,
            "payment_tier": user.payment_tier
        }
    )

@router.get("/start-purpose", response_class=HTMLResponse)
async def start_purpose(request: Request):
    """
    Start with the Purpose tier (free)
    Redirects to the form with a query parameter indicating it's the Purpose tier
    """
    return RedirectResponse(url="/form?tier=purpose", status_code=303)

@router.get("/start-plan", response_class=HTMLResponse)
async def start_plan(request: Request):
    """
    Start with the Plan tier ($4.99 one-time)
    Redirects to account creation with Plan payment
    """
    # Check if user is authenticated
    stytch_user = await get_authenticated_user(request)
    
    if stytch_user and hasattr(stytch_user, 'emails') and stytch_user.emails:
        # User is authenticated, check if they exist in our database
        db = next(get_session())
        user_email = stytch_user.emails[0].email
        
        statement = select(User).where(User.email == user_email)
        db_user = db.exec(statement).first()
        
        if db_user:
            # Check if user has already paid for Plan or Pursuit
            if db_user.payment_tier in ["plan", "pursuit"]:
                # User has already paid, redirect to form
                return RedirectResponse(url=f"/form/{db_user.id}?tier=plan&paid=true", status_code=303)
            else:
                # User exists but hasn't paid for Plan, redirect to payment
                return RedirectResponse(url=f"/api/payments/{db_user.id}/create-checkout-session/plan", status_code=303)
    
    # User is not authenticated or doesn't exist, show account creation form with Plan payment
    return templates.TemplateResponse(
        "form.html", 
        {
            "request": request,
            "tier": "plan",
            "show_account_creation": True
        }
    )

@router.get("/start-pursuit", response_class=HTMLResponse)
async def start_pursuit(request: Request):
    """
    Start with the Pursuit tier ($4.99/month subscription)
    Redirects to account creation with Pursuit subscription payment
    """
    # Check if user is authenticated
    stytch_user = await get_authenticated_user(request)
    
    if stytch_user and hasattr(stytch_user, 'emails') and stytch_user.emails:
        # User is authenticated, check if they exist in our database
        db = next(get_session())
        user_email = stytch_user.emails[0].email
        
        statement = select(User).where(User.email == user_email)
        db_user = db.exec(statement).first()
        
        if db_user:
            # Check if user has already paid for Pursuit
            if db_user.payment_tier == "pursuit":
                # User has already paid for Pursuit, redirect to form
                return RedirectResponse(url=f"/form/{db_user.id}?tier=pursuit&paid=true", status_code=303)
            else:
                # User exists but hasn't paid for Pursuit, redirect to payment
                return RedirectResponse(url=f"/api/payments/{db_user.id}/create-checkout-session/pursuit?is_subscription=true", status_code=303)
    
    # User is not authenticated or doesn't exist, show account creation form with Pursuit payment
    return templates.TemplateResponse(
        "form.html", 
        {
            "request": request,
            "tier": "pursuit",
            "show_account_creation": True,
            "is_subscription": True
        }
    )

@router.get("/cancel", response_class=HTMLResponse)
async def cancel(request: Request, user_id: uuid.UUID):
    return templates.TemplateResponse(
        "cancel.html", 
        {"request": request, "user_id": user_id}
    )
