"""
This file is a wrapper around the modular payments system.
It imports and re-exports the router from the payments package.
"""

from app.routers.payments import router

# Re-export the router
__all__ = ['router']
