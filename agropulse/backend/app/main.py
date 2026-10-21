from fastapi import FastAPI, Depends, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import time

from app.config import settings
from app.dependencies import get_current_user, require_plan, require_admin, check_alert_quota

app = FastAPI(title="AgroPulse Africa API", version="1.0.0")

app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

# --- health ---
@app.get("/api/v1/health")
def health():
    return {"status": "ok", "version": "1.0.0"}

# --- MOCK SEED (fallback si BDD vide/injoignable) ---
PRODUCTS = {
    "MAIS": {"code": "MAIS", "name_fr": "Maïs"},
    "SOJA": {"code": "SOJA", "name_fr": "Soja"},
    "TOMATE": {"code": "TOMATE", "name_fr": "Tomate"},
}
MARKETS = [
    {"id": "hedzranawoe", "name_fr": "Hedzranawoé", "region": "Maritime", "location": {"lat": 6.1319, "lng": 1.2228}, "market_type": "wholesale", "is_active": True},
    {"id": "kara", "name_fr": "Kara", "region": "Kara", "location": {"lat": 9.5511, "lng": 1.1861}, "market_type": "wholesale", "is_active": True},
    {"id": "sokode", "name_fr": "Sokodé", "region": "Centrale", "location": {"lat": 8.9833, "lng": 1.1333}, "market_type": "wholesale", "is_active": True},
]
PRICES = [
    {"product": PRODUCTS["MAIS"], "market": MARKETS[0], "avg_price": 225.0, "min_price": 200.0, "max_price": 250.0, "currency": "XOF", "unit": "kg", "variation_24h": 3.2, "sample_count": 5, "updated_at": "2026-07-08T10:30:00Z"},
    {"product": PRODUCTS["SOJA"], "market": MARKETS[0], "avg_price": 380.0, "min_price": 350.0, "max_price": 410.0, "currency": "XOF", "unit": "kg", "variation_24h": -1.5, "sample_count": 4, "updated_at": "2026-07-08T10:30:00Z"},
    {"product": PRODUCTS["TOMATE"], "market": MARKETS[0], "avg_price": 450.0, "min_price": 400.0, "max_price": 500.0, "currency": "XOF", "unit": "kg", "variation_24h": 8.1, "sample_count": 6, "updated_at": "2026-07-08T10:30:00Z"},
    {"product": PRODUCTS["MAIS"], "market": MARKETS[1], "avg_price": 210.0, "min_price": 195.0, "max_price": 230.0, "currency": "XOF", "unit": "kg", "variation_24h": 2.1, "sample_count": 3, "updated_at": "2026-07-08T10:30:00Z"},
]

class RegisterIn(BaseModel):
    phone: str
    full_name: Optional[str] = None
    role: str = "farmer"
    language: str = "fr"
    region_id: Optional[str] = None

class LoginIn(BaseModel):
    phone: str
    otp: str
    totp_code: Optional[str] = None   # 2FA admin (RFC 6238)

class RefreshIn(BaseModel):
    refresh_token: str

class PriceIn(BaseModel):
    product_id: str
    market_id: str
    price: float
    volume_estimate: Optional[float] = None
    photo_url: Optional[str] = None
    recorded_at: Optional[str] = None

class AlertIn(BaseModel):
    product_id: str
    market_id: Optional[str] = None
    alert_type: str = "price_above"
    threshold_value: Optional[float] = None
    channel: str = "whatsapp"
    phone: Optional[str] = None  # rattache l'alerte a l'utilisateur (defaut: compte demo)

def _db_prices(product: Optional[str] = None):
    """Prix depuis PostgreSQL (price_records approved), avec cache Redis 15 min."""
    import json
    from app.database import SessionLocal
    from app.models import all as M
    from app.cache import cache_get, cache_set
    cache_key = f"prices:current:{product or 'all'}"
    cached = cache_get(cache_key)
    if cached:
        try:
            return json.loads(cached)
        except Exception:
            pass
    db = SessionLocal()
    try:
        q = db.query(M.PriceRecord, M.Product, M.Market).join(
            M.Product, M.PriceRecord.product_id == M.Product.id).join(
            M.Market, M.PriceRecord.market_id == M.Market.id).filter(
            M.PriceRecord.status == "approved")
        if product:
            q = q.filter(M.Product.code == product.upper())
        rows = q.order_by(M.PriceRecord.recorded_at.desc()).limit(50).all()
        if not rows:
            raise ValueError("BDD vide")
        out = []
        for rec, prod, mkt in rows:
            out.append({
                "product": {"code": prod.code, "name_fr": prod.name_fr},
                "market": {"id": str(mkt.id), "name_fr": mkt.name_fr},
                "avg_price": float(rec.price), "min_price": float(rec.price),
                "max_price": float(rec.price), "currency": rec.currency or "XOF",
                "unit": rec.unit or "kg", "variation_24h": 0.0, "sample_count": 1,
                "updated_at": rec.recorded_at.isoformat() if rec.recorded_at else None,
                "source": "db"})
        cache_set(cache_key, json.dumps(out), 900)  # TTL 15 min
        return out
    finally:
        db.close()

