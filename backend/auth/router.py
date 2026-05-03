from fastapi import APIRouter
from auth.gmail_oauth import router as gmail_router

# Create the main auth router
router = APIRouter()

# Include the routes you defined in gmail_oauth.py
router.include_router(gmail_router)