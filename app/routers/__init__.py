from app.routers.users import router as users_router
from app.routers.form_responses import router as form_responses_router
from app.routers.results import router as results_router
from app.routers.ai import router as ai_router
from app.routers.payments import router as payments_router
from app.routers.web import router as web_router
from app.routers.auth import router as auth_router

__all__ = [
    "users_router",
    "form_responses_router",
    "results_router",
    "ai_router",
    "payments_router",
    "web_router",
    "auth_router"
]
