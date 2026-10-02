# AgroPulse Africa — ROADMAP Complète Étape par Étape
> Version 1.0 — 30/09/2026 — Synthèse des 19 dossiers (01 → 19)
> Objectif : MVP Togo → Expansion CEDEAO → Infrastructure panafricaine
> Slogan : « L'intelligence des marchés agricoles africains. »
> Usage : cocher `[x]` au fur et à mesure. Réviser à chaque sprint review + comité mensuel.

**Stack retenue :** Backend Python 3.11+ / FastAPI 0.110+ / SQLAlchemy 2.0 / Celery+Redis / Frontend Next.js 14+ / Tailwind 3+ / PostgreSQL 15+ PostGIS / Redis 7+ / S3 / WhatsApp Cloud API / AWS af-south-1 / Cloudflare
**Marchés pilotes :** Hedzranawoé (Lomé), Kara, Sokodé, Atakpamé, Dapaong, Cinkassé + 9 autres → 15+ An1
**Produits MVP :** MAIS, SOJA, TOMATE (+ MANIOC, IGNAME, ARACHIDE, CACAO, CAFE, RIZ en seed)
**Objectifs An1 :** 1000 MAU, 15+ marchés, fiabilité >85%, 50+ payants, MRR 2000 USD M12

---

## PHASE 0 — PRÉPARATION (Juil–Août 2026) — 2 mois — Jalon M0
> Réf : 01, 13, 14, 15, 17

### 0.1 Juridique & Admin
- [ ] Créer SARL AgroPulse Africa SARL (Lomé) : réservation dénomination CFE
- [ ] Rédiger statuts + dépôt capital 1-5M FCFA + RCCM + NIF + CNSS + Patente (~200-500k FCFA, 2-4 sem)
- [ ] Signer pacte d'associés (vesting 4 ans, cliff 1 an, CEO 50%/CTO 35%/Terrain 15%)
- [ ] Ouvrir compte bancaire pro (Ecobank/BOA/Orabank)
- [ ] Dépôt marque OAPI « AgroPulse Africa » + logo (150-300k FCFA, 17 pays)
- [ ] Rédiger CGU (14 sections), Politique confidentialité, Mentions légales
- [ ] Nommer DPO (dpo@agropulse.africa) + registre traitements Loi 2019-014 Togo
- [ ] Signer contrats freelance (clause PI cédée), NDA, contrats agents terrain, DPA sous-traitants
- [ ] Assurance RC pro

### 0.2 Financement Seed 50 000 USD (M0 : 15 Août 2026)
- [ ] Clôturer seed : 50k USD en banque (valo 500k, dilution 10%)
- [ ] Cibles : angels AgriTech 10-25k, fonds impact Janngo/Savannah/GreenTec, grants FIDA/GIZ/AFD, MEST/CcHUB
- [ ] Plan décaissement : M1 12k, M2 10k, M3 10k, M4 8k, M5 5k, M6 5k réserve

### 0.3 Équipe & Outils
- [ ] Recruter : CEO, CTO/Lead Dev, Dev Backend, Dev Frontend, Designer UX/UI, QA, Resp. Terrain + 5-10 agents LOI
- [ ] Setup : GitHub + Projects, Notion, Slack+WhatsApp, Figma, Sentry+Grafana, HubSpot Free
- [ ] Signer ADR-01→07 (Python, PostgreSQL, WhatsApp-first, AWS af-south-1, JWT, Celery+Redis, Next.js SSR)
- [ ] Ouvrir partenariats : 2 coopératives LOI, GIZ ProAgri, Moov/Yas, INAM/MAE, Univ. Lomé

**Critère sortie Phase 0 :** seed clos, SARL immatriculée, équipe 4 pers., repos GitHub, ADR signés.

---

## PHASE 1 — MVP TOGO (Sep–Déc 2026) — Sprints 1-4
> Réf : 04, 05, 06, 07, 08, 09, 10, 16

