"""User- and job-scoped filesystem paths for uploads and outputs."""

from __future__ import annotations

import uuid
from pathlib import Path
from typing import Union

from .config import OUTPUT_DIR, UPLOAD_DIR
from .services.audio import safe_filename

JobKey = Union[str, uuid.UUID]


def upload_path(user_id: str | None, file_id: str, original_filename: str) -> Path:
    name = f"{file_id}__{safe_filename(original_filename)}"
    if user_id:
        dest_dir = UPLOAD_DIR / user_id
        dest_dir.mkdir(parents=True, exist_ok=True)
        return dest_dir / name
    return UPLOAD_DIR / name


def find_upload(file_id: str, user_id: str | None = None) -> Path:
    if user_id:
        user_dir = UPLOAD_DIR / user_id
        matches = list(user_dir.glob(f"{file_id}__*")) if user_dir.is_dir() else []
        if not matches:
            raise FileNotFoundError(f"upload {file_id} not found for user")
        return matches[0]

    flat = list(UPLOAD_DIR.glob(f"{file_id}__*"))
    if flat:
        return flat[0]

    for child in UPLOAD_DIR.iterdir():
        if child.is_dir():
            nested = list(child.glob(f"{file_id}__*"))
            if nested:
                return nested[0]

    raise FileNotFoundError(f"upload {file_id} not found")


def job_dir(job_id: JobKey, user_id: str | None = None) -> Path:
    if user_id:
        return OUTPUT_DIR / user_id / str(job_id)
    return OUTPUT_DIR / str(job_id)
