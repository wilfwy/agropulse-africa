# AgroPulse Africa — Roadmap Prompts Développement
> Copier-coller chaque prompt dans l'ordre dans ton agent code (OpenCode / Cursor / Copilot).
> Chaque prompt = 1 étape incrémentale, avec specs exactes des dossiers 01-19.
> Stack imposée : Python 3.11+ FastAPI 0.110+ SQLAlchemy2 Pydantic2 Celery+Redis / Next.js14 React18 Tailwind3 / PostgreSQL15+PostGIS Redis7 S3 / AWS af-south-1 Cloudflare
> Conventions : snake_case, UUID PK `gen_random_uuid()`, timestamps UTC TIMESTAMPTZ, FCFA/kg, `/api/v1`, Bearer JWT + `X-API-Key`.

---
## MODE D'EMPLOI
1. Exécute P00 → P12 pour MVP Togo (P0 obligatoire).
2. Ne saute pas d'étape, chaque prompt dépend du précédent.
3. Critère global MVP : `GET /prices/current?product=MAIS&country=TGO` <500ms P95, WhatsApp <3s, 99.5% uptime, 500 concurrents.
4. Coche ici : `- [ ] P00 ... - [ ] P14`

---

### P00 — INIT MONOREPO + DOCKER + CI/CD + ENV
```text
Contexte AgroPulse Africa, plateforme intelligence agricole Togo (WhatsApp-first).

Crée l'arborescence exacte :
agropulse/backend/app/{api,models,schemas,services,workers,ml} backend/alembic backend/tests backend/Dockerfile frontend/src/{app,components,lib} frontend/Dockerfile infrastructure/terraform scripts/{seed_togo.py,deploy.sh} docker-compose.yml .env.example README.md

Backend FastAPI Python 3.11+, frontend Next.js 14+ Tailwind3, PostgreSQL15+ PostGIS, Redis7+, Docker24+.

Fichiers à générer :
- docker-compose.yml (api:8000, web:3000, postgres:5432, redis:6379, celery worker+beat)
- .env.example avec DATABASE_URL, REDIS_URL, JWT_SECRET(RS256 path/to/private.pem), WHATSAPP_TOKEN, WHATSAPP_PHONE_ID, AWS_ACCESS_KEY, AWS_SECRET_KEY, S3_BUCKET=agropulse-data, SMS_API_KEY, ENVIRONMENT
- backend/Dockerfile + frontend/Dockerfile multistage
- GitHub Actions : lint+pytest+build+push ECR+deploy staging auto, prod manuel avec healthcheck + rollback
- Terraform base : VPC 10.0.0.0/16, subnets public(ALB)/privé(RDS,Redis), ECS Fargate, RDS, ElastiCache, S3, Cloudflare
- GET /api/v1/health -> {"status":"ok","version":"1.0.0"}

Design tokens à préparer : vert forêt #2D6A4F, vert clair #52B788, or #F4A261, terre #8B5E3C, rouge #E63946, bleu #457B9D, fond #F8F9FA, texte #212529/#6C757D, fonts Inter + JetBrains Mono (self-hosted), Lucide outline 24px 1.5px.

Acceptance : docker-compose up -d OK, curl localhost:8000/api/v1/health OK, pytest vide passe.
```