### SPRINT 1 (S1-2) — Fondations [M1 : Architecture validée 1 Sep 2026]
- [ ] Setup repos `agropulse/` (backend/app/api/models/schemas/services/workers/ml, frontend/src, infra/terraform, scripts/)
- [ ] Docker + Docker Compose + GitHub Actions (lint+tests+build+push ECR+deploy staging auto)
- [ ] Terraform VPC 10.0.0.0/16, subnets public/privé, ALB, ECS Fargate, RDS PostgreSQL 15+ PostGIS, ElastiCache Redis 7+, S3, Cloudflare DNS+WAF+TLS 1.3
- [ ] Schéma BDD + migrations Alembic (countries, regions, markets, product_categories, products, users, subscriptions)
- [ ] Seed Togo : 5 régions, 14 marchés (Maritime, Plateaux, Centrale, Kara, Savanes), 9 produits MVP
- [ ] Auth : OTP SMS 6 chiffres TTL 5min + JWT RS256 (access 15min/refresh 7j) + RBAC 6 rôles + API Keys `ap_live_`
- [ ] Setup WhatsApp Business API (Meta Cloud API / 360dialog) + webhook `/webhooks/whatsapp`
- [ ] Design system : couleurs #2D6A4F/#52B788/#F4A261/#E63946, Inter + JetBrains Mono, Lucide, composants Button/Card Badge Input Toast Modal Table Chart

### SPRINT 2 (S3-4) — Données [M2 : Bot WhatsApp 1 Oct 2026]
- [ ] API Pricing : `GET /prices/current`, `GET /prices/history`, `POST /prices` (agent/admin), `GET /prices/forecasts` (Pro+)
- [ ] API Référentiels : `GET /markets`, `/products`, `/regions?country=TGO`
- [ ] Règles métier BR-01→05 : 1 source validée, flag ±30% médiane 7j, obsolète >48h, FCFA/kg, marché référentiel
- [ ] Bot WhatsApp v1 : BONJOUR→inscription (nom, loc, cultures), PRIX [produit][marché], AIDE, MON COMPTE, STOP, SUPPRIMER
- [ ] PWA Agent Terrain offline-first : login, marché du jour, saisie prix/kg+volume+photo, file validation, score qualité
- [ ] Admin MVP : dashboard KPIs, file modération (✅/❌/👁, raccourcis A/R/→), users, agents, référentiels
- [ ] Cache Redis prix du jour TTL 15min + invalidation + pagination cursor + gzip/brotli + PgBouncer

### SPRINT 3 (S5-8) — Dashboard & Alertes
- [ ] Dashboard web Next.js SSR : cards Maïs 225F/Soja 380F/Tomate 450F + sparklines, graphique 30j + prévision pointillée, carte Leaflet+OSM, panneau alertes
- [ ] Alertes : `POST/GET/DELETE /alerts`, moteur règles (price_above/below, shortage/surplus/weather), Celery Beat 15min, dispatch WhatsApp/SMS/push, BR-10→13 (tel unique, essai 14j, grâce 7j, coop 20 membres min)
- [ ] NLP v1 extraction prix/produit/quantité (spaCy FR) + Whisper STT vocal éwé/FR + OCR Tesseract panneaux
- [ ] Détection anomalies Isolation Forest + validation croisée 2+ sources
- [ ] Export CSV (Pro) / PDF, Auth OTP web, RBAC matrice (Visiteur/Basic/Pro/Coop/Enterprise/Agent/Admin)
- [ ] Tests intégration + staging.staging.agropulse.africa

