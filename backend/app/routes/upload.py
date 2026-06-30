"""Upload endpoint."""

from __future__ import annotations

import uuid
from pathlib import Path

from fastapi import APIRouter, File, HTTPException, UploadFile

from ..config import ALLOWED_EXTENSIONS, MAX_UPLOAD_BYTES, UPLOAD_DIR, logger
from ..models.schemas import UploadResponse
from ..services.audio import safe_filename

router = APIRouter(prefix="/api", tags=["upload"])

CHUNK = 1024 * 1024  # 1MB


@router.post("/upload", response_model=UploadResponse)
async def upload_audio(file: UploadFile = File(...)) -> UploadResponse:
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided")

    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported file type {ext!r}. Allowed: {sorted(ALLOWED_EXTENSIONS)}",
        )

    file_id = uuid.uuid4().hex
    stored = UPLOAD_DIR / f"{file_id}__{safe_filename(file.filename)}"

    total = 0
    with stored.open("wb") as out:
        while True:
            chunk = await file.read(CHUNK)
            if not chunk:
                break
            total += len(chunk)
            if total > MAX_UPLOAD_BYTES:
                out.close()
                stored.unlink(missing_ok=True)
                raise HTTPException(
                    status_code=413,
                    detail=f"File too large (>{MAX_UPLOAD_BYTES // (1024 * 1024)} MB)",
                )
            out.write(chunk)

    logger.info("uploaded %s -> %s (%d bytes)", file.filename, stored, total)
    return UploadResponse(file_id=file_id, filename=file.filename, size_bytes=total)
