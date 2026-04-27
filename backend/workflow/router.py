from fastapi import APIRouter, HTTPException
from workflow.builder import WorkflowRequest, Workflow, build_workflow

router = APIRouter()

@router.post("/build", response_model=Workflow)
async def build_workflow_route(request: WorkflowRequest):
    try:
        workflow = build_workflow(request.goal, request.steps)
        return workflow
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Workflow build failed: {str(e)}")