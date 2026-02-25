# Story 1.4: Subscription Tiers Management

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **système**,  
I want **gérer les niveaux d'abonnement (Normal, Premium, Premium Plus)**,  
so that **les fonctionnalités sont correctement restreintes selon le plan de l'utilisateur**.

## Acceptance Criteria

1. **Given** un utilisateur authentifié  
   **When** le système vérifie le niveau d'abonnement  
   **Then** le modèle de données pour abonnements existe (niveau, date début, date fin, statut)  
   **And** l'API permet de vérifier le niveau d'abonnement d'un utilisateur  
   **And** le middleware/guard restreint l'accès aux fonctionnalités selon le niveau (Normal/Premium/Premium Plus)  
   **And** l'interface admin permet de gérer les abonnements (souscription, upgrade, downgrade)  
   **And** les logs des changements d'abonnement sont enregistrés  
   **And** les tests de restriction d'accès par niveau sont passants  
   **And** la facturation automatique selon le niveau choisi est configurée (intégration future)

## Tasks / Subtasks

- [x] Task 1: Vérifier/compléter le modèle et l’API abonnements (AC: 1, 2)
  - [x] Confirmer que les tables `subscriptions` et `subscription_changes` (V006) couvrent niveau, dates, statut
  - [x] Vérifier GET /subscriptions/current et POST /subscriptions/upgrade (tenant authentifié)
  - [x] Documenter les champs et règles métier (trial, active, upgrade/downgrade) dans docs ou Dev Notes
- [x] Task 2: Middleware/guard par niveau (AC: 3)
  - [x] Vérifier que requireTier(allowedTiers) est utilisé sur les routes nécessitant Premium/Premium Plus
  - [x] Appliquer le guard sur au moins une route métier (ex: prédictions IA, commandes smart) ou confirmer route exemple /subscriptions/premium-only
  - [x] Documenter quelles fonctionnalités sont restreintes par tier (tableau features par tier)
- [x] Task 3: Interface admin gestion abonnements (AC: 4)
  - [x] Définir le périmètre : API seule (déjà en place) ou écran admin frontend
  - [x] Si API seule : exposer GET /subscriptions/current et POST /subscriptions/upgrade pour un futur écran admin
  - [x] Si frontend dans le scope : ajouter page/écran admin (liste tenants/abonnements, upgrade/downgrade) selon stack (apps/web ou apps/api/public)
- [x] Task 4: Logs des changements (AC: 5)
  - [x] Vérifier que upgradeSubscription insère bien dans subscription_changes (tenant_id, old_tier, new_tier, changed_by_user_id)
  - [x] Optionnel : GET /subscriptions/changes (historique pour le tenant) si utile pour admin
- [x] Task 5: Tests restriction par niveau (AC: 6)
  - [x] Vérifier/étendre tests dans __tests__/subscriptions/ (current, upgrade, 403 si tier insuffisant)
  - [x] Tester requireTier : accès refusé (403) pour un tenant Normal sur une route Premium
- [x] Task 6: Facturation automatique – intégration future (AC: 7)
  - [x] Documenter le choix (Stripe ou autre) et la présence de stripe_subscription_id dans le schéma
  - [x] Ne pas implémenter la facturation réelle dans cette story ; préparer le schéma/variables si besoin

## Dev Notes

- **Contexte Epic 1** : Stories 1.1 (infra), 1.2 (BDD multi-tenant), 1.3 (auth) sont done. Cette story repose sur auth (authenticateToken, req.user.tenantId) et sur le modèle subscriptions déjà créé en V006.
- **Déjà en place (à ne pas réinventer)** :  
  - Tables `subscriptions` (tenant_id, tier, status, trial_ends_at, current_period_*, stripe_subscription_id) et `subscription_changes` (audit).  
  - Service `subscription.service.ts` : getCurrentSubscription, getFeaturesForTier, createTrialSubscriptionForTenant, upgradeSubscription, tierSatisfies.  
  - Middleware `requireTier(allowedTiers)` dans `subscriptionTier.ts`.  
  - Routes GET /subscriptions/current, POST /subscriptions/upgrade, GET /subscriptions/premium-only (exemple protégé).  
  - RLS sur subscriptions et subscription_changes.  
- **À faire / à compléter** : Vérifier que tous les AC sont couverts (modèle, API, guard, logs, tests), ajouter l’interface admin si dans le scope (sinon documenter que l’API est prête), documenter mapping tier → fonctionnalités, et préparer la facturation (intégration future).

### Project Structure Notes

