"""Sécurité : JWT RS256, hash HMAC des téléphones, TOTP, mots de passe.

Clés RSA : variable d'env JWT_PRIVATE_KEY (PEM) > dossier keys/ > génération auto.
"""
import base64
import hashlib
import hmac
import os
import struct
import time
from pathlib import Path

import jwt
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding, rsa

from app.config import settings

KEYS_DIR = Path(os.environ.get("JWT_KEYS_DIR", Path(__file__).resolve().parent.parent / "keys"))
ACCESS_TTL = 15 * 60          # 15 minutes
REFRESH_TTL = 7 * 24 * 3600   # 7 jours
ISSUER = "agropulse-africa"
PHONE_SECRET = os.environ.get("PII_HASH_SECRET", settings.JWT_SECRET)
# Garde la memoire des refresh tokens quand Redis est indisponible
_REFRESH_STORE: dict = {}


# --------------------------------------------------------------------------- cles
def _load_or_create_keys():
    env_key = os.environ.get("JWT_PRIVATE_KEY", "").strip()
    if env_key:
        private_pem = env_key.replace("\\n", "\n").encode()
        private_key = serialization.load_pem_private_key(private_pem, password=None)
        public_key = private_key.public_key()
        return private_key, public_key
    KEYS_DIR.mkdir(parents=True, exist_ok=True)
    priv_path, pub_path = KEYS_DIR / "private.pem", KEYS_DIR / "public.pem"
    if priv_path.exists() and pub_path.exists():
        private_key = serialization.load_pem_private_key(priv_path.read_bytes(), password=None)
        public_key = serialization.load_pem_public_key(pub_path.read_bytes())
        return private_key, public_key
    private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    public_key = private_key.public_key()
    priv_path.write_bytes(private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption()))
    pub_path.write_bytes(public_key.public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo))
    try:
        os.chmod(priv_path, 0o600)
    except OSError:
        pass
    return private_key, public_key


_PRIVATE_KEY, _PUBLIC_KEY = _load_or_create_keys()


# --------------------------------------------------------------------------- JWT
def create_token(user_id: str, phone: str, role: str, plan: str, token_type: str = "access") -> str:
    now = int(time.time())
    ttl = ACCESS_TTL if token_type == "access" else REFRESH_TTL
    payload = {
        "sub": str(user_id), "phone_hash": phone_hash(phone), "role": role, "plan": plan,
        "typ": token_type, "iss": ISSUER, "iat": now, "exp": now + ttl,
        "jti": hashlib.sha256(f"{user_id}{now}{token_type}".encode()).hexdigest()[:16],
    }
    token = jwt.encode(payload, _PRIVATE_KEY, algorithm="RS256")
    if token_type == "refresh":
        _REFRESH_STORE[payload["jti"]] = now + ttl
    return token


def decode_token(token: str, expect: str = "access") -> dict:
    payload = jwt.decode(token, _PUBLIC_KEY, algorithms=["RS256"], issuer=ISSUER)
    if payload.get("typ") != expect:
        raise jwt.InvalidTokenError(f"Type de token attendu: {expect}")
    if expect == "refresh" and payload.get("jti") not in _REFRESH_STORE:
        raise jwt.InvalidTokenError("Refresh token revoque ou expire")
    return payload


def revoke_refresh(jti: str) -> None:
    _REFRESH_STORE.pop(jti, None)


# --------------------------------------------------------------------------- PII
def phone_hash(phone: str) -> str:
    """HMAC-SHA256 du numero normalise — usage analytics/journalisation."""
    normalized = (phone or "").replace(" ", "").replace("-", "")
    return hmac.new(PHONE_SECRET.encode(), normalized.encode(), hashlib.sha256).hexdigest()


# --------------------------------------------------------------------------- mot de passe
def hash_password(password: str) -> str:
    salt = os.urandom(16)
    dk = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 200_000)
    return f"pbkdf2_sha256$200000${base64.b64encode(salt).decode()}${base64.b64encode(dk).decode()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        algo, iters, salt_b64, dk_b64 = stored.split("$")
        if algo != "pbkdf2_sha256":
            return False
        salt, expected = base64.b64decode(salt_b64), base64.b64decode(dk_b64)
        dk = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, int(iters))
        return hmac.compare_digest(dk, expected)
    except Exception:
        return False


# --------------------------------------------------------------------------- TOTP (RFC 6238)
def _b32_secret() -> bytes:
    return base64.b32encode(os.urandom(20)).decode().rstrip("=")


def totp_secret() -> str:
    return _b32_secret()


def totp_code(secret: str, moment: int = None, step: int = 30, digits: int = 6) -> str:
    key = base64.b32decode(secret + "=" * (-len(secret) % 8))
    counter = int((moment or time.time()) // step)
    msg = struct.pack(">Q", counter)
    digest = hmac.new(key, msg, hashlib.sha1).digest()
    offset = digest[-1] & 0x0F
    code = (struct.unpack(">I", digest[offset:offset + 4])[0] & 0x7FFFFFFF) % (10 ** digits)
    return str(code).zfill(digits)


def totp_verify(secret: str, code: str, window: int = 1) -> bool:
    if not secret or not code:
        return False
    for drift in range(-window, window + 1):
        if hmac.compare_digest(totp_code(secret, int(time.time()) + drift * 30), str(code).strip()):
            return True
    return False


def verify_signature(public_key_pem: bytes, signature: bytes, payload: bytes) -> bool:
    try:
        pub = serialization.load_pem_public_key(public_key_pem)
        pub.verify(signature, payload, padding.PKCS1v15(), hashes.SHA256())
        return True
    except Exception:
        return False
