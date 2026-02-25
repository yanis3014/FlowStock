# Niveaux d'abonnement (Story 1.4)

Documentation des tiers d'abonnement et des fonctionnalités associées. Source : PRD FR30, FR31, FR32 et `apps/api/src/services/subscription.service.ts`.

## Tiers

| Tier | Description |
|------|-------------|
| **normal** | Plan de base : pas d’IA prédictive, pas de commandes smart, historique 30 jours. |
| **premium** | Prédictions IA, recommandations de commande (smart_orders), historique 90 jours. |
| **premium_plus** | Tout Premium + photo facture IA, commandes automatiques, historique 365 jours. |

## Fonctionnalités par tier (getFeaturesForTier)

| Fonctionnalité | normal | premium | premium_plus |
|----------------|--------|---------|--------------|
| ai_predictions | non | oui | oui |
| smart_orders | non | oui | oui |
| photo_invoice | non | non | oui |
| auto_orders | non | non | oui |
| history_days | 30 | 90 | 365 |

## Règles métier

- **Trial** : à l’inscription, un abonnement en statut `trial` et tier `normal` est créé (trial_ends_at = +30 jours). Voir `createTrialSubscriptionForTenant` dans auth.service.
- **Upgrade / downgrade** : `POST /subscriptions/upgrade` avec `{ new_tier }`. Chaque changement est enregistré dans `subscription_changes` (old_tier, new_tier, changed_by_user_id).
- **Un abonnement par tenant** : contrainte UNIQUE (tenant_id) sur `subscriptions`.

## Restriction d’accès (requireTier)

Le middleware `requireTier(allowedTiers)` (après `authenticateToken`) retourne 403 si le tier du tenant n’est pas dans la liste autorisée. Exemple : route `/subscriptions/premium-only` exige `['premium', 'premium_plus']`. À utiliser sur les routes métier qui dépendent de l’IA, des commandes smart, etc.

## API admin (gestion abonnements)

- **GET /subscriptions/current** : abonnement du tenant authentifié (tier, status, features, dates).
- **POST /subscriptions/upgrade** : changement de tier (body : `{ new_tier }`).
- **GET /subscriptions/changes** : historique des changements d’abonnement du tenant (audit).

Une interface admin frontend peut s’appuyer sur ces endpoints (écran liste/upgrade à prévoir dans une story dédiée si besoin).

## Facturation (intégration future)

- La colonne **stripe_subscription_id** existe dans la table `subscriptions` (migration V006) pour une future intégration Stripe (ou autre fournisseur).
- Aucun appel de facturation réelle n’est implémenté dans cette story ; le champ est prêt pour lier un abonnement Stripe au tenant.
- Facturation automatique selon le niveau (souscription, upgrade, downgrade) : à implémenter dans une story ultérieure (intégration Stripe / paiement).

## Références

- [Source: apps/api/migrations/V006__create_subscriptions.sql] — Schéma `subscriptions`, `subscription_changes`
- [Source: apps/api/src/services/subscription.service.ts] — getFeaturesForTier, upgradeSubscription, tierSatisfies
- [Source: apps/api/src/middleware/subscriptionTier.ts] — requireTier
