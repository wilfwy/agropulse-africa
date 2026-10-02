from app.services.pricing import to_kg, check_range, is_obsolete, aggregate
from app.services.whatsapp import parse
from app.services.alerts_ml import eval_rule, forecast_moving_average, detect_anomaly, reliability_score, marketplace_suspended

def test_units():
    assert to_kg(11000, "sac50") == 220.0
    assert check_range("MAIS", 350)["flag"] is True
    assert check_range("MAIS", 225)["flag"] is False
    assert aggregate([200, 225, 250])["median"] == 225
    assert is_obsolete("2020-01-01T00:00:00Z") is True

def test_whatsapp_intents():
    assert parse("PRIX MAIS KARA")["intent"] == "PRIX"
    assert parse("ALERTE MAIS > 250")["threshold"] == 250
    assert parse("BONJOUR")["intent"] == "INSCRIPTION"
    assert parse("STOP")["intent"] == "STOP"
    assert parse("LANGUE ee")["lang"] == "ee"

def test_alerts_ml():
    assert eval_rule("price_above", 260, 250) is True
    assert eval_rule("price_below", 390, 400) is True
    assert len(forecast_moving_average([220, 225, 230], 7)) == 7
    assert detect_anomaly(350, 225)["anomaly"] is True
    assert reliability_score(5, 0) == 3.5
    assert marketplace_suspended(1.9) is True
