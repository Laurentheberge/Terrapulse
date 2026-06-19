from fastapi import APIRouter

from app.firebase import db

router = APIRouter(prefix="/sites", tags=["sites"])


@router.get("")
def list_sites():
    docs = db.collection("disposal_sites").stream()
    results = []
    for d in docs:
        data = d.to_dict()
        data["id"] = d.id
        results.append(data)
    return results
