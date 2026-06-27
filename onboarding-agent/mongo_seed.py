"""
Seeds MongoDB with initial OnboardEase data on first startup.
Mirrors the hard-coded seed data from the frontend's AppContext.tsx.
Each collection is only seeded once (idempotent check on document count).
"""

from mongo_db import (
    employees_col, tasks_col, documents_col,
    mentors_col, meetings_col, settings_col,
)

COLORS = ['#2B85DC', '#4EA0EB', '#7DBCF5', '#B3D8FF', '#1F6EC4', '#1558A8']

USER_UUIDS = {
    "EMP_1":    "d290f1ee-6c54-4b01-90e6-d701748f0851",
    "EMP_2":    "7c9e6679-7425-40de-944b-e07fc1f90ae7",
    "EMP_3":    "e4b65014-79c4-4a29-a20e-b6adaef744b2",
    "EMP_4":    "52a98ff7-1c88-4b56-a82c-8b85f3d9e541",
    "MENTOR_1": "4b8a5e9f-2d7c-4f3a-8e1b-9c0a6d4f2e17",
    "MENTOR_2": "6f3d2a1b-8e7c-4d5f-9a2e-1b0c8f7d3e4a",
    "MENTOR_3": "3a7f1c9e-5b2d-4e8a-b6f0-2c4d7e1f9a3b",
}

MENTORS = [
    {"id": USER_UUIDS["MENTOR_1"], "name": "Sarah Chen",   "specialty": "Engineering & Architecture",   "department": "Engineering", "initials": "SC", "color": "#2B85DC"},
    {"id": USER_UUIDS["MENTOR_2"], "name": "Mike Johnson", "specialty": "Sales & Business Development", "department": "Sales",       "initials": "MJ", "color": "#4EA0EB"},
    {"id": USER_UUIDS["MENTOR_3"], "name": "Priya Patel",  "specialty": "Design & Product",             "department": "Product",     "initials": "PP", "color": "#7DBCF5"},
]

EMPLOYEES = [
    {"id": USER_UUIDS["EMP_1"], "name": "Jordan Lee",   "role": "Software Engineer",    "email": "jordan@company.com",  "team": "Engineering", "mentorId": USER_UUIDS["MENTOR_1"], "startDate": "Feb 24, 2026", "progress": 22, "day": 2,  "totalDays": 30, "status": "onboarding", "risk": "low",  "initials": "JL", "color": COLORS[0]},
    {"id": USER_UUIDS["EMP_2"], "name": "Priya Kapoor", "role": "Product Manager",      "email": "priya.k@company.com", "team": "Product",     "mentorId": USER_UUIDS["MENTOR_3"], "startDate": "Feb 20, 2026", "progress": 54, "day": 6,  "totalDays": 30, "status": "onboarding", "risk": "low",  "initials": "PK", "color": COLORS[1]},
    {"id": USER_UUIDS["EMP_3"], "name": "Marcus Stone", "role": "Sales Representative", "email": "marcus@company.com",  "team": "Sales",       "mentorId": USER_UUIDS["MENTOR_2"], "startDate": "Feb 17, 2026", "progress": 31, "day": 9,  "totalDays": 21, "status": "onboarding", "risk": "high", "initials": "MS", "color": COLORS[2]},
    {"id": USER_UUIDS["EMP_4"], "name": "Aiko Tanaka",  "role": "UX Designer",          "email": "aiko@company.com",    "team": "Design",      "mentorId": USER_UUIDS["MENTOR_3"], "startDate": "Feb 10, 2026", "progress": 78, "day": 16, "totalDays": 21, "status": "onboarding", "risk": "low",  "initials": "AT", "color": COLORS[3]},
]

DOCUMENTS = [
    {"id": "doc-1", "name": "Employee Handbook v3.2",       "type": "PDF", "size": "2.4 MB", "status": "processed", "uploadedBy": "admin", "taskCount": 32, "date": "Feb 20", "content": "Company values: innovation, collaboration, integrity. Communication policy: use Slack for quick messages, email for formal comms. Work hours: flexible 9-5. Benefits: health, dental, vision, 401k. PTO: 15 days/year. Performance reviews: quarterly."},
    {"id": "doc-2", "name": "IT Security Policy",           "type": "PDF", "size": "1.1 MB", "status": "processed", "uploadedBy": "hr",    "taskCount": 15, "date": "Feb 18", "content": "All employees must complete security training within first week. MFA required on all accounts. Password policy: minimum 12 characters. VPN required for remote work. Incident reporting: contact security@company.com."},
    {"id": "doc-3", "name": "Engineering Onboarding Guide", "type": "PDF", "size": "3.2 MB", "status": "processed", "uploadedBy": "admin", "taskCount": 28, "date": "Feb 15", "content": "Tech stack: React, TypeScript, Node.js, PostgreSQL, AWS. Code review: all PRs require 2 approvals. Testing: unit tests required, 80% coverage. CI/CD: automated pipeline with GitHub Actions."},
    {"id": "doc-4", "name": "Sales Playbook 2026",          "type": "PDF", "size": "1.8 MB", "status": "processed", "uploadedBy": "admin", "taskCount": 20, "date": "Feb 12", "content": "Sales process: prospect, qualify, demo, proposal, close. CRM: Salesforce mandatory. Target: $50k quota per month. Commission structure: 8% on closed deals."},
]