- **apps/api/migrations/V006__create_subscriptions.sql** : tables subscriptions, subscription_changes, RLS.
- **apps/api/src/services/subscription.service.ts** : logique abonnement, features par tier, upgrade + écriture dans subscription_changes.
- **apps/api/src/middleware/subscriptionTier.ts** : requireTier(allowedTiers) — à utiliser après authenticateToken.
- **apps/api/src/routes/subscription.routes.ts** : routes /subscriptions/current, /upgrade, /premium-only.
- **apps/api/src/__tests__/subscriptions/** : tests à vérifier/étendre.
- **docs/database-schema.md** : documenter subscriptions et subscription_changes si pas déjà fait.

### Developer Context (contexte pour l’agent dev)

**État actuel du projet (à ne pas réinventer) :**
- **Modèle** : Un abonnement par tenant (UNIQUE tenant_id). Tiers : normal, premium, premium_plus. Statuts : active, cancelled, past_due, trial. Trial créé à l’inscription (Story 1.3) via createTrialSubscriptionForTenant.
- **Features par tier** (getFeaturesForTier) : normal (aucune IA, history_days 30), premium (ai_predictions, smart_orders, history_days 90), premium_plus (+ photo_invoice, auto_orders, history_days 365).
- **Guard** : requireTier(['premium', 'premium_plus']) retourne 403 si le tenant n’a pas le tier requis. tierSatisfies(tenantTier, requiredTiers) pour logique “au moins un des tiers requis”.
- **Upgrade** : POST /subscriptions/upgrade avec body { new_tier }. Met à jour subscriptions et insère une ligne dans subscription_changes (old_tier, new_tier, changed_by_user_id).

**À faire / à compléter pour cette story :**
- S’assurer que tous les AC sont validés (vérification, pas de réécriture inutile).
- Appliquer requireTier sur les routes métier qui doivent être restreintes (ex: endpoints IA, commandes smart) selon le PRD.
- Interface admin : soit uniquement API (déjà prête), soit ajouter un écran dans le frontend (décision produit).
- Tests : au moins un test d’intégration qui vérifie 403 pour un utilisateur Normal accédant à une route Premium.
- Facturation : documenter “intégration future” (Stripe), pas d’implémentation réelle dans cette story.

**Pièges à éviter :**
- Ne pas dupliquer la logique getFeaturesForTier ou tierSatisfies.
- Ne pas oublier d’utiliser authenticateToken avant requireTier (req.user.tenantId doit être défini).
- Ne pas modifier le schéma V006 sans nouvelle migration (V014+).

### Technical Requirements

- **PostgreSQL** : Tables subscriptions et subscription_changes (V006) avec RLS. Une seule ligne subscriptions par tenant.
- **API** : GET /subscriptions/current (tenant courant), POST /subscriptions/upgrade (body: new_tier). Réponses JSON avec tier, status, features, dates.
- **Middleware** : requireTier(allowedTiers: SubscriptionTier[]) après authenticateToken. Réponse 403 avec message clair si tier insuffisant.
- **Audit** : Chaque changement de tier doit être enregistré dans subscription_changes (tenant_id, subscription_id, old_tier, new_tier, changed_by_user_id, changed_at).
- **Facturation** : Colonne stripe_subscription_id prête pour intégration future ; pas d’appel Stripe dans cette story.

### Architecture Compliance

- [Source: docs/architecture.md] — API Gateway gère auth et routing ; multi-tenant par tenant_id et RLS. Les abonnements sont un sous-ensemble du modèle utilisateur/tenant.
- Pas de nouveau service externe obligatoire (Stripe = intégration future). Rester dans apps/api pour les routes et le middleware.

### Library / Framework Requirements

- **Node.js (API)** : Aucune nouvelle dépendance obligatoire. Réutiliser express, middleware auth existant, subscription.service.
- Si interface admin frontend : aligner sur apps/web (Next.js) ou apps/api/public (HTML/JS) selon le projet.

### File Structure Requirements

- Routes abonnements : apps/api/src/routes/subscription.routes.ts (existant).
- Service : apps/api/src/services/subscription.service.ts (existant).
- Middleware : apps/api/src/middleware/subscriptionTier.ts (existant).
- Tests : apps/api/src/__tests__/subscriptions/*.test.ts et/ou *.integration.test.ts.
- Documentation : docs/database-schema.md (tables subscriptions, subscription_changes), éventuellement docs/subscription-tiers.md pour le mapping tier → fonctionnalités.

### Testing Requirements

- Tests d’intégration : GET /subscriptions/current avec token valide (200, données cohérentes) ; POST /subscriptions/upgrade avec new_tier valide (200, subscription_changes alimenté) ; accès à une route protégée requireTier(['premium']) avec un tenant Normal (403).
- Tests unitaires optionnels : getFeaturesForTier pour chaque tier, tierSatisfies(tenantTier, requiredTiers).
- Pas d’exigence de couverture % ; les AC “tests passants” et “restriction par niveau” doivent être couverts par au moins un test automatisé.

### Previous Story Intelligence (Story 1.3)

- **Story 1.3** (User Authentication & Registration) est **done**. Auth JWT (access + refresh), register avec création tenant + trial subscription, login, verify-email, logout, reset-password. Middleware authenticateToken et authorizeRole.
- **Pertinent pour 1.4** : createTrialSubscriptionForTenant est appelé à l’inscription (auth.service). GET /subscriptions/current et POST /subscriptions/upgrade doivent être protégés par authenticateToken. requireTier doit être utilisé après authenticateToken pour que req.user.tenantId soit défini.
- **Fichiers** : apps/api/src/services/auth.service.ts, apps/api/src/middleware/auth.ts, apps/api/src/routes/auth.routes.ts.

### Project Context Reference

- Contexte produit et technique : docs/brief.md, docs/architecture.md, planning-artifacts/epics.md. FR30, FR31, FR32 (structure abonnement, restriction fonctionnalités, gestion abonnements).

### Story Completion Status

- **Status** : done  
- **Completion note** : Contexte et garde-fous rédigés. Une grande partie du modèle, de l’API et du middleware existe déjà ; la story vise à vérifier/compléter les AC (guard sur routes métier, tests 403, interface admin si scope, doc facturation future).

---

## References

- [Source: planning-artifacts/epics.md#Epic 1 Story 1.4] — Critères d'acceptation et contexte métier
- [Source: docs/architecture.md] — API Gateway, multi-tenancy
- [Source: apps/api/migrations/V006__create_subscriptions.sql] — Schéma subscriptions et subscription_changes
- [Source: apps/api/src/services/subscription.service.ts] — getFeaturesForTier, upgradeSubscription, tierSatisfies
- [Source: apps/api/src/middleware/subscriptionTier.ts] — requireTier
- [Source: implementation-artifacts/1-3-user-authentication-registration.md] — Auth et création trial à l’inscription

## Change Log

- **2026-02-25** — Code review (AI) : correction statut Story Completion Status (review), message 500 requireTier → "Internal server error", tests GET /changes autonomes (beforeAll) + assertion changed_by_user_id, fichiers story/doc ajoutés au staging git.
- **2026-02-24** — Implémentation dev-story : vérification modèle/API/guard, doc docs/subscription-tiers.md, GET /subscriptions/changes, tests GET /changes et 403 requireTier, facturation future documentée. Tous les AC couverts. Status → review.
- **2026-02-24** — Création story (workflow create-story). Sprint-status 1-3 mis à jour à done ; story 1-4 créée, status ready-for-dev.

## Dev Agent Record

### Agent Model Used

Auto (dev-story workflow)

### Debug Log References

### Completion Notes List

- **2026-02-24** — Story 1.4 implémentée : (1) Modèle et API V006 confirmés (GET /current, POST /upgrade). (2) requireTier utilisé sur /subscriptions/premium-only ; tableau features par tier dans docs/subscription-tiers.md. (3) Périmètre admin : API seule (GET /current, POST /upgrade, GET /changes exposés pour futur écran). (4) upgradeSubscription insère bien dans subscription_changes ; GET /subscriptions/changes ajouté (historique tenant). (5) Tests existants vérifiés (current, upgrade, 403 pour Normal sur premium-only) ; test GET /changes ajouté. (6) Facturation future documentée (stripe_subscription_id, Stripe) dans docs/subscription-tiers.md. Tous les tests passent (364 tests).

### File List

**Nouveaux fichiers :**
- `docs/subscription-tiers.md`

**Fichiers modifiés :**
- `apps/api/src/services/subscription.service.ts` (getSubscriptionChanges, interface SubscriptionChangeRow)
- `apps/api/src/routes/subscription.routes.ts` (GET /subscriptions/changes)
- `apps/api/src/middleware/subscriptionTier.ts` (message 500 → "Internal server error" en catch)
- `apps/api/src/__tests__/subscriptions/subscriptions.integration.test.ts` (tests GET /changes, beforeAll autonome, assertion changed_by_user_id, userId)
- `implementation-artifacts/1-4-subscription-tiers-management.md` (tasks, status, Change Log, Dev Agent Record, Story Completion Status → review)
- `implementation-artifacts/sprint-status.yaml` (1-4 → in-progress puis review)

### Senior Developer Review (AI)

- **2026-02-25** — Revue adverse : 1 HIGH (statut incohérent), 4 MEDIUM, 4 LOW. Corrections appliquées : statut "review" dans Story Completion Status ; requireTier catch retourne "Internal server error" ; tests GET /subscriptions/changes rendus autonomes (beforeAll) et assertion changed_by_user_id ; docs/subscription-tiers.md et story ajoutés au staging git.