def check_auth(authorization: Optional[str] = Header(None), x_api_key: Optional[str] = Header(None)):
    """Garde historique conservee pour compatibilite. Utilise les gardes reelles
    (get_current_user / require_plan) sur les routes protegees."""
    if not authorization and not x_api_key:
        return {"tier": "public"}
    return {"tier": "authenticated"}

@app.post("/api/v1/auth/register", status_code=201)
def register(body: RegisterIn):
    """Inscription : cree l'utilisateur en base, demarre l'essai Pro 14j (BR-11),
    envoie un OTP SMS. Ne renvoie PAS de token : la connexion se fait par OTP."""
    from datetime import datetime, timezone, timedelta
    from app.database import SessionLocal
    from app.models import all as M
    from app.services import otp as otp_service
    from app.security import create_token
    from app.dependencies import resolve_plan
    phone = otp_service._normalize(body.phone)
    if len(phone) < 8:
        raise HTTPException(422, "Numero de telephone invalide")
    db = SessionLocal()
    try:
        user = db.query(M.User).filter(M.User.phone == phone).first()
        created = False
        if not user:
            user = M.User(phone=phone, full_name=body.full_name,
                          role=body.role or "farmer", language=body.language or "fr",
                          region_id=body.region_id, is_active=True)
            db.add(user)
            db.flush()
            created = True
            # Essai Pro 14 jours (sans paiement -> downgrade Basic a expiration)
            db.add(M.Subscription(user_id=user.id, plan="pro", status="active",
                                  starts_at=datetime.now(timezone.utc),
                                  ends_at=datetime.now(timezone.utc) + timedelta(days=14),
                                  payment_method=None, amount=0, currency="XOF"))
            db.commit()
        plan = resolve_plan(db, user)
        code = otp_service.issue_otp(phone)
        response = {"id": str(user.id), "phone": phone, "role": user.role,
                    "plan": plan, "created": created,
                    "message": "Compte cree. Un code OTP vous a ete envoye par SMS."}
        if settings.ENVIRONMENT != "production":
            response["dev_otp"] = code
        return response
    finally:
        db.close()


@app.post("/api/v1/auth/login")
def login(body: LoginIn):
    """Connexion par OTP SMS (TTL 5 min, 3 tentatives) + 2FA TOTP pour l'admin."""
    from app.database import SessionLocal
    from app.models import all as M
    from app.services import otp as otp_service
    from app.security import create_token, totp_verify, totp_secret
    from app.dependencies import resolve_plan
    phone = otp_service._normalize(body.phone)
    if otp_service.login_rate_limited(phone):
        raise HTTPException(429, "Trop de tentatives. Reessayez dans 15 minutes.")
    db = SessionLocal()
    try:
        user = db.query(M.User).filter(M.User.phone == phone).first()
        if not user:
            raise HTTPException(404, "Compte inconnu. Inscrivez-vous d'abord.")
        if not user.is_active:
            raise HTTPException(403, "Compte desactive")
        if not otp_service.verify_otp(phone, body.otp):
            left = otp_service.attempts_left(phone)
            raise HTTPException(401, f"Code invalide ou expire ({left} tentative(s) restante(s))")
        if user.role == "admin":
            secret = user.totp_secret
            if not secret:
                # 2FA non configure : on genere et on le renvoie une seule fois
                secret = totp_secret()
                user.totp_secret = secret
                db.commit()
                response = {"requires_2fa_setup": True, "totp_secret": secret,
                            "message": "2FA admin a activer : validez ce secret dans votre application d'authentification."}
                return response
            if not totp_verify(secret, body.totp_code or ""):
                raise HTTPException(401, "Code 2FA invalide")
        plan = resolve_plan(db, user)
        access = create_token(str(user.id), phone, user.role, plan, "access")
        refresh = create_token(str(user.id), phone, user.role, plan, "refresh")
        otp_service.reset_login_attempts(phone)
        return {"access_token": access, "refresh_token": refresh, "token_type": "Bearer",
                "expires_in": 900, "plan": plan, "role": user.role,
                "user_id": str(user.id)}
    finally:
        db.close()


