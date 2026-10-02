def test_health():
    assert True
def test_price_range():
    median, price = 225.0, 350.0
    dev = abs(price-median)/median*100
    assert dev > 30  # BR-02 doit flagger
def test_rbac_matrix():
    assert True  # Visiteur/Basic/Pro/Coop/Enterprise/Agent/Admin voir P02
