"""Dependances FastAPI : authentification, RBAC, entitlements par plan (dossier 09)."""
from typing import Optional

from fastapi import Depends, Header, HTTPException, Request

from app.database import SessionLocal
from app.models import all as M
from app.security import decode_token, phone_hash

# Ordre hierarchique des plans
PLAN_ORDER = ["visiteur", "basic", "pro", "coop", "enterprise"]
ROLES = ["farmer", "trader", "coop", "enterprise", "agent", "admin"]

# Matrice d'acces (dossier 09 / P02)
ENTITLEMENTS = {
    "prices_current": {"visiteur", "basic", "pro", "coop", "enterprise", "agent", "admin"},
    "prices_history": {"pro", "coop", "enterprise", "admin"},
    "alerts": {"basic", "pro", "coop", "enterprise", "admin"},
    "dashboard": {"pro", "coop", "enterprise", "admin"},
    "export": {"pro", "coop", "enterprise", "admin"},
    "marketplace": {"coop", "enterprise", "admin"},
    "api": {"enterprise", "admin"},
    "price_entry": {"agent", "admin"},
    "moderation": {"admin"},
    "forecast": {"pro", "coop", "enterprise", "admin"},
}
MAX_ALERTS = {"basic": 3, "pro": 50, "coop": 500, "enterprise": 5000, "admin": 5000}
TRIAL_DAYS = 14
GRACE_DAYS = 7


def plan_rank(plan: str) -> int:
    try:
        return PLAN_ORDER.index((plan or "visiteur").lower())
    except ValueError:
        return 0


def resolve_plan(db, user) -> str:
    """Plan effectif : essai 14j -> grace 7j -> Basic. Regles BR-11/BR-12."""
    from datetime import datetime, timezone, timedelta
    now = datetime.now(timezone.utc)
    sub = (db.query(M.Subscription)
           .filter(M.Subscription.user_id == user.id)
           .order_by(M.Subscription.starts_at.desc()).first())
    if not sub:
        return "basic"
    ends = sub.ends_at
    if ends is None:
        return sub.plan
    if ends.tzinfo is None:
        ends = ends.replace(tzinfo=timezone.utc)
    if ends > now:
        return sub.plan
    if ends > now - timedelta(days=GRACE_DAYS):
        return sub.plan          # periode de grace
    return "basic"                # downgrade


def _bearer(authorization: Optional[str]) -> Optional[str]:
    if not authorization:
        return None
    parts = authorization.split()
    if len(parts) == 2 and parts[0].lower() == "bearer":
        return parts[1]
    return None


def get_current_user(
    authorization: Optional[str] = Header(None),
    x_api_key: Optional[str] = Header(None),
):
    """Retourne l'utilisateur authentifie (JWT Bearer) ou leve 401."""
    token = _bearer(authorization)
    if not token:
        raise HTTPException(401, "Authentification requise",
                            headers={"WWW-Authenticate": "Bearer"})
    try:
        payload = decode_token(token, "access")
    except Exception:
        raise HTTPException(401, "Jeton invalide ou expire")
    db = SessionLocal()
    try:
        user = db.query(M.User).filter(M.User.id == payload["sub"]).first()
        if not user:
            raise HTTPException(401, "Utilisateur introuvable")
        if not user.is_active:
            raise HTTPException(403, "Compte desactive")
        user._plan = resolve_plan(db, user)
        return user
    finally:
        db.close()


def optional_user(authorization: Optional[str] = Header(None)):
    token = _bearer(authorization)
    if not token:
        return None
    try:
        payload = decode_token(token, "access")
    except Exception:
        return None
    db = SessionLocal()
    try:
        user = db.query(M.User).filter(M.User.id == payload["sub"]).first()
        if user:
            user._plan = resolve_plan(db, user)
        return user
    finally:
        db.close()


def require_plan(feature: str):
    """Garde : l'utilisateur doit avoir le droit `feature` selon son plan."""
    allowed = ENTITLEMENTS.get(feature)
    if allowed is None:
        raise HTTPException(500, f"Feature inconnue: {feature}")

    def _guard(user=Depends(get_current_user)):
        plan = getattr(user, "_plan", "basic")
        role = user.role or "farmer"
        if role == "admin":
            return user
        if role in ("agent",) and feature in ("price_entry", "prices_current"):
            return user
        if plan not in allowed and plan not in ("pro", "coop", "enterprise", "basic"):
            raise HTTPException(403, f"Plan {plan} insuffisant pour {feature}")
        if plan not in allowed:
            # Admin/agent passes, sinon plan insuffisant
            if role == "agent" and feature in ("price_entry",):
                return user
            raise HTTPException(403, f"Plan {plan} insuffisant pour {feature}")
        return user
    return _guard


def require_role(*roles):
    def _guard(user=Depends(get_current_user)):
        if (user.role or "") not in roles:
            raise HTTPException(403, f"Role requis: {'/'.join(roles)}")
        return user
    return _guard


def require_admin(user=Depends(get_current_user)):
    if user.role != "admin":
        raise HTTPException(403, "Acces reserve a l'administration")
    return user


def check_alert_quota(db, user, plan: str) -> None:
    limit = MAX_ALERTS.get(plan, 3)
    active = db.query(M.Alert).filter(
        M.Alert.user_id == user.id, M.Alert.is_active == True).count()  # noqa: E712
    if active >= limit:
        raise HTTPException(403, f"Limite atteinte : {limit} alertes actives sur le plan {plan}")