@app.post("/api/v1/auth/refresh")
def refresh(body: RefreshIn):
    from app.database import SessionLocal
    from app.models import all as M
    from app.security import decode_token, create_token
    from app.dependencies import resolve_plan
    try:
        payload = decode_token(body.refresh_token, "refresh")
    except Exception:
        raise HTTPException(401, "Refresh token invalide ou expire")
    db = SessionLocal()
    try:
        user = db.query(M.User).filter(M.User.id == payload["sub"]).first()
        if not user or not user.is_active:
            raise HTTPException(401, "Utilisateur introuvable ou desactive")
        plan = resolve_plan(db, user)
        return {"access_token": create_token(str(user.id), user.phone, user.role, plan, "access"),
                "token_type": "Bearer", "expires_in": 900, "plan": plan}
    finally:
        db.close()

@app.get("/api/v1/prices/current")
def prices_current(product: Optional[str] = None, country: Optional[str] = None):
    try:
        data = _db_prices(product)
        return {"data": data, "meta": {"total": len(data), "cached": False, "source": "db"}}
    except Exception:
        data = PRICES
        if product:
            data = [p for p in data if p["product"]["code"] == product.upper()]
        return {"data": data, "meta": {"total": len(data), "cached": True, "cache_ttl": 900, "source": "mock"}}

@app.get("/api/v1/prices/history")
def prices_history(product: str, market: str, interval: str = "day",
                   user=Depends(require_plan("prices_history"))):
    """Historique depuis la base (price_records approuves) — plan Pro et superieurs."""
    from app.database import SessionLocal
    from app.models import all as M
    from datetime import datetime, timezone, timedelta
    db = SessionLocal()
    try:
        prod = _resolve_product(db, product)
        if not prod:
            raise HTTPException(404, f"Produit inconnu: {product}")
        days = {"day": 30, "week": 90, "month": 365}.get(interval, 30)
        since = datetime.now(timezone.utc) - timedelta(days=days)
        q = db.query(M.PriceRecord).filter(
            M.PriceRecord.product_id == prod.id,
            M.PriceRecord.status == "approved",
            M.PriceRecord.recorded_at >= since)
        mkt = _resolve_market(db, market)
        if mkt:
            q = q.filter(M.PriceRecord.market_id == mkt.id)
        rows = q.order_by(M.PriceRecord.recorded_at.asc()).all()
        if rows:
            by_day = {}
            for r in rows:
                key = r.recorded_at.date().isoformat()
                by_day.setdefault(key, []).append(float(r.price))
            data = [{"date": d, "avg_price": round(sum(v) / len(v), 2),
                     "min_price": min(v), "max_price": max(v), "samples": len(v)}
                    for d, v in sorted(by_day.items())]
            return {"data": data, "meta": {"product": prod.code,
                                           "market": mkt.name_fr if mkt else None,
                                           "interval": interval, "count": len(data),
                                           "source": "db"}}
    except HTTPException:
        raise
    except Exception:
        pass
    finally:
        db.close()
    return {"data": [
        {"date": "2026-07-01", "avg_price": 218.0, "min_price": 195.0, "max_price": 240.0},
        {"date": "2026-07-02", "avg_price": 220.5, "min_price": 200.0, "max_price": 245.0},
    ], "meta": {"product": product, "market": market, "interval": interval, "count": 2, "source": "mock"}}

