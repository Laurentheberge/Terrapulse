import os

from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, status

from app.auth import User, get_current_user, require_authority
from app.firebase import auth as firebase_admin_auth

PROTECTED = {e.strip().lower() for e in os.environ.get("PROTECTED_AUTHORITIES", "").split(",") if e.strip()}

router = APIRouter(prefix="/auth", tags=["auth"])

class CheckEmailBody(BaseModel):
    email: str

@router.post("/check-email")
def check_email(body: CheckEmailBody):
    try:
        firebase_admin_auth.get_user_by_email(body.email)
        return {"exists": True}
    except firebase_admin_auth.UserNotFoundError:
        return {"exists": False}

class SetRoleBody(BaseModel):
    role: str

@router.post("/set-role")
def set_role(body: SetRoleBody, user: User = Depends(get_current_user)):
    if body.role != "citizen":
        raise HTTPException(status_code=400, detail="Only 'citizen' role can be self-assigned")
    firebase_admin_auth.set_custom_user_claims(user.uid, {"role": "citizen"})
    return {"message": "Role set to 'citizen'"}


class PromoteBody(BaseModel):
    email: str

@router.post("/promote")
def promote_to_authority(body: PromoteBody, admin: User = Depends(require_authority)):
    try:
        target = firebase_admin_auth.get_user_by_email(body.email)
    except firebase_admin_auth.UserNotFoundError:
        raise HTTPException(status_code=404, detail="No user found with that email")

    if not target.email_verified:
        raise HTTPException(
            status_code=400,
            detail="User's email is not verified. Ask them to verify their email before promoting.",
        )

    firebase_admin_auth.set_custom_user_claims(target.uid, {"role": "authority"})
    return {"message": f"User '{body.email}' promoted to authority"}


@router.post("/demote")
def demote_from_authority(body: PromoteBody, admin: User = Depends(require_authority)):
    try:
        target = firebase_admin_auth.get_user_by_email(body.email)
    except firebase_admin_auth.UserNotFoundError:
        raise HTTPException(status_code=404, detail="No user found with that email")

    if target.email.lower() in PROTECTED:
        raise HTTPException(status_code=403, detail="This user is protected and cannot be demoted.")

    firebase_admin_auth.set_custom_user_claims(target.uid, {"role": "citizen"})
    return {"message": f"User '{body.email}' demoted to citizen"}
