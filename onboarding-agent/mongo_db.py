"""
MongoDB client and collection references for OnboardEase.
Each entity type maps to its own collection in the 'onboardease' database.
Documents are stored as plain dicts — exactly the camelCase JSON the
TypeScript frontend sends — so no field-mapping is ever needed.
"""

from pymongo import MongoClient

MONGO_URI    = "mongodb://localhost:27017"
MONGO_DB     = "onboardease"

_client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
db      = _client[MONGO_DB]

# ── Collections (one per entity type) ────────────────────────────────────────
employees_col     = db["employees"]
tasks_col         = db["tasks"]
documents_col     = db["documents"]
mentors_col       = db["mentors"]
notifications_col = db["notifications"]
conversations_col = db["conversations"]
messages_col      = db["messages"]
meetings_col      = db["meetings"]
settings_col      = db["settings"]


def ping() -> bool:
    """Returns True if MongoDB is reachable."""
    try:
        _client.admin.command("ping")
        return True
    except Exception:
        return False
