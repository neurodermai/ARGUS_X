"""
ARGUS-X — Session Threat Store
Persistent session storage backed by Redis when available,
with in-memory fallback for local development.
"""
import asyncio
import json
import os
import logging
import time

log = logging.getLogger("argus.session_store")

# Default empty session shape
_DEFAULT_SESSION = {"total": 0, "threats": 0, "last_score": 0, "escalation": 0, "user_id": ""}

# Session TTL: 24 hours (seconds)
SESSION_TTL = 86400

# Max in-memory sessions to prevent memory exhaustion
MAX_MEMORY_SESSIONS = 10000


class SessionStore:
    """Async session store with Redis persistence and in-memory fallback."""

    # Evict expired in-memory entries every N writes
    _EVICT_EVERY = 100

    def __init__(self):
        self._redis = None
        # In-memory store: session_id → (data_dict, expiry_timestamp)
        self._memory: dict[str, tuple[dict, float]] = {}
        self._prefix = "argus:session:"
        self._write_count = 0
        # SECURITY: Lock for atomic read-modify-write on in-memory sessions
        self._lock = asyncio.Lock()

    async def init(self):
        """Attempt to connect to Redis. Falls back to in-memory if unavailable."""
        redis_url = os.getenv("REDIS_URL", "")
        if not redis_url:
            log.info("REDIS_URL not set — using in-memory session store (non-persistent)")
            return

        try:
            import redis.asyncio as aioredis
            self._redis = aioredis.from_url(
                redis_url,
                decode_responses=True,
                socket_connect_timeout=5,
            )
            # Verify connection
            await self._redis.ping()
            log.info("✅ Redis session store connected")
        except Exception as e:
            log.warning(f"Redis connection failed ({e}) — falling back to in-memory store")
            self._redis = None

    def _key(self, session_id: str) -> str:
        return f"{self._prefix}{session_id}"

    async def get_session(self, session_id: str) -> dict:
        """Retrieve session data. Returns default if not found."""
        if self._redis:
            try:
                raw = await self._redis.get(self._key(session_id))
                if raw:
                    return json.loads(raw)
            except Exception as e:
                log.warning(f"Redis GET failed for {session_id}: {e}")
        else:
            entry = self._memory.get(session_id)
            if entry is not None:
                data, expiry = entry
                if time.monotonic() < expiry:
                    return data.copy()
                # Expired — remove and return default
                del self._memory[session_id]

        return _DEFAULT_SESSION.copy()

    async def update_session(self, session_id: str, user_id: str, action: str, score: float):
        """Update session threat counters atomically."""
        if self._redis:
            try:
                key = self._key(session_id)
                # Use WATCH for optimistic locking — retry if key changes
                # between read and write (prevents TOCTOU race under load).
                max_retries = 3
                for _attempt in range(max_retries):
                    try:
                        await self._redis.watch(key)
                        raw = await self._redis.get(key)
                        session = json.loads(raw) if raw else _DEFAULT_SESSION.copy()

                        if not session.get("user_id"):
                            session["user_id"] = user_id
                        session["total"] += 1
                        if action in ("BLOCKED", "SANITIZED"):
                            session["threats"] += 1
                            if score > session["last_score"]:
                                session["escalation"] += 1
                        session["last_score"] = score

                        pipe = self._redis.pipeline()
                        pipe.multi()
                        pipe.set(key, json.dumps(session), ex=SESSION_TTL)
                        await pipe.execute()
                        break  # Success
                    except Exception as watch_err:
                        err_name = type(watch_err).__name__
                        if "WatchError" in err_name:
                            continue  # Retry on contention
                        raise
                    finally:
                        try:
                            await self._redis.unwatch()
                        except Exception:
                            pass
            except Exception as e:
                log.warning(f"Redis SET failed for {session_id}: {e}")
        else:
            # In-memory: use lock for atomic update
            async with self._lock:
                entry = self._memory.get(session_id)
                if entry is not None:
                    data, expiry = entry
                    if time.monotonic() >= expiry:
                        data = _DEFAULT_SESSION.copy()
                    session = data
                else:
                    session = _DEFAULT_SESSION.copy()

                if not session.get("user_id"):
                    session["user_id"] = user_id
                session["total"] += 1
                if action in ("BLOCKED", "SANITIZED"):
                    session["threats"] += 1
                    if score > session["last_score"]:
                        session["escalation"] += 1
                session["last_score"] = score

                self._memory[session_id] = (session, time.monotonic() + SESSION_TTL)
                self._write_count += 1

                # Evict expired + enforce cap
                if self._write_count >= self._EVICT_EVERY:
                    self._evict_expired()
                    self._write_count = 0
                if len(self._memory) > MAX_MEMORY_SESSIONS:
                    # Evict oldest entries
                    sorted_keys = sorted(
                        self._memory, key=lambda k: self._memory[k][1]
                    )
                    for k in sorted_keys[:len(self._memory) - MAX_MEMORY_SESSIONS]:
                        del self._memory[k]

    def _evict_expired(self) -> None:
        """Remove all expired entries from the in-memory store."""
        now = time.monotonic()
        expired = [k for k, (_, exp) in self._memory.items() if now >= exp]
        for k in expired:
            del self._memory[k]
        if expired:
            log.debug(f"Evicted {len(expired)} expired sessions ({len(self._memory)} remaining)")

    async def close(self):
        """Clean shutdown."""
        if self._redis:
            try:
                await self._redis.close()
            except Exception:
                pass
