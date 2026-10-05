from fastapi import FastAPI, Depends, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import time

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
    """Prix depuis PostgreSQL (price_records approved). Leve une exception si BDD vide."""
    from app.database import SessionLocal
    from app.models import all as M
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
        return out
    finally:
        db.close()

def check_auth(authorization: Optional[str] = Header(None), x_api_key: Optional[str] = Header(None)):
    if not authorization and not x_api_key:
        return {"tier": "public"}
    return {"tier": "pro"}

@app.post("/api/v1/auth/register", status_code=201)
def register(body: RegisterIn):
    return {"id": "uuid-mock", "phone": body.phone, "role": body.role, "access_token": "eyJ.mock", "refresh_token": "eyJ.mock"}

@app.post("/api/v1/auth/login")
def login(body: LoginIn):
    if body.otp != "123456":
        raise HTTPException(401, "OTP invalide (dev: 123456)")
    return {"access_token": "eyJ.mock", "refresh_token": "eyJ.mock", "expires_in": 900}

@app.post("/api/v1/auth/refresh")
def refresh(payload: dict):
    return {"access_token": "eyJ.mock", "expires_in": 900}

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
def prices_history(product: str, market: str, interval: str = "day"):
    return {"data": [
        {"date": "2026-07-01", "avg_price": 218.0, "min_price": 195.0, "max_price": 240.0},
        {"date": "2026-07-02", "avg_price": 220.5, "min_price": 200.0, "max_price": 245.0},
    ], "meta": {"product": product, "market": market, "interval": interval, "count": 2}}

@app.post("/api/v1/prices", status_code=201)
def post_price(body: PriceIn, auth=Depends(check_auth)):
    # BR-02 : flag ±30% médiane 7j (médiane mock 225)
    median = 225.0
    dev = abs(body.price - median) / median * 100
    if dev > 30:
        raise HTTPException(status_code=422, detail={"code": "PRICE_OUT_OF_RANGE", "message": "Le prix soumis dépasse de plus de 30% la médiane", "details": {"submitted": body.price, "median": median, "deviation": round(dev, 1)}})
    return {"id": "uuid-mock", "status": "pending", "message": "Prix soumis, en attente de validation"}

@app.get("/api/v1/prices/forecasts")
def forecasts(auth=Depends(check_auth)):
    return {"data": [{"date": "2026-07-15", "predicted_price": 235.0, "confidence_low": 220.0, "confidence_high": 250.0, "model_version": "prophet-v1.2"}]}

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
def create_alert(body: AlertIn):
    try:
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
            user = _demo_user(db, body.phone)
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
        finally:
            db.close()
    except HTTPException:
        raise
    except Exception:
        pass
    return {"id": "uuid-alert", "alert_type": body.alert_type, "threshold_value": body.threshold_value, "is_active": True, "source": "mock"}

@app.get("/api/v1/alerts")
def list_alerts():
    try:
        from app.database import SessionLocal
        from app.models import all as M
        db = SessionLocal()
        try:
            rows = db.query(M.Alert, M.Product, M.Market).join(
                M.Product, M.Alert.product_id == M.Product.id).outerjoin(
                M.Market, M.Alert.market_id == M.Market.id).filter(
                M.Alert.is_active == True).all()  # noqa: E712
            if rows:
                return {"data": [{
                    "id": str(a.id), "product": p.code,
                    "market": m.name_fr if m else None,
                    "alert_type": a.alert_type,
                    "threshold_value": float(a.threshold_value) if a.threshold_value else None,
                    "channel": a.channel, "is_active": a.is_active} for a, p, m in rows],
                    "source": "db"}
        finally:
            db.close()
    except Exception:
        pass
    return {"data": [], "source": "mock"}

@app.delete("/api/v1/alerts/{alert_id}")
def delete_alert(alert_id: str):
    try:
        from app.database import SessionLocal
        from app.models import all as M
        import uuid as _uuid
        db = SessionLocal()
        try:
            a = db.query(M.Alert).filter(M.Alert.id == _uuid.UUID(alert_id)).first()
            if a:
                a.is_active = False
                db.commit()
                return {"id": alert_id, "is_active": False, "source": "db"}
        finally:
            db.close()
    except Exception:
        pass
    return {"id": alert_id, "is_active": False, "source": "mock"}

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
def me():
    return {"id": "uuid", "phone": "+22890123456", "role": "farmer", "language": "fr"}

@app.get("/api/v1/marketplace/listings")
def listings(product: Optional[str] = None):
    return {"data": []}

@app.post("/api/v1/marketplace/listings", status_code=201)
def create_listing(payload: dict):
    # BR-20 : score initial 3/5
    return {"id": "uuid-listing", "status": "active", "reliability_score": 3.0}

@app.get("/api/v1/admin/prices/pending")
def pending():
    return {"data": [{"id": "1", "market": "Kara", "product": "Maïs", "price": 350, "deviation": "+42%"}]}

@app.get("/api/v1/users/me/subscription")
def my_subscription():
    return {"plan": "pro", "status": "active", "trial_days_left": 14, "renewal": "Flooz"}

@app.get("/api/v1/marketplace/listings/{listing_id}")
def listing_detail(listing_id: str):
    return {"id": listing_id, "status": "active", "reliability_score": 3.0}

@app.post("/api/v1/admin/prices/{price_id}/approve")
def approve(price_id: str):
    return {"id": price_id, "status": "approved", "published": True}

@app.post("/api/v1/admin/prices/{price_id}/reject")
def reject(price_id: str, payload: dict = None):
    return {"id": price_id, "status": "rejected"}

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
