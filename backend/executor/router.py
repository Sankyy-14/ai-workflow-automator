from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from intent.parser import parse_intent
from workflow.builder import build_workflow
from executor.runner import execute_workflow

router = APIRouter()

class RunRequest(BaseModel):
    user_input: str
    context: dict = {}

@router.post("/run")
async def run_full_pipeline(request: RunRequest):
    """
    Full pipeline in one single call:
    1. Parse intent (Groq AI)
    2. Build workflow
    3. Execute all steps
    4. Return results
    """
    try:
        # 1. Intent
        intent = await parse_intent(request.user_input, request.context)

        # 2. Build workflow
        workflow = build_workflow(intent.goal, intent.steps)

        # 3. Execute
        completed = await execute_workflow(workflow)

        # 4. Return
        return {
            "workflow_id": completed.id,
            "goal": completed.goal,
            "status": completed.status,
            "steps": [
                {
                    "id": s.id,
                    "action": s.action,
                    "description": s.description,
                    "status": s.status,
                    "result": s.result,
                    "error": s.error,
                }
                for s in completed.steps
            ],
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))