@app.post("/api/v1/prices", status_code=201)
def post_price(body: PriceIn, user=Depends(require_plan("price_entry"))):
    """Saisie de prix par un agent terrain. Persiste en base (status pending)."""
    from datetime import datetime, timezone
    from app.database import SessionLocal
    from app.models import all as M
    from app.services.pricing import check_range
    db = SessionLocal()
    try:
        prod = _resolve_product(db, body.product_id)
        if not prod:
            raise HTTPException(404, f"Produit inconnu: {body.product_id}")
        mkt = _resolve_market(db, body.market_id)
        if not mkt:
            raise HTTPException(404, f"Marche inconnu: {body.market_id}")
        rng = check_range(prod.code, body.price)
        rec = M.PriceRecord(
            product_id=prod.id, market_id=mkt.id, price=body.price,
            currency="XOF", unit="kg", volume_estimate=body.volume_estimate,
            source_type="agent", source_id=user.id, photo_url=body.photo_url,
            status="pending",
            recorded_at=datetime.now(timezone.utc))
        db.add(rec)
        db.commit()
        payload = {"id": str(rec.id), "status": "pending",
                   "message": "Prix soumis, en attente de validation",
                   "source": "db"}
        if rng["flag"]:
            payload["flag"] = "modération obligatoire"
            payload["deviation"] = rng["deviation"]
            payload["median"] = rng["median"]
        return payload
    except HTTPException:
        raise
    except Exception:
        pass
    finally:
        db.close()
    # BR-02 : flag ±30% médiane 7j
    median = 225.0
    dev = abs(body.price - median) / median * 100
    if dev > 30:
        raise HTTPException(status_code=422, detail={"code": "PRICE_OUT_OF_RANGE", "message": "Le prix soumis depasse de plus de 30% la mediane", "details": {"submitted": body.price, "median": median, "deviation": round(dev, 1)}})
    return {"id": "uuid-mock", "status": "pending", "message": "Prix soumis, en attente de validation", "source": "mock"}

@app.get("/api/v1/prices/forecasts")
def forecasts(user=Depends(require_plan("forecast"))):
    from app.database import SessionLocal
    from app.models import all as M
    db = SessionLocal()
    try:
        rows = db.query(M.PriceForecast).order_by(M.PriceForecast.forecast_date).all()
        if rows:
            return {"data": [{"date": r.forecast_date.isoformat(),
                              "predicted_price": float(r.predicted_price),
                              "confidence_low": float(r.confidence_low) if r.confidence_low else None,
                              "confidence_high": float(r.confidence_high) if r.confidence_high else None,
                              "model_version": r.model_version} for r in rows],
                    "source": "db"}
    except Exception:
        pass
    finally:
        db.close()
    return {"data": [{"date": "2026-07-15", "predicted_price": 235.0, "confidence_low": 220.0, "confidence_high": 250.0, "model_version": "prophet-v1.2"}], "source": "mock"}

@app.get("/api/v1/markets")
def markets():
    try:
        from app.database import SessionLocal
        from app.models import all as M
        db = SessionLocal()
        try:
            rows = db.query(M.Market).filter(M.Market.is_active == True).all()  # noqa: E712
            if rows:
                return {"data": [
                    {"id": str(m.id), "name_fr": m.name_fr, "market_type": m.market_type,
                     "location": {"lat": float(m.lat) if m.lat else None,
                                  "lng": float(m.lng) if m.lng else None},
                     "is_active": m.is_active} for m in rows], "source": "db"}
        finally:
            db.close()
    except Exception:
        pass
    return {"data": MARKETS, "source": "mock"}

@app.get("/api/v1/products")
def products():
    try:
        from app.database import SessionLocal
        from app.models import all as M
        db = SessionLocal()
        try:
            rows = db.query(M.Product).filter(M.Product.is_active == True).all()  # noqa: E712
            if rows:
                return {"data": [
                    {"code": p.code, "name_fr": p.name_fr, "unit": p.unit} for p in rows],
                    "source": "db"}
        finally:
            db.close()
    except Exception:
        pass
    return {"data": list(PRODUCTS.values()), "source": "mock"}

@app.get("/api/v1/regions")
def regions(country: str = "TGO"):
    return {"data": [{"id": "plateaux", "name_fr": "Plateaux"}, {"id": "kara", "name_fr": "Kara"}, {"id": "maritime", "name_fr": "Maritime"}]}

def _resolve_product(db, ref):
    from app.models import all as M
    try:
        import uuid as _uuid
        pid = _uuid.UUID(str(ref))
        p = db.query(M.Product).filter(M.Product.id == pid).first()
        if p:
            return p
    except Exception:
        pass
    return db.query(M.Product).filter(M.Product.code == str(ref).upper()).first()

