from fastapi import APIRouter

from .payment_checkout import router as checkout_router
from .payment_verification import router as verification_router
from .subscription_management import router as subscription_router
from .payment_webhooks import router as webhook_router

# Create a combined router for all payment-related endpoints
router = APIRouter(
    prefix="/api/payments",
    tags=["payments"],
)

# Include all the sub-routers
router.include_router(checkout_router)
router.include_router(verification_router)
router.include_router(subscription_router)
router.include_router(webhook_router)
