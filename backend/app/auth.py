"""Minimal bearer-token auth (user id embedded in signed token)."""

from __future__ import annotations

import hmac
from hashlib import sha256

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from .config import AUTH_SECRET

_bearer = HTTPBearer(auto_error=False)


def create_access_token(user_id: str) -> str:
    sig = hmac.new(AUTH_SECRET.encode(), user_id.encode(), sha256).hexdigest()
    return f"{user_id}.{sig}"


def _decode_access_token(token: str) -> str:
    if "." not in token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    user_id, sig = token.rsplit(".", 1)
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    expected = hmac.new(AUTH_SECRET.encode(), user_id.encode(), sha256).hexdigest()
    if not hmac.compare_digest(sig, expected):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    return user_id


def get_current_user_id(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
) -> str:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid authorization header",
        )
    return _decode_access_token(credentials.credentials)


def get_optional_user_id(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
) -> str | None:
    if credentials is None or credentials.scheme.lower() != "bearer":
        return None
    return _decode_access_token(credentials.credentials)
