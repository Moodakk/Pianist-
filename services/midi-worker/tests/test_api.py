"""Basic API tests for the MIDI worker."""

from __future__ import annotations

import uuid
from unittest.mock import MagicMock, patch

from fastapi.testclient import TestClient


def test_health(client: TestClient) -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_enqueue_job(client: TestClient) -> None:
    job_id = uuid.uuid4()
    payload = {
        "job_id": str(job_id),
        "user_id": "user-a",
        "audio_path": "/tmp/sample.wav",
        "callback_url": "http://localhost:8000/api/midi/jobs/callback",
    }
    mock_task = MagicMock()
    mock_task.id = "task-123"

    with patch("app.main.process_job") as mock_process:
        mock_process.delay.return_value = mock_task
        response = client.post("/jobs", json=payload)

    assert response.status_code == 202
    body = response.json()
    assert body["task_id"] == "task-123"
    assert body["job_id"] == str(job_id)
    mock_process.delay.assert_called_once()


def test_enqueue_job_requires_audio_source(client: TestClient) -> None:
    response = client.post(
        "/jobs",
        json={
            "job_id": str(uuid.uuid4()),
            "user_id": "user-a",
            "callback_url": "http://localhost/callback",
        },
    )
    assert response.status_code == 422


def test_job_payload_validation() -> None:
    from app.schemas import JobPayload

    payload = JobPayload.model_validate(
        {
            "job_id": str(uuid.uuid4()),
            "user_id": "u1",
            "audio_url": "https://example.com/a.mp3",
            "callback_url": "http://localhost/callback",
        }
    )
    assert payload.options.mode == "full"
