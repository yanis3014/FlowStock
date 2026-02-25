# Migrations base de données (API)

Ce document décrit comment exécuter et suivre les migrations PostgreSQL pour l’API (Story 1.2).

## Convention des fichiers

- **Emplacement** : `apps/api/migrations/`
- **Nom** : `V{num}__{description}.sql` (style Flyway)
  - `V` + numéro sur 3 chiffres (ex. `V001`, `V013`)
  - `__` (double underscore)
  - Description en snake_case (ex. `create_tenants`, `rls_refresh_tokens`)

Exemples : `V001__create_tenants.sql`, `V013__rls_refresh_tokens.sql`.

## Suivi des migrations

Le runner crée et utilise la table `schema_migrations` (version, description, installed_on, success). Seules les migrations marquées avec `success = true` sont considérées comme appliquées.

## Commandes (depuis la racine du repo ou depuis `apps/api`)

Variables d’environnement : `DATABASE_URL` ou `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`. Voir `.env.example`.

- **Appliquer les migrations** (recommandé si Postgres tourne déjà, ex. Docker) :
  ```bash
  cd apps/api && npm run migrate:direct
  ```
  Ou via le script Docker (démarre le conteneur Postgres si besoin) :
  ```bash
  cd apps/api && npm run migrate
  ```

- **Afficher le statut des migrations** :
  ```bash
  cd apps/api && npm run migrate:status
  ```

Le runner lit tous les fichiers `V*.sql` dans `apps/api/migrations/`, les trie par numéro, et exécute uniquement celles dont la version n’est pas présente dans `schema_migrations` avec `success = true`.

## Bonnes pratiques

- Ne pas modifier le contenu d’une migration déjà appliquée ; ajouter une nouvelle migration (V014, …) pour tout changement.
- Chaque table métier doit avoir `tenant_id` et RLS avec policy `tenant_isolation_policy` (voir `docs/database-multi-tenancy.md`).

## Références

- [Source: apps/api/src/database/migrations.ts] — Implémentation du runner
- [Source: apps/api/package.json] — Scripts `migrate`, `migrate:direct`, `migrate:status`
