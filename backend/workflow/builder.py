from pydantic import BaseModel
from typing import List, Optional
from enum import Enum
import uuid

class StepStatus(str, Enum):
    PENDING  = "pending"
    RUNNING  = "running"
    DONE     = "done"
    FAILED   = "failed"
    SKIPPED  = "skipped"

class WorkflowStep(BaseModel):
    id: str
    action: str
    description: str
    params: dict = {}
    depends_on: List[str] = []
    status: StepStatus = StepStatus.PENDING
    result: Optional[dict] = None
    error: Optional[str] = None

class Workflow(BaseModel):
    id: str
    goal: str
    steps: List[WorkflowStep]
    status: StepStatus = StepStatus.PENDING

class WorkflowRequest(BaseModel):
    goal: str
    steps: list

def build_workflow(goal: str, raw_steps: list) -> Workflow:
    workflow_id = str(uuid.uuid4())[:8]

    steps = [
        WorkflowStep(
            id=step.get("id", f"step_{i+1}"),
            action=step["action"],
            description=step.get("description", ""),
            params=step.get("params", {}),
            depends_on=step.get("depends_on", []),
        )
        for i, step in enumerate(raw_steps)
    ]

    return Workflow(
        id=workflow_id,
        goal=goal,
        steps=steps,
        status=StepStatus.PENDING,
    )