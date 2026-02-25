# Code Review – API Client & pages publiques

**Périmètre :** `apps/api/public/api-client.js`, `login.html`, intégration JWT/CSRF  
**Date :** 2026-02-13  
**Workflow :** Revue de code ciblée

---

## 1. Résumé

Le client API partagé (`api-client.js`) centralise l’injection du JWT, du token CSRF et des credentials sur les requêtes. Il est utilisé par les pages publiques (dashboard, chat, etc.). Le code est lisible et la logique CSRF (récupération + retry sur 403) est bien gérée. Quelques points de robustesse, cohérence et sécurité sont relevés ci-dessous.

---

## 2. Points positifs

- **IIFE et `'use strict'`** : Pas de fuite dans le scope global, à part `window.BmadApiClient`.
- **Extraction JWT** : Gestion de plusieurs formats (objet `{ access_token }`, chaîne brute, regex JWT) avec `extractJWT`.
- **CSRF** : Récupération à la demande, retry automatique sur 403 avec message contenant "CSRF", puis seconde requête avec le nouveau token.
- **Storage** : `saveTokenToStorage` / `loadTokenFromStorage` avec try/catch pour éviter les erreurs en contexte restreint (privé, etc.).
- **Headers** : Définition conditionnelle de `Content-Type` pour les body string, et injection systématique de `credentials: 'include'`.

---

## 3. Problèmes identifiés

### HAUTE SÉVÉRITÉ

1. **Double requête possible avec le même body (retry CSRF)**  
   - **Fichier/ligne :** `apps/api/public/api-client.js` (l.65–75)  
   - **Code :** En cas de 403 CSRF, on refait `fetch(API_BASE + url, { ...fetchOpts, headers })`.  
   - **Problème :** Pour une requête POST/PUT/PATCH, `options.body` est un flux (stream) ou une chaîne. Si c’est un `ReadableStream`, il a déjà été consommé par le premier `fetch` ; la seconde requête peut envoyer un body vide ou provoquer une erreur.  
   - **Action :** Pour le retry, ne refaire la requête qu’avec des body non stream (ex. `typeof options.body === 'string'` ou blob/buffer). Sinon, documenter que le client ne garantit pas le retry pour les body stream.

2. **Login n’utilise pas `BmadApiClient.fetch`**  
   - **Fichier :** `apps/api/public/login.html` (l.98–106)  
   - **Code :** Appel manuel à `fetch('/auth/login', { ... })` avec CSRF récupéré via `ensureCsrf()` et `getCsrfToken()`.  
   - **Problème :** Duplication de la logique (CSRF, credentials). Si la logique du client évolue (ex. base URL, headers communs), la page login peut diverger.  
   - **Action :** Soit utiliser `BmadApiClient.fetch('/auth/login', { method: 'POST', body: JSON.stringify(...) })` sans Authorization (le client peut ne pas ajouter le header si `getToken()` est vide), soit documenter explicitement que la page login est volontairement hors client pour éviter toute injection de token avant authentification.

### MOYENNE SÉVÉRITÉ

3. **`API_BASE = ''` en dur**  
   - **Fichier :** `apps/api/public/api-client.js` (l.9)  
   - **Problème :** En déploiement derrière un reverse proxy ou sur un autre chemin (ex. `/api`), les appels restent relatifs à l’origine. Souvent suffisant, mais pas de support d’une base différente (ex. autre domaine ou préfixe).  
   - **Action :** Documenter que les URLs sont relatives à l’origine, ou ajouter une config (ex. `BmadApiClient.setBaseUrl('/api')`) si besoin futur.

4. **Regex JWT trop permissive**  
   - **Fichier :** `apps/api/public/api-client.js` (l.23)  
   - **Code :** `raw.match(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/)`  
   - **Problème :** Accepte toute chaîne de la forme header.payload.signature (3 segments base64url), sans vérifier la signature. En contexte client c’est souvent acceptable (le serveur rejette les tokens invalides), mais la regex peut matcher du texte qui n’est pas un JWT (ex. autre token en base64).  
   - **Action :** Laisser en l’état si le but est uniquement d’extraire une chaîne à envoyer au serveur ; sinon documenter que l’extraction est heuristique et que la validation reste côté serveur.

5. **Pas de timeout sur `fetch`**  
   - **Fichier :** `apps/api/public/api-client.js`  
   - **Problème :** Les appels `fetch` n’ont pas de timeout. En cas de réseau lent ou bloqué, l’utilisateur peut attendre indéfiniment.  
   - **Action :** Envisager `AbortController` + `setTimeout` pour un timeout global (ex. 30 s) ou par requête, et documenter le comportement en cas d’abort.

### FAIBLE / SUGGESTIONS

6. **Exemple dans le bloc commenté**  
   - **Fichier :** `apps/api/public/api-client.js` (l.3–4)  
   - **Code :** `BmadApiClient.setTokenGetter(() => document.getElementById('token').value);`  
   - **Suggestion :** La plupart des pages utilisent le storage (`loadTokenFromStorage`). Ajouter un exemple avec storage dans le commentaire d’en-tête, ex. `setTokenGetter(() => BmadApiClient.loadTokenFromStorage())`.

7. **Gestion d’erreur dans `ensureCsrf`**  
   - **Fichier :** `apps/api/public/api-client.js` (l.33–38)  
   - **Code :** Si `r.json()` échoue, l’erreur n’est pas catchée et remonte.  
   - **Suggestion :** Optionnel : `try { const j = await r.json(); ... } catch (e) { throw new Error('Réponse CSRF invalide'); }` pour un message plus clair si le serveur renvoie du non-JSON.

8. **Cohérence des clés de stockage**  
   - **Fichier :** `apps/api/public/login.html` (l.116) vs `api-client.js` (l.10)  
   - **Code :** Login fait `localStorage.setItem('bmad_jwt_token', ...)` ; le client utilise `JWT_STORAGE_KEY = 'bmad_jwt_token'`.  
   - **Statut :** Déjà cohérent. Suggestion : utiliser `BmadApiClient.saveTokenToStorage(data.data.access_token)` après login pour centraliser la clé et la logique (ex. futur chiffrement ou autre stockage).

---

## 4. Recommandations prioritaires

1. **Court terme :** Vérifier/compléter le retry CSRF pour les requêtes avec body (éviter double envoi avec body stream).  
2. **Court terme :** Aligner la page login soit sur `BmadApiClient.fetch` (sans token), soit documenter la raison de l’appel manuel et réutiliser `saveTokenToStorage` après succès.  
3. **Moyen terme :** Ajouter un timeout (AbortController) sur les requêtes du client pour améliorer l’UX en cas de réseau défaillant.

---

## 5. Vérifications transverses (stories précédentes)

- **Story 4.4 (alertes) :** Les bugs critiques signalés dans `code-review-report-4-4.md` (syntaxe TypeScript `as HTMLInputElement` dans le HTML, formule « rupture imminente » toujours 30) ne sont plus présents dans le code actuel. La logique « rupture imminente » s’appuie sur `lead_time_days` et le statut low/critical ; le seuil d’alerte est bien récupéré/mis à jour via `getElementById` sans cast TypeScript.
