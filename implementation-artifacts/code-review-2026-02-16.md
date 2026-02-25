# Code Review – Périmètre récent (API, Dashboard, Front, Auth)

**Date :** 2026-02-16  
**Périmètre :** API (index, dashboard, auth), api-client.js, login.html, dashboard.html, middleware (CSRF, rate-limit), services dashboard.

---

## 1. Résumé

La revue porte sur les changements récents : routes dashboard (summary, alert-threshold), service dashboard avec seuil d’alerte configurable, api-client, page login et dashboard. Le code est structuré, les routes sont protégées et testées. Plusieurs points de la revue précédente (api-client du 2026-02-13) restent non traités ; quelques améliorations de robustesse et de cohérence sont proposées.

---

## 2. Points positifs

- **Dashboard (backend)** : Routes claires (`/summary`, `/alert-threshold` GET/PUT), authentification systématique, vérification `req.user?.tenantId`. Service bien découpé (seuil tenant, calcul d’alertes, agrégations).
- **Validation métier** : Seuil d’alerte borné (50–500 %) côté service ; messages d’erreur explicites.
- **Tests dashboard** : Tests d’intégration présents (summary, alert-threshold, 400 sur type invalide, persistance du seuil).
- **Rate limiting** : Limiteurs dédiés (register, login, forgot-password, verify-email), désactivés en test pour éviter 429 en E2E.
- **CSRF** : Middleware csurf avec options cookie (httpOnly, secure, sameSite), erreur 403 gérée proprement.
- **Front dashboard** : Utilisation de `BmadApiClient.fetch` pour summary et alert-threshold ; validation côté client (50–500, NaN) avant envoi.
- **Graceful shutdown** : Fermeture du serveur et du pool DB sur SIGTERM/SIGINT, avec gestion uncaughtException/unhandledRejection.

---

## 3. Problèmes identifiés

### HAUTE SÉVÉRITÉ

1. **Retry CSRF avec body (api-client)** — *déjà signalé 2026-02-13*  
   - **Fichier :** `apps/api/public/api-client.js` (l.64–75)  
   - **Problème :** En cas de 403 CSRF, une seconde `fetch` est envoyée avec le même `fetchOpts` (donc le même `body`). Si `body` est un `ReadableStream`, il est déjà consommé → seconde requête avec body vide ou erreur.  
   - **Action :** Ne faire le retry que pour les body non stream (ex. `typeof options.body === 'string'` ou Blob/ArrayBuffer). Sinon, documenter que le retry n’est pas garanti pour les requêtes avec stream.

2. **Login n’utilise pas `BmadApiClient.fetch`** — *déjà signalé 2026-02-13*  
   - **Fichier :** `apps/api/public/login.html` (l.98–106)  
   - **Problème :** Appel manuel à `fetch('/auth/login', ...)` avec CSRF/credentials dupliqués. Évolution future de l’api-client (base URL, headers, timeout) ne s’appliquera pas au login.  
   - **Action :** Utiliser `BmadApiClient.fetch('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) })` sans définir de token getter (pas d’Authorization avant login), puis après succès appeler `BmadApiClient.saveTokenToStorage(data.data.access_token)` et rediriger. Cela centralise aussi la clé de stockage.

### MOYENNE SÉVÉRITÉ

3. **Validation PUT alert-threshold : NaN / Infinity**  
   - **Fichier :** `apps/api/src/routes/dashboard.routes.ts` (l.56–60)  
   - **Code :** `if (typeof thresholdPercent !== 'number')` rejette les strings mais pas `NaN` ni `Infinity` (`typeof NaN === 'number'`).  
   - **Action :** Ajouter `if (!Number.isFinite(thresholdPercent))` (ou équivalent) pour rejeter NaN/Infinity et renvoyer 400.

4. **Performance dashboard summary (limit 10000)**  
   - **Fichier :** `apps/api/src/services/dashboard.service.ts` (l.98–99)  
   - **Code :** `listProducts(tenantId, { page: 1, limit: 10000 })` pour agréger tous les produits.  
   - **Problème :** Pour un tenant avec beaucoup de produits, charge mémoire et temps de réponse élevés.  
   - **Action :** À moyen terme : pagination ou endpoint dédié (ex. agrégats SQL) pour ne pas charger toute la liste produits en mémoire. Court terme : documenter la limite ou ajouter une borne max (ex. 5000) avec comportement défini au-delà.

5. **Pas de timeout sur `fetch` (api-client)** — *déjà signalé 2026-02-13*  
   - **Fichier :** `apps/api/public/api-client.js`  
   - **Problème :** Requêtes sans timeout → attente potentiellement illimitée en cas de réseau lent.  
   - **Action :** Envisager `AbortController` + `setTimeout` (ex. 30 s) et documenter le comportement en cas d’abort.

### FAIBLE / SUGGESTIONS

6. **Cohérence sauvegarde token après login**  
   - **Fichier :** `apps/api/public/login.html` (l.115–117)  
   - **Code :** `localStorage.setItem('bmad_jwt_token', ...)` en dur.  
   - **Suggestion :** Utiliser `BmadApiClient.saveTokenToStorage(data.data.access_token)` pour centraliser la clé et la logique (aligné avec la revue du 13/02).

7. **API_BASE et base URL (api-client)**  
   - **Fichier :** `apps/api/public/api-client.js` (l.9)  
   - **Suggestion :** Documenter que les URLs sont relatives à l’origine, ou ajouter une config (ex. `setBaseUrl`) si un déploiement avec préfixe (ex. `/api`) est prévu.

8. **IDs d’alertes non stables**  
   - **Fichier :** `apps/api/src/services/dashboard.service.ts` (ex. l.134, 151, 172)  
   - **Code :** `id: \`alert_${product.id}_critical_${Date.now()}\``  
   - **Suggestion :** Si le front utilise ces IDs pour du cache ou du suivi, des IDs stables (ex. `alert_${product.id}_critical` sans timestamp) évitent des re-renders inutiles. À adapter si le besoin est uniquement d’avoir un identifiant unique par alerte à l’instant T.

---

## 4. Recommandations prioritaires

1. **Court terme :**  
   - Implémenter la condition de retry CSRF pour body non stream dans `api-client.js`.  
   - Passer le login à `BmadApiClient.fetch` + `saveTokenToStorage` et supprimer la duplication CSRF/credentials.  
   - Ajouter la validation `Number.isFinite(thresholdPercent)` dans `dashboard.routes.ts` pour PUT alert-threshold.

2. **Moyen terme :**  
   - Envisager un timeout global (ou par requête) dans l’api-client.  
   - Réfléchir à une stratégie de chargement du dashboard pour les tenants avec beaucoup de produits (agrégats SQL ou pagination).

3. **Documentation :**  
   - Préciser dans la spec ou le README que l’api-client suppose des URLs relatives à l’origine et que la validation JWT reste côté serveur.

---

## 5. Synthèse par fichier

| Fichier | État | Action principale |
|--------|------|--------------------|
| `api-client.js` | À renforcer | Retry CSRF conditionnel (body), option timeout, doc base URL |
| `login.html` | À aligner | Utiliser BmadApiClient.fetch + saveTokenToStorage |
| `dashboard.routes.ts` | OK + petit correctif | Rejeter NaN/Infinity pour thresholdPercent |
| `dashboard.service.ts` | OK | À terme : limiter/optimiser chargement produits |
| `dashboard.html` | OK | — |
| `csrf.ts` / `rateLimit.ts` | OK | — |
| `index.ts` | OK | — |

---

*Revue effectuée sur la base du statut git et des fichiers ouverts/modifiés récemment.*
