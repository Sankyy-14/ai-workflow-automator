import os
from fastapi import APIRouter
from fastapi.responses import RedirectResponse
from db.state import TOKENS, FLOWS
from google_auth_oauthlib.flow import Flow
from dotenv import load_dotenv

load_dotenv()

router = APIRouter()

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8000")

SCOPES = [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.compose",
]

# Store flow between requests
FLOWS = {}

@router.get("/gmail")
async def gmail_auth():
    redirect_uri = f"{BACKEND_URL}/auth/callback"
    flow = Flow.from_client_secrets_file(
        "credentials.json",
        scopes=SCOPES,
        redirect_uri=redirect_uri,
    )
    auth_url, state = flow.authorization_url(
        access_type="offline",
        prompt="consent",
    )
    # Store flow object to reuse in callback
    FLOWS[state] = flow
    return RedirectResponse(auth_url)

@router.get("/callback")
async def gmail_callback(code: str, state: str):
    try:
        # Reuse the same flow object from /gmail
        if state not in FLOWS:
            return RedirectResponse(f"{FRONTEND_URL}?auth=error&message=State not found")
        
        flow = FLOWS[state]
        flow.fetch_token(code=code)
        creds = flow.credentials

        token_data = {
            "token": creds.token,
            "refresh_token": creds.refresh_token,
            "token_uri": creds.token_uri,
            "client_id": creds.client_id,
            "client_secret": creds.client_secret,
            "scopes": list(creds.scopes) if creds.scopes else [],
        }
        TOKENS["user_token"] = token_data

        # Clean up
        del FLOWS[state]

        return RedirectResponse(f"{FRONTEND_URL}?auth=success")

    except Exception as e:
        return RedirectResponse(f"{FRONTEND_URL}?auth=error&message={str(e)}")

@router.get("/status")
async def auth_status():
    if "user_token" in TOKENS:
        return {"authenticated": True}
    return {"authenticated": False}

@router.get("/logout")
async def logout():
    if "user_token" in TOKENS:
        del TOKENS["user_token"]
    return {"message": "Logged out successfully"}