from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from intent.router import router as intent_router
from workflow.router import router as workflow_router
from executor.router import router as executor_router

app = FastAPI(
    title="AI Workflow Automator",
    description="Natural language → executable workflows → completed tasks",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(intent_router, prefix="/api/intent", tags=["Intent"])
app.include_router(workflow_router, prefix="/api/workflow", tags=["Workflow"])
app.include_router(executor_router, prefix="/api/execute", tags=["Executor"])

@app.get("/")
async def root():
    return {"status": "ok", "message": "AI Workflow Automator is running 🚀"}

@app.get("/health")
async def health():
    return {"status": "healthy"}

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)