### P01 — BDD POSTGRESQL + MIGRATIONS + SEED TOGO
```text
SGBD PostgreSQL15+ PostGIS. Alembic, migrations réversibles YYYYMMDD_HHMM_desc.py.

Crée EXACTEMENT ces tables (UUID PK default gen_random_uuid()) :
countries(id,code UNIQUE TGO/GHA/BEN,name_fr,currency default XOF), regions(id,country_id FK,code,name_fr,name_local,geometry POLYGON4326, UNIQUE country,code), markets(id,region_id FK,name_fr,name_local,market_type wholesale/retail/border,location POINT4326 NOT NULL,is_active), product_categories(id,name_fr,icon), products(id,category_id FK,code UNIQUE, name_fr,name_local,unit default kg,is_active), price_records(id,product_id FK,market_id FK,price DECIMAL12,2,currency XOF,unit kg,volume_estimate,source_type agent/whatsapp/api/satellite,source_id,photo_url 500,status pending/approved/rejected,recorded_at,created_at), price_validations(id,price_record_id FK,validator_id,action approved/rejected,reason), price_aggregates(id,product_id,market_id,avg/min/max/median,sample_count,variation_24h,period_start/end,UNIQUE product,market,period_start), users(id,phone UNIQUE,email,full_name,role farmer/trader/coop/enterprise/agent/admin,language fr/ee/kb,region_id FK,whatsapp_id,reliability_score 3.00,is_active), subscriptions(id,user_id FK,plan basic/pro/coop/enterprise,status active/expired/cancelled,starts_at/ends_at,payment_method flooz/tmoney/bank/invoice,amount,currency XOF), alerts(id,user_id FK,product_id FK,market_id FK,alert_type price_above/price_below/shortage/surplus/weather,threshold_value,is_active,last_triggered,channel whatsapp/sms/push), notifications(id,user_id FK,alert_id FK,message,channel,status sent/delivered/failed,sent_at), field_agents(id,user_id FK,assigned_markets UUID[],quality_score,total_submissions,approval_rate,is_active,hired_at), agent_payments(...), price_forecasts(id,product_id,market_id,forecast_date,predicted_price,confidence_low/high,model_version,UNIQUE product,market,date), marketplace_listings(id,seller_id FK,product_id FK,region_id FK,quantity,unit,price_per_unit,currency,description,available_from/until,status active/sold/expired).

Index : idx_price_records_lookup(product,market,recorded_at DESC) WHERE status=approved, idx_price_aggregates_latest, idx_users_phone, idx_alerts_active WHERE is_active, idx_markets GIST(location).

Seed Togo : Maritime[Hedzranawoé(Lomé 6.1319,1.2228),Tabligbo,Aného], Plateaux[Atakpamé,Kpalimé,Badou], Centrale[Sokodé,Tchamba,Sotouboua], Kara[Kara,Bassar,Niamtougou], Savanes[Dapaong,Cinkassé] + produits MAIS(Maïs/Céréales) SOJA TOMATE MANIOC IGNAME ARACHIDE CACAO CAFE RIZ.

scripts/seed_togo.py idempotent. Acceptance : alembic upgrade head OK, seed OK, SELECT count markets>=14, products>=9.
```

### P02 — AUTH + USERS + ABONNEMENTS + RBAC
```text
Implémente Auth Service :
POST /auth/register {phone +228..., full_name, role, language, region_id} -> 201 {id,phone,role,access_token,refresh_token}
POST /auth/login {phone,otp 6 chiffres} -> 200 {access_token,refresh_token,expires_in:900}
POST /auth/refresh {refresh_token} -> 200 {access_token}
OTP SMS TTL 5min max 3 tentatives (mock Africa's Talking en dev). JWT RS256 access 15min refresh 7j. API Keys ap_live_/ap_test_ rotatable pour Enterprise (header X-API-Key). 2FA TOTP obligatoire admin. Mots de passe admin 12 car + maj/min/chiffre/symbole + HaveIBeenPwned + rotation 90j.

GET /users/me, PATCH /users/me (nom,langue,région), GET /users/me/subscription.
Règles BR-10 à 13 : phone unique, essai Pro 14j, grâce 7j -> rétrogradation Basic, coop validation manuelle min 20 membres.

RBAC matrice stricte :
Visiteur/Basic/Pro/Coop/Enterprise/Agent/Admin : prix jour 3 produits ✅tous, historique ❌❌✅✅✅❌✅, alertes ❌3max/illimité, dashboard ❌❌✅✅✅❌✅, export ❌❌CSV/CSV+PDF/API/❌✅, marketplace ❌❌❌✅✅❌✅, API ❌❌❌❌✅❌✅, saisie prix ❌❌❌❌❌✅✅, modération admin seul.

Rate limiting : Public20 Basic60 Pro200 Coop500 Enterprise1000 req/min + headers X-RateLimit-*. Erreurs format {error:{code,message,details}} codes 400/401/403/404/409/422/429/500 dont PRICE_OUT_OF_RANGE.

Acceptance : register/login/refresh/me OK, 403 si plan insuffisant, 429 après limite.
```

