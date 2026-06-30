"""Tests for /api/upload validation."""

from __future__ import annotations

import asyncio
from io import BytesIO

import pytest
from fastapi import HTTPException, UploadFile
from fastapi.testclient import TestClient

from app.routes.upload import upload_audio


def test_upload_unsupported_extension(client: TestClient) -> None:
    response = client.post(
        "/api/upload",
        files={"file": ("malware.exe", b"fake-binary", "application/octet-stream")},
    )
    assert response.status_code == 415
    assert "Unsupported file type" in response.json()["detail"]


def test_upload_oversized_file(client: TestClient, monkeypatch) -> None:
    monkeypatch.setattr("app.routes.upload.MAX_UPLOAD_BYTES", 64)
    response = client.post(
        "/api/upload",
        files={"file": ("large.wav", b"x" * 128, "audio/wav")},
    )
    assert response.status_code == 413
    assert "too large" in response.json()["detail"].lower()


def test_upload_missing_filename() -> None:
    upload = UploadFile(filename="", file=BytesIO(b"audio-bytes"))
    with pytest.raises(HTTPException) as exc_info:
        asyncio.run(upload_audio(upload))
    assert exc_info.value.status_code == 400
    assert exc_info.value.detail == "No filename provided"


def test_upload_valid_wav(client: TestClient) -> None:
    payload = b"RIFF\x24\x00\x00\x00WAVEfmt \x10\x00\x00\x00"
    response = client.post(
        "/api/upload",
        files={"file": ("clip.wav", payload, "audio/wav")},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["filename"] == "clip.wav"
    assert body["size_bytes"] == len(payload)
    assert body["file_id"]
