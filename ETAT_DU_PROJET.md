# AgroPulse Africa — État du projet

**Date :** 28 octobre 2026
**Périmètre :** plateforme d'intelligence des prix agricoles, Togo d'abord, WhatsApp d'abord.

Ce document répond à deux questions : **ce qui fonctionne aujourd'hui** et **ce qu'il reste à construire**, avec les prérequis de mise en service et les limites connues.

---

## 1. Résumé

Le produit est un MVP fonctionnel de bout en bout sur le plan technique : API, base de données, authentification réelle, tableaux de bord, carte interactive et déploiement automatisé. Deux briques bloquent encore un usage réel par des agriculteurs :

1. **l'envoi des SMS/OTP** (aucun opérateur configuré → personne ne peut se connecter sur le site public) ;
2. **l'envoi WhatsApp réel** (le parseur d'intentions existe, l'appel à l'API Meta n'est pas branché).

Tout le reste peut être testé dès maintenant.

| Indicateur | Valeur |
|---|---|
| Endpoints API | 32 |
| Pages web | 8 |
| Tables PostgreSQL | 18 |
| Tests backend | 16 (tous verts) |
| Tests E2E authentification | 13/13 |
| Coût d'hébergement | 0 € (Vercel + Render + Neon + Upstash) |

---

## 2. Accès et environnements

| Élément | Adresse |
|---|---|
| Site web (production) | https://agropulse-web-lemon.vercel.app |
| API (production) | https://agropulse-api-eo5o.onrender.com/api/v1 |
| Documentation interactive | https://agropulse-api-eo5o.onrender.com/docs |
| Dépôt GitHub | dépôt public, branche `main` |
| Base de données | Neon (PostgreSQL 15, région Europe) |
| Cache | Upstash Redis (optionnel, repli mémoire automatique) |

**État du déploiement :** le site public et l'API tournent sur la version 1.3.0 (analytique détaillée, carte 3D, graphiques, modération, saisie terrain et marketplace reliés à l'API, accès démonstration). Vérification effectuée le 28 octobre 2026 : `/health` renvoie `1.3.0`, les huit pages répondent en 200, la carte affiche les tuiles réelles et les colonnes de prix.

**Accès démonstration :** la page `/login` propose quatre profils de test (agriculteur, coopérative, agent terrain, administrateur) qui ouvrent une session sans SMS. Ces comptes (`+228 90 00 00 01` à `04`), leurs alertes, leurs annonces et un relevé en attente de modération sont créés automatiquement au démarrage. À couper avec `DEMO_LOGIN=0` avant une mise en service réelle.

---

## 3. Ce qui fonctionne

### 3.1 API backend

32 routes, toutes versionnées sous `/api/v1`.

| Domaine | Routes | État |
|---|---|---|
| Santé | `GET /health` (+ `?detail=1` : tables, colonnes manquantes, dernière erreur) | Fonctionne |
| Authentification | `POST /auth/register`, `/auth/login`, `/auth/refresh`, `/auth/demo-login` | Fonctionne (démo sans SMS) |
| Prix | `GET /prices/current`, `/prices/trend`, `/prices/history`, `/prices/forecasts`, `/prices/convert`, `POST /prices` | Fonctionne |
| Analyse | `GET /stats/overview` | Fonctionne (production) |
| Référentiel | `GET /markets`, `/markets/geo`, `/products`, `/regions` | Fonctionne |
| Alertes | `POST /alerts`, `GET /alerts`, `DELETE /alerts/{id}` | Fonctionne (cloisonné par utilisateur) |
| Administration | `GET /admin/prices/pending`, `POST /admin/prices/{id}/approve`, `/reject`, `GET /admin/tasks/check-alerts` | Fonctionne |
| Utilisateurs | `GET /users/me`, `GET /users/me/subscription` | Fonctionne |
| Marketplace | `GET /marketplace/listings`, `POST /marketplace/listings`, `GET /marketplace/listings/{id}` | Fonctionne (persisté en base, publication réservée aux plans Coopérative/Entreprise) |
| Paiement | `POST /payments/init`, webhooks Flooz / T-Money | Stubs |
| WhatsApp | `GET/POST /webhooks/whatsapp` | Parseur d'intentions, pas d'envoi |

