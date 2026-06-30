"""End-to-end acceptance tests for audio-to-MIDI (all 10 criteria)."""

from __future__ import annotations

import io
import uuid

import pytest
from fastapi.testclient import TestClient

from app.auth import create_access_token
from app.models.schemas import ConvertRequest
from app.services.midi_job_service import create_midi_artifact, update_midi_job
from app.storage_paths import find_upload, job_dir, upload_path


def _upload(
    client: TestClient,
    filename: str,
    content: bytes,
    auth_header: dict[str, str] | None = None,
) -> str:
    headers = auth_header or {}
    response = client.post(
        "/api/upload",
        files={"file": (filename, io.BytesIO(content), "application/octet-stream")},
        headers=headers,
    )
    assert response.status_code == 200, response.text
    return response.json()["file_id"]


def _create_job(client: TestClient, auth_header: dict[str, str], file_id: str) -> str:
    response = client.post(
        "/api/midi/jobs",
        json={"file_id": file_id},
        headers=auth_header,
    )
    assert response.status_code == 201, response.text
    return response.json()["id"]


# 1. User can upload WAV/MP3
@pytest.mark.parametrize("filename", ["sample.wav", "track.mp3"])
def test_upload_wav_and_mp3(
    client: TestClient,
    auth_header: dict[str, str],
    user_a: str,
    filename: str,
) -> None:
    file_id = _upload(client, filename, b"RIFFxxxxWAVEfmt ", auth_header)
    path = find_upload(file_id, user_id=user_a)
    assert path.exists()
    assert filename.split(".")[0] in path.name


def test_upload_rejects_unsupported_extension(client: TestClient) -> None:
    response = client.post(
        "/api/upload",
        files={"file": ("notes.txt", io.BytesIO(b"hello"), "text/plain")},
    )
    assert response.status_code == 415