### P03 — PRICING API + VALIDATION + AGRÉGATS
```text
Pricing Service :
GET /prices/current?product=MAIS&market=uuid&region=uuid&country=TGO -> {data:[{product:{code,name_fr},market:{id,name_fr},avg_price:225.00,min:200,max:250,currency:XOF,unit:kg,variation_24h:3.2,sample_count:5,updated_at}],meta:{total,cached,cache_ttl:900}}
GET /prices/history?product&market&from&to&interval day/week/month -> historique.
POST /prices (Agent/Admin) {product_id,market_id,price,volume_estimate,photo_url,recorded_at} -> 201 {id,status:pending,message} + règle BR-02 : si >±30% médiane 7j -> flag modération obligatoire (erreur 422 PRICE_OUT_OF_RANGE avec submitted/median/deviation).
GET /prices/forecasts (Pro+) -> [{date,predicted_price,confidence_low/high,model_version:prophet-v1.2}]
GET /markets, GET /products, GET /regions?country=TGO (Hedzranawoé wholesale Maritime lat/lng).

Logique : CRUD prix, calcul avg/médiane/marche/produit, historique, cache Redis TTL 15min + invalidation à chaque approved, pagination cursor, PgBouncer, gzip.

Règles BR-01→05 : publié si >=1 source validée, aberrant->modération, >48h -> obsolète, unité FCFA/kg avec conversion sac/tonne auto, marché doit exister référentiel.

Acceptance : POST 225 OK pending, POST 350 (+55%) -> flag/422, GET current cached, admin approve -> visible.
```

### P04 — WHATSAPP GATEWAY + BOT COMMANDS
```text
WhatsApp Gateway (Meta Cloud API) :
POST /webhooks/whatsapp (vérif signature, traitement async Celery, queue respect rate Meta, réponse <3s).

Pipeline NLP : intent detection -> extraction entités. Intents : PRIX, ALERTE, AIDE, INSCRIPTION, MON COMPTE, ABONNEMENT, LANGUE, STOP, SUPPRIMER.
Commandes exactes :
BONJOUR -> inscription (nom,loc,cultures) -> prix jour maïs/soja/tomate
PRIX MAIS KARA -> 📊 Maïs-Kara Prix moyen 210F Min195 Max230 Variation▲+2.1% MAJ08/07 Source3agents + 💡 conseil vente
PRIX TOMATE (région user), ALERTE MAIS >250 / ALERTE TOMATE <400 -> ✅ Alerte créée, MES ALERTES, SUPPRIMER ALERTE 1, MON COMPTE, ABONNEMENT, LANGUE ee/fr/kb, AIDE menu, STOP, SUPPRIMER.

Support audio Whisper STT (éwé/FR) -> NLP, image OCR -> extraction prix -> validation. Templates + dynamiques, horaires bot 6h-22h UTC+0, français défaut éwé/kabyè alertes clés, tutoiement phrases courtes.

UC-01/02 : inconnu -> « Données en cours de collecte », max 10 alertes Basic illimité Pro.

Acceptance : webhook mock -> réponse formatée <3s, audio + image testés.
```

### P05 — PWA AGENT TERRAIN (OFFLINE)
```text
PWA Next.js offline-first (agent.agropulse.africa) Android8+ iOS14+ :
Écran Saisie prix : ← Marché[Hedzranawoé▾] Produit[Maïs▾] Prix FCFA/kg[225] Volume[500kg] [📷 Prendre photo] Notes[...] [✅ SOUMETTRE] Dernière 07:32 Score⭐4.2

Flow : login agent -> marché jour -> saisie prix+volume+photo -> POST /prices -> file validation -> notif validation/rejet -> score qualité -> paie Mobile Money fin mois.
Sync différée IndexedDB + background sync, photos WebP compressées <5MB validation MIME + antivirus, max 3 taps action critique, lisible plein soleil gros boutons 44x44, contraste WCAG AA.

BR-30→32 : min 3j/sem/marché, commission qualité×volume×fiabilité, 3 rejets -> formation.

Acceptance : offline saisie -> online sync OK, photo upload S3 OK.
```