TASKS = [
    {"id": "task-init-1", "title": "Complete company overview module", "description": "Watch company overview video and complete knowledge check", "category": "Learning",   "estimatedTime": "20 min", "assignedTo": USER_UUIDS["EMP_1"], "assignedBy": "hr",     "assignedByName": "HR Team",     "status": "done",        "createdAt": "2026-02-24"},
    {"id": "task-init-2", "title": "Set up Slack workspace",           "description": "Install Slack, join all required channels, update profile",      "category": "Tools",      "estimatedTime": "5 min",  "assignedTo": USER_UUIDS["EMP_1"], "assignedBy": "admin",  "assignedByName": "Admin",       "status": "done",        "createdAt": "2026-02-24"},
    {"id": "task-init-3", "title": "Meet your buddy Sarah Chen",       "description": "Schedule and complete first 1:1 with your assigned mentor",      "category": "People",     "estimatedTime": "30 min", "assignedTo": USER_UUIDS["EMP_1"], "assignedBy": "admin",  "assignedByName": "Admin",       "status": "in-progress", "createdAt": "2026-02-24"},
    {"id": "task-init-4", "title": "Review employee handbook",         "description": "Read all sections and acknowledge receipt",                       "category": "Compliance", "estimatedTime": "45 min", "assignedTo": USER_UUIDS["EMP_1"], "assignedBy": "hr",     "assignedByName": "HR Team",     "status": "pending",     "createdAt": "2026-02-24"},
    {"id": "task-init-5", "title": "Complete IT security training",    "description": "Finish the mandatory cybersecurity awareness course",             "category": "Compliance", "estimatedTime": "30 min", "assignedTo": USER_UUIDS["EMP_2"], "assignedBy": "hr",     "assignedByName": "HR Team",     "status": "done",        "createdAt": "2026-02-20"},
    {"id": "task-init-6", "title": "Set up product management tools",  "description": "Access Jira, Confluence, and Figma with required permissions",   "category": "Tools",      "estimatedTime": "20 min", "assignedTo": USER_UUIDS["EMP_2"], "assignedBy": "admin",  "assignedByName": "Admin",       "status": "done",        "createdAt": "2026-02-20"},
    {"id": "task-init-7", "title": "Salesforce CRM walkthrough",       "description": "Complete CRM tour and enter first 5 mock deals",                 "category": "Tools",      "estimatedTime": "60 min", "assignedTo": USER_UUIDS["EMP_3"], "assignedBy": "mentor", "assignedByName": "Mike Johnson", "status": "pending",     "createdAt": "2026-02-17"},
]

MEETINGS = [
    {"id": "meet-1", "title": "1:1 Onboarding Sync",    "date": "2026-03-01", "time": "10:00 AM", "mentorId": USER_UUIDS["MENTOR_1"], "employeeId": USER_UUIDS["EMP_1"], "description": "Weekly sync to review onboarding progress",       "link": "https://meet.google.com/abc-defg-hij"},
    {"id": "meet-2", "title": "Tech Stack Deep Dive",    "date": "2026-03-03", "time": "2:00 PM",  "mentorId": USER_UUIDS["MENTOR_1"], "employeeId": USER_UUIDS["EMP_1"], "description": "Walkthrough of the React + TypeScript codebase",   "link": "https://zoom.us/j/123456789"},
    {"id": "meet-3", "title": "Code Review Walkthrough", "date": "2026-03-06", "time": "11:00 AM", "mentorId": USER_UUIDS["MENTOR_1"], "employeeId": USER_UUIDS["EMP_1"], "description": "Review your first PR and learn code review standards"},
    {"id": "meet-4", "title": "Product Roadmap Review",  "date": "2026-03-02", "time": "11:00 AM", "mentorId": USER_UUIDS["MENTOR_3"], "employeeId": USER_UUIDS["EMP_2"], "description": "Overview of Q1 product roadmap",                   "link": "https://meet.google.com/xyz-uvwx-yz"},
    {"id": "meet-5", "title": "CRM Demo & Walkthrough",  "date": "2026-03-04", "time": "3:00 PM",  "mentorId": USER_UUIDS["MENTOR_2"], "employeeId": USER_UUIDS["EMP_3"], "description": "Live demo of Salesforce CRM and pipeline setup"},
]

DEFAULT_SETTINGS = {
    "name":     "Acme Corp",
    "industry": "SaaS / Software",
    "teamSize": "15-30 employees",
    "about":    "Acme Corp is a fast-growing SaaS company dedicated to building innovative tools that help teams collaborate and scale effectively.",
}


def seed_if_empty():
    """Insert initial data into each collection only when it is empty."""
    if mentors_col.count_documents({}) == 0:
        mentors_col.insert_many(MENTORS)

    if employees_col.count_documents({}) == 0:
        employees_col.insert_many(EMPLOYEES)

    if documents_col.count_documents({}) == 0:
        documents_col.insert_many(DOCUMENTS)

    if tasks_col.count_documents({}) == 0:
        tasks_col.insert_many(TASKS)

    if meetings_col.count_documents({}) == 0:
        meetings_col.insert_many(MEETINGS)

    if settings_col.count_documents({}) == 0:
        settings_col.insert_one({"key": "main", **DEFAULT_SETTINGS})
