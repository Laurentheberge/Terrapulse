from datetime import datetime, timezone
from typing import Optional

import geohash2
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel

from app.auth import User, get_current_user, get_optional_user
from app.firebase import db
from app.scoring import environment_score

router = APIRouter(prefix="/reports", tags=["reports"])


class CreateReportBody(BaseModel):
    image_url: str
    latitude: float
    longitude: float
    address: str = ""
    damage_type: str = ""
    severity_level: str = ""


@router.post("")
def create_report(
    body: CreateReportBody,
    user: User = Depends(get_current_user),
):
    now = datetime.now(timezone.utc).isoformat()
    gh = geohash2.encode(body.latitude, body.longitude, precision=7)

    score = environment_score(body.damage_type, body.severity_level) if body.damage_type and body.severity_level else 100

    doc_ref = db.collection("reports").document()
    doc_ref.set({
        "citizen_id": user.uid,
        "image_url": body.image_url,
        "latitude": body.latitude,
        "longitude": body.longitude,
        "geohash": gh,
        "address": body.address,
        "damage_type": body.damage_type,
        "severity_level": body.severity_level,
        "environment_score": score,
        "status": "pending_review",
        "created_at": now,
        "updated_at": now,
    })

    doc = doc_ref.get()
    data = doc.to_dict()
    data["id"] = doc.id
    return data


@router.get("/my")
def list_my_reports(user: User = Depends(get_current_user)):
    docs = db.collection("reports").where("citizen_id", "==", user.uid).stream()
    results = []
    for d in docs:
        data = d.to_dict()
        data["id"] = d.id
        results.append(data)
    return sorted(results, key=lambda r: r.get("created_at", ""), reverse=True)


@router.get("")
def list_reports(
    damage_type: Optional[str] = Query(None, alias="type"),
    status: Optional[str] = None,
    start_date: Optional[str] = Query(None, alias="start"),
    end_date: Optional[str] = Query(None, alias="end"),
):
    docs = db.collection("reports").stream()
    results = []
    for d in docs:
        data = d.to_dict()
        data["id"] = d.id
        results.append(data)

    if damage_type:
        results = [r for r in results if r.get("damage_type") == damage_type]
    if status:
        results = [r for r in results if r.get("status") == status]
    if start_date:
        results = [r for r in results if r.get("created_at", "") >= start_date]
    if end_date:
        results = [r for r in results if r.get("created_at", "") <= end_date]

    return results


@router.get("/{report_id}")
def get_report(report_id: str, user: User | None = Depends(get_optional_user)):
    doc = db.collection("reports").document(report_id).get()
    if not doc.exists:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")
    data = doc.to_dict()
    data["id"] = doc.id
    return data


@router.patch("/{report_id}/status")
def update_status(
    report_id: str,
    new_status: str,
    user: User = Depends(get_current_user),
):
    doc_ref = db.collection("reports").document(report_id)
    doc = doc_ref.get()
    if not doc.exists:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")

    data = doc.to_dict()
    is_owner = data.get("citizen_id") == user.uid

    if user.is_authority:
        valid = {"in_progress", "resolved", "rejected"}
        if new_status not in valid:
            raise HTTPException(status_code=400, detail=f"Authority can set: {valid}")
    elif is_owner:
        if new_status != "resolved":
            raise HTTPException(status_code=400, detail="Citizens can only set status to resolved")
    else:
        raise HTTPException(status_code=403, detail="You can only update your own reports")

    now = datetime.now(timezone.utc).isoformat()
    doc_ref.update({"status": new_status, "updated_at": now})

    updated = doc_ref.get()
    data = updated.to_dict()
    data["id"] = updated.id
    return data
