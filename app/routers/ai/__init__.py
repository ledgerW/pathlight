from fastapi import APIRouter

from .ai_routes import router as routes_router

# Create a combined router for all AI-related endpoints
router = APIRouter(
    prefix="/api/ai",
    tags=["ai"],
)

# Include all the sub-routers
router.include_router(routes_router)
