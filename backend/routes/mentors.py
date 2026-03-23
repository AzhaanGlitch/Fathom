from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List
from bson import ObjectId
from datetime import datetime

from db import get_db
from models.mentor import MentorCreate, MentorUpdate

router = APIRouter(prefix="/api/mentors", tags=["mentors"])

# ── helpers ────────────────────────────────────────────────────────────────────

def _serialize(doc: dict) -> dict:
    """Convert MongoDB _id → id string and return the doc."""
    doc = dict(doc)                            # don't mutate the original
    if "_id" in doc:
        doc["id"] = str(doc.pop("_id"))
    return doc

# ── GET /api/mentors ───────────────────────────────────────────────────────────

@router.get("", response_model=List[dict])
@router.get("/", response_model=List[dict])
async def get_mentors(
    owner_uid: Optional[str] = Query(None),
    role: Optional[str] = Query(None),
    exclude_role: Optional[str] = Query(None),
    skip: int = 0,
    limit: int = 100,
):
    database = await get_db()
    query: dict = {}
    if owner_uid:
        query["owner_uid"] = owner_uid
    if role:
        query["role"] = role
    if exclude_role:
        query["role"] = {"$ne": exclude_role}

    cursor = database.mentors.find(query).skip(skip).limit(limit)
    result = []
    async for doc in cursor:
        result.append(_serialize(doc))
    return result


# ── GET /api/mentors/:id ───────────────────────────────────────────────────────

