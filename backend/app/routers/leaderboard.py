from fastapi import APIRouter, Query

from app.firebase import db, auth as firebase_admin_auth

router = APIRouter(prefix="/leaderboard", tags=["leaderboard"])


@router.get("")
def get_leaderboard(limit: int = Query(20, ge=1, le=100)):
    docs = db.collection("reports").stream()

    groups = {}
    for d in docs:
        data = d.to_dict()
        uid = data.get("citizen_id", "")
        if not uid:
            continue
        if uid not in groups:
            groups[uid] = {"total": 0, "resolved": 0}
        groups[uid]["total"] += 1
        if data.get("status") == "resolved":
            groups[uid]["resolved"] += 1

    uids = list(groups.keys())
    email_map = {}
    for i in range(0, len(uids), 100):
        batch = uids[i:i+100]
        try:
            identifiers = [firebase_admin_auth.UidIdentifier(uid) for uid in batch]
            result = firebase_admin_auth.get_users(identifiers)
            for user in result.users:
                email_map[user.uid] = user.email or "Unknown"
        except Exception:
            pass

    leaderboard = []
    for uid, stats in groups.items():
        leaderboard.append({
            "uid": uid,
            "email": email_map.get(uid, "Unknown"),
            "report_count": stats["total"],
            "resolved_count": stats["resolved"],
        })

    leaderboard.sort(key=lambda x: x["report_count"], reverse=True)
    return leaderboard[:limit]
