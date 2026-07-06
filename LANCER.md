# Baileo — Phase 1 + Phase 2

## ⚠️ IMPORTANT : deux cas différents

`docker compose down -v` **EFFACE TOUTE LA BASE DE DONNÉES** (comptes, annonces, candidatures).
Ne l'utilisez QUE pour la toute première installation ou pour repartir de zéro.

---

## 1️⃣ PREMIÈRE INSTALLATION (une seule fois)

```bash
# Permissions pour que le container puisse écrire (uploads, cache, clés JWT)
chmod -R 777 backend/var backend/config/jwt backend/public/uploads

docker compose down -v
docker compose up -d --build
sleep 15

docker compose exec backend php bin/console lexik:jwt:generate-keypair --skip-if-exists
docker compose exec backend php bin/console doctrine:schema:update --force
docker compose exec backend php bin/console doctrine:fixtures:load --no-interaction
docker compose exec backend php bin/console cache:clear

cd frontend && rm -rf .angular && npm install && npm start
```

## 2️⃣ DÉMARRAGES SUIVANTS (au quotidien — vos données sont conservées)

```bash
docker compose up -d
cd frontend && npm start
```

## 3️⃣ Après une mise à jour du code backend

```bash
# Nouvelles colonnes (publicBio, dpe/ges/extras, viewedAt, threads) + table visit_feedback :
chmod -R 777 backend/var backend/config/jwt backend/public/uploads
docker compose exec backend php bin/console doctrine:schema:update --force
docker compose exec backend php bin/console cache:clear
```

## (ancien contenu)

```bash
docker compose exec backend php bin/console doctrine:schema:update --force
docker compose exec backend php bin/console cache:clear
```

---

## Accès
- App : http://localhost:4200 · API : http://localhost:8000

## Comptes de test (password123)
- marie.dupont@example.com — Propriétaire
- lucas.martin@example.com — Candidat

## Où sont stockées les données ?
- **Base de données** : volume Docker `postgres_data` — persiste tant que vous ne faites pas `down -v`
- **Photos / documents** : `backend/public/uploads/` sur votre disque — persiste toujours
- **Clés JWT** : `backend/config/jwt/` — générées une fois, conservées

## Si « JWT Token not found » ou déconnexion inattendue
Votre session a expiré ou la base a été réinitialisée : reconnectez-vous simplement.
L'app vous redirige automatiquement vers /connexion sur toute session invalide.


---

## 🚀 Checklist déploiement PRODUCTION
- `APP_ENV=prod` + régénérer `APP_SECRET` : `php -r "echo bin2hex(random_bytes(32));"`
- `CORS_ALLOW_ORIGIN` = votre domaine frontend exact (jamais `*`)
- Régénérer les clés JWT sur le serveur (`lexik:jwt:generate-keypair`)
- HTTPS obligatoire (reverse proxy) — les headers de sécurité nginx sont déjà en place
- Sonde de santé : `GET /api/health` (200 ok / 503 si base injoignable)
- Sauvegardes : volume `postgres_data` + dossier `backend/public/uploads/`
