# Authentification — ce qu'il reste à faire (5 minutes, une seule fois)

## Pourquoi ces variables sont indispensables

Le conteneur Render est **éphémère** : à chaque redéploiement, le dossier `keys/` est
effacé et les clés RSA sont régénérées. Conséquence : **tous les utilisateurs sont
déconnectés à chaque mise en production**. `JWT_PRIVATE_KEY` fixe la clé.

## Marche à suivre

1. Ouvre le fichier `agropulse/backend/keys/PRODUCTION_ENV.txt` (il contient déjà les
   3 valeurs générées, formatées pour Render)
2. Render → ton service `agropulse-api` → **Environment** → **Add Environment Variable**
3. Colle les 3 variables :

| Key | Valeur | Effet |
|---|---|---|
| `JWT_PRIVATE_KEY` | la ligne `-----BEGIN PRIVATE KEY-----\n...` (une seule ligne) | sessions stables entre les déploiements |
| `PII_HASH_SECRET` | la valeur générée | hash HMAC des téléphones |
| `DEBUG_OTP_KEY` | la valeur générée | permet de lire l'OTP sans fournisseur SMS |

4. **Save & Deploy** (Render redéploie, ~5 min)
5. Teste :
```
curl -X POST https://agropulse-api-eo5o.onrender.com/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -H "X-Debug-Key: <ta valeur DEBUG_OTP_KEY>" \
  -d '{"phone":"+22890000077","full_name":"Test"}'
```
La réponse contient `dev_otp` → utilise-le pour `POST /auth/login`.

## À FAIRE PLUS TARD (priorité)

- **Fournisseur SMS** (Africa's Talking, Moov, ou un gateway local) :
  renseigne `SMS_API_KEY` + `SMS_USERNAME`. Les OTP partiront alors par SMS.
- **Vider `DEBUG_OTP_KEY`** dès que le SMS fonctionne (le header de debug est
  uniquement un pansement : il permet de court-circuiter la vérification SMS).
- **Redis** : `health` affiche `redis:false` → `REDIS_URL` (Upstash) n'est pas
  renseigné sur Render. Le cache fonctionne en mémoire mais n'est pas partagé
  entre les instances (rate limiting non fiable). Colle l'URL Upstash dans
  `REDIS_URL`.
