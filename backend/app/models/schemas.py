"""Pydantic request/response schemas."""

from __future__ import annotations

from datetime import datetime
from typing import List, Literal, Optional
from uuid import UUID

from pydantic import BaseModel, Field

Mode = Literal["full", "melody", "bass", "stem", "piano"]
StemName = Literal["vocals", "bass", "other", "drums", "original", "minus"]
Quantize = Literal["none", "1/16", "1/8", "1/4"]
MidiJobState = Literal["queued", "running", "done", "error"]


class UploadResponse(BaseModel):
    file_id: str
    filename: str
    size_bytes: int


class ConvertRequest(BaseModel):
    file_id: str
    mode: Mode = "full"
    use_demucs: bool = False
    selected_stem: StemName = "original"
    quantize: Quantize = "none"
    min_note_duration_ms: int = Field(80, ge=0, le=2000)
    min_velocity: int = Field(20, ge=0, le=127)
    transpose: int = Field(0, ge=-24, le=24)
    estimate_tempo: bool = True
    merge_close_notes: bool = False


class ConvertResponse(BaseModel):
    job_id: str


class JobStatus(BaseModel):
    job_id: str
    state: Literal["queued", "running", "done", "error"]
    progress: float = 0.0
    step: str = ""
    error: Optional[str] = None
    file_id: Optional[str] = None
    output_filename: Optional[str] = None
    created_at: float
    updated_at: float


class MidiJobCreateRequest(ConvertRequest):
    pass


class MidiJobResponse(BaseModel):
    id: UUID
    state: MidiJobState
    progress: float = 0.0
    step: str = ""
    error: Optional[str] = None
    file_id: str
    output_filename: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class MidiJobCreateResponse(BaseModel):
    id: UUID
    state: MidiJobState


class NotePreview(BaseModel):
    pitch: int
    name: str
    start: float
    end: float
    velocity: int


class PreviewResponse(BaseModel):
    job_id: str
    duration: float
    note_count: int
    estimated_bpm: Optional[float] = None
    notes: List[NotePreview]


class HistoryEntry(BaseModel):
    job_id: str
    filename: str
    created_at: float
    size_bytes: int


class HistoryResponse(BaseModel):
    items: List[HistoryEntry]


class MidiJobCallbackRequest(BaseModel):
    """Webhook payload sent by the MIDI worker when job status changes."""

    task_id: Optional[str] = None
    state: MidiJobState
    progress: float = 0.0
    step: str = ""
    error: Optional[str] = None
    output_filename: Optional[str] = None
    artifact_url: Optional[str] = None
    artifact_path: Optional[str] = None
    artifact_size_bytes: Optional[int] = None
    meta: Optional[dict] = None
