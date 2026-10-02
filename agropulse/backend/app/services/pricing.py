"""Pricing Service — règles BR-01 → BR-05."""
MEDIAN_7D = {"MAIS": 225.0, "SOJA": 380.0, "TOMATE": 450.0}
SAC_TO_KG = {"sac50": 50.0, "sac100": 100.0, "tonne": 1000.0, "kg": 1.0}

def to_kg(price: float, unit: str) -> float:
    factor = SAC_TO_KG.get((unit or "kg").lower(), 1.0)
    return round(price / factor, 2)

def check_range(product_code: str, price_kg: float):
    median = MEDIAN_7D.get(product_code.upper(), 225.0)
    dev = abs(price_kg - median) / median * 100 if median else 0
    return {"median": median, "deviation": round(dev, 1), "flag": dev > 30}

def is_obsolete(updated_at_iso: str, now_ts=None, max_hours: int = 48) -> bool:
    from datetime import datetime, timezone
    try:
        dt = datetime.fromisoformat(updated_at_iso.replace("Z", "+00:00"))
    except Exception:
        return True
    now = datetime.now(timezone.utc)
    return (now - dt).total_seconds() > max_hours * 3600

def aggregate(samples: list) -> dict:
    if not samples:
        return {"avg": None, "min": None, "max": None, "median": None, "count": 0}
    s = sorted(samples)
    n = len(s)
    median = s[n // 2] if n % 2 else round((s[n // 2 - 1] + s[n // 2]) / 2, 2)
    return {"avg": round(sum(s) / n, 2), "min": min(s), "max": max(s), "median": median, "count": n}
