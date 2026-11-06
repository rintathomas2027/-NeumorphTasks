import os
from contextlib import asynccontextmanager
from typing import Optional, List
from fastapi import FastAPI, Depends, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session

from app.database import engine, Base, get_db
from app.models import Task
from app.schemas import TaskCreate, TaskUpdate, TaskResponse, StatsResponse
from app import crud

# Create tables and seed initial data on startup
@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    db = next(get_db())
    try:
        crud.seed_default_tasks_if_empty(db)
    finally:
        db.close()
    yield


app = FastAPI(
    title="Neumorphic Task Management System",
    description="Full CRUD Task Management System with Neumorphic UI and Docker containerization",
    version="1.0.0",
    lifespan=lifespan,
)

# Enable CORS for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static files path
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STATIC_DIR = os.path.join(BASE_DIR, "static")

if os.path.exists(STATIC_DIR):
    app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


@app.get("/", include_in_schema=False)
async def serve_home():
    """Serve the single page application."""
    index_file = os.path.join(STATIC_DIR, "index.html")
    if os.path.exists(index_file):
        return FileResponse(index_file)
    return {"message": "Neumorphic Task Manager API is running. UI file missing."}


@app.get("/api/health", tags=["System"])
def health_check():
    """Health check endpoint for Docker container checks."""
    return {"status": "healthy", "service": "task-manager"}


@app.get("/api/tasks", response_model=List[TaskResponse], tags=["Tasks"])
def list_tasks(
    search: Optional[str] = Query(None, description="Search keyword in title, description, category"),
    status: Optional[str] = Query(None, description="Filter by status (all, todo, in_progress, completed)"),
    priority: Optional[str] = Query(None, description="Filter by priority (all, low, medium, high, urgent)"),
    category: Optional[str] = Query(None, description="Filter by category"),
    sort_by: str = Query("created_desc", description="Sort order: created_desc, created_asc, due_date_asc, priority"),
    db: Session = Depends(get_db),
):
    """List all tasks with optional search, filtering, and sorting."""
    return crud.get_tasks(
        db=db,
        search=search,
        status=status,
        priority=priority,
        category=category,
        sort_by=sort_by,
    )


@app.post("/api/tasks", response_model=TaskResponse, status_code=status.HTTP_201_CREATED, tags=["Tasks"])
def create_new_task(task_in: TaskCreate, db: Session = Depends(get_db)):
    """Create a new task."""
    return crud.create_task(db=db, task_in=task_in)


@app.get("/api/tasks/{task_id}", response_model=TaskResponse, tags=["Tasks"])
def get_task_by_id(task_id: int, db: Session = Depends(get_db)):
    """Retrieve details of a single task."""
    task = crud.get_task(db=db, task_id=task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@app.put("/api/tasks/{task_id}", response_model=TaskResponse, tags=["Tasks"])
def update_existing_task(task_id: int, task_in: TaskUpdate, db: Session = Depends(get_db)):
    """Update fields of an existing task."""
    task = crud.get_task(db=db, task_id=task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return crud.update_task(db=db, task=task, task_in=task_in)


@app.delete("/api/tasks/{task_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["Tasks"])
def delete_task_by_id(task_id: int, db: Session = Depends(get_db)):
    """Delete a task by ID."""
    task = crud.get_task(db=db, task_id=task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    crud.delete_task(db=db, task=task)
    return None


@app.post("/api/tasks/{task_id}/toggle", response_model=TaskResponse, tags=["Tasks"])
def toggle_task_completion(task_id: int, db: Session = Depends(get_db)):
    """Toggle between completed and todo."""
    task = crud.get_task(db=db, task_id=task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return crud.toggle_task(db=db, task=task)


@app.post("/api/tasks/clear-completed", tags=["Tasks"])
def clear_completed_tasks(db: Session = Depends(get_db)):
    """Delete all completed tasks."""
    count = crud.clear_completed(db=db)
    return {"message": f"Successfully deleted {count} completed tasks", "deleted_count": count}


@app.get("/api/stats", response_model=StatsResponse, tags=["Analytics"])
def get_task_statistics(db: Session = Depends(get_db)):
    """Get aggregate statistics for the dashboard."""
    return crud.get_stats(db=db)
