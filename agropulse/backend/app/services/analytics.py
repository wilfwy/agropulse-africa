"""Analytique des prix : séries journalières, statistiques, comparaison de marchés.

Toutes les fonctions travaillent sur price_records (status = approved) et
dégradent proprement (listes vides) si la base est indisponible.
"""
import math
from datetime import datetime, timedelta, timezone


def _num(v):
    return float(v) if v is not None else None


def daily_series(db, product_id, market_id=None, days=30):
    """Série journalière : moyenne, min, max, volume par jour."""
    from sqlalchemy import text
    sql = """
        SELECT date_trunc('day', recorded_at AT TIME ZONE 'UTC')::date AS d,
               AVG(price)::float AS avg_price,
               MIN(price)::float AS min_price,
               MAX(price)::float AS max_price,
               COUNT(*)::int AS sample_count,
               SUM(volume_estimate)::float AS volume
        FROM price_records
        WHERE status = 'approved'
          AND product_id = :pid
          AND recorded_at >= now() - (:days || ' days')::interval
    """
    params = {"pid": str(product_id), "days": int(days)}
    if market_id:
        sql += " AND market_id = :mid"
        params["mid"] = str(market_id)
    sql += " GROUP BY 1 ORDER BY 1"
    rows = db.execute(text(sql), params).fetchall()
    out = []
    for d, avg, mn, mx, cnt, vol in rows:
        out.append({
            "date": d.isoformat(),
            "avg_price": round(avg, 2),
            "min_price": round(mn, 2),
            "max_price": round(mx, 2),
            "sample_count": int(cnt),
            "volume": round(vol, 2) if vol else None,
            "ma7": None,
            "ma14": None,
        })
    _add_moving_averages(out)
    return out


def _add_moving_averages(series):
    prices = [p["avg_price"] for p in series]
    for i, point in enumerate(series):
        for window, key in ((7, "ma7"), (14, "ma14")):
            start = max(0, i - window + 1)
            chunk = prices[start:i + 1]
            if chunk:
                point[key] = round(sum(chunk) / len(chunk), 2)
    return series


def _median(values):
    if not values:
        return None
    s = sorted(values)
    n = len(s)
    mid = n // 2
    return s[mid] if n % 2 else (s[mid - 1] + s[mid]) / 2


def _stdev(values):
    if len(values) < 2:
        return 0.0
    mean = sum(values) / len(values)
    var = sum((v - mean) ** 2 for v in values) / (len(values) - 1)
    return math.sqrt(var)


def compute_stats(series, window_days=7):
    """Statistiques descriptives + tendance (régression linéaire simple)."""
    prices = [p["avg_price"] for p in series if p.get("avg_price") is not None]
    if not prices:
        return {"samples": 0, "days": 0}
    mean = sum(prices) / len(prices)
    sd = _stdev(prices)
    first, last = prices[0], prices[-1]
    change_pct = ((last - first) / first * 100) if first else 0.0
    n = len(prices)
    xs = list(range(n))
    x_mean = sum(xs) / n
    y_mean = mean
    denom = sum((x - x_mean) ** 2 for x in xs)
    slope = (sum((xs[i] - x_mean) * (prices[i] - y_mean) for i in range(n)) / denom) if denom else 0.0
    recent = prices[-window_days:]
    previous = prices[-2 * window_days:-window_days]
    momentum = 0.0
    if recent and previous:
        r, p = sum(recent) / len(recent), sum(previous) / len(previous)
        momentum = ((r - p) / p * 100) if p else 0.0
    vol = (sd / mean * 100) if mean else 0.0
    return {
        "samples": sum(p.get("sample_count", 1) for p in series),
        "days": len(series),
        "mean": round(mean, 2),
        "median": round(_median(prices), 2),
        "min": round(min(prices), 2),
        "max": round(max(prices), 2),
        "std": round(sd, 2),
        "volatility_pct": round(vol, 2),
        "change_pct": round(change_pct, 2),
        "slope_per_day": round(slope, 3),
        "momentum_pct": round(momentum, 2),
        "trend": "hausse" if slope > 0.05 else ("baisse" if slope < -0.05 else "stable"),
        "amplitude_pct": round(((max(prices) - min(prices)) / mean * 100) if mean else 0, 2),
    }


def histogram(prices, bins=7):
    """Distribution des prix pour l'histogramme."""
    if not prices:
        return []
    lo, hi = min(prices), max(prices)
    if hi == lo:
        return [{"from": round(lo, 2), "to": round(hi, 2), "count": len(prices)}]
    step = (hi - lo) / bins
    out = []
    for i in range(bins):
        a, b = lo + i * step, lo + (i + 1) * step
        cnt = sum(1 for p in prices if (a <= p < b) or (i == bins - 1 and p == hi))
        out.append({"from": round(a, 2), "to": round(b, 2), "count": cnt})
    return out


def forecast(series, horizon=7):
    """Projection : régression linéaire sur les 21 derniers points + bande ±1 écart-type."""
    prices = [p["avg_price"] for p in series[-21:] if p.get("avg_price") is not None]
    if len(prices) < 4:
        return []
    n = len(prices)
    xs = list(range(n))
    x_mean = sum(xs) / n
    y_mean = sum(prices) / n
    denom = sum((x - x_mean) ** 2 for x in xs) or 1
    slope = sum((xs[i] - x_mean) * (prices[i] - y_mean) for i in range(n)) / denom
    intercept = y_mean - slope * x_mean
    sd = _stdev(prices)
    last_date = datetime.fromisoformat(series[-1]["date"]).date()
    out = []
    for h in range(1, horizon + 1):
        value = intercept + slope * (n - 1 + h)
        band = sd * (1 + h * 0.12)
        out.append({
            "date": (last_date + timedelta(days=h)).isoformat(),
            "predicted_price": round(max(value, 0), 2),
            "confidence_low": round(max(value - band, 0), 2),
            "confidence_high": round(value + band, 2),
            "model_version": "regression-v1",
        })
    return out


