# AgroPulse Africa — MVP Togo
L'intelligence des marchés agricoles africains.

## Démarrage (sans Docker, sans Python installé → installer Python 3.11+ Node 18+ Docker 24+)
```bash
cp agropulse/.env.example .env
cd agropulse && docker-compose up -d
docker-compose exec api python scripts/seed_togo.py
curl http://localhost:8000/api/v1/health
curl "http://localhost:8000/api/v1/prices/current?product=MAIS&country=TGO"
```
Frontend : http://localhost:3000 — API docs : http://localhost:8000/docs
WhatsApp test : POST /api/v1/webhooks/whatsapp {"text":"PRIX MAIS KARA"}

## Structure
Voir PROMPTS_DEVELOPPEMENT.md P00-P14. Backend FastAPI (app/main.py = MVP complet mock + règles BR-02), models SQLAlchemy (app/models/all.py), workers Celery, frontend Next.js, terraform af-south-1.

## Étapes suivantes
- [x] P00 fondations, P01 BDD, P02 auth, P03 pricing, P04 WhatsApp, P05 PWA, P06 admin mock, P07 dashboard
- [ ] Brancher PostgreSQL réel + Alembic + Redis + S3 + Meta WhatsApp token + Flooz/T-Money + OpenWeather
- [ ] P08 alertes Beat, P10 Prophet/Whisper/OCR, P13 marketplace, P14 Enterprise
