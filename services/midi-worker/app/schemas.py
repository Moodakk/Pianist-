"""Pydantic schemas for worker job payloads and API responses."""

from __future__ import annotations

from typing import Literal, Optional
from uuid import UUID

from pydantic import BaseModel, Field, model_validator

Mode = Literal["full", "melody", "bass", "stem", "piano"]
StemName = Literal["vocals", "bass", "other", "drums", "original"]
Quantize = Literal["none", "1/16", "1/8", "1/4"]
StorageType = Literal["local", "s3"]


class ConvertOptions(BaseModel):
    mode: Mode = "full"
    use_demucs: bool = False
    selected_stem: StemName = "original"
    quantize: Quantize = "none"
    min_note_duration_ms: int = Field(80, ge=0, le=2000)
    min_velocity: int = Field(20, ge=0, le=127)
    transpose: int = Field(0, ge=-24, le=24)
    estimate_tempo: bool = True
    merge_close_notes: bool = False


class ArtifactUploadConfig(BaseModel):
    storage_type: StorageType = "local"
    local_dir: Optional[str] = None
    s3_bucket: Optional[str] = None
    s3_prefix: Optional[str] = None
    public_base_url: Optional[str] = None


class JobPayload(BaseModel):
    job_id: UUID
    user_id: str
    audio_url: Optional[str] = None
    audio_path: Optional[str] = None
    options: ConvertOptions = Field(default_factory=ConvertOptions)
    callback_url: str
    artifact_upload: ArtifactUploadConfig = Field(default_factory=ArtifactUploadConfig)

    @model_validator(mode="after")
    def _require_audio_source(self) -> "JobPayload":
        if not self.audio_url and not self.audio_path:
            raise ValueError("Either audio_url or audio_path is required")
        return self


class JobEnqueueResponse(BaseModel):
    task_id: str
    job_id: UUID


class JobStatusResponse(BaseModel):
    task_id: str
    state: str
    result: Optional[dict] = None
    error: Optional[str] = None


class CallbackPayload(BaseModel):
    job_id: UUID
    task_id: Optional[str] = None
    state: Literal["running", "done", "error"]
    progress: float = 0.0
    step: str = ""
    error: Optional[str] = None
    output_filename: Optional[str] = None
    artifact_url: Optional[str] = None
    artifact_path: Optional[str] = None
    artifact_size_bytes: Optional[int] = None
    meta: Optional[dict] = None
