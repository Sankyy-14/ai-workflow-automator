import asyncio
from typing import Dict, Any
from workflow.builder import Workflow, WorkflowStep, StepStatus

async def run_step(step: WorkflowStep, context: Dict[str, Any]) -> dict:
    """
    Routes a single step to the correct tool.
    context = results from previously completed steps.
    """
    action = step.action
    params = step.params.copy()

    # Inject previous step result if this step depends on one
    previous_result = None
    if step.depends_on:
        dep_id = step.depends_on[0]
        previous_result = context.get(dep_id)

    if action == "gmail_fetch":
        from tools.gmail import gmail_fetch
        return await gmail_fetch(params)

    elif action == "gmail_summarize":
        from tools.gmail import gmail_summarize
        return await gmail_summarize(params, previous_result)

    elif action == "gmail_draft_reply":
        from tools.gmail import gmail_draft_reply
        return await gmail_draft_reply(params)

    elif action == "wait":
        seconds = params.get("seconds", 2)
        await asyncio.sleep(seconds)
        return {"waited_seconds": seconds}

    else:
        raise NotImplementedError(f"Action '{action}' is not yet implemented.")


async def execute_workflow(workflow: Workflow) -> Workflow:
    """
    Runs all steps sequentially.
    Respects dependencies between steps.
    """
    workflow.status = StepStatus.RUNNING
    context: Dict[str, Any] = {}

    for step in workflow.steps:

        # Skip if a dependency failed
        for dep_id in step.depends_on:
            dep_step = next((s for s in workflow.steps if s.id == dep_id), None)
            if dep_step and dep_step.status == StepStatus.FAILED:
                step.status = StepStatus.SKIPPED
                step.error = f"Skipped because '{dep_id}' failed."
                break

        if step.status == StepStatus.SKIPPED:
            continue

        step.status = StepStatus.RUNNING
        print(f"▶ Running [{step.id}]: {step.action}")

        try:
            result = await run_step(step, context)
            step.result = result
            step.status = StepStatus.DONE
            context[step.id] = result
            print(f"✅ [{step.id}] done")
        except Exception as e:
            step.status = StepStatus.FAILED
            step.error = str(e)
            print(f"❌ [{step.id}] failed: {e}")

    # Set overall workflow status
    failed = any(s.status == StepStatus.FAILED for s in workflow.steps)
    workflow.status = StepStatus.FAILED if failed else StepStatus.DONE

    return workflow