# 2. App creates job
# 3. Job appears as queued
def test_create_job_returns_queued_state(
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


def test_job_create_rejects_other_users_upload(
    client: TestClient,
    auth_header: dict[str, str],
    other_auth_header: dict[str, str],
    user_b: str,
) -> None:
    file_id = uuid.uuid4().hex
    upload_path(user_b, file_id, "private.wav").write_bytes(b"RIFFxxxxWAVEfmt ")
    response = client.post(
        "/api/midi/jobs",
        json={"file_id": file_id},
        headers=auth_header,
    )
    assert response.status_code == 404


# 4. Worker processes file
# 5. Job status changes while processing
def test_pipeline_status_transitions(
    client: TestClient,
    auth_header: dict[str, str],
    uploaded_file_id: str,
    db_session,
    user_a: str,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    def _transitioning_pipeline(job_id: uuid.UUID, req: ConvertRequest) -> None:
        update_midi_job(db_session, job_id, state="running", step="loading audio", progress=0.1)
        work_dir = job_dir(job_id, user_a)
        work_dir.mkdir(parents=True, exist_ok=True)
        midi_path = work_dir / "output.mid"
        midi_path.write_bytes(b"MThd\x00\x00\x00\x06\x00\x00\x00\x01\x00\x01")
        update_midi_job(
            db_session,
            job_id,
            state="done",
            step="finished",
            progress=1.0,
            output_filename="converted.mid",
        )
        create_midi_artifact(
            db_session,
            job_id,
            file_path=midi_path,
            filename="converted.mid",
            kind="midi",
        )

    monkeypatch.setattr("app.routes.midi.run_pipeline", _transitioning_pipeline)

    job_id = _create_job(client, auth_header, uploaded_file_id)
    response = client.get(f"/api/midi/jobs/{job_id}", headers=auth_header)
    assert response.status_code == 200
    body = response.json()
    assert body["state"] == "done"
    assert body["progress"] == 1.0
    assert body["step"] == "finished"


# 6. MIDI file is generated
# 7. User can download .mid
def test_download_generated_midi(
    client: TestClient,
    auth_header: dict[str, str],
    uploaded_file_id: str,
) -> None:
    job_id = _create_job(client, auth_header, uploaded_file_id)
    response = client.get(f"/api/midi/jobs/{job_id}/artifacts/midi", headers=auth_header)
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("audio/midi")
    assert response.content.startswith(b"MThd")


# 8. Failed transcription shows useful error
def test_transcription_failure_returns_useful_error(
    client: TestClient,
    auth_header: dict[str, str],
    uploaded_file_id: str,
    db_session,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    def _failing_pipeline(job_id: uuid.UUID, req: ConvertRequest) -> None:
        update_midi_job(
            db_session,
            job_id,
            state="error",
            step="failed",
            error="RuntimeError: Basic Pitch found no notes in audio",
        )

    monkeypatch.setattr("app.routes.midi.run_pipeline", _failing_pipeline)

    job_id = _create_job(client, auth_header, uploaded_file_id)
    response = client.get(f"/api/midi/jobs/{job_id}", headers=auth_header)
    assert response.status_code == 200
    body = response.json()
    assert body["state"] == "error"
    assert "Basic Pitch found no notes" in (body["error"] or "")


# 9. Unauthorized users cannot access another user's MIDI
def test_other_user_cannot_get_job(
    client: TestClient,
    auth_header: dict[str, str],
    other_auth_header: dict[str, str],
    uploaded_file_id: str,
) -> None:
    job_id = _create_job(client, auth_header, uploaded_file_id)
    assert client.get(f"/api/midi/jobs/{job_id}", headers=other_auth_header).status_code == 403


def test_other_user_cannot_download_midi(
    client: TestClient,
    auth_header: dict[str, str],
    other_auth_header: dict[str, str],
    uploaded_file_id: str,
) -> None:
    job_id = _create_job(client, auth_header, uploaded_file_id)
    assert (
        client.get(f"/api/midi/jobs/{job_id}/artifacts/midi", headers=other_auth_header).status_code
        == 403
    )


def test_midi_jobs_require_auth(client: TestClient, uploaded_file_id: str) -> None:
    assert client.post("/api/midi/jobs", json={"file_id": uploaded_file_id}).status_code == 401


# 10. Original uploads and generated files are scoped by user/job
def test_user_scoped_upload_and_output_paths(
    client: TestClient,
    auth_header: dict[str, str],
    user_a: str,
    uploaded_file_id: str,
) -> None:
    upload = find_upload(uploaded_file_id, user_id=user_a)
    assert user_a in upload.parts

    job_id = _create_job(client, auth_header, uploaded_file_id)
    output = job_dir(uuid.UUID(job_id), user_a)
    assert user_a in output.parts
    assert (output / "output.mid").exists()


def test_auth_token_endpoint_issues_bearer_token(client: TestClient) -> None:
    response = client.post("/api/auth/token", json={"user_id": "demo-user"})
    assert response.status_code == 200
    token = response.json()["access_token"]
    assert token.startswith("demo-user.")

    upload_id = _upload(
        client,
        "demo.wav",
        b"RIFFxxxxWAVEfmt ",
        {"Authorization": f"Bearer {token}"},
    )
    assert find_upload(upload_id, user_id="demo-user").exists()


def test_full_e2e_flow_upload_job_poll_download(
    client: TestClient,
    auth_header: dict[str, str],
    user_a: str,
) -> None:
    file_id = _upload(client, "e2e.wav", b"RIFFxxxxWAVEfmt ", auth_header)

    create_resp = client.post("/api/midi/jobs", json={"file_id": file_id}, headers=auth_header)
    assert create_resp.json()["state"] == "queued"
    job_id = create_resp.json()["id"]

    status_resp = client.get(f"/api/midi/jobs/{job_id}", headers=auth_header)
    assert status_resp.json()["state"] == "done"

    dl = client.get(f"/api/midi/jobs/{job_id}/artifacts/midi", headers=auth_header)
    assert dl.status_code == 200
    assert len(dl.content) > 4

    assert find_upload(file_id, user_id=user_a).is_file()
    assert (job_dir(uuid.UUID(job_id), user_a) / "output.mid").is_file()