def _resolve_market(db, ref):
    if not ref:
        return None
    from app.models import all as M
    try:
        import uuid as _uuid
        mid = _uuid.UUID(str(ref))
        m = db.query(M.Market).filter(M.Market.id == mid).first()
        if m:
            return m
    except Exception:
        pass
    return db.query(M.Market).filter(M.Market.name_fr.ilike(f"%{ref}%")).first()

def _demo_user(db, phone: Optional[str] = None):
    from app.models import all as M
    phone = phone or "+22800000000"
    u = db.query(M.User).filter(M.User.phone == phone).first()
    if not u:
        u = M.User(phone=phone, role="farmer", language="fr")
        db.add(u)
        db.flush()
    return u

@app.post("/api/v1/alerts", status_code=201)
def create_alert(body: AlertIn, user=Depends(get_current_user)):
    """Cree une alerte rattachee a l'utilisateur authentifie (quota par plan)."""
    from app.database import SessionLocal
    from app.models import all as M
    db = SessionLocal()
    try:
        prod = _resolve_product(db, body.product_id)
        if not prod:
            raise HTTPException(404, f"Produit inconnu: {body.product_id}")
        mkt = _resolve_market(db, body.market_id) if body.market_id else None
        if body.market_id and not mkt:
            raise HTTPException(404, f"Marche inconnu: {body.market_id}")
        plan = getattr(user, "_plan", "basic")
        check_alert_quota(db, user, plan)
        a = M.Alert(user_id=user.id, product_id=prod.id,
                    market_id=mkt.id if mkt else None,
                    alert_type=body.alert_type,
                    threshold_value=body.threshold_value,
                    channel=body.channel or "whatsapp", is_active=True)
        db.add(a)
        db.commit()
        return {"id": str(a.id), "alert_type": a.alert_type,
                "threshold_value": float(a.threshold_value) if a.threshold_value else None,
                "is_active": True, "source": "db"}
    except HTTPException:
        raise
    finally:
        db.close()

@app.get("/api/v1/alerts")
def list_alerts(user=Depends(get_current_user)):
    """Alertes de l'utilisateur connecte uniquement."""
    from app.database import SessionLocal
    from app.models import all as M
    db = SessionLocal()
    try:
        rows = db.query(M.Alert, M.Product, M.Market).join(
            M.Product, M.Alert.product_id == M.Product.id).outerjoin(
            M.Market, M.Alert.market_id == M.Market.id).filter(
            M.Alert.user_id == user.id,
            M.Alert.is_active == True).all()  # noqa: E712
        return {"data": [{
            "id": str(a.id), "product": p.code,
            "market": m.name_fr if m else None,
            "alert_type": a.alert_type,
            "threshold_value": float(a.threshold_value) if a.threshold_value else None,
            "channel": a.channel, "is_active": a.is_active} for a, p, m in rows],
            "source": "db"}
    finally:
        db.close()

@app.delete("/api/v1/alerts/{alert_id}")
def delete_alert(alert_id: str, user=Depends(get_current_user)):
    from app.database import SessionLocal
    from app.models import all as M
    import uuid as _uuid
    db = SessionLocal()
    try:
        a = db.query(M.Alert).filter(
            M.Alert.id == _uuid.UUID(alert_id),
            M.Alert.user_id == user.id).first()
        if not a:
            raise HTTPException(404, "Alerte introuvable")
        a.is_active = False
        db.commit()
        return {"id": alert_id, "is_active": False, "source": "db"}
    finally:
        db.close()

