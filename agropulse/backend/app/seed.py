"""Seed production AgroPulse : create_all + referentiels Togo + prix d'exemple.
Usage local :  python -m app.seed
Usage Render (Shell) :  python -m app.seed
Idempotent : n'insere que si les tables sont vides.
"""
import sys, os
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import Base, engine, SessionLocal  # noqa: E402
from app.models import all as M  # noqa: E402,F401

MARKETS = {
    "Maritime": ["Hedzranawoe (Lome)", "Tabligbo", "Aneho"],
    "Plateaux": ["Atakpame", "Kpalime", "Badou"],
    "Centrale": ["Sokode", "Tchamba", "Sotouboua"],
    "Kara": ["Kara", "Bassar", "Niamtougou"],
    "Savanes": ["Dapaong", "Cinkasse"],
}
PRODUCTS = [
    ("MAIS", "Mais", "Cereales"), ("SOJA", "Soja", "Legumineuses"),
    ("TOMATE", "Tomate", "Maraichage"), ("MANIOC", "Manioc", "Tubercules"),
    ("IGNAME", "Igname", "Tubercules"), ("ARACHIDE", "Arachide", "Oleagineux"),
    ("CACAO", "Cacao", "Export"), ("CAFE", "Cafe", "Export"), ("RIZ", "Riz", "Cereales"),
]
SAMPLE_PRICES = {  # (code produit, marché) -> prix FCFA/kg
    ("MAIS", "Hedzranawoe (Lome)"): 225, ("SOJA", "Hedzranawoe (Lome)"): 380,
    ("TOMATE", "Hedzranawoe (Lome)"): 450, ("MAIS", "Kara"): 210,
}


def init_db():
    Base.metadata.create_all(engine)
    db = SessionLocal()
    try:
        if db.query(M.Country).count() > 0:
            print("Seed deja present — rien a faire.")
            return
        tgo = M.Country(code="TGO", name_fr="Togo", currency="XOF")
        db.add(tgo)
        db.flush()
        region_ids, market_ids, product_ids = {}, {}, {}
        for rname, mnames in MARKETS.items():
            r = M.Region(country_id=tgo.id, code=rname[:3].upper(), name_fr=rname)
            db.add(r)
            db.flush()
            region_ids[rname] = r.id
            for mname in mnames:
                mk = M.Market(region_id=r.id, name_fr=mname, market_type="wholesale", is_active=True)
                db.add(mk)
                db.flush()
                market_ids[mname] = mk.id
        for code, name, cat in PRODUCTS:
            p = M.Product(code=code, name_fr=name, unit="kg", is_active=True)
            db.add(p)
            db.flush()
            product_ids[code] = p.id
        now = datetime.now(timezone.utc)
        for (code, mname), price in SAMPLE_PRICES.items():
            db.add(M.PriceRecord(
                product_id=product_ids[code], market_id=market_ids[mname],
                price=price, currency="XOF", unit="kg", volume_estimate=500,
                source_type="agent", status="approved", recorded_at=now))
        db.commit()
        print(f"Seed OK : 1 pays, {len(region_ids)} regions, "
              f"{len(market_ids)} marches, {len(product_ids)} produits, "
              f"{len(SAMPLE_PRICES)} prix.")
    finally:
        db.close()


if __name__ == "__main__":
    init_db()
