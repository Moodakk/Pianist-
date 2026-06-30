"""Dev-friendly token issuance for authenticated MIDI flows."""

from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel, Field

from ..auth import create_access_token

router = APIRouter(prefix="/api/auth", tags=["auth"])


class TokenRequest(BaseModel):
    user_id: str = Field(min_length=1, max_length=128)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


@router.post("/token", response_model=TokenResponse)
def issue_token(req: TokenRequest) -> TokenResponse:
    return TokenResponse(access_token=create_access_token(req.user_id))
