# Schéma base de données (API) — Vue d’ensemble

Documentation synthétique du schéma PostgreSQL utilisé par l’API (Story 1.2). Pour les détails exacts (contraintes, index), se référer aux migrations dans `apps/api/migrations/`.

## Tables système (sans RLS)

| Table | Description |
|-------|-------------|
| `tenants` | Organisations / entreprises (multi-tenant). Colonnes : id, company_name, slug, industry, settings (JSONB), is_active, created_at, updated_at. |
| `schema_migrations` | Versions des migrations appliquées (version, description, installed_on, success). |

## Tables métier (avec RLS et tenant_id)

Toutes les tables ci-dessous ont une colonne `tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE` (sauf mention) et une policy RLS `tenant_isolation_policy` basée sur `app.current_tenant`.

| Table | Description |
|-------|-------------|
| `users` | Utilisateurs (email, password_hash, first_name, last_name, role, is_active, tenant_id). Contrainte UNIQUE (tenant_id, email). |
| `refresh_tokens` | Tokens JWT de refresh (user_id, token, expires_at, revoked). RLS via jointure users.tenant_id ; lookup par token via `get_refresh_token_info()`. |
| `locations` | Emplacements / sites (name, is_active, tenant_id). UNIQUE (tenant_id, name). |
| `suppliers` | Fournisseurs (name, contact, email, phone, address, is_active, tenant_id). UNIQUE (tenant_id, name). |
| `products` | Produits / stocks (name, sku, quantity, unit, location_id, supplier_id, tenant_id, …). UNIQUE (tenant_id, sku). |
| `subscriptions` | Abonnement par tenant (tenant_id, tier, started_at, ends_at, …). UNIQUE (tenant_id). |
| `subscription_changes` | Historique des changements d’abonnement (tenant_id, from_tier, to_tier, changed_at, …). |
| `sales` | Ventes historiques (tenant_id, product_id, sale_date, quantity_sold, unit_price, source, external_id, …). |
| `stock_movements` | Mouvements de stock (tenant_id, product_id, type, quantity, reason, created_at, …). |
| `formulas` | Formules prédéfinies (tenant_id NULL) ou personnalisées (tenant_id NOT NULL). name, formula_expression, formula_type, variables_used, is_active. |
| `chat_conversations` | Conversations du chat IA (tenant_id, user_id, title, created_at, …). |
| `chat_messages` | Messages d’une conversation (conversation_id, role, content, created_at). RLS via conversation → tenant_id. |
| `chat_context` | Contexte mémorisé pour le chat (conversation_id, key, value). RLS via conversation → tenant_id. |

## Fonctions utilitaires (SECURITY DEFINER)

- **set_tenant_context(tenant_id UUID)** : définit `app.current_tenant` pour la session (utilisé par l’API avant les requêtes métier).
- **get_tenant_id_for_user(p_user_id UUID)** : retourne le tenant_id d’un utilisateur (contourne RLS).
- **get_user_active_and_tenant(p_user_id UUID)** : retourne tenant_id et is_active (auth).
- **get_user_for_password_reset(email)** : retourne id, tenant_id, email pour envoi d’email de reset.
- **get_refresh_token_info(p_token VARCHAR)** : retourne user_id, tenant_id, expires_at, revoked pour un token de refresh (contourne RLS pour la lookup par token).

## Relations principales

- `users.tenant_id` → `tenants.id`
- `products.location_id` → `locations.id`, `products.supplier_id` → `suppliers.id`
- `sales.product_id` → `products.id`, `sales.location_id` → `locations.id`
- `stock_movements.product_id` → `products.id`
- `chat_messages.conversation_id` → `chat_conversations.id` ; `chat_context.conversation_id` → `chat_conversations.id`

## Références

- [Source: apps/api/migrations/] — Définitions complètes (V001 à V013+)
- [Source: docs/database-multi-tenancy.md] — Usage de set_tenant_context et RLS
