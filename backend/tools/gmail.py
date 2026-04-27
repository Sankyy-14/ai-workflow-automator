import os
import base64
import json
from dotenv import load_dotenv
from groq import Groq

load_dotenv()

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

# Google Auth imports
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build

SCOPES = [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.compose",
]

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CREDENTIALS_PATH = os.path.join(BASE_DIR, "../credentials.json")
TOKEN_PATH = os.path.join(BASE_DIR, "../token.json")


def get_gmail_service():
    creds = None
    if os.path.exists(TOKEN_PATH):
        creds = Credentials.from_authorized_user_file(TOKEN_PATH, SCOPES)

    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file(CREDENTIALS_PATH, SCOPES)
            creds = flow.run_local_server(port=0)
        with open(TOKEN_PATH, "w") as token:
            token.write(creds.to_json())

    return build("gmail", "v1", credentials=creds)


def decode_body(payload: dict) -> str:
    body = ""
    if "parts" in payload:
        for part in payload["parts"]:
            if part["mimeType"] == "text/plain":
                data = part["body"].get("data", "")
                body = base64.urlsafe_b64decode(data + "==").decode("utf-8", errors="ignore")
                break
    else:
        data = payload.get("body", {}).get("data", "")
        if data:
            body = base64.urlsafe_b64decode(data + "==").decode("utf-8", errors="ignore")
    return body.strip()


async def gmail_fetch(params: dict) -> dict:
    max_results = params.get("max_results", 10)
    query = params.get("query", "is:unread")

    service = get_gmail_service()
    result = service.users().messages().list(
        userId="me", q=query, maxResults=max_results
    ).execute()

    messages = result.get("messages", [])
    emails = []

    for msg in messages:
        msg_data = service.users().messages().get(
            userId="me", id=msg["id"], format="full"
        ).execute()

        headers = {h["name"]: h["value"] for h in msg_data["payload"]["headers"]}
        body = decode_body(msg_data["payload"])

        emails.append({
            "id": msg["id"],
            "subject": headers.get("Subject", "(no subject)"),
            "from": headers.get("From", "unknown"),
            "date": headers.get("Date", ""),
            "snippet": msg_data.get("snippet", ""),
            "body": body[:2000],
        })

    return {"emails": emails, "count": len(emails)}


async def gmail_summarize(params: dict, previous_result: dict = None) -> dict:
    emails = params.get("emails") or (previous_result or {}).get("emails", [])

    if not emails:
        return {"summaries": [], "message": "No emails to summarize."}

    email_text = ""
    for i, email in enumerate(emails, 1):
        email_text += f"\n--- Email {i} ---\n"
        email_text += f"From: {email['from']}\n"
        email_text += f"Subject: {email['subject']}\n"
        email_text += f"Body: {email['body'][:500]}\n"

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {
                "role": "system",
                "content": "You are an email assistant. Summarize emails as JSON only. No markdown."
            },
            {
                "role": "user",
                "content": f"""Summarize these emails. Respond ONLY with a JSON array:
[{{"id": "...", "subject": "...", "from": "...", "summary": "...", "priority": "high/medium/low", "needs_reply": true/false}}]

Emails:
{email_text}"""
            }
        ],
        temperature=0.3,
    )

    raw = response.choices[0].message.content.strip()
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    raw = raw.strip()

    summaries = json.loads(raw)
    return {"summaries": summaries}


async def gmail_draft_reply(params: dict) -> dict:
    email_id = params.get("email_id")
    tone = params.get("tone", "professional")

    service = get_gmail_service()
    msg_data = service.users().messages().get(
        userId="me", id=email_id, format="full"
    ).execute()

    headers = {h["name"]: h["value"] for h in msg_data["payload"]["headers"]}
    body = decode_body(msg_data["payload"])

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {
                "role": "system",
                "content": f"You are an email assistant. Draft a {tone} reply. Write only the reply body."
            },
            {
                "role": "user",
                "content": f"""Draft a reply to this email:
From: {headers.get('From')}
Subject: {headers.get('Subject')}
Body: {body[:1000]}"""
            }
        ],
        temperature=0.5,
    )

    draft_body = response.choices[0].message.content.strip()

    return {
        "email_id": email_id,
        "subject": headers.get("Subject", ""),
        "draft": draft_body,
        "to": headers.get("From", ""),
    }