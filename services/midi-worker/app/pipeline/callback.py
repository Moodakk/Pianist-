"""HTTP callback to the main backend."""

from __future__ import annotations

import httpx

from ..config import logger, settings
from ..schemas import CallbackPayload


def send_callback(callback_url: str, payload: CallbackPayload) -> None:
    """POST job status update to the main app webhook."""
    headers = {"X-Worker-Secret": settings.worker_secret}
    body = payload.model_dump(mode="json")
    logger.info("callback %s state=%s progress=%s", callback_url, payload.state, payload.progress)

    with httpx.Client(timeout=30.0) as client:
        response = client.post(callback_url, json=body, headers=headers)
        response.raise_for_status()
