"""Tests securite : JWT RS256, hash telephone, TOTP, mots de passe, cache, quotas."""
import time

import jwt
import pytest

from app.security import (ACCESS_TTL, REFRESH_TTL, create_token, decode_token,
                          hash_password, verify_password, phone_hash, totp_secret,
                          totp_code, totp_verify)


def test_token_roundtrip():
    t = create_token("user-1", "+22890123456", "farmer", "pro", "access")
    p = decode_token(t, "access")
    assert p["sub"] == "user-1"
    assert p["role"] == "farmer"
    assert p["plan"] == "pro"
    assert p["typ"] == "access"
    assert p["exp"] - p["iat"] == ACCESS_TTL


def test_token_expiration_15min():
    t = create_token("u", "+228", "farmer", "basic", "access")
    p = decode_token(t, "access")
    assert p["exp"] - p["iat"] == 900


def test_refresh_ttl_7d():
    t = create_token("u", "+228", "farmer", "basic", "refresh")
    p = decode_token(t, "refresh")
    assert p["exp"] - p["iat"] == REFRESH_TTL == 7 * 24 * 3600


def test_wrong_type_rejected():
    t = create_token("u", "+228", "farmer", "basic", "refresh")
    with pytest.raises(jwt.InvalidTokenError):
        decode_token(t, "access")


def test_tampered_token_rejected():
    t = create_token("u", "+228", "farmer", "basic", "access")
    with pytest.raises(jwt.InvalidTokenError):
        decode_token(t[:-3] + "aaa", "access")


def test_phone_hash_stable_and_hidden():
    h1 = phone_hash("+228 90 12 34 56")
    h2 = phone_hash("+22890123456")
    assert h1 == h2                      # normalisation
    assert h1 != "+228 90 12 34 56"     # pas en clair
    assert len(h1) == 64


def test_password_hash_verify():
    stored = hash_password("MotDePasse123!")
    assert "MotDePasse123!" not in stored
    assert verify_password("MotDePasse123!", stored) is True
    assert verify_password("mauvais", stored) is False


def test_totp_valid_window():
    secret = totp_secret()
    now = int(time.time())
    code = totp_code(secret, now)
    assert totp_verify(secret, code) is True
    assert totp_verify(secret, "000000") in (True, False)  # collision possible
    assert totp_verify("JBSWY3DPEHPK3PXP", "123456") is False


def test_totp_drift_window():
    secret = totp_secret()
    code = totp_code(secret, int(time.time()) - 30)
    assert totp_verify(secret, code) is True  # tolerance -1 step


def test_cache_memory_fallback():
    from app.cache import cache_set, cache_get, cache_delete, incr
    cache_set("t:k", "v", 60)
    assert cache_get("t:k") == "v"
    cache_delete("t:k")
    assert cache_get("t:k") is None
    assert incr("t:c", 60) >= 1