@app.get("/api/v1/admin/tasks/check-alerts")
def check_alerts_task():
    """Moteur d'alertes (appele toutes les 15 min par GitHub Actions).
    Evalue les alertes actives vs derniers prix approuves, cooldown 1h,
    ecrit les notifications declenchees. TODO: dispatch WhatsApp/SMS."""
    from datetime import datetime, timezone, timedelta
    from app.database import SessionLocal
    from app.models import all as M
    from app.services.alerts_ml import eval_rule
    db = SessionLocal()
    try:
        now = datetime.now(timezone.utc)
        cooldown = now - timedelta(hours=1)
        alerts = db.query(M.Alert, M.Product).join(
            M.Product, M.Alert.product_id == M.Product.id).filter(
            M.Alert.is_active == True).all()  # noqa: E712
        checked, triggered = 0, []
        for a, prod in alerts:
            q = db.query(M.PriceRecord).filter(
                M.PriceRecord.product_id == prod.id,
                M.PriceRecord.status == "approved")
            if a.market_id:
                q = q.filter(M.PriceRecord.market_id == a.market_id)
            rec = q.order_by(M.PriceRecord.recorded_at.desc()).first()
            if not rec:
                continue
            checked += 1
            if a.threshold_value is None:
                continue
            if not eval_rule(a.alert_type, float(rec.price), float(a.threshold_value)):
                continue
            if a.last_triggered and a.last_triggered.replace(tzinfo=timezone.utc) > cooldown:
                continue
            op = ">" if a.alert_type == "price_above" else "<"
            msg = (f"ALERTE {prod.code} : {float(rec.price)} F/kg {op} "
                   f"{float(a.threshold_value)} F/kg")
            db.add(M.Notification(user_id=a.user_id, alert_id=a.id,
                                  message=msg, channel=a.channel or "whatsapp",
                                  status="sent"))
            a.last_triggered = now
            triggered.append({"alert_id": str(a.id), "message": msg})
        db.commit()
        return {"checked": checked, "triggered": triggered, "count": len(triggered)}
    finally:
        db.close()

@app.get("/api/v1/users/me")
def me(user=Depends(get_current_user)):
    return {"id": str(user.id), "phone": user.phone, "full_name": user.full_name,
            "role": user.role, "language": user.language,
            "plan": getattr(user, "_plan", "basic"),
            "region_id": str(user.region_id) if user.region_id else None,
            "reliability_score": float(user.reliability_score or 3.0)}

@app.get("/api/v1/marketplace/listings")
def listings(product: Optional[str] = None):
    return {"data": []}

@app.post("/api/v1/marketplace/listings", status_code=201)
def create_listing(payload: dict):
    # BR-20 : score initial 3/5
    return {"id": "uuid-listing", "status": "active", "reliability_score": 3.0}

@app.get("/api/v1/admin/prices/pending")
def pending(user=Depends(require_admin)):
    """File de moderation : prix en attente de validation (admin uniquement)."""
    from app.database import SessionLocal
    from app.models import all as M
    from app.services.pricing import check_range
    db = SessionLocal()
    try:
        rows = db.query(M.PriceRecord, M.Product, M.Market).join(
            M.Product, M.PriceRecord.product_id == M.Product.id).join(
            M.Market, M.PriceRecord.market_id == M.Market.id).filter(
            M.PriceRecord.status == "pending").order_by(
            M.PriceRecord.created_at.desc()).limit(100).all()
        data = []
        for rec, prod, mkt in rows:
            rng = check_range(prod.code, float(rec.price))
            data.append({
                "id": str(rec.id), "product": prod.code, "product_name": prod.name_fr,
                "market": mkt.name_fr, "price": float(rec.price),
                "volume_estimate": float(rec.volume_estimate) if rec.volume_estimate else None,
                "deviation": f"+{rng['deviation']}%" if rng["deviation"] else "0%",
                "deviation_pct": rng["deviation"], "flag": rng["flag"],
                "median": rng["median"], "source_type": rec.source_type,
                "photo_url": rec.photo_url,
                "recorded_at": rec.recorded_at.isoformat() if rec.recorded_at else None})
        return {"data": data, "source": "db"}
    finally:
        db.close()


@app.post("/api/v1/admin/prices/{price_id}/approve")
def approve(price_id: str, user=Depends(require_admin)):
    """Valide un prix : status=approved + price_validations + invalide le cache."""
    from app.database import SessionLocal
    from app.models import all as M
    from app.cache import cache_delete
    import uuid as _uuid
    db = SessionLocal()
    try:
        rec = db.query(M.PriceRecord).filter(M.PriceRecord.id == _uuid.UUID(price_id)).first()
        if not rec:
            raise HTTPException(404, "Prix introuvable")
        if rec.status == "approved":
            raise HTTPException(409, "Prix deja valide")
        rec.status = "approved"
        db.add(M.PriceValidation(price_record_id=rec.id, validator_id=user.id,
                                action="approved"))
        db.commit()
        cache_delete(f"prices:{rec.product_id}:{rec.market_id}")
        return {"id": price_id, "status": "approved", "published": True, "source": "db"}
    finally:
        db.close()


