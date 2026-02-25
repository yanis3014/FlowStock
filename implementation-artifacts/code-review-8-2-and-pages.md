# Revue de code — Story 8.2, api-client, pages (stock-estimates, forecast)

**Date :** 2026-02-16  
**Périmètre :** Layout Tailwind (8.2), api-client (401/403), cohérence des pages métier (token, api-client).

---

## 1. Points positifs

### Layout (Story 8.2)
- **layout.js** : Nav et header entièrement en classes Tailwind ; comportement burger conservé ; une seule règle CSS restante pour `#layout-nav-list.open` (mobile).
- **design-system.css** : Règles layout retirées, `.page-container` et composants (stat-card, badges) conservés pour 8.3–8.5.
- **login / register** : Pas de nav applicative (vérifié).

### api-client.js
- Intercepteur 401/403 → redirection login (hors routes `auth/`), token effacé, `setLoginRedirectUrl` / `setOnAuthError` exposés.
- CSRF + retry, timeout 30s, `credentials: 'include'`, JWT injecté.
- Clé de stockage centralisée : `bmad_jwt_token`.

### stock-estimates.html (qualité du code)
- **escapeHtml** utilisé pour `product_name`, `sku`, `unit` (anti-XSS).
- Tri/filtre côté client, badges de confiance (Tailwind), tri par colonne.
- `formatConsumption` / `formatDaysRemaining` renvoient du HTML (tooltip) ; les valeurs viennent de l’API (numériques) → pas de risque XSS sur ces champs.

### Backend
- Routes `/stock-estimates` protégées par `authenticateToken`, validation `period_days` (7–365).

---

## 2. Problèmes identifiés

### 2.1 stock-estimates.html : pas d’api-client, clé token incohérente (prioritaire)

- **api-client non chargé** : La page ne référence pas `/api-client.js`. Les appels passent par `fetch()` manuel avec `Authorization: Bearer ${token}`.
- **Conséquences** : Pas de redirection 401/403 vers login, pas de CSRF sur d’éventuels futurs POST, pas de timeout centralisé, pas de synchro avec le flux login (login.html enregistre dans `bmad_jwt_token`, pas dans `jwt_token`).
- **Clé localStorage** : La page utilise `jwt_token` (l.292, 297) alors que le reste de l’app (dashboard, stats, login) utilise `bmad_jwt_token`. Un utilisateur connecté via login n’a pas son token disponible sur stock-estimates s’il n’a pas copié/collé.
- **UX** : Bloc « Token JWT (après connexion via /auth/login) » toujours présent — en décalage avec la spec (flux unifié via api-client + redirection 401/403).

**Recommandation :**  
Charger `/api-client.js` sur stock-estimates.html, utiliser `BmadApiClient.setTokenGetter(() => BmadApiClient.loadTokenFromStorage())` au chargement, remplacer l’appel `fetch('/stock-estimates?...')` par `BmadApiClient.fetch('/stock-estimates?period_days=' + ...)`, et supprimer le champ manuel « Token JWT » (ou le garder en option debug uniquement). Utiliser la clé `bmad_jwt_token` si un fallback localStorage reste nécessaire (idéalement tout passer par le token getter).

### 2.2 forecast.html : clé localStorage incohérente

- **Clé** : `localStorage.getItem('jwt_token')` (l.267, 757) au lieu de `bmad_jwt_token`. La page charge api-client.js ; si le token est sauvegardé après login dans `bmad_jwt_token`, forecast ne le récupère pas avec `jwt_token`.

**Recommandation :** Remplacer `jwt_token` par `bmad_jwt_token` (ou utiliser uniquement `BmadApiClient.loadTokenFromStorage()`).

### 2.3 Dashboard : champ token manuel encore affiché

- **dashboard.html** (l.22–23) : Input « Token JWT (ou laissez vide si déjà connecté) » + lien « Se connecter ». Cohérent avec l’usage de `bmad_jwt_token` et du token getter, mais la spec vise à supprimer les champs token manuels et à s’appuyer sur le flux login + redirection 401/403. À traiter comme les autres pages (optionnel après correction stock-estimates / forecast).

### 2.4 Debounce recherche (stock-estimates) — spec front-end

- La spec demande un **debounce sur la recherche** (stock-estimates). Actuellement `searchInput.addEventListener('input', ...)` déclenche `renderTable()` à chaque frappe. Pour de gros volumes, un debounce (ex. 200–300 ms) améliore les perfs.

---

## 3. Synthèse des actions recommandées

| Priorité | Fichier / zone | Action |
|----------|----------------|--------|
| Haute | stock-estimates.html | Charger api-client.js ; utiliser BmadApiClient.fetch + token getter ; supprimer ou réduire le bloc « Token JWT » ; aligner localStorage sur bmad_jwt_token si conservé. |
| Haute | forecast.html | Remplacer `jwt_token` par `bmad_jwt_token` (ou BmadApiClient.loadTokenFromStorage()). |
| Moyenne | stock-estimates.html | Ajouter un debounce sur le champ de recherche (spec). |
| Basse | dashboard.html (et autres) | À terme, retirer le champ token manuel et s’appuyer uniquement sur login + 401/403. |

---

## 4. Récapitulatif clés localStorage

| Page | Clé utilisée | api-client chargé |
|------|--------------|-------------------|
| login.html | BmadApiClient.saveTokenToStorage → bmad_jwt_token | Oui |
| dashboard, stats | bmad_jwt_token | Oui |
| formulas, locations | BmadApiClient.loadTokenFromStorage / saveTokenToStorage | Oui |
| stock-estimates.html | jwt_token | Non |
| forecast.html | jwt_token | Oui (mais clé incohérente) |

Unifier sur **bmad_jwt_token** et **api-client** pour toutes les pages métier garantit une seule source de vérité et le bon déclenchement de la redirection 401/403.
