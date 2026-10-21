"""Cache Redis (Upstash) avec repli memoire — degrade sans erreur si indisponible."""
import os
import threading
import time

import redis

from app.config import settings

_client = None
_lock = threading.Lock()
_MEM: dict = {}


def _memory_get(key):
    exp = _MEM.get(key)
    if exp is None:
        return None
    if exp[0] < time.time():
        _MEM.pop(key, None)
        return None
    return exp[1]


def _memory_set(key, value, ttl=None):
    _MEM[key] = (time.time() + (ttl or 60), value)


def get_redis():
    global _client
    if _client is not None:
        return _client
    with _lock:
        if _client is None:
            try:
                _client = redis.Redis.from_url(
                    settings.REDIS_URL, decode_responses=True,
                    socket_connect_timeout=3, socket_timeout=3)
                _client.ping()
            except Exception:
                _client = False  # marque "indisponible", on bascule en memoire
    return _client or None


def cache_get(key: str):
    r = get_redis()
    if r:
        try:
            return r.get(key)
        except Exception:
            pass
    return _memory_get(key)


def cache_set(key: str, value: str, ttl: int = 900) -> None:
    r = get_redis()
    if r:
        try:
            r.setex(key, ttl, value)
            return
        except Exception:
            pass
    _memory_set(key, value, ttl)


def cache_delete(key: str) -> None:
    r = get_redis()
    if r:
        try:
            r.delete(key)
        except Exception:
            pass
    _MEM.pop(key, None)


def incr(key: str, ttl: int = 60) -> int:
    """Compteur avec expiration — utilise pour le rate limiting.
    Format memoire : _MEM[key] = (expire_at, value)."""
    r = get_redis()
    if r:
        try:
            pipe = r.pipeline()
            pipe.incr(key)
            pipe.expire(key, ttl)
            return int(pipe.execute()[0])
        except Exception:
            pass
    entry = _MEM.get(key)
    if entry is None:
        value, expire_at = 1, time.time() + ttl
    else:
        expire_at, value = entry
        if expire_at < time.time():          # cle expiree -> on repart de 1
            value, expire_at = 1, time.time() + ttl
        else:
            value = int(value) + 1
    _MEM[key] = (expire_at, value)
    return value


def ping() -> bool:
    r = get_redis()
    if not r:
        return False
    try:
        return bool(r.ping())
    except Exception:
        return False
