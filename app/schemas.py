from datetime import datetime
from typing import Optional, Literal
from pydantic import BaseModel, Field, ConfigDict


PriorityType = Literal["low", "medium", "high", "urgent"]
StatusType = Literal["todo", "in_progress", "completed"]


class TaskBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=200, description="Task title")
    description: Optional[str] = Field(default="", max_length=2000, description="Detailed task description")
    priority: PriorityType = Field(default="medium", description="Priority level")
    category: str = Field(default="Work", max_length=50, description="Category / Project tag")
    status: StatusType = Field(default="todo", description="Task completion status")
    due_date: Optional[datetime] = Field(default=None, description="Due date and time")


class TaskCreate(TaskBase):
    pass


class TaskUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=2000)
    priority: Optional[PriorityType] = None
    category: Optional[str] = Field(None, max_length=50)
    status: Optional[StatusType] = None
    due_date: Optional[datetime] = None


class TaskResponse(TaskBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class StatsResponse(BaseModel):
    total: int
    todo: int
    in_progress: int
    completed: int
    urgent: int
    completion_rate: float
