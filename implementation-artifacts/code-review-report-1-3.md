# 🔥 RAPPORT DE RÉVISION DE CODE - Story 1.3

**Story:** 1-3-user-authentication-registration  
**Date:** 2026-01-29  
**Réviseur:** BMAD Code Review Agent (Adversarial)  
**Statut Story:** review → **in-progress** (problèmes critiques identifiés)

---

## 📊 RÉSUMÉ EXÉCUTIF

**Issues Trouvées:** 8 problèmes spécifiques  
- 🔴 **CRITIQUE:** 2  
- 🟡 **HAUTE:** 3  
- 🟢 **MOYENNE:** 2  
- ⚪ **BASSE:** 1  

**Git vs Story:** Pas de dépôt git détecté à la racine du projet — vérification git omise.

**Verdict:** Story **NON PRÊTE** pour statut "done". Des problèmes critiques (RLS + secret JWT) et des problèmes haute sévérité doivent être corrigés avant validation.

---

## 🔴 PROBLÈMES CRITIQUES

### 1. [CRITIQUE] Requêtes sur `users` sans contexte tenant → login / verify / forgot / refresh / reset cassés avec RLS

**Fichiers:**  
`apps/api/src/services/auth.service.ts` (loginUser, verifyEmail, requestPasswordReset, refreshAccessToken, resetPassword)  
`apps/api/src/database/connection.ts` (commentaire sur `query()`)

**Problème:**  
La table `users` a RLS activé (V003) avec la politique `tenant_id = current_setting('app.current_tenant', true)::UUID`. Sans `set_tenant_context()`, `current_setting` vaut `NULL`, donc **aucune ligne ne passe** la politique.

Or le code fait :

- **loginUser** : `db.query('SELECT ... FROM users u WHERE u.email = $1 ...')` sans jamais appeler `set_tenant_context` → 0 lignes → "Invalid credentials" même avec bons identifiants.
- **verifyEmail** : `db.query('SELECT tenant_id FROM users WHERE id = $1', [userId])` sans contexte → 0 lignes → "User not found" systématique.
- **requestPasswordReset** : `db.query('SELECT ... FROM users u WHERE u.email = $1 ...')` sans contexte → utilisateur jamais trouvé, reset jamais envoyé.
- **refreshAccessToken** : `db.query('SELECT ... FROM refresh_tokens rt JOIN users u ...')` — `users` est sous RLS, pas de contexte → jointure ne retourne rien → refresh toujours en échec.
- **resetPassword** : `db.query('SELECT tenant_id FROM users WHERE id = $1 AND email = $2', ...)` sans contexte → 0 lignes → "User not found".

**Impact:**  
Avec RLS activé (cas normal après migrations), **inscription + login + vérification email + refresh + forgot/reset password ne fonctionnent pas**. Seul le flux d’inscription (tenant créé puis `set_tenant_context` dans la même transaction) peut encore écrire dans `users`.

**Preuve (extrait):**
```typescript
// auth.service.ts - loginUser (l.201-208)
const userResult = await db.query(  // ← pas de set_tenant_context avant
  `SELECT u.id, u.tenant_id, ... FROM users u WHERE u.email = $1 ...`,
  [input.email]
);
// Avec RLS : 0 rows car app.current_tenant est NULL
```

**Action requise:**  
Introduire un mécanisme de lecture "système" pour ces cas où le tenant est inconnu (recherche par email ou par token) :

- Soit une fonction SQL `SECURITY DEFINER` qui retourne `(user_id, tenant_id)` pour un email ou pour un token, sans être soumise à RLS, et appeler `set_tenant_context(tenant_id)` avant les requêtes métier.
- Soit un rôle/connection dédié avec `BYPASSRLS` pour ces requêtes de lookup uniquement, puis utilisation de `queryWithTenant` pour le reste.

Sans cela, l’auth est inutilisable avec RLS activé.

---

### 2. [CRITIQUE] Secret JWT en fallback si `JWT_SECRET` absent

**Fichier:** `apps/api/src/utils/jwt.ts` lignes 3-7

**Problème:**  
Si `JWT_SECRET` n’est pas défini (ou vide), le code utilise un secret par défaut :

```typescript
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-change-in-production-min-32-chars';
```

En production, un oubli de variable d’environnement laisse un secret prévisible et partagé par toutes les instances → **fabrication de tokens valides et prise de compte possible**.

