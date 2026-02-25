# Multi-tenancy et Row-Level Security (RLS)

Ce document décrit le pattern multi-tenant utilisé côté base de données (PostgreSQL) et son usage dans l’API (Story 1.2).

## Contexte tenant

- Chaque table métier possède une colonne `tenant_id` (référence vers `tenants.id`) et est protégée par **Row-Level Security (RLS)**.
- Avant d’exécuter des requêtes sur ces tables, l’API doit définir le contexte tenant pour la session avec la fonction PostgreSQL :

  ```sql
  SELECT set_tenant_context($tenant_id::uuid);
  ```

- La fonction enregistre l’identifiant dans un paramètre de session : `app.current_tenant`. Les policies RLS utilisent ce paramètre pour filtrer les lignes.

## Usage dans l’API (Node.js)

Le pool de connexions expose deux méthodes (voir `apps/api/src/database/connection.ts`) :

1. **`queryWithTenant(tenantId, queryText, values?)`**  
   Définit le contexte tenant pour la requête, exécute la requête, puis libère le client. À utiliser pour toute requête sur des tables avec RLS (users, products, sales, etc.).

2. **`transactionWithTenant(tenantId, callback)`**  
   Définit le contexte tenant pour toute la transaction. À utiliser pour des enchaînements de requêtes qui doivent voir uniquement les données du tenant.

**Exemple :**

```ts
const db = getDatabase();
const rows = await db.queryWithTenant(
  req.tenantId,
  'SELECT * FROM products WHERE is_active = true',
  []
);
```

- **`query(queryText, values?)`** (sans tenant) doit être réservé aux tables sans RLS (ex. `tenants`, `schema_migrations`) ou aux fonctions **SECURITY DEFINER** qui contournent RLS (ex. `get_refresh_token_info`, `get_tenant_id_for_user`).

## Tables avec RLS

Toutes les tables métier ont RLS activé et une policy `tenant_isolation_policy` basée sur `current_setting('app.current_tenant', true)::UUID` :

- `users`, `locations`, `suppliers`, `products`
- `subscriptions`, `subscription_changes`
- `sales`, `stock_movements`, `formulas`
- `chat_conversations`, `chat_messages`, `chat_context`
- `refresh_tokens` (isolation via `users.tenant_id` et fonction `get_refresh_token_info` pour la recherche par token)

La table `tenants` n’a pas de RLS (table système). La table `schema_migrations` n’a pas de RLS.

## Références

- [Source: apps/api/migrations/V002__setup_rls_base.sql] — Définition de `set_tenant_context`
- [Source: apps/api/src/database/connection.ts] — `queryWithTenant`, `transactionWithTenant`
- [Source: docs/architecture.md] — Multi-Tenancy Pattern