### SPRINT 4 (S9-12) — Finitions + Paiement [M3 15 Nov / M4 Beta 1 Déc 2026]
- [ ] Paiement Flooz/T-Money REST + webhooks `/webhooks/payment/flooz|tmoney` + virement + facture Enterprise
- [ ] Landing page SEO : Hero Hedzranawoé + CTA WhatsApp, /prix/mais|tomate|soja, /marches, blog 2/sem, Schema.org Product/Offer/Place, sitemap, Core Web Vitals <500KB
- [ ] Sécurité pré-launch checklist (10_Securite) : HTTPS, WAF, AES-256 RDS/S3, Secrets Manager, rate limiting (Public 20/Basic 60/Pro 200/Coop 500/Enterprise 1000 req/min), 2FA admin, headers HSTS/CSP, backup restore testé, Dependabot+Snyk clean
- [ ] Tests terrain : 5 agents × 3 marchés (Hedzranawoé, Kara, Sokodé), fiabilité >85%
- [ ] Beta fermée 50 testeurs → Lancement public 15 Jan 2027 (M5) : site live, radio Lomé/Nana FM, Republicoftogo, Facebook Ads click-to-WhatsApp

**Critère sortie MVP :** tous P0 livrés, <500ms API P95, <3s WhatsApp, 99.5% uptime, 500 concurrents.

---

## PHASE 2 — LANCEMENT & TRACTION (Jan–Juin 2027) — M6/M7
> Réf : 11, 12, 13, 18 — Objectif 1000 MAU, 50 payants, 15 marchés

### 2.1 Produit
- [ ] Passer 5→10→15 marchés, ajouter MANIOC Q2, RIZ/IGNAME/ARACHIDE seed
- [ ] Alertes avancées pénurie/surplus + risque climatique (OpenWeather) + bulletin quotidien 7h WhatsApp + SMS payant
- [ ] Carte interactive complète + multilingue FR/éwé/kabyè
- [ ] NLP WhatsApp beta Q1 + prévisions IA v1 Prophet (batch 02:00 UTC → `price_forecasts` 7/30j) Q2
- [ ] Onboarding : essai Pro 14j, parrainage (parrain 1 mois / filleul 14j), coop -10% si 20+ membres

### 2.2 Growth / Commercial
- [ ] Funnel : Notoriété (radio/FB/bouche-à-oreille) → Intérêt → BONJOUR → Activation (1 prix+1 alerte) → Rétention → Conversion Flooz → Ambassadeur
- [ ] Budget 5k USD : FB 2k (CPA<2$), Google 500, radio 1k (100k reach), terrain 1k (500 inscrits), influenceurs 500
- [ ] Prospection : 20 coops (Plateau 300+, Lomé 150+, Kara 200+, Mango 500+, Kpalimé 250+), 10 exportateurs/grossistes, 5 institutions (Ecobank, BOA, NSIA, INAM, MAE)
- [ ] CRM HubSpot Free, pipeline Lead→Qualifié→Démo→Proposition→Négo→Gagné, scripts WhatsApp/Email
- [ ] Support : WhatsApp Lun-Sam 7-20h <1h, Email <24h, Tel Coop+ <30min
- [ ] KPIs M6 : churn <8%, DAU/MAU >30%, NPS >30, conv >5% ; M12 : churn <5%, DAU/MAU >40%, NPS >45, conv >10%

**Gate Phase1→2 :** 1000 MAU, 50 payants, 85% fiabilité, MRR >2000 USD.

---

## PHASE 3 — CROISSANCE & EXPANSION (Jul 2027–Juin 2028) — M8→M11
> Réf : 03, 06, 08, 09 — Objectif 5000 MAU, 3 pays, 1 Enterprise

### 3.1 Expansion géo
- [ ] Q3 2027 Ghana pilote Accra/Kumasi (5 marchés) + prévisions IA v1 → 2500 users
- [ ] Q4 2027 Bénin Cotonou (3 marchés) + API B2B + 1er Enterprise → 5000 users
- [ ] Q1 2028 CI Abidjan (5 marchés) + marketplace beta → 8000 users
- [ ] Q2 2028 Marketplace live 8 produits multilingue → 15000 users
- [ ] Conformité : Ghana Data Protection Act, Bénin 2017-029, CI 2013-450, ARCEP SMS/USSD

