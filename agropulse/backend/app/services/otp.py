"""OTP SMS : generation, envoi (Africa's Talking si configure), verification, rate limit."""
import random
import time

from app.cache import cache_get, cache_set, incr
from app.config import settings

OTP_TTL = 300          # 5 minutes
OTP_MAX_ATTEMPTS = 3
OTP_PREFIX = "otp:"
OTP_ATTEMPTS = "otp_attempts:"


def _normalize(phone: str) -> str:
    p = (phone or "").replace(" ", "").replace("-", "")
    if p.startswith("00"):
        p = "+" + p[2:]
    if p and not p.startswith("+") and len(p) <= 15:
        p = "+" + p
    return p


def send_sms(phone: str, message: str) -> bool:
    """Envoi reel si SMS_API_KEY configure, sinon journalise (mode dev)."""
    key = settings.__dict__.get("SMS_API_KEY", "") or os.environ.get("SMS_API_KEY", "")
    if not key:
        print(f"[SMS:dev] -> {phone} : {message}")
        return False
    try:
        import httpx
        url = "https://api.africastalking.com/version1/messaging"
        resp = httpx.post(url, data={
            "username": os.environ.get("SMS_USERNAME", "sandbox"),
            "to": _normalize(phone).lstrip("+"),
            "message": message,
        }, headers={"apiKey": key}, timeout=10)
        return resp.status_code == 201
    except Exception as exc:  # pragma: no cover
        print(f"[SMS:erreur] {exc}")
        return False


import os  # noqa: E402  (utilise dans send_sms)


def issue_otp(phone: str, code: str = None) -> str:
    code = code or f"{random.randint(0, 999999):06d}"
    cache_set(OTP_PREFIX + _normalize(phone), code, OTP_TTL)
    cache_set(OTP_ATTEMPTS + _normalize(phone), "0", OTP_TTL)
    send_sms(_normalize(phone), f"AgroPulse : votre code est {code} (valide 5 min).")
    return code


def verify_otp(phone: str, code: str) -> bool:
    key = OTP_PREFIX + _normalize(phone)
    expected = cache_get(key)
    if not expected:
        return False
    attempts = int(cache_get(OTP_ATTEMPTS + _normalize(phone)) or 0)
    if attempts >= OTP_MAX_ATTEMPTS:
        return False
    if str(expected) == str(code).strip():
        cache_set(key, "", 1)
        return True
    incr(OTP_ATTEMPTS + _normalize(phone), OTP_TTL)
    return False


def attempts_left(phone: str) -> int:
    used = int(cache_get(OTP_ATTEMPTS + _normalize(phone)) or 0)
    return max(0, OTP_MAX_ATTEMPTS - used)


def login_rate_limited(phone: str, max_attempts: int = 5, window: int = 900) -> bool:
    """5 tentatives de login par 15 min et par numero (anti brute-force)."""
    return incr(f"login_attempts:{_normalize(phone)}", window) > max_attempts


def reset_login_attempts(phone: str) -> None:
    cache_set(f"login_attempts:{_normalize(phone)}", "0", 900)


def otp_ttl_remaining(phone: str) -> int:
    return OTP_TTL
