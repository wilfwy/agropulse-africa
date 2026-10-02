"""Alerts + Forecast + Anomaly — sans dépendances lourdes (P08/P10)."""

def eval_rule(alert_type: str, current: float, threshold: float) -> bool:
    if alert_type == "price_above":
        return current > threshold
    if alert_type == "price_below":
        return current < threshold
    return False

def forecast_moving_average(history: list, days: int = 7) -> list:
    """Prévision naive : moyenne glissante + intervalle ±8%. Remplacée par Prophet/LSTM en Phase 2."""
    if not history:
        return []
    avg = sum(history) / len(history)
    out = []
    for d in range(1, days + 1):
        out.append({"day": d, "predicted_price": round(avg * (1 + 0.002 * d), 2),
                    "confidence_low": round(avg * 0.92, 2), "confidence_high": round(avg * 1.08, 2)})
    return out

def detect_anomaly(price: float, median: float, threshold_pct: float = 30.0) -> dict:
    dev = abs(price - median) / median * 100 if median else 0
    return {"anomaly": dev > threshold_pct, "deviation": round(dev, 1)}

# Score fiabilité marketplace BR-20→22
def reliability_score(transactions_ok: int, disputes: int) -> float:
    score = 3.0 + 0.1 * transactions_ok - 0.5 * disputes
    return round(max(1.0, min(5.0, score)), 2)

def marketplace_suspended(score: float) -> bool:
    return score < 2.0