Toutes les routes publiques sont protégées par un cache 15 min et un repli mémoire si Redis est absent.

### 3.2 Authentification et sécurité

- **JWT RS256** : access token 15 min, refresh token 7 jours, clés RSA persistées par variable d'environnement.
- **OTP par SMS** : code à 6 chiffres, validité 5 minutes, 3 tentatives maximum, anti-rejeu.
- **2FA TOTP** (RFC 6238) pour les comptes administrateurs.
- **Mots de passe** : PBKDF2-SHA256, 200 000 itérations, sel aléatoire.
- **Téléphones** : stockés hachés en HMAC-SHA256 (le numéro en clair n'est pas conservé côté base).
- **RBAC et plans** : matrice d'habilitations appliquée côté API (Basic / Pro / Coopérative / Agent / Admin).
- **Rate limiting** sur les routes sensibles (Redis, repli mémoire).
- **Quotas d'alertes** : Basic 3, Pro 50, Coopérative 500.
- **Essai Pro 14 jours**, puis 7 jours de grâce, puis retour automatique en Basic.

### 3.3 Base de données

18 tables, créées et migrées automatiquement au démarrage du conteneur (26 instructions `ALTER TABLE IF NOT EXISTS` idempotentes). Aucune commande manuelle à lancer sur Neon.

Tables principales : `users`, `subscriptions`, `alerts`, `price_records`, `price_validations`, `products`, `markets`, `regions`, `countries`, `marketplace_listings`, `payments`, `notifications`, `audit_logs`, `sessions`.

### 3.4 Données et analytique

Nouveau module `app/services/analytics.py` :

- séries journalières (moyenne, min, max, volume, moyennes mobiles 7 et 14 jours) ;
- statistiques descriptives : moyenne, médiane, écart-type, volatilité, amplitude, pente, momentum ;
- prévision à 7 jours par régression linéaire avec bande d'incertitude ;
- comparaison entre marchés et détection des tensions (surplus / équilibre / pénurie) ;
- calcul d'arbitrage : marché le moins cher, marché le plus cher, gain potentiel en FCFA/kg.

Nouveau module `app/services/demo_data.py` :

- coordonnées GPS réelles des 14 marchés togolais, injectées automatiquement ;
- génération d'un historique de démonstration (120 jours, 6 produits, 6 marchés, 2 relevés/jour, soit 8 640 lignes) si la base contient moins de 100 relevés.

> Les lignes de démonstration sont marquées `source_type = 'synthetic'` et l'interface les étiquette « série de démonstration ». Le drapeau est calculé côté API (`meta.demo`, `meta.synthetic_share`) : il reste vrai tant que la majorité des relevés sont synthétiques, puis disparaît automatiquement quand les agents terrain alimentent la base. Pour les supprimer d'un coup :
> `DELETE FROM price_records WHERE source_type = 'synthetic';`

### 3.5 Site web — 8 pages

| Page | Contenu | État |
|---|---|---|
| `/` | Accueil immersif, KPI, graphique 30 jours, indicateurs, prix du jour, carte, alertes | Fonctionne |
| `/carte` | Carte interactive 3D + fiche marché + graphique + analyse | Fonctionne (nouveau) |
| `/alertes` | Création, liste, suppression d'alertes réelles (API) | Fonctionne |
| `/tarifs` | Quatre plans, comparatif | Fonctionne |
| `/login` | Connexion par téléphone + OTP | Fonctionne (dépend des SMS) |
| `/marketplace` | Annonces réelles (lecture publique, publication authentifiée) | Fonctionne |
| `/admin` | File de modération réelle : approuver / rejeter | Fonctionne (compte admin requis) |
| `/agent` | Saisie terrain reliée à `POST /prices`, file locale de secours | Fonctionne (rôle agent requis) |

Design : navbar en verre, hero avec image, 20 icônes SVG maison, **aucun emoji**, responsive mobile avec barre de navigation basse.

### 3.6 Carte interactive

- fond de carte réel OpenStreetMap, bascule **satellite** (Esri) en un clic ;
- vue inclinée à 50° (perspective), bouton **Vue 3D / Vue 2D**, **rotation automatique**, **recentrer sur le Togo** ;
- **colonnes 3D** par marché : hauteur proportionnelle au prix, couleur selon la tension (vert surplus, bleu équilibré, rouge pénurie) ;
- étiquettes de prix cliquables, zoom animé sur le marché sélectionné ;
- **corridors commerciaux** animés (Lomé – Atakpamé – Sokodé – Kara – Dapaong, Lomé – Kpalimé) ;
- panneau latéral : prix, variation, série locale, tableau des six produits ;
- légende et échelle métrique.

> Les colonnes sont dessinées en DOM projeté (et non en WebGL) : rendu garanti sur les téléphones d'entrée de gamme et sur les navigateurs sans accélération graphique.

### 3.7 Graphiques et statistiques

- graphique SVG maison (aucune librairie lourde) : courbe, aire dégradée, bande min/max, moyenne mobile 7 jours, projection 7 jours avec intervalle de confiance ;
- survol avec curseur, info-bulle (date, prix, min/max, nombre de relevés) ;
- sélecteurs 7 / 14 / 30 jours et filtres d'affichage ;
- huit indicateurs clés : prix moyen, médiane, minimum, maximum, volatilité, amplitude, momentum, tendance ;
- histogramme de distribution des prix ;
- comparaison des marchés en barres cliquables ;
- encart d'arbitrage « acheter ici / vendre là ».

### 3.8 Déploiement et automatisation

- **Vercel** : frontend Next.js 14, déploiement par CLI (`--scope wilfwys-projects`).
- **Render** : API FastAPI en Docker, plan gratuit, région Francfort, `render.yaml` versionné.
- **Neon** : PostgreSQL 15.
- **GitHub Actions** : `CI` (tests), `alerts-cron` (toutes les 15 min), `keepalive` (toutes les 5 min, évite la mise en veille de Render).
- **Auto-migration** au démarrage : plus aucune commande SQL à exécuter à la main.

### 3.9 Tests

- 16 tests `pytest` verts (MVP, sécurité, services).
- 13 vérifications E2E d'authentification en local : inscription, doublon, OTP faux, endpoints protégés, rafraîchissement.
- Vérification en production : inscription, doublon, OTP erroné, 401 attendus, 8 pages en 200.

---

## 4. Ce qui a été ajouté lors de la dernière itération

Itération du 28 octobre 2026 (en plus de l'analytique, des graphiques et de la carte 3D) :

- `/admin` branché sur la file de modération réelle : approbation, rejet motivé, gestion des erreurs et des doublons (409).
- `/agent` branché sur `POST /prices` : listes produits/marchés issues de l'API, file locale de secours et synchronisation manuelle.
- `/marketplace` : annonces persistées en base, publication réservée aux plans Coopérative/Entreprise, affichage du vendeur, de la région et de la fiabilité.
- Comptes de démonstration avec rôles et plans, alertes et annonces de test ; relevé en attente pour illustrer la modération.
- Accueil : les alertes affichées proviennent désormais de l'API (`AlertsPreview`), plus de contenu figé.
- `/regions` lit la table `regions` (repli sur trois régions si la base est vide).
- Étiquette « démonstration » sur les annonces et rappel du caractère fictif des données.

---

## 5. Ce qui reste à implémenter

### P0 — Bloquant pour un usage réel

| # | Tâche | Détail |
|---|---|---|
| 1 | Variables d'environnement Render | `JWT_PRIVATE_KEY`, `PII_HASH_SECRET`, `DEBUG_OTP_KEY`, `REDIS_URL` (voir section 6) |
| 2 | Passerelle SMS réelle | Africa's Talking ou agrégateur Moov/Togocom : sans elle, aucun utilisateur ne reçoit son code |
| 3 | Envoi WhatsApp réel | Appels Graph API (`POST /messages`), gabarits validés par Meta, service de notification et journal des envois |
| 4 | Retirer `DEBUG_OTP_KEY` | Une fois les SMS opérationnels, supprimer la clé de débogage |
| 5 | Fermer l'accès démonstration | `DEMO_LOGIN=0` sur Render dès que les comptes réels existent (les profils de test ouvrent une session sans mot de passe) |

### P1 — Cœur produit

| # | Tâche | Détail |
|---|---|---|
| 7 | Marketplace — suite | Persistance et publication faites (`marketplace_listings`) ; restent commandes, commissions 1–3 %, échange de coordonnées |
| 8 | Paiements réels | Intégration Flooz et T-Money (initiation, webhooks signés, réconciliation, factures) |
| 9 | Tableau de bord admin — suite | Modération branchée ; restent gestion des utilisateurs, abonnements et indicateurs agrégés |
| 10 | Application agent — suite | Saisie et file locale branchées ; reste le mode hors-ligne complet (service worker, photo) |
| 11 | Notifications | File d'attente (Celery) pour alertes prix, rappels d'abonnement, échecs et relances, avec journal de livraison |
| 12 | Moteur de prévision | Remplacer la régression linéaire par un modèle saisonnier (Prophet ou SARIMA) entraîné sur l'historique réel |
| 13 | Facturation et plans | Parcours d'abonnement complet : souscription, échéances, grâce, rétrogradation, relances |
| 14 | Multilingue | Messages WhatsApp et interface en éwé et kabyè, en plus du français |
| 15 | Extension géographique | Ghana, Bénin, Burkina Faso : devises, marchés, corridors transfrontaliers |

### P2 — Consolidation technique

| # | Tâche | Détail |
|---|---|---|
| 16 | Alembic | Remplacer les migrations maison par des révisions versionnées |
| 17 | Tests frontend | Playwright sur les parcours carte, alertes, connexion |
| 18 | Tests de charge | 200 utilisateurs simultanés sur `/prices/current` et `/stats/overview` |
| 19 | Observabilité | Sentry (erreurs front et back), métriques de latence, alerte sur `/health` |
| 20 | Sauvegardes | Export quotidien Neon vers stockage objet, test de restauration |
| 21 | Conformité | Registre de traitement, consentement, droit à l'effacement (loi togolaise 2019-014 / RGPD) |
| 22 | Performance mobile | Budget JS, images AVIF, mise en cache des tuiles de carte |
| 23 | PWA | Installation sur l'écran d'accueil, consultation hors-ligne des derniers prix |
| 24 | USSD / IVR | Accès sans smartphone pour les producteurs sans données mobiles |
| 25 | SEO et partage | Métadonnées par page, `sitemap.xml`, aperçus sociaux |

---

## 6. Mise en service — actions à faire

### 6.1 Variables d'environnement Render

Les trois valeurs sont générées et stockées dans `agropulse/backend/keys/PRODUCTION_ENV.txt` (fichier non versionné). À saisir dans Render → service API → Environment :

| Variable | Rôle |
|---|---|
| `JWT_PRIVATE_KEY` | Clé RSA de signature (sinon les sessions sautent à chaque redéploiement) |
| `PII_HASH_SECRET` | Hachage des numéros de téléphone |
| `DEBUG_OTP_KEY` | Permet de récupérer l'OTP via l'en-tête `X-Debug-Key` en attendant les SMS |
| `REDIS_URL` | Cache et rate limiting partagés (Upstash) |

Sans ces variables, l'inscription fonctionne mais **personne ne peut se connecter**.

### 6.2 Déploiement (déjà effectué le 28 octobre 2026)

```powershell
# API : Render reconstruit automatiquement à chaque push sur main (environ 5 minutes)
cd agropulse
git add .
git commit -m "Analytique detaillee et carte interactive 3D"
git push origin main

# Frontend : déploiement manuel par CLI (le projet Vercel n'est pas relié à GitHub)
cd frontend
npx.cmd vercel deploy --prod --scope wilfwys-projects
```

Vérification de la version déployée : `GET /health` doit renvoyer `1.2.0`.

### 6.3 Vérification après déploiement

```powershell
# Nouveaux endpoints
Invoke-RestMethod "https://agropulse-api-eo5o.onrender.com/api/v1/prices/trend?product=MAIS&days=30"
Invoke-RestMethod "https://agropulse-api-eo5o.onrender.com/api/v1/stats/overview?product=MAIS&days=30"
Invoke-RestMethod "https://agropulse-api-eo5o.onrender.com/api/v1/markets/geo"
```

Attendu : une série d'environ 30 points, 6 marchés géolocalisés, un bloc d'arbitrage.

---

## 7. Limites connues et risques

| Sujet | Risque | Mitigation actuelle |
|---|---|---|
| Historique de démonstration | Données synthétiques en production | Marquées `synthetic`, étiquetées « démonstration », purge en une commande |
| SMS absents | Aucune connexion possible sans `DEBUG_OTP_KEY` | Clé de débogage temporaire |
| WhatsApp non branché | Le canal principal du produit n'est pas actif | Parseur prêt, envoi à ajouter |
| Render Free | Mise en veille, premier appel lent (30 à 50 s) | Cron `keepalive` toutes les 5 minutes |
| Neon Free | 0,5 Go, pas de PITR long | Historique limité à 120 jours, purge des données synthétiques |
| Tuiles OpenStreetMap | Politique d'usage : trafic élevé interdit | À basculer vers un fournisseur dédié (MapTiler, Stadia) au-delà de quelques milliers de visites |
| Migrations maison | Risque de dérive du schéma | Passer à Alembic (P2) |
| Environnement Windows local | Docker et AppLocker limitent l'exécution hors conteneur | Travail dans Docker, scripts documentés |
| Absence de 2FA obligatoire | Comptes admin protégés seulement si activés | À imposer côté API |

---

## 8. Ordre recommandé pour la suite

1. Saisir les variables d'environnement Render et tester une connexion complète avec `X-Debug-Key`.
2. Brancher l'envoi WhatsApp (Graph API) : c'est la promesse centrale du produit.
3. Brancher un opérateur SMS, puis retirer `DEBUG_OTP_KEY`.
4. Ajouter les paiements Flooz / T-Money et les commissions marketplace.
5. Passer à un modèle de prévision saisonnier et à Alembic.
6. Avant toute mise en service réelle : `DEMO_LOGIN=0` et purge de l'historique synthétique.

---

## 9. Commandes utiles

```powershell
# Pile locale (PostgreSQL + Redis + API)
cd agropulse
docker compose up -d postgres redis api

# Tests backend
docker compose exec api pytest -q

# Frontend en développement
cd agropulse/frontend
$env:NEXT_PUBLIC_API_URL="http://127.0.0.1:8000/api/v1"
npm.cmd run dev

# Diagnostic base de données
Invoke-RestMethod "http://127.0.0.1:8000/api/v1/health?detail=1"

# Purger l'historique de démonstration
docker compose exec postgres psql -U agropulse -d agropulse -c "DELETE FROM price_records WHERE source_type = 'synthetic';"
```

---

*Document généré à partir de l'état réel du dépôt et de la base au 28 octobre 2026.*
