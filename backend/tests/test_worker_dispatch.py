"""Tests for worker dispatch and worker-authenticated input download."""

from __future__ import annotations

import uuid
from unittest.mock import MagicMock, patch

import httpx
import pytest
from fastapi.testclient import TestClient

from app.config import WORKER_SECRET
from app.models.schemas import ConvertRequest
from app.services.midi_job_service import create_midi_job, get_midi_job
from app.services.worker_dispatch import (
    build_audio_url,
    build_callback_url,
    dispatch_midi_job,
)
from app.storage_paths import upload_path


def test_build_callback_url() -> None:
    job_id = uuid.uuid4()
    url = build_callback_url(job_id)
    assert url.endswith(f"/api/midi/jobs/{job_id}/callback")


def test_build_audio_url_includes_worker_token() -> None:
    job_id = uuid.uuid4()
    url = build_audio_url(job_id)
    assert f"/api/midi/jobs/{job_id}/input" in url
    assert f"worker_token={WORKER_SECRET}" in url


def test_dispatch_midi_job_posts_expected_payload(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr("app.services.worker_dispatch.WORKER_URL", "http://worker.test")
    monkeypatch.setattr("app.services.worker_dispatch.WORKER_API_KEY", "test-api-key")

    job_id = uuid.uuid4()
    req = ConvertRequest(file_id="abc123", mode="melody", use_demucs=True)
    mock_response = MagicMock()
    mock_response.raise_for_status = MagicMock()

    with patch("app.services.worker_dispatch.httpx.Client") as mock_client_cls:
        mock_client = MagicMock()
        mock_client.__enter__ = MagicMock(return_value=mock_client)
        mock_client.__exit__ = MagicMock(return_value=False)
        mock_client.post.return_value = mock_response
        mock_client_cls.return_value = mock_client

        dispatch_midi_job(job_id, "user-a", "abc123", req, callback_url="http://api/callback")

    mock_client.post.assert_called_once()
    call_kwargs = mock_client.post.call_args.kwargs
    assert call_kwargs["headers"]["X-API-Key"] == "test-api-key"
    payload = call_kwargs["json"]
    assert payload["job_id"] == str(job_id)
    assert payload["user_id"] == "user-a"
    assert payload["callback_url"] == "http://api/callback"
    assert payload["audio_url"] == build_audio_url(job_id)
    assert payload["options"]["mode"] == "melody"
    assert payload["options"]["use_demucs"] is True


def test_dispatch_midi_job_marks_error_when_worker_unreachable(
    db_session,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr("app.services.worker_dispatch.WORKER_URL", "http://worker.test")
    monkeypatch.setattr("app.services.worker_dispatch.SessionLocal", lambda: db_session)

    job = create_midi_job(db_session, "user-a", "file-1", {"file_id": "file-1"})
    req = ConvertRequest(file_id="file-1")

    with patch("app.services.worker_dispatch.httpx.Client") as mock_client_cls:
        mock_client = MagicMock()
        mock_client.__enter__ = MagicMock(return_value=mock_client)
        mock_client.__exit__ = MagicMock(return_value=False)
        mock_client.post.side_effect = httpx.ConnectError("connection refused")
        mock_client_cls.return_value = mock_client

        dispatch_midi_job(job.id, "user-a", "file-1", req)

    updated = get_midi_job(db_session, job.id)
    assert updated is not None
    assert updated.state == "error"
    assert "Worker dispatch failed" in (updated.error or "")


def test_dispatch_midi_job_marks_error_when_worker_url_missing(
    db_session,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr("app.services.worker_dispatch.WORKER_URL", "")
    monkeypatch.setattr("app.services.worker_dispatch.SessionLocal", lambda: db_session)

    job = create_midi_job(db_session, "user-a", "file-1", {"file_id": "file-1"})
    dispatch_midi_job(job.id, "user-a", "file-1", ConvertRequest(file_id="file-1"))

    updated = get_midi_job(db_session, job.id)
    assert updated is not None
    assert updated.state == "error"
    assert "WORKER_URL not configured" in (updated.error or "")


def test_create_job_uses_worker_dispatch_when_background_tasks_disabled(
    client: TestClient,
    auth_header: dict[str, str],
    uploaded_file_id: str,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr("app.routes.midi.USE_BACKGROUND_TASKS", False)
    with patch("app.routes.midi.dispatch_midi_job") as mock_dispatch:
        response = client.post(
            "/api/midi/jobs",
            json={"file_id": uploaded_file_id},
            headers=auth_header,
        )
    assert response.status_code == 201
    mock_dispatch.assert_called_once()


def test_job_input_download_with_worker_secret(
    client: TestClient,
    db_session,
    user_a: str,
) -> None:
    file_id = uuid.uuid4().hex
    upload_path(user_a, file_id, "sample.wav").write_bytes(b"RIFFxxxxWAVEfmt ")
    job = create_midi_job(db_session, user_a, file_id, {"file_id": file_id})

    response = client.get(
        f"/api/midi/jobs/{job.id}/input",
        headers={"X-Worker-Secret": WORKER_SECRET},
    )
    assert response.status_code == 200
    assert response.content.startswith(b"RIFF")


def test_job_input_download_with_worker_token_query(
    client: TestClient,
    db_session,
    user_a: str,
) -> None:
    file_id = uuid.uuid4().hex
    upload_path(user_a, file_id, "sample.wav").write_bytes(b"RIFFxxxxWAVEfmt ")
    job = create_midi_job(db_session, user_a, file_id, {"file_id": file_id})

    response = client.get(
        f"/api/midi/jobs/{job.id}/input",
        params={"worker_token": WORKER_SECRET},
    )
    assert response.status_code == 200
    assert response.content.startswith(b"RIFF")


def test_job_input_download_rejects_invalid_secret(
    client: TestClient,
    db_session,
    user_a: str,
) -> None:
    file_id = uuid.uuid4().hex
    upload_path(user_a, file_id, "sample.wav").write_bytes(b"RIFFxxxxWAVEfmt ")
    job = create_midi_job(db_session, user_a, file_id, {"file_id": file_id})

    response = client.get(
        f"/api/midi/jobs/{job.id}/input",
        headers={"X-Worker-Secret": "wrong"},
    )
    assert response.status_code == 401
