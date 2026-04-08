"""
Caching decorators and utilities.
Falls back gracefully to no-cache if Redis is unavailable.
"""
import json
import functools
import hashlib
import logging
from typing import Any, Callable, TypeVar

try:
    import redis
    _redis_client: redis.Redis | None = None

    def _get_redis() -> redis.Redis | None:
        global _redis_client
        if _redis_client is None:
            from app.core.config import get_settings
            settings = get_settings()
            try:
                _redis_client = redis.from_url(
                    settings.redis_url,
                    decode_responses=True,
                    socket_connect_timeout=2,
                )
                _redis_client.ping()
            except Exception:
                _redis_client = None
        return _redis_client

except ImportError:
    def _get_redis():  # type: ignore[misc]
        return None

logger = logging.getLogger(__name__)
F = TypeVar("F", bound=Callable[..., Any])


def _make_cache_key(prefix: str, *args: Any, **kwargs: Any) -> str:
    """Generate a deterministic cache key from function arguments."""
    raw = json.dumps({"args": args, "kwargs": kwargs}, sort_keys=True, default=str)
    digest = hashlib.sha256(raw.encode()).hexdigest()[:16]
    return f"taxwise:{prefix}:{digest}"


def cached(prefix: str, ttl: int | None = None) -> Callable[[F], F]:
    """
    Decorator: cache the return value of a function in Redis.

    Usage:
        @cached("tax_summary", ttl=60)
        def get_summary(db, user_id): ...

    Falls back to calling the function directly if Redis is unavailable.
    """
    def decorator(func: F) -> F:
        @functools.wraps(func)
        def wrapper(*args: Any, **kwargs: Any) -> Any:
            from app.core.config import get_settings
            effective_ttl = ttl or get_settings().cache_ttl_seconds
            cache_key = _make_cache_key(prefix, *args[1:], **kwargs)  # skip 'db' arg
            r = _get_redis()

            if r:
                try:
                    cached_value = r.get(cache_key)
                    if cached_value is not None:
                        logger.debug("Cache HIT: %s", cache_key)
                        return json.loads(cached_value)
                except Exception as exc:
                    logger.warning("Cache read error: %s", exc)

            result = func(*args, **kwargs)

            if r:
                try:
                    r.setex(cache_key, effective_ttl, json.dumps(result, default=str))
                    logger.debug("Cache SET: %s (TTL=%ds)", cache_key, effective_ttl)
                except Exception as exc:
                    logger.warning("Cache write error: %s", exc)

            return result
        return wrapper  # type: ignore[return-value]
    return decorator


def invalidate_cache(prefix: str, *args: Any, **kwargs: Any) -> None:
    """Remove a specific cached entry."""
    key = _make_cache_key(prefix, *args, **kwargs)
    r = _get_redis()
    if r:
        try:
            r.delete(key)
        except Exception as exc:
            logger.warning("Cache invalidation error: %s", exc)


def invalidate_prefix(prefix: str) -> int:
    """Remove all cached entries matching a prefix pattern. Returns deleted count."""
    r = _get_redis()
    if not r:
        return 0
    pattern = f"taxwise:{prefix}:*"
    keys = r.keys(pattern)
    if keys:
        return r.delete(*keys)
    return 0