### 3.2 Fonctionnalités Phase 2 (P2)
- [ ] Marketplace B2B : `POST/GET /marketplace/listings`, recherche filtre, score fiabilité BR-20→22 (init 3/5, +0.1/-0.5, <2 suspendu), messagerie relay WhatsApp, contrat OHADA P3
- [ ] API Enterprise : JWT+API Key, OpenAPI Swagger `/docs`, rate 1000/min, portal dev, facturation trimestrielle, SLA 99.9%
- [ ] Dashboard coopérative + TimescaleDB time-series + export PDF + USSD opérateur + satellite NDVI Sentinel/GEE
- [ ] Monétisation : Coop 50-500 USD/mois, Enterprise 1-10k USD/mois, data 5-100k USD/an, marketplace 1-3% + listing 5-20 USD/mois, pub 50-1000 USD
- [ ] Break-even M8 (Oct 2027) : MRR > charges (~14750 USD An2, ~5463 clients mix) ; Série A Oct 2028 500k+ USD

**Gate Phase2→3 :** 5000 MAU, 500 payants, 3 pays, MRR >15k, 1 Enterprise.

---

## PHASE 4 — SCALE CEDEAO (Jul 2028–Déc 2030) — M12
> Réf : 18 — Objectif 100k MAU, 8+ pays, 6M USD revenus An5

- [ ] Q3 2028 Série A, 5 pays, IA avancée LSTM+NLP, AgroPulse Index CEDEAO → 20k users
- [ ] Q4 2028 Burkina+Niger, contrats numériques → 30k users
- [ ] 2029 8 pays (SN, ML), scoring producteurs API banques (Ecobank), pilote crédit + assurance NSIA/SUNU, logistique corridors Lomé-Accra-Cotonou → 45-60k users
- [ ] 2030 : 100k MAU, Index cité FAO/BAD, 1000 crédits/an, 10M volume trading, 50 Enterprise, app native iOS+Android, multi-région/multi-cloud, AutoML, expansion Cameroun/Kenya/Tanzanie
- [ ] Roadmap tech : monolithe → microservices+event sourcing → distributed ; PG → +Sharding → multi-région ; single AZ → multi-AZ → multi-région
- [ ] Rentabilité An2 +3k, An3 +381k (52%), An5 +4.5M (75%)

**Gate Phase3→4 :** 15k MAU, break-even, 5 pays, Série A clos, marketplace active.

---

## CHECKLISTS TRANSVERSES (à garder cochées)

### Sécurité & Continuité (10)
- [ ] TLS 1.3, WAF, JWT RS256+2FA TOTP, AES-256, Secrets Manager, PII hash HMAC-SHA256, backup quotidien 30j + WAL continu RTO 4h RPO 1h, logs CloudWatch+Sentry, pentest annuel, incidents P1 1h/P2 4h/P3 24h/P4 1sem

### Risques Top (14)
- [ ] R01 données incorrectes (validation croisée, modération, IA, score agents, feedback) — CTO
- [ ] R02 faible adoption (3 coops 300+, démo marchés, gratuit 14j, vidéos, parrainage) — CEO
- [ ] R05 concurrence Esoko/MTN (vitesse 4 mois, data J1, exclus coops, veille mensuelle) — CEO
- [ ] + R03 retard, R04 panne multi-AZ, R08 coût WA (templates+SMS fallback), R10 climat

### Jalons M0-M12
- [ ] M0 15/08/26 seed 50k — M1 01/09/26 archi — M2 01/10/26 bot maïs Lomé — M3 15/11/26 P0 — M4 01/12/26 50 beta — M5 15/01/27 launch — M6 01/03/27 500 MAU — M7 01/06/27 1000 MAU/50 payants — M8 01/10/27 MRR>charges — M9 01/01/28 Ghana — M10 01/06/28 5000 MAU — M11 01/10/28 Série A — M12 01/01/30 100k/8 pays

---
*Document généré à partir des 19 PDFs. Détail SQL : voir 08, API : voir 09, UML : voir 19. Prochaine révision : comité mensuel.*
