"""Shared pytest fixtures for API tests."""

from __future__ import annotations

import uuid
from collections.abc import Generator
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.auth import create_access_token
from app.config import OUTPUT_DIR, UPLOAD_DIR
from app.db import Base, get_db
from app.main import app
from app.models import db_models  # noqa: F401
from app.models.schemas import ConvertRequest
from app.services.midi_job_service import create_midi_artifact, update_midi_job
from app.storage_paths import job_dir, upload_path


class _SessionWrapper:
    """Prevent pipeline code from closing the shared pytest session."""

    def __init__(self, session: Session) -> None:
        self._session = session

    def __getattr__(self, name: str):
        return getattr(self._session, name)

    def close(self) -> None:
        return None


@pytest.fixture()
def db_session() -> Generator[Session, None, None]:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    TestingSessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture()
def client(db_session: Session, monkeypatch: pytest.MonkeyPatch) -> Generator[TestClient, None, None]:
    def _get_test_db() -> Generator[Session, None, None]:
        yield db_session

    def _fast_pipeline(job_id: uuid.UUID, req: ConvertRequest) -> None:
        from app.routes.convert import _resolve_user_id

        owner_id = _resolve_user_id(job_id)
        work_dir = job_dir(job_id, owner_id)
        work_dir.mkdir(parents=True, exist_ok=True)
        midi_path = work_dir / "output.mid"
        midi_path.write_bytes(b"MThd\x00\x00\x00\x06\x00\x00\x00\x01\x00\x01")
        update_midi_job(
            db_session,
            job_id,
            state="done",
            step="finished",
            progress=1.0,
            output_filename="test.mid",
        )
        create_midi_artifact(
            db_session,
            job_id,
            file_path=midi_path,
            filename="test.mid",
            kind="midi",
        )

    monkeypatch.setattr("app.routes.convert.SessionLocal", lambda: _SessionWrapper(db_session))
    monkeypatch.setattr("app.routes.midi.run_pipeline", _fast_pipeline)
    app.dependency_overrides[get_db] = _get_test_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture()
def user_a() -> str:
    return "user-a"


@pytest.fixture()
def user_b() -> str:
    return "user-b"


@pytest.fixture()
def auth_header(user_a: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {create_access_token(user_a)}"}


@pytest.fixture()
def other_auth_header(user_b: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {create_access_token(user_b)}"}


@pytest.fixture()
def uploaded_file_id(user_a: str) -> str:
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    file_id = uuid.uuid4().hex
    path = upload_path(user_a, file_id, "sample.wav")
    path.write_bytes(b"RIFFxxxxWAVEfmt ")
    return file_id


@pytest.fixture()
def pipeline_env(
    db_session: Session,
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> dict[str, Path]:
    upload_dir = tmp_path / "uploads"
    output_dir = tmp_path / "outputs"
    upload_dir.mkdir()
    output_dir.mkdir()

    monkeypatch.setattr("app.storage_paths.UPLOAD_DIR", upload_dir)
    monkeypatch.setattr("app.storage_paths.OUTPUT_DIR", output_dir)
    monkeypatch.setattr("app.routes.convert.OUTPUT_DIR", output_dir)
    monkeypatch.setattr(
        "app.routes.convert.SessionLocal",
        lambda: _SessionWrapper(db_session),
    )

    return {"upload_dir": upload_dir, "output_dir": output_dir}
