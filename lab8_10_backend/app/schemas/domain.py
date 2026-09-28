from datetime import date, datetime
from typing import Literal

from pydantic import EmailStr, Field, model_validator

from app.schemas.common import ApiModel


class ProjectCreate(ApiModel):
    name: str = Field(min_length=2, max_length=200)
    client_name: str = Field(default="Внутрішній проєкт", max_length=200)
    color: str = Field(default="#7C3AED", pattern=r"^#[0-9A-Fa-f]{6}$")
    status: Literal["planning", "active", "on_hold", "completed"] = "planning"
    department_id: int = Field(gt=0)
    budget_hours: float = Field(gt=0, le=1_000_000)
    lead_id: int = Field(gt=0)
    member_ids: list[int] = Field(default_factory=list, max_length=200)
    start_date: date
    deadline: date | None = None
    description: str = Field(default="", max_length=5000)

    @model_validator(mode="after")
    def check_deadline(self):
        if self.deadline and self.deadline < self.start_date:
            raise ValueError("deadline must not be before startDate")
        return self


class ProjectPatch(ApiModel):
    name: str | None = Field(default=None, min_length=2, max_length=200)
    client_name: str | None = Field(default=None, max_length=200)
    color: str | None = Field(default=None, pattern=r"^#[0-9A-Fa-f]{6}$")
    status: Literal["planning", "active", "on_hold", "completed"] | None = None
    department_id: int | None = Field(default=None, gt=0)
    budget_hours: float | None = Field(default=None, gt=0, le=1_000_000)
    lead_id: int | None = Field(default=None, gt=0)
    member_ids: list[int] | None = Field(default=None, max_length=200)
    start_date: date | None = None
    deadline: date | None = None
    description: str | None = Field(default=None, max_length=5000)


class TaskCreate(ApiModel):
    project_id: int = Field(gt=0)
    title: str = Field(min_length=2, max_length=300)
    assignee_id: int = Field(gt=0)
    due_date: date | None = None
    estimate_minutes: int | None = Field(default=None, gt=0)


class TaskStatusUpdate(ApiModel):
    status: Literal["todo", "in_progress", "done"]


class TaskPriorityUpdate(ApiModel):
    priority: Literal["low", "medium", "high", "urgent"]


class TimeEntryCreate(ApiModel):
    user_id: int | None = Field(default=None, gt=0)
    work_date: date
    check_in: datetime
    check_out: datetime | None = None
    project_id: int | None = Field(default=None, gt=0)
    task_id: int | None = Field(default=None, gt=0)
    note: str | None = Field(default=None, max_length=2000)
    pause_minutes: int | None = Field(default=None, ge=0, le=1440)
    lunch_minutes: int | None = Field(default=None, ge=0, le=1440)

    @model_validator(mode="after")
    def check_times(self):
        if self.check_out and self.check_out <= self.check_in:
            raise ValueError("checkOut must be later than checkIn")
        return self


class TimeEntryPatch(ApiModel):
    work_date: date | None = None
    check_in: datetime | None = None
    check_out: datetime | None = None
    status: Literal["in_progress", "completed", "edited", "missing_checkout"] | None = None
    project_id: int | None = Field(default=None, gt=0)
    task_id: int | None = Field(default=None, gt=0)
    note: str | None = Field(default=None, max_length=2000)
    pause_minutes: int | None = Field(default=None, ge=0, le=1440)
    lunch_minutes: int | None = Field(default=None, ge=0, le=1440)


class LeaveCreate(ApiModel):
    leave_type_id: int = Field(gt=0)
    start_date: date
    end_date: date
    reason: str | None = Field(default=None, max_length=1000)

    @model_validator(mode="after")
    def check_dates(self):
        if self.end_date < self.start_date:
            raise ValueError("endDate must be on or after startDate")
        return self


class LeaveDecision(ApiModel):
    status: Literal["approved", "rejected", "cancelled"]
    comment: str | None = Field(default=None, max_length=1000)


class ScheduleCreate(ApiModel):
    user_id: int = Field(gt=0)
    work_date: date
    shift_template_id: int | None = Field(default=None, gt=0)
    planned_start: datetime
    planned_end: datetime
    note: str | None = Field(default=None, max_length=1000)

    @model_validator(mode="after")
    def check_times(self):
        if self.planned_end <= self.planned_start:
            raise ValueError("plannedEnd must be later than plannedStart")
        return self


class ReportCreate(ApiModel):
    report_type: Literal["attendance_summary", "lateness_summary", "leave_summary", "department_summary", "payroll_cost_summary"]
    period_start: date
    period_end: date
    department_id: int | None = Field(default=None, gt=0)
    parameters: dict = Field(default_factory=dict)

    @model_validator(mode="after")
    def check_dates(self):
        if self.period_end < self.period_start:
            raise ValueError("periodEnd must be on or after periodStart")
        return self


class HourlyRateUpdate(ApiModel):
    rate: float = Field(ge=0, le=1_000_000)