**Action requise:**  
- En production (`NODE_ENV === 'production'`), refuser de démarrer si `JWT_SECRET` est absent ou trop court (ex. &lt; 32 caractères).
- Documenter clairement dans le README / déploiement que `JWT_SECRET` est obligatoire et doit être fort et unique par environnement.

---

## 🟡 PROBLÈMES HAUTE SÉVÉRITÉ

### 3. [HAUTE] Tests d’intégration qui ne valident pas vraiment le middleware d’auth

**Fichier:** `apps/api/src/__tests__/auth/auth.integration.test.ts`  
- "Middleware authenticateToken" (l.401-429)  
- "should allow access with valid token" (l.411-422)  
- "should reject request without token" (l.424-428)

**Problème:**  
- "should allow access with valid token" appelle `GET /health` avec un Bearer token. Or `/health` **n’utilise pas** `authenticateToken`. Le test vérifie seulement que le serveur répond 200, pas que le middleware accepte le token.
- "should reject request without token" ne fait qu’un `expect(accessToken).toBeDefined()` et ne fait **aucun appel** à une route protégée sans token. Il ne démontre pas le 401.

**Impact:**  
AC "Middleware authenticateToken - extraction et validation token" et "Middleware authorizeRole - vérification permissions" ne sont pas couverts par des tests d’intégration réels.

**Action requise:**  
- Exposer une route de test protégée par `authenticateToken` (et éventuellement une par `authorizeRole`) ou utiliser une route réelle protégée.
- Ajouter un test : appel à cette route **sans** `Authorization` → 401.
- Ajouter un test : appel avec token valide → 200 (ou 204 selon le cas).
- Ajouter un test : token invalide/expiré → 401.
- Si une route admin existe : test avec rôle insuffisant → 403.

---

### 4. [HAUTE] Colonne `refresh_tokens.token` en VARCHAR(500) — risque de dépassement

**Fichier:** `apps/api/migrations/V004__create_refresh_tokens.sql` ligne 11

**Problème:**  
Un JWT (header + payload + signature) dépasse souvent 500 caractères (ex. payload avec userId, tenantId, role, email, type, exp, iat). La colonne est définie en `VARCHAR(500)` :

```sql
token VARCHAR(500) NOT NULL UNIQUE,
```

**Impact:**  
En production, l’INSERT du refresh token peut échouer (truncation ou erreur selon la config PostgreSQL), ce qui casse login et register après émission du JWT.

**Action requise:**  
Utiliser `TEXT` pour `token` (ou au minimum une taille plus large, ex. 1000), et déployer une migration de modification de colonne si la table existe déjà.

---

### 5. [HAUTE] GET /auth/verify-email sans rate limiting

**Fichier:** `apps/api/src/routes/auth.routes.ts` — route `GET /verify-email` (l.121-149)

**Problème:**  
Contrairement à `/register`, `/login`, `/forgot-password`, la route `GET /auth/verify-email?token=...` n'a pas de rate limiting. Un attaquant peut tenter un grand nombre de tokens (énumération / brute-force) sans limitation. En revanche, en cas d’erreur interne (ex. erreur DB dans `logoutUser`), le catch envoie un JSON (500 + body). Ce n’est pas un bug 204, mais il faut s’assurer que **tous** les chemins de succès n’envoient jamais de body quand on utilise 204.

Vérification effectuée : le succès n’envoie pas de body. Le seul point à clarifier est que pour "token déjà révoqué ou inexistant", le service retourne `{ success: true }` et le routeur ne renvoie pas ce body (il fait bien `res.status(204).send()`). Donc pas de bug direct, mais la spec dit "Retourner 204 No Content" — à noter que dans ce cas on ne renvoie pas de body, c’est conforme.

**Réévaluation:** Ce point est plutôt une vérification. Le vrai risque identifié est que si un jour on renvoie `res.json(...)` par erreur sur le chemin 204, ce serait non conforme. **Rétrogradé en remarque de vigilance.** Je remplace par un autre point haute priorité.

**Remplacement par :**  
### 5. [HAUTE] GET /auth/verify-email sans rate limiting

**Fichier:** `apps/api/src/routes/auth.routes.ts` — route `GET /verify-email` (l.121-149)

**Problème:**  
Contrairement à `/register`, `/login`, `/forgot-password`, la route `GET /auth/verify-email?token=...` n’a pas de rate limiting. Un attaquant peut tenter un grand nombre de tokens (énumération / brute-force) sans limitation.

