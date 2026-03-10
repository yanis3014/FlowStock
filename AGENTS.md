# AGENTS.md

## Cursor Cloud specific instructions

### Project overview

BMAD Stock Agent is a Turborepo monorepo (npm workspaces) with two runnable services and one shared library:

| Component | Type | Path | Port |
|---|---|---|---|
| API Gateway | Express.js (TypeScript) | `apps/api` | 3000 |
| Web (Next.js) | Next.js 14 | `apps/web` | 3002 |
| ML Service | FastAPI (Python 3.11+) | `apps/ml-service` | 8000 |
| Shared types | TypeScript library | `packages/shared` | N/A |

*Note : le port 3001 est réservé à Grafana dans certains environnements ; l’app web utilise 3002.*

PostgreSQL 15 is required and runs via `docker compose up -d postgres` (user/pass/db: `bmad`/`bmad`/`bmad_stock_agent`).

### Standard commands

See `README.md` and root `package.json` for standard commands (`npm run dev`, `npm run lint`, `npm run test`, `npm run build`).

### Non-obvious caveats

- **Node.js 20.x is required.** Use `nvm use 20` before running npm commands. The system default may be a different version.
- **`workspace:*` protocol in `apps/api/package.json`:** npm does not support the `workspace:*` dependency protocol (pnpm syntax). The `@bmad/shared` dependency must use `"*"` (without the `workspace:` prefix) for `npm install` to work. The lockfile already resolves it correctly as `"*"`.
- **CSRF protection is active.** To make mutating API calls (POST/PUT/DELETE), you must first `GET /csrf-token` (saving cookies), then include the `CSRF-Token` header and cookie jar in subsequent requests. In test mode (`NODE_ENV=test`), CSRF is bypassed.
- **Migrations run automatically** on API startup (`RUN_MIGRATIONS_ON_STARTUP` defaults to true). No need to run migrations manually.
- **`@bmad/shared` exports from `dist/`.** The shared package must be built (`npm run build` or `turbo run build --filter=@bmad/shared`) before the API build. Turborepo handles this automatically via `dependsOn: ["^build"]`.
- **Tests require PostgreSQL.** The integration tests connect to the same database configured in `.env`. Ensure `docker compose up -d postgres` is running before `npm run test`.
- **ML service uses a Python venv** at `apps/ml-service/.venv`. Activate it with `source apps/ml-service/.venv/bin/activate` before running `uvicorn` or `pytest`.
- **Docker must be started manually** in the cloud VM: `sudo dockerd &>/dev/null &` then wait a few seconds before running `docker compose`.
- **Registration field names** use `snake_case`: `first_name`, `last_name`, `company_name` (not camelCase).
- **Story 2.5 (mode dégradé POS)** : `POS_DEGRADED_SILENCE_MINUTES` (défaut 15) et `POS_DEGRADED_FAILURE_THRESHOLD` (défaut 5) optionnels pour la détection de perte de synchro.
