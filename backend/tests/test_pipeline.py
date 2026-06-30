"""Tests for the conversion pipeline (worker-style behavior with mocked ML)."""

from __future__ import annotations

import uuid
import wave
from pathlib import Path

import pytest
from sqlalchemy.orm import Session

from app.models.schemas import ConvertRequest
from app.routes.convert import run_pipeline
from app.services.midi_job_service import create_midi_job, get_midi_artifact, get_midi_job
from app.storage_paths import job_dir, upload_path

MINIMAL_MIDI = b"MThd\x00\x00\x00\x06\x00\x00\x00\x01\x00\x01"
TEST_USER = "user-a"


def _make_minimal_wav(path: Path, *, duration_sec: float = 0.1, sample_rate: int = 44100) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    n_frames = int(sample_rate * duration_sec)
    with wave.open(str(path), "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)
        wf.writeframes(b"\x00\x00" * n_frames)


def _mock_successful_ml(monkeypatch: pytest.MonkeyPatch) -> None:
    def _to_wav(src: Path, dst: Path, mono: bool = False) -> Path:
        _make_minimal_wav(dst)
        return dst

    def _transcribe(audio: Path, raw_mid: Path) -> Path:
        raw_mid.parent.mkdir(parents=True, exist_ok=True)
        raw_mid.write_bytes(MINIMAL_MIDI)
        return raw_mid

    def _clean_midi(raw: Path, clean: Path, settings) -> None:
        clean.write_bytes(raw.read_bytes())

    monkeypatch.setattr("app.routes.convert.to_wav", _to_wav)
    monkeypatch.setattr("app.routes.convert.transcribe", _transcribe)
    monkeypatch.setattr("app.routes.convert.clean_midi", _clean_midi)
    monkeypatch.setattr("app.routes.convert.estimate_tempo", lambda _p: 120.0)
    monkeypatch.setattr("app.routes.convert.duration_seconds", lambda _p: 0.1)


def test_pipeline_handles_invalid_audio(
    pipeline_env: dict,
    db_session: Session,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    file_id = uuid.uuid4().hex
    upload_path(TEST_USER, file_id, "corrupt.wav").write_bytes(b"")

    job = create_midi_job(db_session, TEST_USER, file_id, {"file_id": file_id})

    def _to_wav_fail(_src: Path, _dst: Path, mono: bool = False) -> Path:
        raise RuntimeError("invalid or empty audio")

    monkeypatch.setattr("app.routes.convert.to_wav", _to_wav_fail)

    run_pipeline(job.id, ConvertRequest(file_id=file_id))

    refreshed = get_midi_job(db_session, job.id)
    assert refreshed is not None
    assert refreshed.state == "error"
    assert refreshed.error is not None
    assert "invalid or empty audio" in refreshed.error


def test_pipeline_creates_midi_artifact_for_valid_wav(
    pipeline_env: dict,
    db_session: Session,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    file_id = uuid.uuid4().hex
    _make_minimal_wav(upload_path(TEST_USER, file_id, "tone.wav"))

    job = create_midi_job(db_session, TEST_USER, file_id, {"file_id": file_id})
    _mock_successful_ml(monkeypatch)

    run_pipeline(job.id, ConvertRequest(file_id=file_id))

    output_mid = job_dir(job.id, TEST_USER)
    assert (output_mid / "output.mid").exists()
    assert (output_mid / "output.mid").read_bytes().startswith(b"MThd")

    refreshed = get_midi_job(db_session, job.id)
    assert refreshed is not None
    assert refreshed.state == "done"
    assert refreshed.output_filename == "tone.mid"


def test_pipeline_failed_job_stores_error_message(
    pipeline_env: dict,
    db_session: Session,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    file_id = uuid.uuid4().hex
    (upload_path(TEST_USER, file_id, "bad.wav")).write_bytes(b"RIFF!!!!")

    job = create_midi_job(db_session, TEST_USER, file_id, {"file_id": file_id})
    _mock_successful_ml(monkeypatch)

    def _transcribe_fail(_audio: Path, _raw_mid: Path) -> Path:
        raise ValueError("transcription failed on corrupt input")

    monkeypatch.setattr("app.routes.convert.transcribe", _transcribe_fail)

    run_pipeline(job.id, ConvertRequest(file_id=file_id))

    refreshed = get_midi_job(db_session, job.id)
    assert refreshed is not None
    assert refreshed.state == "error"
    assert refreshed.step == "failed"
    assert refreshed.error is not None
    assert "transcription failed" in refreshed.error


def test_pipeline_success_exposes_downloadable_artifact(
    client,
    pipeline_env: dict,
    db_session: Session,
    auth_header: dict[str, str],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    file_id = uuid.uuid4().hex
    _make_minimal_wav(upload_path(TEST_USER, file_id, "song.wav"))

    job = create_midi_job(db_session, TEST_USER, file_id, {"file_id": file_id})
    _mock_successful_ml(monkeypatch)

    run_pipeline(job.id, ConvertRequest(file_id=file_id))

    status_response = client.get(f"/api/midi/jobs/{job.id}", headers=auth_header)
    assert status_response.status_code == 200
    body = status_response.json()
    assert body["state"] == "done"
    assert body["output_filename"] == "song.mid"

    download_response = client.get(
        f"/api/midi/jobs/{job.id}/artifacts/midi",
        headers=auth_header,
    )
    assert download_response.status_code == 200
    assert download_response.headers["content-type"].startswith("audio/midi")
    assert download_response.content.startswith(b"MThd")

    artifact = get_midi_artifact(db_session, job.id)
    assert artifact is not None
    assert artifact.filename == "song.mid"
    assert Path(artifact.file_path).exists()
