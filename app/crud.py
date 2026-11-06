from datetime import datetime, timedelta
from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc, asc

from app.models import Task
from app.schemas import TaskCreate, TaskUpdate, StatsResponse


def get_tasks(
    db: Session,
    search: Optional[str] = None,
    status: Optional[str] = None,
    priority: Optional[str] = None,
    category: Optional[str] = None,
    sort_by: str = "created_desc",
) -> List[Task]:
    query = db.query(Task)

    if search:
        pattern = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Task.title.ilike(pattern),
                Task.description.ilike(pattern),
                Task.category.ilike(pattern),
            )
        )

    if status and status != "all":
        query = query.filter(Task.status == status)

    if priority and priority != "all":
        query = query.filter(Task.priority == priority)

    if category and category != "all":
        query = query.filter(Task.category == category)

    # Sorting
    if sort_by == "created_asc":
        query = query.order_by(asc(Task.created_at))
    elif sort_by == "due_date_asc":
        # Put null due dates at the end
        query = query.order_by(Task.due_date.is_(None), asc(Task.due_date))
    elif sort_by == "priority":
        # custom priority ordering if needed or standard
        query = query.order_by(desc(Task.priority))
    else:  # default created_desc
        query = query.order_by(desc(Task.created_at))

    return query.all()


def get_task(db: Session, task_id: int) -> Optional[Task]:
    return db.query(Task).filter(Task.id == task_id).first()


def create_task(db: Session, task_in: TaskCreate) -> Task:
    task = Task(
        title=task_in.title.strip(),
        description=task_in.description.strip() if task_in.description else "",
        priority=task_in.priority,
        category=task_in.category.strip(),
        status=task_in.status,
        due_date=task_in.due_date,
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


def update_task(db: Session, task: Task, task_in: TaskUpdate) -> Task:
    update_data = task_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if field == "title" and value:
            setattr(task, field, value.strip())
        elif field == "description" and value is not None:
            setattr(task, field, value.strip())
        elif field == "category" and value:
            setattr(task, field, value.strip())
        else:
            setattr(task, field, value)

    task.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(task)
    return task


def delete_task(db: Session, task: Task) -> None:
    db.delete(task)
    db.commit()


def toggle_task(db: Session, task: Task) -> Task:
    if task.status == "completed":
        task.status = "todo"
    else:
        task.status = "completed"
    task.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(task)
    return task


def clear_completed(db: Session) -> int:
    deleted_count = db.query(Task).filter(Task.status == "completed").delete()
    db.commit()
    return deleted_count


def get_stats(db: Session) -> StatsResponse:
    total = db.query(Task).count()
    todo = db.query(Task).filter(Task.status == "todo").count()
    in_progress = db.query(Task).filter(Task.status == "in_progress").count()
    completed = db.query(Task).filter(Task.status == "completed").count()
    urgent = db.query(Task).filter(Task.priority == "urgent", Task.status != "completed").count()

    rate = round((completed / total * 100), 1) if total > 0 else 0.0

    return StatsResponse(
        total=total,
        todo=todo,
        in_progress=in_progress,
        completed=completed,
        urgent=urgent,
        completion_rate=rate,
    )


def seed_default_tasks_if_empty(db: Session):
    """Seed helpful sample tasks if database is empty."""
    if db.query(Task).count() == 0:
        sample_tasks = [
            Task(
                title="Explore Neumorphic Design System",
                description="Experience soft dual shadows, debossed inset inputs, and tactile button states in both Light and Dark mode.",
                priority="high",
                category="Design",
                status="completed",
                due_date=datetime.utcnow() + timedelta(days=1),
            ),
            Task(
                title="Test CRUD Operations in Task Manager",
                description="Create a new task, update priority, toggle completion status, and filter by tags.",
                priority="urgent",
                category="Work",
                status="in_progress",
                due_date=datetime.utcnow() + timedelta(days=2),
            ),
            Task(
                title="Deploy with Docker Compose",
                description="Verify containerized deployment with volume persistence and healthcheck endpoint.",
                priority="medium",
                category="DevOps",
                status="todo",
                due_date=datetime.utcnow() + timedelta(days=3),
            ),
            Task(
                title="Review Task Analytics & Insights",
                description="Inspect the neumorphic stats counters and completion progress ring.",
                priority="low",
                category="Personal",
                status="todo",
                due_date=datetime.utcnow() + timedelta(days=5),
            ),
        ]
        db.add_all(sample_tasks)
        db.commit()
