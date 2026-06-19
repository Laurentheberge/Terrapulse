from fastapi import Depends, HTTPException, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.firebase import verify_token

security = HTTPBearer(auto_error=False)


class User:
    def __init__(self, uid: str, email: str, role: str):
        self.uid = uid
        self.email = email
        self.role = role

    @property
    def is_authority(self) -> bool:
        return self.role == "authority"


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Security(security),
) -> User:
    try:
        decoded = verify_token(credentials.credentials)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )
    return User(
        uid=decoded["uid"],
        email=decoded.get("email", ""),
        role=decoded.get("role", "citizen"),
    )


def get_optional_user(
    credentials: HTTPAuthorizationCredentials | None = Security(security),
) -> User | None:
    if credentials is None:
        return None
    try:
        decoded = verify_token(credentials.credentials)
        return User(
            uid=decoded["uid"],
            email=decoded.get("email", ""),
            role=decoded.get("role", "citizen"),
        )
    except Exception:
        return None


def require_authority(user: User = Depends(get_current_user)) -> User:
    if not user.is_authority:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Authority role required",
        )
    return user
