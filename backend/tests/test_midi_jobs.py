"""Tests for authenticated MIDI job endpoints."""

from __future__ import annotations

import uuid

from fastapi.testclient import TestClient

from app.services.midi_job_service import create_midi_job, update_midi_job


def _create_job(client: TestClient, auth_header: dict[str, str], file_id: str) -> str:
    response = client.post(
        "/api/midi/jobs",
        json={"file_id": file_id},
        headers=auth_header,
    )
    assert response.status_code == 201
    return response.json()["id"]


def test_create_job_requires_auth(client: TestClient, uploaded_file_id: str) -> None:
    response = client.post("/api/midi/jobs", json={"file_id": uploaded_file_id})
    assert response.status_code == 401


def test_create_job_returns_id_and_status(
    client: TestClient,
    auth_header: dict[str, str],
    uploaded_file_id: str,
) -> None:
    response = client.post(
        "/api/midi/jobs",
        json={"file_id": uploaded_file_id},
        headers=auth_header,
    )
    assert response.status_code == 201
    body = response.json()
    assert body["state"] == "queued"
    assert uuid.UUID(body["id"])


def test_get_job_status_for_owner(
    client: TestClient,
    auth_header: dict[str, str],
    uploaded_file_id: str,
) -> None:
    job_id = _create_job(client, auth_header, uploaded_file_id)
    response = client.get(f"/api/midi/jobs/{job_id}", headers=auth_header)
    assert response.status_code == 200
    body = response.json()
    assert body["id"] == job_id
    assert body["state"] == "done"
    assert body["progress"] == 1.0
    assert body["output_filename"] == "test.mid"


def test_get_job_forbidden_for_other_user(
    client: TestClient,
    auth_header: dict[str, str],
    other_auth_header: dict[str, str],
    uploaded_file_id: str,
) -> None:
    job_id = _create_job(client, auth_header, uploaded_file_id)
    response = client.get(f"/api/midi/jobs/{job_id}", headers=other_auth_header)
    assert response.status_code == 403


def test_get_job_not_found(client: TestClient, auth_header: dict[str, str]) -> None:
    missing_id = uuid.uuid4()
    response = client.get(f"/api/midi/jobs/{missing_id}", headers=auth_header)
    assert response.status_code == 404


def test_download_midi_for_owner(
    client: TestClient,
    auth_header: dict[str, str],
    uploaded_file_id: str,
) -> None:
    job_id = _create_job(client, auth_header, uploaded_file_id)
    response = client.get(f"/api/midi/jobs/{job_id}/artifacts/midi", headers=auth_header)
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("audio/midi")
    assert response.content.startswith(b"MThd")


def test_download_midi_forbidden_for_other_user(
    client: TestClient,
    auth_header: dict[str, str],
    other_auth_header: dict[str, str],
    uploaded_file_id: str,
) -> None:
    job_id = _create_job(client, auth_header, uploaded_file_id)
    response = client.get(f"/api/midi/jobs/{job_id}/artifacts/midi", headers=other_auth_header)
    assert response.status_code == 403


def test_download_midi_conflict_when_not_finished(
    client: TestClient,
    auth_header: dict[str, str],
    uploaded_file_id: str,
    db_session,
    user_a: str,
) -> None:
    job = create_midi_job(db_session, user_a, uploaded_file_id, {"file_id": uploaded_file_id})
    update_midi_job(db_session, job.id, state="running", step="working", progress=0.5)
    response = client.get(f"/api/midi/jobs/{job.id}/artifacts/midi", headers=auth_header)
    assert response.status_code == 409


def test_download_midi_not_found_without_artifact(
    client: TestClient,
    auth_header: dict[str, str],
    uploaded_file_id: str,
    db_session,
    user_a: str,
) -> None:
    job = create_midi_job(db_session, user_a, uploaded_file_id, {"file_id": uploaded_file_id})
    update_midi_job(db_session, job.id, state="done", step="finished", progress=1.0)
    response = client.get(f"/api/midi/jobs/{job.id}/artifacts/midi", headers=auth_header)
    assert response.status_code == 404


def test_job_callback_updates_status(
    client: TestClient,
    auth_header: dict[str, str],
    uploaded_file_id: str,
    db_session,
    user_a: str,
) -> None:
    job = create_midi_job(db_session, user_a, uploaded_file_id, {"file_id": uploaded_file_id})
    response = client.post(
        f"/api/midi/jobs/{job.id}/callback",
        json={
            "state": "running",
            "progress": 0.5,
            "step": "transcribing",
        },
        headers={"X-Worker-Secret": "dev-worker-secret"},
    )
    assert response.status_code == 200
    assert response.json()["state"] == "running"

    status_response = client.get(f"/api/midi/jobs/{job.id}", headers=auth_header)
    assert status_response.status_code == 200
    assert status_response.json()["progress"] == 0.5


def test_job_callback_rejects_invalid_secret(
    client: TestClient,
    uploaded_file_id: str,
    db_session,
    user_a: str,
) -> None:
    job = create_midi_job(db_session, user_a, uploaded_file_id, {"file_id": uploaded_file_id})
    response = client.post(
        f"/api/midi/jobs/{job.id}/callback",
        json={"state": "running", "progress": 0.1, "step": "test"},
        headers={"X-Worker-Secret": "wrong"},
    )
    assert response.status_code == 401
