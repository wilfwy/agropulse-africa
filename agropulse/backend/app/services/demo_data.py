"""Données de référence : coordonnées GPS des marchés + historique de démonstration.

L'historique synthétique est clairement marqué `source_type = 'synthetic'` pour
pouvoir être purgé quand les agents terrain alimentent la base :

    DELETE FROM price_records WHERE source_type = 'synthetic';
"""
import math
import random
from datetime import datetime, timedelta, timezone

# Coordonnées réelles des marchés togolais (WGS84)
MARKET_GEO = {
    "Hedzranawoe (Lome)": (6.1725, 1.2500),
    "Hedzranawoé (Lomé)": (6.1725, 1.2500),
    "Tabligbo": (6.5833, 1.5000),
    "Aneho": (6.2333, 1.6000),
    "Aného": (6.2333, 1.6000),
    "Atakpame": (7.5333, 1.1333),
    "Atakpamé": (7.5333, 1.1333),
    "Kpalime": (6.9000, 0.6333),
    "Kpalimé": (6.9000, 0.6333),
    "Badou": (7.5833, 0.6000),
    "Sokode": (8.9833, 1.1333),
    "Sokodé": (8.9833, 1.1333),
    "Tchamba": (8.9667, 1.4167),
    "Sotouboua": (8.5167, 0.9833),
    "Kara": (9.5511, 1.1861),
    "Bassar": (9.2500, 0.7833),
    "Niamtougou": (9.7667, 1.1000),
    "Dapaong": (10.8667, 0.2000),
    "Cinkasse": (11.1000, 0.0167),
    "Cinkassé": (11.1000, 0.0167),
}

# Prix de référence FCFA/kg (Togo, 2026)
BASE_PRICE = {
    "MAIS": 225, "SOJA": 380, "TOMATE": 450, "MANIOC": 150, "IGNAME": 300,
    "ARACHIDE": 520, "CACAO": 1050, "CAFE": 950, "RIZ": 450,
}
# Produits insérés dans l'historique de démonstration
DEMO_PRODUCTS = ["MAIS", "SOJA", "TOMATE", "MANIOC", "IGNAME", "RIZ"]
DEMO_MARKETS = ["Hedzranawoe (Lome)", "Kara", "Sokode", "Atakpame", "Kpalime", "Dapaong"]
# Écart-type relatif au prix de base (volatilité par produit)
VOLATILITY = {"MAIS": 0.07, "SOJA": 0.06, "TOMATE": 0.18, "MANIOC": 0.09,
              "IGNAME": 0.10, "RIZ": 0.04, "ARACHIDE": 0.08, "CACAO": 0.05, "CAFE": 0.06}
# Décalage géographique moyen (transport) par marché
TRANSPORT = {"Hedzranawoe (Lome)": -0.02, "Kara": 0.03, "Sokode": 0.02,
             "Atakpame": 0.00, "Kpalime": 0.01, "Dapaong": 0.06}


def ensure_market_geo(db=None) -> dict:
    """Renseigne lat/lng des marchés qui n'en ont pas (idempotent)."""
    from sqlalchemy import text
    from app.database import engine
    updated = 0
    try:
        with engine.begin() as conn:
            for name, (lat, lng) in MARKET_GEO.items():
                res = conn.execute(text(
                    "UPDATE markets SET lat=:lat, lng=:lng "
                    "WHERE lower(name_fr)=lower(:name) AND (lat IS NULL OR lng IS NULL)"
                ), {"lat": lat, "lng": lng, "name": name})
                updated += res.rowcount or 0
    except Exception as exc:
        return {"ok": False, "error": str(exc)[:200]}
    return {"ok": True, "updated": updated}


def _seasonality(day_index, total_days, product):
    """Cycle saisonnier simple + effet jour de marché."""
    phase = (day_index / max(total_days, 1)) * 2 * math.pi
    seasonal = math.sin(phase) * 0.05
    if product == "TOMATE":
        seasonal = math.sin(phase * 1.5) * 0.16 + math.sin(phase * 4) * 0.05
    weekday = math.sin(day_index / 7 * 2 * math.pi) * 0.012
    return seasonal + weekday


def ensure_demo_history(days: int = 120, force: bool = False) -> dict:
    """Génère un historique réaliste si la base est presque vide.

    Marque les lignes `source_type='synthetic'`. Ne s'exécute qu'une fois :
    un réappel est sans effet dès que l'historique est présent.
    """
    from sqlalchemy import text
    from app.database import engine

    try:
        with engine.connect() as conn:
            existing = conn.execute(text(
                "SELECT COUNT(*) FROM price_records WHERE status='approved'"
            )).scalar() or 0
            if existing >= 100 and not force:
                return {"ok": True, "seeded": 0, "reason": "historique deja present",
                        "existing": existing}
            products = {r[0]: r[1] for r in conn.execute(text(
                "SELECT code, id FROM products WHERE code = ANY(:codes)"
            ), {"codes": DEMO_PRODUCTS}).fetchall()}
            markets = {r[0]: r[1] for r in conn.execute(text(
                "SELECT name_fr, id FROM markets"
            )).fetchall()}
    except Exception as exc:
        return {"ok": False, "error": str(exc)[:200]}

    now = datetime.now(timezone.utc)
    rows = []
    for mkey in DEMO_MARKETS:
        market_id = markets.get(mkey)
        if not market_id:
            continue
        for code in DEMO_PRODUCTS:
            product_id = products.get(code)
            if not product_id:
                continue
            rng = random.Random(abs(hash((code, mkey))) % (2 ** 31))
            base = BASE_PRICE[code] * (1 + TRANSPORT.get(mkey, 0))
            vol = VOLATILITY[code]
            walk = 0.0
            for i in range(days, 0, -1):
                walk = walk * 0.85 + rng.gauss(0, vol * 0.35)
                seasonal = _seasonality(days - i, days, code)
                mid = base * (1 + seasonal + walk)
                # deux relevés par jour (matin / après-midi) -> min/max réalistes
                for hour, adj in ((7, -0.012), (15, 0.012)):
                    price = mid * (1 + adj + rng.gauss(0, vol * 0.30))
                    rows.append({
                        "product_id": product_id,
                        "market_id": market_id,
                        "price": round(max(price, base * 0.45), 2),
                        "currency": "XOF",
                        "unit": "kg",
                        "volume_estimate": round(rng.uniform(80, 900), 2),
                        "source_type": "synthetic",
                        "status": "approved",
                        "recorded_at": (now - timedelta(days=i)).replace(
                            hour=hour, minute=rng.randint(0, 59), second=0, microsecond=0),
                    })
    if not rows:
        return {"ok": True, "seeded": 0, "reason": "aucun produit/marche correspondant"}

    try:
        with engine.begin() as conn:
            for i in range(0, len(rows), 1000):
                chunk = rows[i:i + 1000]
                conn.execute(text("""
                    INSERT INTO price_records
                      (id, product_id, market_id, price, currency, unit, volume_estimate,
                       source_type, status, recorded_at)
                    VALUES
                      (gen_random_uuid(), :product_id, :market_id, :price, :currency, :unit,
                       :volume_estimate, :source_type, :status, :recorded_at)
                """), chunk)
    except Exception as exc:
        return {"ok": False, "error": str(exc)[:200]}

    return {"ok": True, "seeded": len(rows), "days": days}
