# AgroPulse Africa — Seed Togo
# python scripts/seed_togo.py
REGIONS = ["Maritime", "Plateaux", "Centrale", "Kara", "Savanes"]
MARKETS = {
 "Maritime": ["Hedzranawoé (Lomé)", "Tabligbo", "Aného"],
 "Plateaux": ["Atakpamé", "Kpalimé", "Badou"],
 "Centrale": ["Sokodé", "Tchamba", "Sotouboua"],
 "Kara": ["Kara", "Bassar", "Niamtougou"],
 "Savanes": ["Dapaong", "Cinkassé"],
}
PRODUCTS = [("MAIS","Maïs","Céréales"),("SOJA","Soja","Légumineuses"),("TOMATE","Tomate","Maraîchage"),("MANIOC","Manioc","Tubercules"),("IGNAME","Igname","Tubercules"),("ARACHIDE","Arachide","Oléagineux"),("CACAO","Cacao","Export"),("CAFE","Café","Export"),("RIZ","Riz","Céréales")]
if __name__ == "__main__":
    print(f"Seed: {len(REGIONS)} régions, {sum(len(v) for v in MARKETS.values())} marchés, {len(PRODUCTS)} produits")
    for r, ms in MARKETS.items():
        print(f" - {r}: {', '.join(ms)}")
    print("OK - brancher à PostgreSQL via Alembic en prod.")