def market_comparison(db, product_id, days=30):
    """Comparaison par marché + variation vs période précédente."""
    from sqlalchemy import text
    rows = db.execute(text("""
        WITH cur AS (
            SELECT market_id, AVG(price)::float AS avg_price, MIN(price)::float AS min_price,
                   MAX(price)::float AS max_price, COUNT(*)::int AS cnt
            FROM price_records
            WHERE status='approved' AND product_id=:pid
              AND recorded_at >= now() - (:days || ' days')::interval
            GROUP BY market_id
        ), prev AS (
            SELECT market_id, AVG(price)::float AS avg_price
            FROM price_records
            WHERE status='approved' AND product_id=:pid
              AND recorded_at >= now() - ((:days * 2) || ' days')::interval
              AND recorded_at <  now() - (:days || ' days')::interval
            GROUP BY market_id
        )
        SELECT m.id, m.name_fr, m.market_type, m.lat, m.lng,
               cur.avg_price, cur.min_price, cur.max_price, cur.cnt, prev.avg_price
        FROM cur
        JOIN markets m ON m.id = cur.market_id
        LEFT JOIN prev ON prev.market_id = cur.market_id
        ORDER BY cur.avg_price DESC
    """), {"pid": str(product_id), "days": int(days)}).fetchall()
    out = []
    for mid, name, mtype, lat, lng, avg, mn, mx, cnt, prev_avg in rows:
        change = ((avg - prev_avg) / prev_avg * 100) if prev_avg else 0.0
        out.append({
            "market_id": str(mid),
            "market": name,
            "market_type": mtype,
            "lat": _num(lat),
            "lng": _num(lng),
            "avg_price": round(avg, 2),
            "min_price": round(mn, 2),
            "max_price": round(mx, 2),
            "sample_count": int(cnt),
            "change_pct": round(change, 2),
            "availability": "surplus" if change <= -2 else ("penurie" if change >= 2 else "equilibre"),
        })
    return out


def overview(db, product_id, days=30):
    """Bloc complet pour les tableaux de bord : série, stats, marchés, histogramme."""
    series = daily_series(db, product_id, None, days)
    stats = compute_stats(series)
    markets = market_comparison(db, product_id, days)
    prices = [p["avg_price"] for p in series]
    result = {
        "stats": stats,
        "series": series,
        "markets": markets,
        "histogram": histogram(prices),
        "forecast": forecast(series),
    }
    if markets:
        result["cheapest"] = min(markets, key=lambda m: m["avg_price"])
        result["expensive"] = max(markets, key=lambda m: m["avg_price"])
        result["spread_pct"] = round(
            (result["expensive"]["avg_price"] - result["cheapest"]["avg_price"])
            / result["cheapest"]["avg_price"] * 100, 2) if result["cheapest"]["avg_price"] else 0
        result["arbitrage"] = {
            "buy": result["cheapest"]["market"],
            "sell": result["expensive"]["market"],
            "gain_xof_per_kg": round(result["expensive"]["avg_price"] - result["cheapest"]["avg_price"], 2),
        }
    return result


def market_overview(db, days=7):
    """Tous les marchés avec dernier prix moyen (carte 3D)."""
    from sqlalchemy import text
    rows = db.execute(text("""
        WITH cur AS (
            SELECT pr.market_id, pr.product_id, AVG(pr.price)::float AS avg_price,
                   COUNT(*)::int AS cnt
            FROM price_records pr
            WHERE pr.status='approved' AND pr.recorded_at >= now() - (:days || ' days')::interval
            GROUP BY pr.market_id, pr.product_id
        ), prev AS (
            SELECT pr.market_id, pr.product_id, AVG(pr.price)::float AS avg_price
            FROM price_records pr
            WHERE pr.status='approved'
              AND pr.recorded_at >= now() - ((:days * 2) || ' days')::interval
              AND pr.recorded_at <  now() - (:days || ' days')::interval
            GROUP BY pr.market_id, pr.product_id
        )
        SELECT m.id, m.name_fr, m.market_type, m.lat, m.lng,
               p.code, p.name_fr, cur.avg_price, cur.cnt, prev.avg_price
        FROM cur
        JOIN markets m ON m.id = cur.market_id
        JOIN products p ON p.id = cur.product_id
        LEFT JOIN prev ON prev.market_id = cur.market_id AND prev.product_id = cur.product_id
        ORDER BY m.name_fr, p.code
    """), {"days": int(days)}).fetchall()

    markets = {}
    for mid, mname, mtype, lat, lng, pcode, pname, avg, cnt, prev_avg in rows:
        key = str(mid)
        if key not in markets:
            markets[key] = {
                "id": key, "name_fr": mname, "market_type": mtype,
                "lat": _num(lat), "lng": _num(lng),
                "products": [], "sample_count": 0,
            }
        change = ((avg - prev_avg) / prev_avg * 100) if prev_avg else 0.0
        markets[key]["products"].append({
            "code": pcode, "name_fr": pname,
            "avg_price": round(avg, 2),
            "sample_count": int(cnt),
            "change_pct": round(change, 2),
        })
        markets[key]["sample_count"] += int(cnt)
    out = list(markets.values())
    for m in out:
        changes = [p["change_pct"] for p in m["products"]]
        m["change_pct"] = round(sum(changes) / len(changes), 2) if changes else 0.0
        m["status"] = "surplus" if m["change_pct"] <= -2 else ("penurie" if m["change_pct"] >= 2 else "equilibre")
        m["product_count"] = len(m["products"])
    return out