### P06 — ADMIN (MODÉRATION + USERS + AGENTS + RÉFÉRENTIELS)
```text
Admin app.agropulse.africa/admin (Email+pwd+2FA, rôles Super/Modérateur/Support) :
- Dashboard KPIs temps réel (MAU, prix collectés, revenus)
- Modération : table Date|Marché|Prod|Prix|Écart|Action[✅][❌][👁] ex Kara Maïs 350 +42% -> approuver publie immédiat, rejeter avec motif notifie agent. Raccourcis A/R/→.
- Users : recherche phone/nom, edit profil, changer plan, suspendre (motif), supprimer RGPD irréversible.
- Agents : Nouveau (profil+marchés), Performance (taux validation), Paiements Générer->Valider->Flooz, Désactiver motif.
- Référentiels : CRUD produits/marchés/régions/corridors.
- Finances : suivi Flooz/T-Money, facturation Enterprise. Config : seuil modération 30%, TTL cache 15, max alertes Basic 3, essai Pro 14j. Logs & audit immuables.

UC-04 : admin compare sources croisées avant approve.

Acceptance : file 12 en attente -> approve/reject OK, audit log écrit.
```

### P07 — DASHBOARD WEB + CARTE + LANDING SEO
```text
Frontend Next.js SSR Tailwind Zustand/ReactQuery Recharts/Chart.js Leaflet+OSM :
- Header ☰ AgroPulse [🔔][👤Kossi▾] + sélecteur marché/région sticky
- Prix jour Lomé 08/07/26 : cards 🌽Maïs225F ▲+3.2% 🫘Soja380F ▼-1.5% 🍅Tomate450F ▲+8.1% avec sparklines
- Graph principal interactif zoom + multi-produits + prévisions pointillées + intervalle confiance
- Carte pins marchés couleur tendance, panneau alertes (3), section Prévisions IA
- Page tarifs 4 col Basic/Pro/Coop/Enterprise toggle mensuel/annuel badge Populaire Pro + Flooz/T-Money + FAQ, login OTP SMS.
- Landing public : Hero Hedzranawoé « L'intelligence des marchés agricoles africains » CTA WhatsApp, 3 cartes problème, capture WhatsApp+dashboard, compteurs, témoignages togolais, footer CGU.
- SEO : /prix/mais|tomate|soja /marches SSR, blog 2/sem, Schema Product/Offer/Place, sitemap XML, Core Web Vitals, pages <500KB lazy WebP.

Accessibilité : clavier complet, ARIA, mode sombre Phase2.

Acceptance : Lighthouse mobile >90, <500KB page.
```

### P08 — ALERTES + NOTIFICATIONS + WORKERS
```text
Alerts Service + Celery Beat 15min + 02:00 UTC IA :
Tables alerts/notifications déjà créées. Endpoints POST /alerts {product_id,market_id,alert_type,threshold_value,channel} ->201, GET /alerts, DELETE /alerts/{id}.

Worker : toutes 15min requête nouveaux prix -> évalue règles users actifs -> file envoi WhatsApp/SMS/push -> dispatch + log notification (status sent/delivered/failed). Bulletin quotidien 7h personnalisé. Alertes pénurie/surplus auto + risque climatique (OpenWeather).

UC-02 : « ALERTE MAIS >250 » -> enregistre -> notif quand condition.

Acceptance : crée alerte -> injecte prix 260 -> reçoit WhatsApp mock <1min.
```

### P09 — PAIEMENTS FLOOZ/T-MONEY + ABONNEMENTS
```text
Plans : Basic 3000F/5$ (prix jour 3 prod, hist 7j, 3 alertes), Pro 7500F/12$ (tout prod, illimité, dashboard, carte, IA 7j, CSV), Coop Standard 75k/125$ Premium 180k/300$ (50 users, IA30j, CSV+PDF, API limitée, SLA99%), Enterprise 1000-10k$/mois (API complète SLA99.9%) -17% annuel. Flow ABONNEMENT WhatsApp/dashboard -> choix Pro -> Flooz/T-Money -> confirmer téléphone -> activation immédiate. Webhooks payment/flooz|tmoney. Virement Ecobank/BOA 24-48h, facture 30j Enterprise, frais 1.5% MM.

Acceptance : paiement mock -> subscription active, non-paiement 7j -> downgrade Basic.
```

