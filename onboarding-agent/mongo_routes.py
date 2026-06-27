"""
Full CRUD REST API for persistent OnboardEase data — MongoDB edition.
All payloads arrive as camelCase JSON from the TypeScript frontend and are
stored verbatim as MongoDB documents (with _id stripped on responses).
"""

from typing import Any

from fastapi import APIRouter, HTTPException

from mongo_db import (
    employees_col, tasks_col, documents_col,
    mentors_col, notifications_col, conversations_col,
    messages_col, meetings_col, settings_col,
)

router = APIRouter()


# ── Helpers ───────────────────────────────────────────────────────────────────

def _clean(doc: dict) -> dict:
    """Remove MongoDB internal _id field before returning to client."""
    doc.pop("_id", None)
    return doc


def _all(col) -> list[dict]:
    return [_clean(d) for d in col.find({})]


def _get_or_404(col, doc_id: str) -> dict:
    doc = col.find_one({"id": doc_id})
    if not doc:
        raise HTTPException(status_code=404, detail=f"{col.name} {doc_id} not found")
    return doc


def _upsert(col, doc_id: str, payload: dict) -> dict:
    payload.pop("_id", None)
    col.update_one({"id": doc_id}, {"$set": payload}, upsert=True)
    return payload


def _delete(col, doc_id: str) -> dict:
    col.delete_one({"id": doc_id})
    return {"ok": True}


# ── Full state snapshot ───────────────────────────────────────────────────────

@router.get("/api/state")
def get_state():
    """Returns the complete app state for initial hydration on the frontend."""
    settings_doc = settings_col.find_one({"key": "main"})
    return {
        "employees":       _all(employees_col),
        "tasks":           _all(tasks_col),
        "documents":       _all(documents_col),
        "mentors":         _all(mentors_col),
        "notifications":   _all(notifications_col),
        "conversations":   _all(conversations_col),
        "chatMessages":    _all(messages_col),
        "meetings":        _all(meetings_col),
        "companySettings": _clean(settings_doc) if settings_doc else {},
    }


# ── Employees ─────────────────────────────────────────────────────────────────

@router.post("/api/employees")
def create_employee(body: dict[str, Any]):
    return _upsert(employees_col, body["id"], body)


@router.patch("/api/employees/{emp_id}")
def update_employee(emp_id: str, body: dict[str, Any]):
    doc = _get_or_404(employees_col, emp_id)
    data = _clean(doc)
    data.update(body)
    employees_col.update_one({"id": emp_id}, {"$set": data})
    return data


@router.delete("/api/employees/{emp_id}")
def delete_employee(emp_id: str):
    return _delete(employees_col, emp_id)


# ── Tasks ─────────────────────────────────────────────────────────────────────

@router.post("/api/tasks")
def create_task(body: dict[str, Any]):
    return _upsert(tasks_col, body["id"], body)


@router.post("/api/tasks/bulk")
def create_tasks_bulk(body: list[dict[str, Any]]):
    for task in body:
        _upsert(tasks_col, task["id"], task)
    return {"ok": True, "count": len(body)}


@router.patch("/api/tasks/{task_id}")
def update_task(task_id: str, body: dict[str, Any]):
    doc = _get_or_404(tasks_col, task_id)
    data = _clean(doc)
    data.update(body)
    tasks_col.update_one({"id": task_id}, {"$set": data})
    return data


@router.delete("/api/tasks/{task_id}")
def delete_task(task_id: str):
    return _delete(tasks_col, task_id)


# ── Documents ─────────────────────────────────────────────────────────────────

@router.post("/api/documents")
def create_document(body: dict[str, Any]):
    # Strip binary fileData before persisting
    body.pop("fileData", None)
    return _upsert(documents_col, body["id"], body)


@router.delete("/api/documents/{doc_id}")
def delete_document(doc_id: str):
    return _delete(documents_col, doc_id)


# ── Mentors ───────────────────────────────────────────────────────────────────

@router.post("/api/mentors")
def create_mentor(body: dict[str, Any]):
    return _upsert(mentors_col, body["id"], body)


@router.delete("/api/mentors/{mentor_id}")
def delete_mentor(mentor_id: str):
    return _delete(mentors_col, mentor_id)


# ── Notifications ─────────────────────────────────────────────────────────────

@router.post("/api/notifications")
def create_notification(body: dict[str, Any]):
    return _upsert(notifications_col, body["id"], body)


@router.patch("/api/notifications/{notif_id}")
def update_notification(notif_id: str, body: dict[str, Any]):
    doc = notifications_col.find_one({"id": notif_id})
    if not doc:
        return {"ok": False}
    data = _clean(doc)
    data.update(body)
    notifications_col.update_one({"id": notif_id}, {"$set": data})
    return data


# ── Conversations ─────────────────────────────────────────────────────────────

@router.post("/api/conversations")
def create_conversation(body: dict[str, Any]):
    return _upsert(conversations_col, body["id"], body)


@router.delete("/api/conversations/{conv_id}")
def delete_conversation(conv_id: str):
    # Also delete all messages in this conversation
    messages_col.delete_many({"conversationId": conv_id})
    return _delete(conversations_col, conv_id)


# ── Chat Messages ─────────────────────────────────────────────────────────────

@router.post("/api/messages")
def create_message(body: dict[str, Any]):
    # Strip binary fileData before persisting
    body.pop("fileData", None)
    return _upsert(messages_col, body["id"], body)


@router.patch("/api/messages/{msg_id}")
def update_message(msg_id: str, body: dict[str, Any]):
    doc = messages_col.find_one({"id": msg_id})
    if not doc:
        return {"ok": False}
    data = _clean(doc)
    data.update(body)
    messages_col.update_one({"id": msg_id}, {"$set": data})
    return data


# ── Meetings ──────────────────────────────────────────────────────────────────

@router.post("/api/meetings")
def create_meeting(body: dict[str, Any]):
    return _upsert(meetings_col, body["id"], body)


# ── Company Settings ──────────────────────────────────────────────────────────

@router.put("/api/settings")
def update_settings(body: dict[str, Any]):
    body.pop("_id", None)
    settings_col.update_one(
        {"key": "main"},
        {"$set": {**body, "key": "main"}},
        upsert=True,
    )
    return body