**Action requise:**  
Ajouter un rate limiter sur `GET /auth/verify-email` (et éventuellement sur `POST /auth/reset-password` si pas déjà fait) avec une limite raisonnable (ex. 20 requêtes/heure par IP pour verify-email).

---

## 🟢 PROBLÈMES MOYENNE SÉVÉRITÉ

### 6. [MOYENNE] Double appel à set_tenant_context dans authenticateToken

**Fichier:** `apps/api/src/middleware/auth.ts` lignes 43 et 70

**Problème:**  
`set_tenant_context(decoded.tenantId)` est appelé une première fois avant la requête user, puis une seconde fois avec `user.tenant_id` après la lecture. Redondant et coût inutile en round-trips DB.

**Action requise:**  
Conserver un seul appel après avoir récupéré l’utilisateur (avec `user.tenant_id`) et supprimer l’appel avec `decoded.tenantId` si les deux valeurs sont censées être identiques.

---

### 7. [MOYENNE] company_name requis métier mais optionnel en validation

**Fichiers:**  
`apps/api/src/middleware/validation.ts` (body `company_name` optionnel)  
`apps/api/src/services/auth.service.ts` (erreur "company_name is required for registration")

**Problème:**  
La story exige un tenant à l’inscription ; le service rejette correctement l’absence de `company_name`. En revanche, la couche validation (express-validator) laisse `company_name` optionnel, donc les erreurs de validation (400) et les messages ne sont pas alignés côté API (on obtient une 400 "company_name is required" du service au lieu d’une erreur de validation explicite).

**Action requise:**  
Rendre `company_name` requis dans la validation d’inscription (ou au moins un champ parmi company_name / tenant_id selon le modèle) et message clair ("Company name is required for registration") pour cohérence avec la story et une meilleure UX API.

---

## ⚪ PROBLÈMES BASSE SÉVÉRITÉ

### 8. [BASSE] Middleware authorizeRole non couvert par les tests d’intégration

**Fichier:** `apps/api/src/__tests__/auth/auth.integration.test.ts`

**Problème:**  
La story demande des tests pour "Middleware authorizeRole - vérification permissions". Aucune route protégée par `authorizeRole(['owner', 'admin'])` n’est exposée dans l’API actuelle et aucun test n’appelle une telle route avec différents rôles (user → 403, admin/owner → succès).

**Action requise:**  
- Soit ajouter une route de test protégée par `authorizeRole` (ex. GET /auth/me admin-only) et des tests 200/403 selon le rôle.
- Soit documenter explicitement que la couverture authorizeRole sera ajoutée lorsque des routes protégées par rôle seront introduites.

---

## ✅ POINTS POSITIFS

- Migrations V003 (users + RLS) et V004 (refresh_tokens) conformes au schéma et contraintes décrits.
- Bcrypt 10 rounds, validation mot de passe (longueur, majuscule, minuscule, chiffre), express-validator sur les entrées.
- Rate limiting sur register, login, forgot-password comme spécifié.
- Helmet utilisé dans `index.ts`.
- Tests unitaires password et JWT présents et pertinents.
- Structure auth (routes, service, middlewares, utils) claire et alignée avec la story.

---

## 📋 SYNTHÈSE DES ACTIONS

| Priorité   | Action |
|-----------|--------|
| 🔴 Critique | Corriger les requêtes auth (login, verify, forgot, refresh, reset) pour qu’elles fonctionnent avec RLS (SECURITY DEFINER ou bypass contrôlé). |
| 🔴 Critique | En production, refuser le démarrage si `JWT_SECRET` absent ou trop court. |
| 🟡 Haute    | Ajouter des tests d’intégration réels pour authenticateToken (route protégée, 401 sans token, 401 token invalide). |
| 🟡 Haute    | Passer `refresh_tokens.token` en TEXT (ou taille suffisante) et migrer si nécessaire. |
| 🟡 Haute    | Ajouter rate limiting sur GET /auth/verify-email (et reset-password si pertinent). |
| 🟢 Moyenne  | Supprimer le double set_tenant_context dans authenticateToken. |
| 🟢 Moyenne  | Rendre company_name requis dans la validation register et aligner les messages. |
| ⚪ Basse   | Couvrir authorizeRole par des tests dès qu’une route protégée par rôle existe. |

---

**Statut proposé pour la story :** **in-progress** (corrections critiques et hautes requises avant passage en "done").
