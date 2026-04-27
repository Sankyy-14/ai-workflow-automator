import json
from groq import Groq
from pydantic import BaseModel
from typing import Optional
from dotenv import load_dotenv
import os

load_dotenv()

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

INTENT_SYSTEM_PROMPT = """You are the intent understanding layer of an AI Workflow Automator.

Convert the user's natural language request into a structured JSON plan.

Available actions:
- gmail_fetch       : Fetch emails (params: max_results, query)
- gmail_summarize   : Summarize fetched emails
- gmail_draft_reply : Draft a reply for an email (params: email_id, tone)
- wait              : Wait N seconds (params: seconds)

Respond ONLY with valid JSON. No markdown, no explanation.

Format:
{
  "goal": "one-sentence summary",
  "steps": [
    {
      "id": "step_1",
      "action": "action_name",
      "description": "what this step does",
      "params": {},
      "depends_on": []
    }
  ],
  "estimated_duration_seconds": 30,
  "confidence": 0.95
}"""

class IntentRequest(BaseModel):
    user_input: str
    context: Optional[dict] = None

class IntentResponse(BaseModel):
    goal: str
    steps: list
    estimated_duration_seconds: int
    confidence: float
    raw_input: str

async def parse_intent(user_input: str, context: dict = None) -> IntentResponse:
    prompt = f"User request: {user_input}"

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": INTENT_SYSTEM_PROMPT},
            {"role": "user", "content": prompt}
        ],
        temperature=0.3,
    )

    raw = response.choices[0].message.content.strip()

    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    raw = raw.strip()

    parsed = json.loads(raw)

    return IntentResponse(
        goal=parsed["goal"],
        steps=parsed["steps"],
        estimated_duration_seconds=parsed.get("estimated_duration_seconds", 30),
        confidence=parsed.get("confidence", 0.8),
        raw_input=user_input,
    )