# Tests de charge k6

Les scripts dans ce dossier utilisent [k6](https://k6.io/) pour tester la charge de l’API.

## Prérequis

- [k6](https://k6.io/docs/get-started/installation/) installé
- API démarrée : `npm run dev` (depuis la racine) ou `npm run dev` dans `apps/api`

## Lancer les tests

```bash
# Auth (inscription + login + /auth/me)
k6 run scripts/load/auth.js

# Produits (login puis GET /products et GET /products/:id)
k6 run scripts/load/products.js
```

## Options courantes

```bash
# 10 VU, 1 minute
k6 run --vus 10 --duration 60s scripts/load/auth.js

# Avec base URL
BASE_URL=http://localhost:3000 k6 run scripts/load/products.js

# Produits avec compte existant (évite de créer un user par itération)
AUTH_EMAIL=user@example.com AUTH_PASSWORD=xxx k6 run scripts/load/products.js
```

## Fichiers

- `auth.js` : CSRF, register, login, /auth/me
- `products.js` : auth puis liste produits et détail d’un produit