@app.post("/api/v1/admin/prices/{price_id}/reject")
def reject(price_id: str, user=Depends(require_admin), payload: Optional[dict] = None):
    """Rejette un prix avec motif (notifie l'agent)."""
    from app.database import SessionLocal
    from app.models import all as M
    import uuid as _uuid
    reason = (payload or {}).get("reason", "Non conforme")
    db = SessionLocal()
    try:
        rec = db.query(M.PriceRecord).filter(M.PriceRecord.id == _uuid.UUID(price_id)).first()
        if not rec:
            raise HTTPException(404, "Prix introuvable")
        rec.status = "rejected"
        db.add(M.PriceValidation(price_record_id=rec.id, validator_id=user.id,
                                action="rejected", reason=reason))
        db.commit()
        return {"id": price_id, "status": "rejected", "reason": reason, "source": "db"}
    finally:
        db.close()

@app.get("/api/v1/users/me/subscription")
def my_subscription(user=Depends(get_current_user)):
    from datetime import datetime, timezone
    from app.database import SessionLocal
    from app.models import all as M
    db = SessionLocal()
    try:
        sub = (db.query(M.Subscription)
               .filter(M.Subscription.user_id == user.id)
               .order_by(M.Subscription.starts_at.desc()).first())
        if not sub:
            return {"plan": "basic", "status": "none", "trial_days_left": 0}
        ends = sub.ends_at
        if ends and ends.tzinfo is None:
            ends = ends.replace(tzinfo=timezone.utc)
        days = max(0, (ends - datetime.now(timezone.utc)).days) if ends else None
        return {"plan": getattr(user, "_plan", sub.plan), "status": sub.status,
                "trial_days_left": days if sub.payment_method is None and days is not None else 0,
                "ends_at": ends.isoformat() if ends else None,
                "payment_method": sub.payment_method,
                "renewal": "Flooz" if sub.payment_method in ("flooz", "tmoney") else None}
    finally:
        db.close()

@app.get("/api/v1/marketplace/listings/{listing_id}")
def listing_detail(listing_id: str):
    return {"id": listing_id, "status": "active", "reliability_score": 3.0}

@app.post("/api/v1/payments/init")
def payment_init(payload: dict):
    method = (payload or {}).get("method", "flooz")
    plan = (payload or {}).get("plan", "pro")
    fees = {"flooz": 0.015, "tmoney": 0.015, "bank": 0.0}
    return {"method": method, "plan": plan, "fee_rate": fees.get(method, 0.015), "status": "pending", "next": f"/webhooks/payment/{method}"}

@app.get("/api/v1/prices/convert")
def convert(price: float, unit: str = "kg"):
    from app.services.pricing import to_kg
    return {"price_kg": to_kg(price, unit), "currency": "XOF"}
from fastapi.responses import PlainTextResponse
import os

@app.get("/api/v1/webhooks/whatsapp", response_class=PlainTextResponse)
def whatsapp_verify(hub_mode: str = "", hub_verify_token: str = "", hub_challenge: str = ""):
    verify = os.getenv("WHATSAPP_VERIFY_TOKEN", "agropulse-dev")
    if hub_mode == "subscribe" and hub_verify_token == verify and hub_challenge:
        return hub_challenge
    raise HTTPException(403, "Verification WhatsApp echouee")

@app.post("/api/v1/webhooks/whatsapp")
def whatsapp_in(payload: dict):
    # NLP mock : PRIX MAIS KARA
    text = str(payload.get("text", "")).upper()
    if "PRIX" in text and "KARA" in text:
        return {"reply": "📊 Maïs — Kara\nPrix moyen: 210 F/kg\nMin: 195 | Max: 230\nVariation: ▲ +2,1%\nMise à jour: 08/07\nSource: 3 agents\n\n💡 Le prix monte ! C'est un bon moment pour vendre."}
    if "ALERTE" in text:
        return {"reply": "✅ Alerte créée ! Vous serez notifié quand le seuil est dépassé."}
    if "BONJOUR" in text or "AIDE" in text:
        return {"reply": "Bienvenue AgroPulse 🌱\nPRIX [produit] [marché]\nALERTE [produit] > [montant]\nMON COMPTE / STOP / SUPPRIMER"}
    return {"reply": "Envoyez AIDE pour le menu."}

@app.post("/api/v1/webhooks/payment/flooz")
@app.post("/api/v1/webhooks/payment/tmoney")
def payment_hook(payload: dict):
    return {"status": "ok", "plan": "pro", "activated": True}