### P10 — IA : ANOMALIES + PRÉVISIONS + NLP/OCR
```text
AI/ML Engine (Python PyTorch Prophet spaCy) :
- Anomalie Isolation Forest sur price_records -> flag ±30%
- Prévision batch nocturne : 90j historique + météo + NDVI -> Prophet saisonnalité + LSTM tendances -> price_forecasts 7/30j + notif admin anomalie
- NLP spaCy FR extraction prix/produit/qty texte libre WhatsApp, Whisper STT, Tesseract/Google Vision OCR panneaux, sanitization anti prompt-injection whitelist intents, pas de PII dans prompts LLM, entraînement isolé.
- Satellite GEE/Sentinel NDVI rendement zone (Phase2).

Acceptance : batch test génère forecast 235F [220-250] prophet-v1.2, anomalie 350 détectée.
```

### P11 — MULTILINGUE + SMS/USSD + EXPORT + SÉCURITÉ HARDENING
```text
- i18n fr/ee/kb, LANGUE ee, alertes clés éwé/kabyè.
- SMS Africa's Talking / Moov, USSD partenariat Moov/Yas (Phase2), Telegram Phase2.
- Export CSV/PDF rapports.
- Sécu : TLS1.3 Cloudflare+ALB HSTS, AES-256 RDS/S3, Secrets Manager rotation, PII phone HMAC-SHA256, VPC isolé SG deny-all, SSM pas SSH, ORM paramétré jamais SQL brut, React escaping CSP CSRF, rate bruteforce lockout 5, headers HSTS/CSP/nosniff/DENY/Referrer, logs CloudWatch+Sentry, Dependabot+Snyk hebdo, backup quotidien 30j + WAL 7j RTO4h RPO1h, conformité Loi2019-014 + DPO + droits MES DONNEES/SUPPRIMER MON COMPTE 30j JSON.
- Checklist pré-launch 12 items validée.

Acceptance : scan clean, restore backup testé, headers présents.
```

### P12 — TESTS + STAGING + PROD + MONITORING + DOCS
```text
- Tests : unitaires, intégration, terrain 5 agents 3 marchés fiabilité >85%, beta 50.
- Envs : localhost:3000/:8000 dev, staging.agropulse.africa démo, app.agropulse.africa prod.
- Deploy AWS : build ECR, terraform apply production.tfvars, migrate ECS task, curl /health.
- Monitoring : Sentry+Grafana+Prometheus, alertes latency P95>1s, 5xx>1%, CPU>80%, Disk>85%, WA delivery<95%, prix obsolètes>20% -> relancer agents. Status page, maintenance MAINTENANCE_MODE=true annoncée 48h, rollback ECS PREVIOUS_VERSION.
- Docs : Swagger /docs, manuels admin/user/agent, FAQ, procédures incident P1.

Acceptance : staging vert, prod health OK, 50/500 rps.
```

### P13 — PHASE2 MARKETPLACE B2B [à faire après MVP]
```text
marketplace_listings + endpoints POST/GET /marketplace/listings?product=MAIS&region&min_qty + GET /{id}. Publication vendeur (produit,volume,prix,loc), recherche acheteur filtre, score BR-20→22 init 3/5 +0.1/-0.5 <2 suspendu, chat relay WhatsApp, contrat numérique OHADA signature élec P3. Commissions 1-2% mise en relation 500/mois, 2-3% contrat 100/mois, listing 5-20$/mois. Clause intermédiaire technique non responsable transactions.

Acceptance : publie offre -> acheteur notifié -> match OK.
```

### P14 — PHASE2 API ENTERPRISE + COOP + EXPANSION
```text
- API B2B Enterprise : clés, portal dev, sandbox->prod, monitoring usage, facturation trimestrielle, data products (flux histo 5-50k$/an, indices CEDEAO 10-100k, risque climat 2-20k, macro 15-80k).
- Dashboard coop agrégé membres/ventes/stocks + invitation 50 users.
- TimescaleDB, indices AgroPulse Index, scoring producteurs banques (Ecobank/BOA), assurance NSIA/SUNU, corridors Lomé-Accra-Cotonou, app React Native, Ghana/Bénin/CI (DPA Ghana, CNIL Bénin, ARTCI CI).

Gate : 5000 MAU 500 payants 3 pays MRR>15k 1 Enterprise.
```
