# Architecture des pages — FlowStock (apps/web)

## Vue d'ensemble

L'application web Next.js 14 (App Router) est structurée en **routes** et **groupes de routes**. Le layout principal (`(app)`) fournit la sidebar, le header et la barre de navigation mobile.

---

## Structure des routes

```
app/
├── page.tsx                    → / (accueil : Connexion / Créer un compte)
├── login/page.tsx              → /login
├── register/page.tsx           → /register
├── onboarding/page.tsx        → /onboarding
│
├── (app)/                      ← Groupe de routes (layout commun : AppShell)
│   ├── layout.tsx              → Layout avec sidebar + header
│   ├── dashboard/page.tsx      → /dashboard
│   ├── stocks/page.tsx         → /stocks
│   ├── rush/page.tsx           → /rush
│   ├── rush/stocks/page.tsx    → /rush/stocks
│   ├── sales/page.tsx          → /sales
│   ├── fiches-techniques/page.tsx     → /fiches-techniques
│   ├── fiches-techniques/[id]/page.tsx → /fiches-techniques/:id
│   ├── suggestions/page.tsx    → /suggestions
│   ├── parametres/page.tsx     → /parametres
│   ├── abonnement/page.tsx     → /abonnement
│   ├── stats/page.tsx          → /stats
│   ├── forecast/page.tsx       → /forecast
│   ├── chat/page.tsx           → /chat
│   ├── formulas/page.tsx       → /formulas
│   ├── custom-formulas/page.tsx → /custom-formulas
│   ├── import-stocks/page.tsx  → /import-stocks
│   ├── import-sales/page.tsx   → /import-sales
│   ├── movements/page.tsx      → /movements
│   ├── locations/page.tsx      → /locations
│   ├── suppliers/page.tsx      → /suppliers
│
└── admin/                      ← Zone admin (layout séparé)
    ├── page.tsx                → /admin
    ├── clients/page.tsx        → /admin/clients
    ├── clients/[id]/page.tsx   → /admin/clients/:id
    ├── abonnements/page.tsx    → /admin/abonnements
    ├── moniteur/page.tsx       → /admin/moniteur
    └── feedback/page.tsx       → /admin/feedback
```

---

## Navigation

- **Sidebar (desktop)** : tous les liens de `nav-config.ts` (Mode Rush, Dashboard, Stocks, Fiches techniques, etc.)
- **Barre mobile (mobile)** : 4 liens principaux — Accueil (/dashboard), Stocks (/stocks), IA (/suggestions), Profil (/dashboard)
- **Dashboard** : liens vers /rush, /sales (bandeau mode dégradé)

---

## Flux d'authentification

1. `/` → si non connecté : liens Connexion / Créer un compte
2. `/` → si connecté : redirection vers `/dashboard`
3. `/login`, `/register` : accessibles sans token
4. Pages sous `(app)/` : protégées par `useAuth` : redirection vers `/login` si pas de token

---

## Ports et services

| Service   | Port | URL (dev)              |
|---------|------|------------------------|
| API     | 3000 | http://localhost:3000  |
| Web     | 3002 | http://localhost:3002  |
| Grafana | 3001 | http://localhost:3001  |
| ML      | 8000 | http://localhost:8000  |

---

## En cas de 404 sur /stocks

Si la page Stocks retourne 404 en Docker :

1. **Reconstruire l'image web** : l'image a peut-être été construite avant l'ajout de la page.
   ```bash
   docker compose build web --no-cache
   docker compose up -d web
   ```

2. **Ou lancer en mode dev** (sans Docker pour le web) :
   ```bash
   # Terminal 1 : API
   cd apps/api && npm run dev
   # Terminal 2 : Web
   cd apps/web && npm run dev
   ```
   Puis ouvrir http://localhost:3002/stocks
