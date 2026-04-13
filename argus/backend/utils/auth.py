"""
ARGUS-X — API Key Authentication
Minimal header-based auth to protect all /api/v1 endpoints.
SECURITY: Never log or expose the API key value.
"""
import os
import logging
from typing import Optional

from fastapi import Security, HTTPException, status
from fastapi.security import APIKeyHeader

log = logging.getLogger("argus.auth")

# ── Configuration ────────────────────────────────────────────────────────────
_API_KEY: Optional[str] = os.getenv("API_KEY", "")

# Header scheme — appears in OpenAPI docs as a security requirement
_api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)


async def require_api_key(api_key: Optional[str] = Security(_api_key_header)) -> str:
    """
    FastAPI dependency that validates the X-API-Key header.

    If API_KEY env var is not set, authentication is DISABLED (dev mode).
    If API_KEY is set, every request must include a matching X-API-Key header.

    Usage:
        app.include_router(router, dependencies=[Depends(require_api_key)])
    """
    # No API_KEY configured → auth disabled (local dev / demo mode)
    if not _API_KEY:
        return ""

    if not api_key:
        log.warning("🔒 Request rejected — missing X-API-Key header")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing X-API-Key header",
        )

    if api_key != _API_KEY:
        log.warning("🔒 Request rejected — invalid API key")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid API key",
        )

    return api_key