@router.get("/{mentor_id}", response_model=dict)
async def get_mentor(mentor_id: str):
    database = await get_db()
    try:
        oid = ObjectId(mentor_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid mentor ID")

    doc = await database.mentors.find_one({"_id": oid})
    if not doc:
        raise HTTPException(status_code=404, detail="Mentor not found")
    return _serialize(doc)


# ── POST /api/mentors  (upsert by owner_uid — NO DUPLICATES) ──────────────────

@router.post("", response_model=dict, status_code=201)
@router.post("/", response_model=dict, status_code=201)
async def create_mentor(mentor: MentorCreate):
    database = await get_db()

    # Safely read fields
    owner_uid        = getattr(mentor, "owner_uid",        None)
    role             = getattr(mentor, "role",             None)
    institution_name = getattr(mentor, "institution_name", None)

    # ── UPSERT: if this Firebase UID already has a mentor record, return it ───
    if owner_uid:
        existing = await database.mentors.find_one({"owner_uid": owner_uid})
        if existing:
            return _serialize(existing)

    now = datetime.utcnow()
    doc = {
        "name":             mentor.name,
        "email":            mentor.email,
        "expertise":        mentor.expertise or [],
        "bio":              mentor.bio or "",
        "owner_uid":        owner_uid,
        "role":             role,
        "institution_name": institution_name,
        "total_sessions":   0,
        "average_score":    None,
        "created_at":       now,
        "updated_at":       now,
    }

    result = await database.mentors.insert_one(doc)
    doc["_id"] = result.inserted_id
    return _serialize(doc)


# ── PUT /api/mentors/:id ───────────────────────────────────────────────────────

@router.put("/{mentor_id}", response_model=dict)
async def update_mentor(mentor_id: str, mentor: MentorUpdate):
    database = await get_db()
    try:
        oid = ObjectId(mentor_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid mentor ID")

    # Use model_dump to be safe with Pydantic v2
    data_dict = mentor.model_dump(exclude_unset=True) if hasattr(mentor, "model_dump") else mentor.dict(exclude_unset=True)
    update_data = {k: v for k, v in data_dict.items()}
    update_data["updated_at"] = datetime.utcnow()

    result = await database.mentors.find_one_and_update(
        {"_id": oid},
        {"$set": update_data},
        return_document=True,
    )
    if not result:
        raise HTTPException(status_code=404, detail="Mentor not found")
    return _serialize(result)


# ── DELETE /api/mentors/:id ────────────────────────────────────────────────────

@router.delete("/{mentor_id}")
async def delete_mentor(mentor_id: str):
    database = await get_db()
    try:
        oid = ObjectId(mentor_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid mentor ID")

    result = await database.mentors.delete_one({"_id": oid})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Mentor not found")
    return {"message": "Mentor deleted successfully"}


# ── GET /api/mentors/:id/stats ─────────────────────────────────────────────────

@router.get("/{mentor_id}/stats")
async def get_mentor_stats(mentor_id: str):
    database = await get_db()
    try:
        oid = ObjectId(mentor_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid mentor ID")

    mentor = await database.mentors.find_one({"_id": oid})
    if not mentor:
        raise HTTPException(status_code=404, detail="Mentor not found")

    sessions = await database.sessions.find(
        {"mentor_id": mentor_id}
    ).to_list(length=None)
    completed = [s for s in sessions if s.get("status") == "completed"]

    scores = []
    for s in completed:
        eval_doc = await database.evaluations.find_one(
            {"session_id": str(s["_id"])}
        )
        if eval_doc and eval_doc.get("overall_score"):
            scores.append(eval_doc["overall_score"])

    # Provide default metric shapes so that frontend accesses like `metrics.clarity` won't crash
    # since we are intercepting the previous elaborate stats format.
    average_score = sum(scores) / len(scores) if scores else None

    recent_trend = "stable"
    if len(scores) >= 6:
        recent_avg = sum(scores[-3:]) / 3
        prev_avg   = sum(scores[-6:-3]) / 3
        if recent_avg > prev_avg + 0.3:
            recent_trend = "improving"
        elif recent_avg < prev_avg - 0.3:
            recent_trend = "declining"

    return {
        "mentor_id":         mentor_id,
        "total_sessions":    len(sessions),
        "completed_sessions": len(completed),
        "average_score":     average_score,
        "recent_trend":      recent_trend,
        "scores":            scores,
        "clarity_avg": 0,
        "structure_avg": 0,
        "correctness_avg": 0,
        "pacing_avg": 0,
        "communication_avg": 0
    }


# ── POST /api/mentors/dedup ────────────────────────────────────────────────────

@router.post("/dedup", response_model=dict)
async def deduplicate_mentors():
    database = await get_db()

    pipeline = [
        {
            "$group": {
                "_id":   "$owner_uid",
                "docs":  {"$push": {
                    "id":             {"$toString": "$_id"},
                    "name":           "$name",
                    "total_sessions": {"$ifNull": ["$total_sessions", 0]},
                    "average_score":  "$average_score",
                    "created_at":     "$created_at",
                }},
                "count": {"$sum": 1},
            }
        },
        {"$match": {"count": {"$gt": 1}}},
    ]

    duplicate_groups = await database.mentors.aggregate(pipeline).to_list(length=None)

    groups_merged      = 0
    duplicates_deleted = 0

    for group in duplicate_groups:
        owner_uid = group["_id"]
        docs      = group["docs"]

        if not owner_uid:
            continue

        winner = sorted(
            docs,
            key=lambda d: (-(d["total_sessions"] or 0), d["created_at"] or datetime.min)
        )[0]
        losers    = [d for d in docs if d["id"] != winner["id"]]
        winner_id = winner["id"]

        for loser in losers:
            loser_id = loser["id"]
            await database.sessions.update_many(
                {"mentor_id": loser_id},
                {"$set": {"mentor_id": winner_id}},
            )
            await database.mentors.delete_one({"_id": ObjectId(loser_id)})
            duplicates_deleted += 1

        sessions  = await database.sessions.find(
            {"mentor_id": winner_id}
        ).to_list(length=None)
        completed = [s for s in sessions if s.get("status") == "completed"]

        scores = []
        for s in completed:
            eval_doc = await database.evaluations.find_one(
                {"session_id": str(s["_id"])}
            )
            if eval_doc and eval_doc.get("overall_score"):
                scores.append(eval_doc["overall_score"])

        avg = sum(scores) / len(scores) if scores else None
        await database.mentors.update_one(
            {"_id": ObjectId(winner_id)},
            {"$set": {
                "total_sessions": len(sessions),
                "average_score":  avg,
                "updated_at":     datetime.utcnow(),
            }},
        )
        groups_merged += 1

    return {
        "message":            "Deduplication complete",
        "groups_merged":      groups_merged,
        "duplicates_deleted": duplicates_deleted,
    }