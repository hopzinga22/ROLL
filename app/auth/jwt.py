"""
auth/jwt.py — create and decode JWT access tokens.

The token's "sub" (subject) claim holds the user's id. Keep the payload
minimal — anything sensitive doesn't belong in a JWT since it's only
base64-encoded, not encrypted; anyone holding the token can read the claims.
"""

from datetime import datetime, timedelta, timezone

from jose import jwt, JWTError

from app.config import get_settings

settings = get_settings()


def create_access_token(user_id: int) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_expire_minutes)
    payload = {"sub": str(user_id), "exp": expire}
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> int | None:
    """Returns the user id from a valid token, or None if it's invalid/expired."""
    try:
        payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
        user_id = payload.get("sub")
        return int(user_id) if user_id is not None else None
    except (JWTError, ValueError):
        return None
