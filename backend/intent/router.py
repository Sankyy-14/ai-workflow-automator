from fastapi import APIRouter, HTTPException
from intent.parser import IntentRequest, IntentResponse, parse_intent

router = APIRouter()

@router.post("/parse", response_model=IntentResponse)
async def parse_user_intent(request: IntentRequest):
    try:
        result = await parse_intent(request.user_input, request.context)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Intent parsing failed: {str(e)}")