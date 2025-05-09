"""
This file is a wrapper around the modular AI system.
It imports and re-exports the router from the ai package.
"""

from app.routers.ai import router

# Re-export the router
__all__ = ['router']
