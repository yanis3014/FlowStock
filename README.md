# BMAD Stock Agent

SaaS de gestion de stocks pour PME avec intelligence artificielle prédictive.

## 🏗️ Structure du Projet

Ce projet utilise une architecture **monorepo** avec Turborepo pour gérer plusieurs applications et packages.

```
bmad-stock-agent/
├── apps/
│   ├── web/                    # Frontend React/Vue.js (à venir)
│   ├── api/                    # Backend API Gateway
│   ├── stocks-service/         # Service Stocks microservice (à venir)
│   ├── ml-service/             # Service IA/ML (Python/FastAPI)
│   ├── orders-service/         # Service Commandes (à venir)
│   ├── invoices-service/       # Service Factures (à venir)
│   └── analytics-service/      # Service Analytics (à venir)
├── packages/
│   ├── shared/                 # Types TypeScript partagés
│   ├── ui/                     # Composants UI partagés (à venir)
│   └── config/                 # Configurations partagées (à venir)
├── infrastructure/
│   └── docker/                 # Dockerfiles pour chaque service (à venir)
├── docker-compose.yml          # Développement local
└── turbo.json                  # Configuration Turborepo
```

## 🚀 Démarrage Rapide

### Prérequis

- **Node.js** 20.x LTS ou supérieur
- **Docker** et **Docker Compose** 24.0+
- **Python** 3.11+ (pour le service ML)
- **Git**

### Installation

1. **Cloner le repository**
   ```bash
   git clone <repository-url>
   cd bmad-stock-agent
   ```

2. **Installer les dépendances**
   ```bash
   npm install
   ```

3. **Configurer les variables d'environnement**
   ```bash
   cp .env.example .env
   # Éditer .env avec vos configurations
   ```

4. **Démarrer les services avec Docker Compose**
   ```bash
   docker-compose up -d
   ```

5. **Vérifier que tout fonctionne**
   ```bash
   curl http://localhost:3000/health
   ```

## 🛠️ Développement

### Scripts Disponibles

- `npm run dev` - Démarrer tous les services en mode développement
- `npm run build` - Builder tous les packages et apps
- `npm run lint` - Linter le code
- `npm run test` - Exécuter les tests

### Base de Données

#### Migrations

Le projet utilise un système de migrations compatible avec Flyway pour gérer le schéma de base de données.

**Exécuter les migrations:**
```bash
cd apps/api
npm run migrate
```

**Vérifier le statut des migrations:**
```bash
cd apps/api
npm run migrate:status
```

Les migrations sont stockées dans `apps/api/migrations/` avec le format `V{version}__{description}.sql`.

**Migrations automatiques au démarrage:**
Par défaut, les migrations s'exécutent automatiquement au démarrage de l'API. Pour désactiver ce comportement:
```bash
RUN_MIGRATIONS_ON_STARTUP=false npm start
```

#### Connexion Multi-Tenant

L'application utilise Row-Level Security (RLS) PostgreSQL pour l'isolation multi-tenant. Toutes les requêtes doivent définir le contexte tenant avant d'accéder aux données.

**Exemple d'utilisation:**
```typescript
import { getDatabase } from './database/connection';

const db = getDatabase();

// Requête avec contexte tenant
const products = await db.queryWithTenant(
  tenantId,
  'SELECT * FROM products WHERE id = $1',
  [productId]
);

// Transaction avec contexte tenant
await db.transactionWithTenant(tenantId, async (client) => {
  await client.query('INSERT INTO products ...');
  await client.query('UPDATE stock ...');
});
```

**Pattern RLS:**
- Toutes les tables métier (sauf `tenants`) incluent une colonne `tenant_id`
- Les politiques RLS filtrent automatiquement les résultats selon `app.current_tenant`
- La fonction `set_tenant_context(tenant_id)` définit le contexte pour la session

### Services Individuels

#### API Gateway (Port 3000)
```bash
cd apps/api
npm run dev
```

#### ML Service (Port 8000)
```bash
cd apps/ml-service
uvicorn app.main:app --reload
```

### Structure Docker

Tous les services sont containerisés avec Docker. Utilisez `docker-compose.yml` pour le développement local.

## 📦 Packages Partagés

### @bmad/shared
Types TypeScript et utilitaires partagés entre tous les services.

```typescript
import { HealthResponse, ApiResponse } from '@bmad/shared';
```

## 🧪 Tests

```bash
# Tests unitaires
npm run test

# Tests d'intégration
npm run test:integration

# Tests E2E
npm run test:e2e
```

## 🚢 Déploiement

### Infrastructure GCP

Le projet est configuré pour être déployé sur **Google Cloud Platform** :

- **Cloud Run** - Déploiement containerisé des services
- **Cloud SQL** - Base de données PostgreSQL
- **Cloud Storage** - Stockage de fichiers
- **Vertex AI** - Infrastructure ML

### CI/CD

Le pipeline CI/CD utilise **GitHub Actions** pour :
- Build automatique sur push
- Tests automatiques
- Build et push des images Docker vers GCP Artifact Registry
- Déploiement automatique vers Cloud Run (staging)

## 📚 Documentation

- [Architecture](./docs/architecture.md) - Documentation complète de l'architecture
- [PRD](./docs/prd.md) - Product Requirements Document
- [Epics](./planning-artifacts/epics.md) - Décomposition en épics et stories

## 🤝 Contribution

1. Créer une branche depuis `main`
2. Implémenter les changements
3. Ajouter des tests
4. S'assurer que tous les tests passent
5. Créer une Pull Request

## 📝 License

[À définir]

## 🔗 Liens Utiles

- [Documentation Architecture](./docs/architecture.md)
- [Stories d'implémentation](./implementation-artifacts/)
