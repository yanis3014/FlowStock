# SaaS Gestion de Stocks IA pour PME Fullstack Architecture Document

---

## Introduction

Ce document décrit l'architecture full-stack complète pour le SaaS de gestion de stocks IA pour PME, incluant les systèmes backend, l'implémentation frontend, et leur intégration. Il sert de source unique de vérité pour le développement piloté par IA, assurant la cohérence à travers toute la stack technologique.

Cette approche unifiée combine ce qui serait traditionnellement des documents d'architecture backend et frontend séparés, rationalisant le processus de développement pour les applications full-stack modernes où ces préoccupations sont de plus en plus entremêlées.

### Starter Template or Existing Project

**N/A - Greenfield project**

Aucun starter template ou projet existant n'est mentionné dans le PRD. Il s'agit d'un projet greenfield qui sera développé from scratch. Cependant, étant donné les besoins techniques (microservices modulaires, infrastructure ML, multi-tenancy), je recommanderai des frameworks/stacks adaptés lors de la sélection de la tech stack.

**Recommandation à venir:** Basé sur les requirements du PRD (architecture microservices, IA/ML, Python pour ML, frontend moderne), je recommanderai une stack appropriée dans la section Tech Stack.

### Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2024-12-19 | 1.0 | Initial architecture document creation | Architect |

---

## High Level Architecture

### Technical Summary

Cette application suit une **architecture microservices modulaire** déployée sur cloud (AWS/GCP/Azure) avec un frontend web responsive moderne et un backend composé de services indépendants pour la scalabilité et l'évolutivité. Le frontend utilisera un framework moderne (React/Vue.js) avec state management pour offrir une expérience utilisateur simple et intuitive, tandis que le backend sera organisé en microservices (Service Stocks, Service IA/ML avec Chat IA intégré, Service Commandes, Service Factures, Service Analytics) communiquant via APIs RESTful. L'infrastructure ML Python sera intégrée pour les prédictions IA et le réentraînement quotidien, avec support cold start via modèles pré-entraînés. La plateforme cloud choisie fournira l'authentification, le stockage, et l'infrastructure scalable nécessaire. Cette architecture répond aux objectifs du PRD en permettant la scalabilité horizontale, l'isolation multi-tenant, et l'intégration IA/ML complexe tout en maintenant la simplicité pour les utilisateurs PME.

### Platform and Infrastructure Choice

**Recommandation: Google Cloud Platform (GCP)**

**Option 1: Google Cloud Platform (GCP) - RECOMMANDÉ**
- **Pros:** Excellente intégration ML/AI (Vertex AI, AutoML), BigQuery pour analytics, Cloud Functions/Cloud Run pour microservices, gestion multi-tenant native, excellente scalabilité
- **Cons:** Courbe d'apprentissage si équipe pas familière, coûts peuvent être élevés pour ML
- **Services clés:** Cloud Run, Vertex AI, Cloud SQL (PostgreSQL), Cloud Storage, Cloud Functions, Cloud Logging/Monitoring

**Option 2: AWS Full Stack**
- **Pros:** Écosystème mature, large adoption, services ML (SageMaker), Lambda pour serverless, bon support multi-tenant
- **Cons:** Complexité de configuration, coûts ML peuvent être élevés
- **Services clés:** Lambda, API Gateway, RDS (PostgreSQL), S3, SageMaker, Cognito

**Option 3: Azure**
- **Pros:** Excellent pour .NET, Azure ML, bon support enterprise
- **Cons:** Moins optimal si stack Python/Node.js, coûts élevés
- **Services clés:** Azure Functions, Azure ML, Azure SQL, Blob Storage

**Recommandation GCP avec justification:**
GCP est recommandé car (1) le projet est centré sur l'IA/ML avec besoin de réentraînement quotidien - Vertex AI offre les meilleures capacités ML intégrées, (2) support natif Python/PyTorch/TensorFlow, (3) Cloud Run permet déploiement simple de microservices, (4) BigQuery excellent pour analytics time-series nécessaires pour l'IA, (5) scalabilité automatique importante pour croissance.

**Confirmation requise:** Confirmez-vous le choix de GCP ou préférez-vous AWS/Azure ?

---

## Tree of Thoughts Deep Dive - Architecture & Docker

### Exploration Multi-Chemins de Raisonnement

**Question centrale:** Quelle architecture de déploiement optimise la maintenance long terme tout en supportant les besoins IA/ML, microservices, et scalabilité ?

#### Chemin 1: Docker + Kubernetes sur GCP (Cloud Run ou GKE)
**Évaluation:** ✅ **SURE** - Optimal pour maintenance long terme

**Raisonnement:**
- **Docker:** Containerisation standardisée pour tous les services (frontend, backend, ML)
- **Avantages maintenance:** Environnements identiques dev/staging/prod, déploiements reproductibles, isolation dépendances
- **GCP Cloud Run:** Gestion Kubernetes simplifiée, auto-scaling, pay-per-use
- **Alternative GKE:** Plus de contrôle, meilleur pour ML workloads complexes
- **Avantages long terme:** Migration facile entre clouds, portabilité, standardisation équipe

**Décision:** Docker + Cloud Run pour MVP (simplicité), migration GKE possible si besoins ML complexes

#### Chemin 2: Docker + Serverless Functions (Cloud Functions)
**Évaluation:** ⚠️ **LIKELY** - Bon pour certains services, limité pour ML

**Raisonnement:**
- **Avantages:** Auto-scaling, coûts optimisés, maintenance réduite
- **Limitations:** Cold start problématique pour ML, limites mémoire/CPU pour entraînement
- **Usage optimal:** Services légers (API Gateway, authentification), pas pour ML lourd

**Décision:** Hybride - Serverless pour services légers, Docker/Cloud Run pour ML et services critiques

#### Chemin 3: Docker + Monorepo + CI/CD intégré
**Évaluation:** ✅ **SURE** - Essentiel pour maintenance

**Raisonnement:**
- **Monorepo:** Partage code frontend/backend, types partagés, dépendances coordonnées
- **Docker Compose:** Développement local identique à production
- **CI/CD:** Build images Docker, tests dans containers, déploiement automatisé
- **Avantages maintenance:** Un seul repo, versions synchronisées, déploiements atomiques

**Décision:** Adopter monorepo + Docker Compose dev + CI/CD avec build images

#### Chemin 4: Architecture Microservices avec Docker
**Évaluation:** ✅ **SURE** - Aligné avec PRD requirements

**Raisonnement:**
- **Services containerisés:** Chaque microservice (Stocks, IA/ML, Commandes, Factures) = container Docker
- **Avantages:** Déploiement indépendant, scaling par service, isolation bugs
- **Communication:** APIs REST entre containers, message queue pour async (réentraînement ML)
- **Maintenance:** Mise à jour un service sans impact autres, rollback facile

**Décision:** Architecture microservices avec chaque service dans son propre container Docker

#### Chemin 5: ML/IA Infrastructure avec Docker
**Évaluation:** ✅ **SURE** - Critique pour maintenance ML

**Raisonnement:**
- **Container ML:** Environnement Python reproductible (TensorFlow/PyTorch, dépendances)
- **Avantages:** Même environnement dev/test/prod, pas de "ça marche sur ma machine"
- **Versioning modèles:** Images Docker taguées avec versions modèles, rollback facile
- **Réentraînement:** Job containerisé quotidien, isolation des autres services
- **Coûts:** Containers ML peuvent scaler indépendamment, arrêt quand inactif

**Décision:** Service ML dans container Docker séparé, job réentraînement containerisé

#### Chemin 6: Multi-tenancy avec Docker
**Évaluation:** ✅ **SURE** - Isolation critique

**Raisonnement:**
- **Isolation données:** Containers permettent isolation runtime, mais données = base de données (schema par tenant)
- **Avantages:** Pas de fuite données entre tenants, scaling par tenant possible
- **Maintenance:** Mise à jour sécurité isolée par container, pas d'impact cross-tenant

**Décision:** Docker pour isolation runtime, PostgreSQL row-level security pour isolation données

### Synthèse - Architecture Recommandée avec Docker

**Architecture finale recommandée:**

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (Docker)                     │
│              React/Vue.js - Containerisé                 │
│              Déployé sur Cloud Run/CDN                   │
└─────────────────────────────────────────────────────────┘
                          ↓ HTTPS
┌─────────────────────────────────────────────────────────┐
│              API Gateway (Docker/Serverless)              │
│              Authentification, Routing, Rate Limiting     │
└─────────────────────────────────────────────────────────┘
                          ↓
        ┌─────────────────┼─────────────────┐
        ↓                 ↓                 ↓
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ Service      │  │ Service      │  │ Service      │
│ Stocks       │  │ Commandes    │  │ Factures     │
│ (Docker)     │  │ (Docker)     │  │ (Docker)     │
└──────────────┘  └──────────────┘  └──────────────┘
        ↓                 ↓                 ↓
┌─────────────────────────────────────────────────────────┐
│         Service IA/ML (Docker - Python)                  │
│         Vertex AI + Containers pour réentraînement      │
└─────────────────────────────────────────────────────────┘
        ↓                 ↓
┌──────────────┐  ┌──────────────┐
│ PostgreSQL   │  │ InfluxDB/    │
│ (Cloud SQL)  │  │ TimescaleDB  │
└──────────────┘  └──────────────┘
```

**Docker Strategy:**
- **Tous les services en Docker** (frontend, backend, ML)
- **Docker Compose pour développement local** (réplique production)
- **Images Docker versionnées** (tags avec versions, git SHA)
- **CI/CD avec build/push images** (GitHub Actions/GitLab CI)
- **Cloud Run pour déploiement** (gestion Kubernetes simplifiée)
- **Migration GKE possible** si besoins ML complexes

**Avantages maintenance long terme:**
1. **Reproductibilité:** Même environnement partout
2. **Portabilité:** Migration cloud facile
3. **Isolation:** Bugs/services isolés
4. **Versioning:** Rollback facile via images taguées
5. **Standardisation:** Équipe utilise mêmes outils
6. **Scalabilité:** Scaling indépendant par service

**Réponse à votre question:** Oui, Docker est essentiel pour maintenance long terme. Je recommande Docker pour tous les services avec Cloud Run (GCP) pour déploiement simplifié.

---

---

## High Level Architecture

### Technical Summary

Cette application suit une **architecture microservices modulaire containerisée avec Docker**, déployée sur Google Cloud Platform avec Cloud Run (Kubernetes managé) pour la scalabilité et l'évolutivité. Le frontend utilise un framework moderne (React/Vue.js) containerisé et déployé via CDN/Cloud Run, tandis que le backend est organisé en microservices indépendants containerisés (Service Stocks, Service IA/ML avec Chat IA intégré, Service Commandes, Service Factures, Service Analytics) communiquant via APIs RESTful. L'infrastructure ML Python est entièrement containerisée pour garantir la reproductibilité et la maintenance long terme, avec intégration Vertex AI pour les capacités ML avancées et réentraînement quotidien. La plateforme GCP fournit l'authentification (Cloud Identity), le stockage (Cloud Storage pour factures), et l'infrastructure scalable nécessaire. Tous les services utilisent Docker pour assurer la reproductibilité, la portabilité, et faciliter la maintenance long terme. Cette architecture répond aux objectifs du PRD en permettant la scalabilité horizontale, l'isolation multi-tenant, et l'intégration IA/ML complexe tout en maintenant la simplicité pour les utilisateurs PME.

### Platform and Infrastructure Choice

**Platform:** Google Cloud Platform (GCP)

**Key Services:**
- **Cloud Run** - Déploiement containerisé de tous les services (frontend, backend, ML) avec auto-scaling
- **Vertex AI** - Infrastructure ML pour entraînement, déploiement modèles, et réentraînement quotidien
- **Cloud SQL (PostgreSQL)** - Base de données relationnelle principale (stocks, commandes, utilisateurs)
- **BigQuery** - Analytics et données time-series pour historique ventes (alternative à InfluxDB/TimescaleDB)
- **Cloud Storage** - Stockage fichiers (photos factures, exports)
- **Cloud Identity & Access Management** - Authentification et gestion accès
- **Cloud Logging & Monitoring** - Logs centralisés et monitoring performance
- **Cloud Build** - CI/CD pour build images Docker et déploiement
- **Secret Manager** - Gestion secrets (API keys, credentials)

**Deployment Host and Regions:**
- **Région principale:** europe-west1 (Belgium) pour conformité données européennes
- **Régions secondaires:** Pour backup et haute disponibilité (europe-west4, europe-central2)
- **CDN:** Cloud CDN pour frontend (cache global)

**Docker Strategy:**
- Tous les services containerisés (frontend, backend, ML)
- Images Docker versionnées avec tags (git SHA + version semver)
- Docker Compose pour développement local
- Cloud Run pour déploiement production (gestion Kubernetes simplifiée)
- Migration vers GKE (Google Kubernetes Engine) possible si besoins ML complexes

### Repository Structure

**Structure:** Monorepo avec workspaces

**Monorepo Tool:** Turborepo ou Nx (recommandé: Turborepo pour simplicité)

**Package Organization:**
```
bmad-stock-agent/
├── apps/
│   ├── web/                    # Frontend React/Vue.js (Docker)
│   ├── api/                    # Backend API Gateway (Docker)
│   ├── stocks-service/         # Service Stocks microservice (Docker)
│   ├── ml-service/             # Service IA/ML (Docker - Python)
│   ├── orders-service/         # Service Commandes (Docker)
│   ├── invoices-service/       # Service Factures (Docker)
│   └── analytics-service/      # Service Analytics (Docker)
├── packages/
│   ├── shared/                 # Types TypeScript partagés
│   ├── ui/                     # Composants UI partagés
│   └── config/                 # Configurations partagées (ESLint, TypeScript, etc.)
├── infrastructure/
│   └── docker/                 # Dockerfiles pour chaque service
├── docker-compose.yml          # Développement local
└── turbo.json                  # Configuration Turborepo
```

**Rationale Monorepo:**
- Partage code frontend/backend (types, interfaces)
- Dépendances coordonnées (même version React, même version Node.js)
- Déploiements atomiques (frontend + backend versionnés ensemble)
- CI/CD simplifié (un seul repo, build/test coordonnés)

**Rationale Docker:**
- Reproductibilité environnements (dev = staging = prod)
- Isolation dépendances par service
- Portabilité (migration cloud facile)
- Maintenance long terme (standardisation équipe)

### High Level Architecture Diagram

```mermaid
graph TB
    subgraph "Users"
        U1[PME Users]
        U2[Mobile Users]
    end
    
    subgraph "CDN/Edge"
        CDN[Cloud CDN]
    end
    
    subgraph "Frontend Layer"
        FE[Frontend Container<br/>React/Vue.js<br/>Cloud Run]
    end
    
    subgraph "API Gateway"
        API[API Gateway Container<br/>Auth, Routing, Rate Limiting<br/>Cloud Run]
    end
    
    subgraph "Backend Services - Docker Containers"
        SVC_STOCKS[Stocks Service<br/>Node.js/Python<br/>Cloud Run]
        SVC_ML[ML/IA Service<br/>Python + TensorFlow<br/>Cloud Run + Vertex AI]
        SVC_ORDERS[Orders Service<br/>Node.js/Python<br/>Cloud Run]
        SVC_INVOICES[Invoices Service<br/>Node.js/Python<br/>Cloud Run]
        SVC_ANALYTICS[Analytics Service<br/>Node.js/Python<br/>Cloud Run]
    end
    
    subgraph "Data Layer"
        PG[(PostgreSQL<br/>Cloud SQL<br/>Multi-tenant)]
        BQ[(BigQuery<br/>Time-series<br/>Ventes & Analytics)]
        STORAGE[Cloud Storage<br/>Photos Factures<br/>Exports]
    end
    
    subgraph "External Services"
        VERTEX_AI[Vertex AI<br/>ML Training<br/>Model Deployment]
        PAYMENT[Payment Terminals<br/>API Integration]
    end
    
    subgraph "Infrastructure"
        AUTH[Cloud Identity<br/>Authentication]
        LOGS[Cloud Logging<br/>Monitoring]
    end
    
    U1 -->|HTTPS| CDN
    U2 -->|HTTPS| CDN
    CDN --> FE
    FE -->|REST API| API
    API -->|Auth Check| AUTH
    API --> SVC_STOCKS
    API --> SVC_ML
    API --> SVC_ORDERS
    API --> SVC_INVOICES
    API --> SVC_ANALYTICS
    
    SVC_STOCKS --> PG
    SVC_STOCKS --> BQ
    SVC_ORDERS --> PG
    SVC_INVOICES --> PG
    SVC_INVOICES --> STORAGE
    SVC_ANALYTICS --> BQ
    SVC_ANALYTICS --> PG
    
    SVC_ML --> VERTEX_AI
    SVC_ML --> BQ
    SVC_ML --> PG
    SVC_ML -->|Daily Retraining| VERTEX_AI
    
    SVC_STOCKS -->|Fetch Sales Data| PAYMENT
    
    SVC_STOCKS -.->|Message Queue| SVC_ML
    SVC_ORDERS -.->|Message Queue| SVC_ML
    
    API --> LOGS
    SVC_STOCKS --> LOGS
    SVC_ML --> LOGS
    SVC_ORDERS --> LOGS
```

### Architectural Patterns

- **Microservices Architecture:** Services indépendants containerisés (Stocks, ML, Orders, Invoices, Analytics) permettant déploiement et scaling indépendants - _Rationale:_ Scalabilité, isolation des bugs, équipes autonomes, évolutivité future

- **Containerization Pattern (Docker):** Tous les services containerisés avec Docker pour reproductibilité et portabilité - _Rationale:_ Environnements identiques dev/staging/prod, maintenance long terme facilitée, migration cloud simple

- **API Gateway Pattern:** Point d'entrée unique pour toutes les requêtes API avec authentification, routing, rate limiting centralisés - _Rationale:_ Sécurité centralisée, monitoring unifié, gestion CORS simplifiée

- **Repository Pattern:** Abstraction de la couche d'accès aux données permettant tests et flexibilité future - _Rationale:_ Isolation logique métier de persistance, facilité tests unitaires, possibilité changement base de données

- **Event-Driven Architecture:** Message queue pour communication asynchrone (réentraînement ML, notifications) - _Rationale:_ Découplage services, traitement asynchrone, résilience (retry automatique)

- **Multi-Tenancy Pattern:** Isolation données par tenant_id (row-level security PostgreSQL) + isolation runtime par container - _Rationale:_ Sécurité données, scaling par tenant possible, maintenance isolée

- **BFF (Backend for Frontend) Pattern:** API Gateway adapte réponses selon client (web vs mobile si besoin) - _Rationale:_ Optimisation payload, flexibilité frontend, évolution indépendante

- **CQRS Pattern (Léger):** Séparation lecture/écriture pour analytics (BigQuery pour lecture, PostgreSQL pour écriture) - _Rationale:_ Performance analytics, optimisation requêtes, scalabilité lecture

- **Circuit Breaker Pattern:** Protection contre cascading failures entre services - _Rationale:_ Résilience système, dégradation gracieuse, prévention surcharge

- **Strangler Fig Pattern:** Migration progressive vers microservices depuis monolithe si nécessaire - _Rationale:_ Réduction risques migration, développement incrémental

---

## Tech Stack

### Technology Stack Table

| Category | Technology | Version | Purpose | Rationale |
|----------|-----------|---------|---------|-----------|
| Frontend Language | TypeScript | 5.3+ | Langage principal frontend avec typage statique | Type safety pour éviter bugs, meilleur DX, alignement avec stack moderne |
| Frontend Framework | React | 18.2+ | Framework UI avec composants réutilisables | Large écosystème, composants réutilisables, support communautaire fort |
| UI Component Library | shadcn/ui + Tailwind CSS | Latest | Composants UI accessibles et personnalisables | Moderne, accessible WCAG AA, personnalisable, intégration Tailwind |
| State Management | Zustand ou React Query | Latest | Gestion état global et cache serveur | Zustand: simple, léger. React Query: cache API automatique, sync serveur |
| Backend Language | TypeScript (Node.js) | 20.x LTS | Backend services (Stocks, Orders, Invoices, Analytics) | Partage code/types frontend-backend, écosystème Node.js mature |
| ML Language | Python | 3.11+ | Service IA/ML uniquement | Standard industrie ML, bibliothèques (TensorFlow, PyTorch, scikit-learn) |
| Backend Framework | Express.js (Node.js) / FastAPI (ML) | 4.18+ / 0.104+ | Framework API REST pour services backend | Express: léger, flexible. FastAPI: moderne, async, excellent pour ML |
| API Style | REST | OpenAPI 3.0 | Communication entre services et frontend | Standard, simple, bien supporté, documentation OpenAPI |
| Database (Relational) | PostgreSQL | 15+ | Données relationnelles (stocks, commandes, utilisateurs, fournisseurs) | Robustesse, support JSON, multi-tenancy, performances |
| Database (Time-Series) | BigQuery | Latest | Données de ventes historiques et métriques IA time-series | Intégration GCP native, scalabilité automatique, analytics puissant |
| Cache | Redis | 7.2+ | Cache sessions, résultats API, données fréquemment accédées | Performances, TTL automatique, support structures de données |
| File Storage | Google Cloud Storage | Latest | Photos factures, exports CSV, fichiers utilisateurs | Intégration GCP, scalabilité, CDN intégré, gestion versions |
| Authentication | Cloud Identity (GCP) + JWT | Latest | Authentification et autorisation utilisateurs | Gestion OAuth2/OIDC native GCP, JWT pour tokens stateless |
| Frontend Testing | Vitest + React Testing Library | Latest | Tests unitaires et intégration composants React | Rapide, compatible Vite, excellente DX, aligné avec React |
| Backend Testing | Jest + Supertest | Latest | Tests unitaires et intégration APIs Node.js | Standard Node.js, mocks faciles, intégration CI/CD |
| ML Testing | pytest | Latest | Tests unitaires et intégration modèles ML Python | Standard Python ML, fixtures, parametrize pour tests multiples |
| E2E Testing | Playwright | Latest | Tests end-to-end navigateur complet | Cross-browser, moderne, meilleure que Cypress pour stabilité |
| Build Tool | Turborepo | Latest | Build système monorepo avec cache intelligent | Cache incrémental, parallélisation, meilleur que Nx pour simplicité |
| Bundler | Vite (Frontend) | 5.0+ | Build et dev server frontend ultra-rapide | HMR instantané, build optimisé, plugins ecosystem |
| Container | Docker | 24.0+ | Containerisation de tous les services | Standard industrie, portabilité, reproductibilité |
| Orchestration | Cloud Run (GCP) | Latest | Orchestration et déploiement containers | Kubernetes managé, auto-scaling, pay-per-use |
| IaC Tool | Terraform | 1.6+ | Infrastructure as Code pour GCP ressources | Déclaratif, versioning infrastructure, multi-cloud possible |
| CI/CD | GitHub Actions | Latest | Pipeline CI/CD automatisé | Intégration GitHub native, marketplace actions, gratuit pour repos publics |
| Monitoring | Google Cloud Monitoring + Prometheus | Latest | Monitoring métriques et performances | Intégration GCP native, alerting, dashboards Grafana possible |
| Logging | Google Cloud Logging | Latest | Centralisation logs tous services | Intégration GCP, recherche avancée, retention configurable |
| ML Framework | TensorFlow / PyTorch | 2.15+ / 2.1+ | Frameworks deep learning pour modèles IA | TensorFlow: production-ready. PyTorch: recherche. Support des deux |
| ML Infrastructure | Vertex AI (GCP) | Latest | Infrastructure ML: training, deployment, model registry | Gestion complète cycle de vie ML, auto-scaling, versioning modèles |
| ML Tracking | MLflow | Latest | Tracking expériences ML et versioning modèles | Standard industrie, comparaison modèles, reproductibilité |
| Formula Parser | mathjs | Latest | Parser et évaluateur formules personnalisées | Support syntaxe Excel-like, extensible, sécurité (sandbox) |
| OCR/Image Processing | Google Cloud Vision API | Latest | Extraction texte depuis photos factures | Intégration GCP native, précision élevée, support multi-langues |
| Message Queue | Cloud Pub/Sub (GCP) | Latest | Communication asynchrone entre services (réentraînement ML) | Intégration GCP native, scaling automatique, delivery garantie |
| CSS Framework | Tailwind CSS | 3.4+ | Framework CSS utilitaire pour styling rapide | Productivité, consistency, dark mode intégré, purge CSS automatique |

**Notes importantes:**
- **TypeScript partout** (frontend + backend Node.js) pour type safety et partage types
- **Python uniquement pour ML service** pour compatibilité bibliothèques ML
- **BigQuery au lieu d'InfluxDB** pour intégration GCP native et analytics avancés
- **Cloud Run** pour orchestration (Kubernetes managé) avec possibilité migration GKE
- **Turborepo** pour monorepo (simplicité vs Nx)
- **React Query** recommandé pour state management (cache API automatique important pour dashboard)

---

## Data Models

### Tenant (Organization)

**Purpose:**  
Représente une entreprise cliente (PME) avec isolation multi-tenant. Chaque tenant a ses propres données, utilisateurs, et configuration.

**Key Attributes:**
- `id`: string (UUID) - Identifiant unique tenant
- `name`: string - Nom de l'entreprise
- `subscriptionTier`: 'normal' | 'premium' | 'premium_plus' - Niveau d'abonnement
- `subscriptionStartDate`: Date - Date début abonnement
- `subscriptionEndDate`: Date | null - Date fin abonnement (null si actif)
- `subscriptionStatus`: 'active' | 'suspended' | 'cancelled' - Statut abonnement
- `createdAt`: Date - Date création
- `updatedAt`: Date - Date dernière modification
- `settings`: JSON - Configuration spécifique tenant (seuils alertes, préférences)

**TypeScript Interface:**
```typescript
interface Tenant {
  id: string;
  name: string;
  subscriptionTier: 'normal' | 'premium' | 'premium_plus';
  subscriptionStartDate: Date;
  subscriptionEndDate: Date | null;
  subscriptionStatus: 'active' | 'suspended' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
  settings: {
    lowStockThreshold?: number;
    alertPreferences?: Record<string, boolean>;
    defaultCurrency?: string;
  };
}
```

**Relationships:**
- Un Tenant a plusieurs Users (1:N)
- Un Tenant a plusieurs Products (1:N)
- Un Tenant a plusieurs Suppliers (1:N)
- Un Tenant a plusieurs Orders (1:N)
- Un Tenant a plusieurs Sales (1:N)

---

### User

**Purpose:**  
Représente un utilisateur du système avec authentification et permissions. Chaque utilisateur appartient à un tenant.

**Key Attributes:**
- `id`: string (UUID) - Identifiant unique utilisateur
- `tenantId`: string (UUID) - Référence au tenant (multi-tenancy)
- `email`: string - Email (unique par tenant)
- `passwordHash`: string - Hash mot de passe (bcrypt)
- `firstName`: string - Prénom
- `lastName`: string - Nom
- `role`: 'owner' | 'admin' | 'user' - Rôle avec permissions
- `isActive`: boolean - Compte actif ou désactivé
- `lastLoginAt`: Date | null - Dernière connexion
- `createdAt`: Date - Date création
- `updatedAt`: Date - Date dernière modification

**TypeScript Interface:**
```typescript
interface User {
  id: string;
  tenantId: string;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  role: 'owner' | 'admin' | 'user';
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
```

**Relationships:**
- Un User appartient à un Tenant (N:1)
- Un User peut créer plusieurs StockMovements (1:N) - traçabilité

---

### Location

**Purpose:**  
Représente un emplacement physique (entrepôt, magasin) où sont stockés les produits. Support multi-emplacements.

**Key Attributes:**
- `id`: string (UUID) - Identifiant unique emplacement
- `tenantId`: string (UUID) - Référence au tenant
- `name`: string - Nom emplacement (ex: "Entrepôt principal", "Magasin Paris")
- `address`: string | null - Adresse complète
- `isActive`: boolean - Emplacement actif ou désactivé
- `createdAt`: Date - Date création
- `updatedAt`: Date - Date dernière modification

**TypeScript Interface:**
```typescript
interface Location {
  id: string;
  tenantId: string;
  name: string;
  address: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

**Relationships:**
- Un Location appartient à un Tenant (N:1)
- Un Location peut avoir plusieurs Products (1:N via ProductLocation)

---

### Supplier

**Purpose:**  
Représente un fournisseur avec lequel l'entreprise fait des commandes. Nécessaire pour les commandes et factures.

**Key Attributes:**
- `id`: string (UUID) - Identifiant unique fournisseur
- `tenantId`: string (UUID) - Référence au tenant
- `name`: string - Nom fournisseur
- `email`: string | null - Email contact
- `phone`: string | null - Téléphone contact
- `address`: string | null - Adresse complète
- `isActive`: boolean - Fournisseur actif ou désactivé
- `createdAt`: Date - Date création
- `updatedAt`: Date - Date dernière modification

**TypeScript Interface:**
```typescript
interface Supplier {
  id: string;
  tenantId: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

**Relationships:**
- Un Supplier appartient à un Tenant (N:1)
- Un Supplier peut être associé à plusieurs Products (N:M via ProductSupplier)
- Un Supplier peut avoir plusieurs Orders (1:N)

---

### Product

**Purpose:**  
Représente un produit en stock avec toutes ses informations (quantité, emplacement, fournisseur, etc.).

**Key Attributes:**
- `id`: string (UUID) - Identifiant unique produit
- `tenantId`: string (UUID) - Référence au tenant
- `sku`: string - Code SKU unique (par tenant)
- `name`: string - Nom produit
- `description`: string | null - Description détaillée
- `unit`: string - Unité de mesure ('pièce', 'kg', 'litre', etc.)
- `currentQuantity`: number - Quantité actuelle en stock
- `minQuantity`: number - Quantité minimale (seuil alerte)
- `maxQuantity`: number | null - Quantité maximale recommandée
- `purchasePrice`: number | null - Prix d'achat unitaire
- `sellingPrice`: number | null - Prix de vente unitaire
- `supplierId`: string (UUID) | null - Fournisseur principal
- `isActive`: boolean - Produit actif ou désactivé
- `createdAt`: Date - Date création
- `updatedAt`: Date - Date dernière modification

**TypeScript Interface:**
```typescript
interface Product {
  id: string;
  tenantId: string;
  sku: string;
  name: string;
  description: string | null;
  unit: 'pièce' | 'kg' | 'litre' | 'mètre' | string;
  currentQuantity: number;
  minQuantity: number;
  maxQuantity: number | null;
  purchasePrice: number | null;
  sellingPrice: number | null;
  supplierId: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

**Relationships:**
- Un Product appartient à un Tenant (N:1)
- Un Product peut avoir un Supplier principal (N:1)
- Un Product peut être dans plusieurs Locations via ProductLocation (N:M)
- Un Product a plusieurs Sales (1:N)
- Un Product a plusieurs StockMovements (1:N)
- Un Product peut avoir plusieurs Predictions (1:N)

---

### ProductLocation

**Purpose:**  
Table de liaison pour gérer les quantités d'un produit dans plusieurs emplacements (multi-emplacements).

**Key Attributes:**
- `id`: string (UUID) - Identifiant unique
- `productId`: string (UUID) - Référence produit
- `locationId`: string (UUID) - Référence emplacement
- `quantity`: number - Quantité du produit dans cet emplacement
- `updatedAt`: Date - Date dernière modification

**TypeScript Interface:**
```typescript
interface ProductLocation {
  id: string;
  productId: string;
  locationId: string;
  quantity: number;
  updatedAt: Date;
}
```

**Relationships:**
- Appartient à un Product (N:1)
- Appartient à un Location (N:1)

---

### Sale

**Purpose:**  
Représente une vente d'un produit. Données critiques pour alimenter le moteur IA et calculer les tendances.

**Key Attributes:**
- `id`: string (UUID) - Identifiant unique vente
- `tenantId`: string (UUID) - Référence au tenant
- `productId`: string (UUID) - Produit vendu
- `quantity`: number - Quantité vendue
- `unitPrice`: number | null - Prix unitaire de vente
- `totalPrice`: number | null - Prix total (quantity * unitPrice)
- `saleDate`: Date - Date de la vente
- `source`: 'manual' | 'import' | 'payment_terminal' - Source de la donnée
- `createdAt`: Date - Date création enregistrement
- `createdBy`: string (UUID) | null - Utilisateur ayant créé (si manuel)

**TypeScript Interface:**
```typescript
interface Sale {
  id: string;
  tenantId: string;
  productId: string;
  quantity: number;
  unitPrice: number | null;
  totalPrice: number | null;
  saleDate: Date;
  source: 'manual' | 'import' | 'payment_terminal';
  createdAt: Date;
  createdBy: string | null;
}
```

**Relationships:**
- Une Sale appartient à un Tenant (N:1)
- Une Sale concerne un Product (N:1)
- Une Sale peut être créée par un User (N:1)

**Note:** Les Sales sont également stockées dans BigQuery pour analytics time-series et entraînement ML.

---

### Order

**Purpose:**  
Représente une commande auprès d'un fournisseur, qu'elle soit recommandée par l'IA ou créée manuellement.

**Key Attributes:**
- `id`: string (UUID) - Identifiant unique commande
- `tenantId`: string (UUID) - Référence au tenant
- `supplierId`: string (UUID) - Fournisseur
- `status`: 'recommended' | 'pending' | 'approved' | 'placed' | 'received' | 'cancelled' - Statut commande
- `recommendedBy`: 'ai' | 'manual' | null - Source recommandation
- `aiConfidence`: number | null - Niveau confiance IA (0-1) si recommandée par IA
- `aiExplanation`: string | null - Rapport explicatif IA (pourquoi commander)
- `totalAmount`: number - Montant total commande
- `orderDate`: Date - Date commande
- `expectedDeliveryDate`: Date | null - Date livraison attendue
- `receivedDate`: Date | null - Date réception effective
- `createdAt`: Date - Date création
- `createdBy`: string (UUID) | null - Utilisateur ayant créé
- `approvedBy`: string (UUID) | null - Utilisateur ayant approuvé (si mode autorisation)

**TypeScript Interface:**
```typescript
interface Order {
  id: string;
  tenantId: string;
  supplierId: string;
  status: 'recommended' | 'pending' | 'approved' | 'placed' | 'received' | 'cancelled';
  recommendedBy: 'ai' | 'manual' | null;
  aiConfidence: number | null;
  aiExplanation: string | null;
  totalAmount: number;
  orderDate: Date;
  expectedDeliveryDate: Date | null;
  receivedDate: Date | null;
  createdAt: Date;
  createdBy: string | null;
  approvedBy: string | null;
}
```

**Relationships:**
- Un Order appartient à un Tenant (N:1)
- Un Order concerne un Supplier (N:1)
- Un Order a plusieurs OrderItems (1:N)
- Un Order peut être créé/approuvé par un User (N:1)

---

### OrderItem

**Purpose:**  
Représente un produit dans une commande avec quantité et prix.

**Key Attributes:**
- `id`: string (UUID) - Identifiant unique
- `orderId`: string (UUID) - Référence commande
- `productId`: string (UUID) - Produit commandé
- `quantity`: number - Quantité commandée
- `unitPrice`: number - Prix unitaire au moment commande
- `totalPrice`: number - Prix total (quantity * unitPrice)

**TypeScript Interface:**
```typescript
interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}
```

**Relationships:**
- Appartient à un Order (N:1)
- Référence un Product (N:1)

---

### Invoice

**Purpose:**  
Représente une facture fournisseur reçue, avec extraction IA possible (Premium Plus) ou saisie manuelle.

**Key Attributes:**
- `id`: string (UUID) - Identifiant unique facture
- `tenantId`: string (UUID) - Référence au tenant
- `orderId`: string (UUID) | null - Commande associée (si existe)
- `supplierId`: string (UUID) - Fournisseur
- `invoiceNumber`: string | null - Numéro facture (extrait ou saisi)
- `invoiceDate`: Date | null - Date facture
- `totalAmount`: number - Montant total facture
- `status`: 'pending' | 'verified' | 'integrated' | 'error' - Statut traitement
- `extractionMethod`: 'ai' | 'manual' | null - Méthode extraction (IA ou manuelle)
- `aiConfidence`: number | null - Niveau confiance extraction IA (0-1)
- `photoUrl`: string | null - URL photo facture (Cloud Storage)
- `extractedData`: JSON | null - Données extraites par IA (quantités, prix, produits)
- `verificationErrors`: JSON | null - Erreurs détectées vs commande (quantités, prix)
- `integratedAt`: Date | null - Date intégration en BDD
- `createdAt`: Date - Date création
- `createdBy`: string (UUID) | null - Utilisateur ayant uploadé

**TypeScript Interface:**
```typescript
interface Invoice {
  id: string;
  tenantId: string;
  orderId: string | null;
  supplierId: string;
  invoiceNumber: string | null;
  invoiceDate: Date | null;
  totalAmount: number;
  status: 'pending' | 'verified' | 'integrated' | 'error';
  extractionMethod: 'ai' | 'manual' | null;
  aiConfidence: number | null;
  photoUrl: string | null;
  extractedData: {
    items?: Array<{
      productName: string;
      quantity: number;
      unitPrice: number;
    }>;
  } | null;
  verificationErrors: {
    quantityMismatches?: Array<{ productId: string; expected: number; actual: number }>;
    priceMismatches?: Array<{ productId: string; expected: number; actual: number }>;
  } | null;
  integratedAt: Date | null;
  createdAt: Date;
  createdBy: string | null;
}
```

**Relationships:**
- Une Invoice appartient à un Tenant (N:1)
- Une Invoice peut être associée à un Order (N:1)
- Une Invoice concerne un Supplier (N:1)
- Une Invoice a plusieurs InvoiceItems (1:N)

---

### InvoiceItem

**Purpose:**  
Représente un produit dans une facture avec quantité et prix.

**Key Attributes:**
- `id`: string (UUID) - Identifiant unique
- `invoiceId`: string (UUID) - Référence facture
- `productId`: string (UUID) | null - Produit (peut être null si non reconnu)
- `productName`: string - Nom produit (extrait ou saisi)
- `quantity`: number - Quantité facturée
- `unitPrice`: number - Prix unitaire
- `totalPrice`: number - Prix total

**TypeScript Interface:**
```typescript
interface InvoiceItem {
  id: string;
  invoiceId: string;
  productId: string | null;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}
```

**Relationships:**
- Appartient à une Invoice (N:1)
- Peut référencer un Product (N:1, nullable)

---

### StockMovement

**Purpose:**  
Historique de tous les mouvements de stocks (entrées, sorties, ajustements) pour traçabilité complète.

**Key Attributes:**
- `id`: string (UUID) - Identifiant unique mouvement
- `tenantId`: string (UUID) - Référence au tenant
- `productId`: string (UUID) - Produit concerné
- `type`: 'in' | 'out' | 'adjustment' | 'sale' | 'purchase' - Type mouvement
- `quantity`: number - Quantité (positive pour entrée, négative pour sortie)
- `previousQuantity`: number - Quantité avant mouvement
- `newQuantity`: number - Quantité après mouvement
- `reason`: string | null - Raison mouvement (ex: "Réception commande", "Ajustement inventaire")
- `referenceId`: string (UUID) | null - ID référence (Order, Invoice, Sale, etc.)
- `referenceType`: 'order' | 'invoice' | 'sale' | 'manual' | null - Type référence
- `createdAt`: Date - Date mouvement
- `createdBy`: string (UUID) | null - Utilisateur ayant créé

**TypeScript Interface:**
```typescript
interface StockMovement {
  id: string;
  tenantId: string;
  productId: string;
  type: 'in' | 'out' | 'adjustment' | 'sale' | 'purchase';
  quantity: number;
  previousQuantity: number;
  newQuantity: number;
  reason: string | null;
  referenceId: string | null;
  referenceType: 'order' | 'invoice' | 'sale' | 'manual' | null;
  createdAt: Date;
  createdBy: string | null;
}
```

**Relationships:**
- Un StockMovement appartient à un Tenant (N:1)
- Un StockMovement concerne un Product (N:1)
- Un StockMovement peut être créé par un User (N:1)

**Note:** Historique limité selon niveau abonnement (30 jours Normal, 90 jours Premium, illimité Premium Plus).

---

### Prediction

**Purpose:**  
Représente une prédiction IA de rupture de stocks pour un produit, avec niveau de confiance et explication.

**Key Attributes:**
- `id`: string (UUID) - Identifiant unique prédiction
- `tenantId`: string (UUID) - Référence au tenant
- `productId`: string (UUID) - Produit concerné
- `predictedRuptureDate`: Date - Date prédite de rupture
- `confidence`: number - Niveau confiance (0-1)
- `currentStock`: number - Stock actuel au moment prédiction
- `predictedConsumptionRate`: number - Taux consommation prédit (unités/jour)
- `modelVersion`: string - Version modèle IA utilisé
- `explanation`: string | null - Explication prédiction (pourquoi cette date)
- `status`: 'active' | 'resolved' | 'expired' - Statut prédiction
- `actualRuptureDate`: Date | null - Date rupture réelle (pour validation)
- `accuracy`: number | null - Précision calculée (si rupture réelle disponible)
- `createdAt`: Date - Date création prédiction
- `updatedAt`: Date - Date dernière mise à jour

**TypeScript Interface:**
```typescript
interface Prediction {
  id: string;
  tenantId: string;
  productId: string;
  predictedRuptureDate: Date;
  confidence: number;
  currentStock: number;
  predictedConsumptionRate: number;
  modelVersion: string;
  explanation: string | null;
  status: 'active' | 'resolved' | 'expired';
  actualRuptureDate: Date | null;
  accuracy: number | null;
  createdAt: Date;
  updatedAt: Date;
}
```

**Relationships:**
- Une Prediction appartient à un Tenant (N:1)
- Une Prediction concerne un Product (N:1)

**Note:** Accessible uniquement pour niveaux Premium et Premium Plus.

---

### CustomFormula

**Purpose:**  
Représente une formule de calcul personnalisée créée par l'utilisateur (formules prédéfinies ou saisie manuelle).

**Key Attributes:**
- `id`: string (UUID) - Identifiant unique formule
- `tenantId`: string (UUID) - Référence au tenant
- `name`: string - Nom formule (ex: "Stock Sécurité Personnalisé")
- `formula`: string - Formule mathématique (syntaxe mathjs)
- `type`: 'predefined' | 'custom' - Type formule (prédéfinie ou personnalisée)
- `description`: string | null - Description formule
- `variables`: JSON - Variables utilisées dans formule avec descriptions
- `isActive`: boolean - Formule active ou désactivée
- `createdAt`: Date - Date création
- `createdBy`: string (UUID) | null - Utilisateur ayant créé (null si prédéfinie)
- `updatedAt`: Date - Date dernière modification

**TypeScript Interface:**
```typescript
interface CustomFormula {
  id: string;
  tenantId: string;
  name: string;
  formula: string; // Ex: "STOCK_ACTUEL * PRIX_ACHAT * 0.15"
  type: 'predefined' | 'custom';
  description: string | null;
  variables: Record<string, { description: string; type: string }>;
  isActive: boolean;
  createdAt: Date;
  createdBy: string | null;
  updatedAt: Date;
}
```

**Relationships:**
- Une CustomFormula appartient à un Tenant (N:1)
- Une CustomFormula peut être créée par un User (N:1)

---

### MLModel

**Purpose:**  
Représente un modèle ML entraîné pour un tenant, avec versioning et métriques de performance.

**Key Attributes:**
- `id`: string (UUID) - Identifiant unique modèle
- `tenantId`: string (UUID) - Référence au tenant
- `version`: string - Version modèle (semver)
- `modelType`: string - Type modèle (ex: "LSTM", "Prophet", "LinearRegression")
- `status`: 'training' | 'active' | 'deprecated' | 'failed' - Statut modèle
- `accuracy`: number | null - Précision globale (0-1)
- `precision`: number | null - Précision métrique
- `recall`: number | null - Rappel métrique
- `f1Score`: number | null - F1-score
- `trainingDataSize`: number - Nombre échantillons utilisés entraînement
- `trainingDate`: Date - Date entraînement
- `deployedAt`: Date | null - Date déploiement production
- `vertexAiModelId`: string | null - ID modèle dans Vertex AI
- `metadata`: JSON - Métadonnées supplémentaires (hyperparamètres, etc.)

**TypeScript Interface:**
```typescript
interface MLModel {
  id: string;
  tenantId: string;
  version: string;
  modelType: string;
  status: 'training' | 'active' | 'deprecated' | 'failed';
  accuracy: number | null;
  precision: number | null;
  recall: number | null;
  f1Score: number | null;
  trainingDataSize: number;
  trainingDate: Date;
  deployedAt: Date | null;
  vertexAiModelId: string | null;
  metadata: Record<string, any>;
}
```

**Relationships:**
- Un MLModel appartient à un Tenant (N:1)

**Note:** Un seul modèle actif par tenant à la fois, historique des versions conservé.

---

## Components

Cette section définit les composants majeurs du système, leurs responsabilités, interfaces, dépendances et technologies spécifiques. Chaque composant est conçu comme un service indépendant containerisé permettant un déploiement et un scaling indépendants.

### 1. Frontend Application (`apps/web`)

**Responsibility:**  
Application web React qui fournit l'interface utilisateur complète pour la gestion de stocks. Gère l'affichage des données, les interactions utilisateur, le state management côté client, et la communication avec les APIs backend.

**Key Interfaces:**
- **Routes:** `/`, `/dashboard`, `/products`, `/products/:id`, `/orders`, `/orders/recommendations`, `/invoices`, `/predictions`, `/settings`, `/subscription`
- **API Client:** Service layer abstrait pour toutes les communications API (via `packages/shared`)
- **State Management:** React Query pour cache API + Zustand pour état global UI
- **Authentication:** JWT token management, refresh logic, protected routes

**Dependencies:**
- API Gateway (toutes les requêtes passent par l'API Gateway)
- Shared types package (`packages/shared`) pour types TypeScript partagés
- UI components package (`packages/ui`) pour composants réutilisables

**Technology Stack:**
- **Framework:** React 18.2+ avec TypeScript 5.3+
- **Build Tool:** Vite 5.0+
- **State Management:** React Query (TanStack Query) + Zustand
- **UI Library:** shadcn/ui + Tailwind CSS 3.4+
- **Routing:** React Router v6+
- **HTTP Client:** Axios ou fetch avec interceptors
- **Testing:** Vitest + React Testing Library
- **Container:** Docker avec nginx pour production

**Key Features:**
- Dashboard temps réel avec métriques clés
- Liste produits avec filtres et recherche
- Visualisation prédictions IA avec graphiques
- Gestion commandes avec workflow d'approbation
- Upload et traitement factures (Premium Plus)
- Formules personnalisées avec éditeur
- Responsive design mobile-first

**Deployment:**
- Containerisé avec Docker
- Déployé sur Cloud Run (GCP) ou CDN
- Build statique optimisé avec code splitting
- Environment variables pour configuration API endpoints

---

### 2. API Gateway (`apps/api`)

**Responsibility:**  
Point d'entrée unique pour toutes les requêtes API. Gère l'authentification, le routing vers les microservices appropriés, le rate limiting par tenant, la validation des requêtes, et la gestion CORS.

**Key Interfaces:**
- **Public Routes:** `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`
- **Protected Routes:** Toutes les routes `/api/v1/*` nécessitent JWT valide
- **Service Routing:** Route vers services backend selon le path (`/products` → Stocks Service, `/orders` → Orders Service, etc.)
- **Health Check:** `GET /health` pour monitoring

**Dependencies:**
- Cloud Identity (GCP) pour validation tokens JWT
- Tous les microservices backend (routing)
- Redis pour cache sessions et rate limiting
- Cloud Logging pour logs centralisés

**Technology Stack:**
- **Runtime:** Node.js 20.x LTS avec TypeScript
- **Framework:** Express.js 4.18+
- **Authentication:** JWT verification avec `jsonwebtoken`
- **Rate Limiting:** `express-rate-limit` avec Redis backend
- **Validation:** Zod pour validation schémas
- **CORS:** `cors` middleware configuré
- **Container:** Docker

**Key Features:**
- JWT authentication middleware
- Rate limiting par tenant (100/200/500 req/min selon tier)
- Request validation avant routing
- Error handling centralisé avec format standardisé
- Request ID tracking pour debugging
- CORS configuration pour frontend
- Health check endpoints

**Deployment:**
- Containerisé avec Docker
- Déployé sur Cloud Run avec auto-scaling
- Load balancer devant pour haute disponibilité

---

### 3. Stocks Service (`apps/stocks-service`)

**Responsibility:**  
Gère toutes les opérations liées aux produits et stocks : CRUD produits, gestion quantités, mouvements de stocks, multi-emplacements, alertes stock faible, et synchronisation avec données de ventes.

**Key Interfaces:**
- `GET /api/v1/products` - Liste produits avec filtres et pagination
- `GET /api/v1/products/:id` - Détails produit avec historique
- `POST /api/v1/products` - Créer produit
- `PUT /api/v1/products/:id` - Mettre à jour produit
- `DELETE /api/v1/products/:id` - Soft delete produit
- `POST /api/v1/products/import` - Import CSV produits
- `GET /api/v1/products/:id/history` - Historique mouvements stock
- `POST /api/v1/stock-movements` - Créer mouvement stock (entrée/sortie/ajustement)

**Dependencies:**
- PostgreSQL (Cloud SQL) pour données produits et stocks
- BigQuery pour historique ventes (lecture)
- ML Service pour prédictions (appel asynchrone)
- Cloud Storage pour fichiers import CSV
- Redis pour cache produits fréquemment accédés

**Technology Stack:**
- **Runtime:** Node.js 20.x LTS avec TypeScript
- **Framework:** Express.js 4.18+
- **Database:** PostgreSQL via Prisma ORM ou TypeORM
- **Cache:** Redis pour cache produits
- **Validation:** Zod pour validation schémas
- **Testing:** Jest + Supertest
- **Container:** Docker

**Key Features:**
- CRUD complet produits avec multi-emplacements
- Calcul automatique statut stock (ok/low/critical)
- Traçabilité complète mouvements (StockMovements)
- Import CSV avec validation et mapping
- Alertes automatiques stock faible
- Synchronisation avec Sales Service pour mise à jour quantités
- Support multi-tenant avec row-level security

**Deployment:**
- Containerisé avec Docker
- Déployé sur Cloud Run avec auto-scaling
- Connection pooling PostgreSQL (PgBouncer)

---

### 4. ML/IA Service (`apps/ml-service`)

**Responsibility:**  
Service Python dédié à l'intelligence artificielle : entraînement modèles ML, prédictions de rupture de stocks, réentraînement quotidien, et gestion du cycle de vie des modèles via Vertex AI.

**Key Interfaces:**
- `GET /api/v1/predictions` - Obtenir prédictions pour tous produits
- `GET /api/v1/predictions/:product_id` - Prédiction détaillée pour un produit
- `POST /api/v1/predictions/retrain` - Déclencher réentraînement manuel (admin)
- `GET /api/v1/predictions/metrics` - Métriques performance modèles
- `POST /api/v1/orders/recommendations` - Générer recommandations commandes IA

**Dependencies:**
- Vertex AI (GCP) pour entraînement et déploiement modèles
- BigQuery pour données historiques ventes (lecture)
- PostgreSQL pour métadonnées modèles et prédictions
- Cloud Pub/Sub pour déclenchement réentraînement quotidien
- MLflow pour tracking expériences ML

**Technology Stack:**
- **Language:** Python 3.11+
- **Framework:** FastAPI 0.104+ (API REST)
- **ML Frameworks:** TensorFlow 2.15+ et/ou PyTorch 2.1+
- **ML Infrastructure:** Vertex AI (GCP) pour training et deployment
- **Data Processing:** pandas, numpy pour preprocessing
- **Time Series:** Prophet ou LSTM pour prédictions temporelles
- **ML Tracking:** MLflow pour versioning modèles
- **Testing:** pytest
- **Container:** Docker avec image Python optimisée

**Key Features:**
- Prédictions rupture stocks avec niveau confiance
- Réentraînement quotidien automatique sur nouvelles données
- Support cold start avec modèles pré-entraînés
- Recommandations commandes avec explications détaillées
- Métriques performance (accuracy, precision, recall, F1)
- Versioning modèles avec rollback possible
- Explications prédictions (feature importance, tendances)

**Deployment:**
- Containerisé avec Docker (image Python + TensorFlow/PyTorch)
- Déployé sur Cloud Run avec ressources CPU/GPU selon besoin
- Job réentraînement quotidien via Cloud Scheduler + Cloud Pub/Sub
- Modèles déployés sur Vertex AI pour scalabilité

---

### 4.1. Chat IA Service (Intégré dans ML/IA Service)

**Responsibility:**  
Le chat IA conversationnel est intégré dans le ML/IA Service pour permettre l'accès conversationnel aux informations sur les stocks, avec mémoire contextuelle et capacité de générer des recommandations de commande directement depuis la conversation.

**Architecture Decision:**  
Le chat IA est **intégré dans le ML/IA Service** plutôt que comme service séparé car :
- Partage la même infrastructure ML (modèles de langage, embeddings)
- Nécessite accès direct aux prédictions IA et recommandations
- Réduit la latence en évitant appels inter-services multiples
- Simplifie la gestion de la mémoire contextuelle avec les données ML

**Key Interfaces:**
- `POST /api/v1/chat/message` - Envoyer message utilisateur et recevoir réponse IA
- `GET /api/v1/chat/history` - Récupérer historique conversation
- `POST /api/v1/chat/generate-order` - Générer recommandation commande depuis conversation (Epic 6)
- `WebSocket /api/v1/chat/stream` - Stream réponses en temps réel (optionnel pour MVP)

**Dependencies:**
- PostgreSQL pour stockage historique conversations et mémoire contextuelle
- ML/IA Service (même service) pour accès prédictions et recommandations
- Stocks Service pour informations produits et stocks
- Orders Service pour génération commandes depuis chat (Epic 6)

**Technology Stack:**
- **Language:** Python 3.11+ (même service que ML/IA)
- **Framework:** FastAPI 0.104+ (API REST + WebSocket optionnel)
- **LLM Integration:** 
  - Option 1: Vertex AI Gemini API (GCP) pour génération conversationnelle
  - Option 2: OpenAI GPT-4 API pour MVP, migration vers modèle custom plus tard
- **Embeddings:** Vertex AI Embeddings API pour recherche sémantique produits
- **Memory:** PostgreSQL table `chat_conversations` et `chat_messages` pour historique
- **Context Management:** Redis pour cache contexte conversation actif (TTL 1h)

**Key Features:**
- Interface conversationnelle avec mémoire contextuelle (références conversation précédentes)
- Accès rapide aux informations stocks via questions naturelles
- Génération recommandations commande depuis conversation (Epic 6 Story 6.5)
- Historique conversations sauvegardé par utilisateur/tenant
- Support multi-plateformes (desktop, tablette, mobile)
- Communication temps réel via WebSocket (optionnel MVP) ou REST polling

**Data Storage:**
- **PostgreSQL Tables:**
  - `chat_conversations` (id, tenant_id, user_id, created_at, updated_at)
  - `chat_messages` (id, conversation_id, role, content, metadata, created_at)
  - `chat_context` (conversation_id, context_data JSONB, expires_at) - pour mémoire contextuelle
- **Redis Cache:** Contexte conversation actif pour performance (clé: `chat:ctx:{conversation_id}`)

**Communication Pattern:**
- **Synchronous:** Frontend → API Gateway → ML/IA Service (chat endpoint) → Réponse immédiate
- **Asynchronous:** Chat peut déclencher génération commande → Orders Service (via message queue ou REST)

**Deployment:**
- Intégré dans le même container Docker que ML/IA Service
- Partage les mêmes ressources Cloud Run
- WebSocket support via Cloud Run (si implémenté) ou REST polling pour MVP

---

### 5. Orders Service (`apps/orders-service`)

**Responsibility:**  
Gère le cycle de vie complet des commandes : création commandes (manuelles ou recommandées par IA), workflow d'approbation, envoi aux fournisseurs, réception, et intégration avec stocks.

**Key Interfaces:**
- `GET /api/v1/orders` - Liste commandes avec filtres
- `GET /api/v1/orders/:id` - Détails commande
- `POST /api/v1/orders` - Créer commande
- `POST /api/v1/orders/:id/approve` - Approuver commande
- `POST /api/v1/orders/:id/send` - Envoyer commande au fournisseur
- `POST /api/v1/orders/:id/receive` - Marquer commande comme reçue
- `GET /api/v1/orders/recommendations` - Recommandations IA (appelle ML Service)

**Dependencies:**
- PostgreSQL pour données commandes
- ML Service pour recommandations IA
- Stocks Service pour mise à jour stocks après réception
- Invoices Service pour vérification factures
- Cloud Pub/Sub pour notifications asynchrones

**Technology Stack:**
- **Runtime:** Node.js 20.x LTS avec TypeScript
- **Framework:** Express.js 4.18+
- **Database:** PostgreSQL via Prisma ORM
- **Validation:** Zod pour validation schémas
- **Testing:** Jest + Supertest
- **Container:** Docker

**Key Features:**
- Création commandes manuelles ou depuis recommandations IA
- Workflow d'approbation configurable (auto ou manuel)
- Génération numéros commande uniques
- Calcul montants totaux automatique
- Intégration stocks après réception
- Historique statuts commandes
- Notifications événements (création, approbation, réception)

**Deployment:**
- Containerisé avec Docker
- Déployé sur Cloud Run
- Intégration avec ML Service pour recommandations

---

### 6. Invoices Service (`apps/invoices-service`)

**Responsibility:**  
Gère le traitement des factures fournisseurs : upload photos, extraction OCR via Cloud Vision API, vérification contre commandes, et intégration données dans système. Disponible uniquement pour Premium Plus.

**Key Interfaces:**
- `POST /api/v1/invoices/upload` - Upload photo facture
- `POST /api/v1/invoices/:id/extract` - Déclencher extraction OCR
- `GET /api/v1/invoices/:id` - Obtenir facture avec données extraites
- `POST /api/v1/invoices/:id/verify` - Vérifier facture contre commande
- `POST /api/v1/invoices/:id/integrate` - Intégrer données dans stocks
- `POST /api/v1/invoices/:id/manual-entry` - Saisie manuelle si OCR échoue

**Dependencies:**
- Cloud Storage pour stockage photos factures
- Cloud Vision API (GCP) pour extraction OCR
- PostgreSQL pour données factures
- Orders Service pour vérification contre commandes
- Stocks Service pour intégration données

**Technology Stack:**
- **Runtime:** Node.js 20.x LTS avec TypeScript
- **Framework:** Express.js 4.18+
- **OCR:** Google Cloud Vision API
- **Storage:** Cloud Storage pour photos
- **Database:** PostgreSQL via Prisma ORM
- **File Upload:** `multer` pour gestion uploads
- **Testing:** Jest + Supertest
- **Container:** Docker

**Key Features:**
- Upload photos factures (JPEG, PNG, PDF)
- Extraction automatique texte et données structurées (OCR)
- Matching produits extraits avec produits existants
- Vérification quantités et prix vs commande
- Détection écarts avec alertes
- Saisie manuelle fallback si OCR échoue
- Intégration automatique dans stocks après vérification
- Score confiance extraction affiché

**Deployment:**
- Containerisé avec Docker
- Déployé sur Cloud Run
- Accès Cloud Storage et Cloud Vision API configuré

---

### 7. Analytics Service (`apps/analytics-service`)

**Responsibility:**  
Gère les analytics et statistiques : agrégation données ventes, calculs métriques dashboard, génération rapports, et préparation données pour ML. Utilise BigQuery pour requêtes analytiques performantes.

**Key Interfaces:**
- `GET /api/v1/dashboard/summary` - Résumé dashboard (ventes hier, stock actuel, alertes)
- `GET /api/v1/analytics/sales` - Statistiques ventes avec filtres
- `GET /api/v1/analytics/products` - Analytics par produit
- `GET /api/v1/analytics/trends` - Tendances temporelles
- `POST /api/v1/analytics/export` - Export données CSV/Excel

**Dependencies:**
- BigQuery pour données analytiques time-series
- PostgreSQL pour métadonnées et données récentes
- Cloud Storage pour exports fichiers
- Sales Service pour données ventes (lecture)

**Technology Stack:**
- **Runtime:** Node.js 20.x LTS avec TypeScript
- **Framework:** Express.js 4.18+
- **Analytics Database:** BigQuery (GCP) pour requêtes analytiques
- **Relational Database:** PostgreSQL pour métadonnées
- **Data Processing:** BigQuery SQL pour agrégations
- **Export:** CSV/Excel generation avec `xlsx` ou `csv-writer`
- **Testing:** Jest + Supertest
- **Container:** Docker

**Key Features:**
- Agrégation données ventes pour dashboard
- Calcul métriques clés (ventes hier, tendances, stock valeur)
- Requêtes analytiques performantes sur BigQuery
- Génération rapports avec filtres personnalisables
- Export données CSV/Excel
- Préparation données pour ML Service
- Cache résultats requêtes fréquentes (Redis)

**Deployment:**
- Containerisé avec Docker
- Déployé sur Cloud Run
- Accès BigQuery configuré avec credentials appropriés

---

### 8. Authentication Service (Intégré dans API Gateway)

**Responsibility:**  
Gère l'authentification et autorisation : inscription utilisateurs, login, refresh tokens, gestion sessions, et permissions basées sur rôles. Intégré dans l'API Gateway pour centralisation.

**Key Interfaces:**
- `POST /auth/register` - Inscription nouveau tenant + utilisateur
- `POST /auth/login` - Authentification et obtention tokens
- `POST /auth/refresh` - Rafraîchir access token
- `POST /auth/logout` - Invalider refresh token
- `POST /auth/forgot-password` - Demande reset mot de passe
- `POST /auth/reset-password` - Reset mot de passe avec token

**Dependencies:**
- PostgreSQL pour utilisateurs et tenants
- Cloud Identity (GCP) pour gestion OAuth2/OIDC (optionnel)
- Redis pour cache sessions et tokens
- Cloud Storage pour avatars utilisateurs (optionnel)

**Technology Stack:**
- **Runtime:** Node.js 20.x LTS avec TypeScript
- **Framework:** Express.js 4.18+ (intégré dans API Gateway)
- **Authentication:** JWT avec `jsonwebtoken`
- **Password Hashing:** bcrypt pour hash mots de passe
- **Database:** PostgreSQL via Prisma ORM
- **Session Management:** Redis pour refresh tokens
- **Testing:** Jest + Supertest
- **Container:** Docker (intégré dans API Gateway container)

**Key Features:**
- Inscription avec création tenant automatique
- JWT access tokens (15 min expiration)
- Refresh tokens (7 jours expiration)
- Hash mots de passe avec bcrypt
- Gestion rôles (owner, admin, user)
- Reset mot de passe avec tokens sécurisés
- Multi-tenant isolation automatique

**Deployment:**
- Intégré dans API Gateway container
- Déployé sur Cloud Run avec API Gateway

---

### Component Interaction Diagram

```mermaid
graph TB
    subgraph "Client Layer"
        WEB[Frontend Application<br/>React + TypeScript]
    end
    
    subgraph "API Layer"
        GATEWAY[API Gateway<br/>Auth, Routing, Rate Limiting]
    end
    
    subgraph "Backend Services"
        STOCKS[Stocks Service<br/>Products & Inventory]
        ML[ML/IA Service<br/>Python + TensorFlow]
        ORDERS[Orders Service<br/>Order Management]
        INVOICES[Invoices Service<br/>Invoice Processing]
        ANALYTICS[Analytics Service<br/>Statistics & Reports]
    end
    
    subgraph "Data Layer"
        PG[(PostgreSQL<br/>Cloud SQL)]
        BQ[(BigQuery<br/>Time-Series)]
        REDIS[(Redis<br/>Cache)]
        STORAGE[Cloud Storage<br/>Files]
    end
    
    subgraph "External Services"
        VERTEX[Vertex AI<br/>ML Training]
        VISION[Cloud Vision API<br/>OCR]
    end
    
    WEB -->|HTTPS| GATEWAY
    GATEWAY -->|JWT Auth| STOCKS
    GATEWAY -->|JWT Auth| ML
    GATEWAY -->|JWT Auth| ORDERS
    GATEWAY -->|JWT Auth| INVOICES
    GATEWAY -->|JWT Auth| ANALYTICS
    
    STOCKS --> PG
    STOCKS --> BQ
    STOCKS --> REDIS
    STOCKS -->|Read Sales| ANALYTICS
    
    ML --> VERTEX
    ML --> BQ
    ML --> PG
    ML -->|Predictions| STOCKS
    
    ORDERS --> PG
    ORDERS -->|Recommendations| ML
    ORDERS -->|Update Stock| STOCKS
    
    INVOICES --> STORAGE
    INVOICES --> VISION
    INVOICES --> PG
    INVOICES -->|Verify| ORDERS
    INVOICES -->|Integrate| STOCKS
    
    ANALYTICS --> BQ
    ANALYTICS --> PG
    ANALYTICS --> STORAGE
```

---

### Component Communication Patterns

**Synchronous Communication:**
- Frontend → API Gateway → Backend Services : REST API calls avec JWT
- Services inter-services : REST API calls internes (service-to-service) avec service accounts

**Asynchronous Communication:**
- Réentraînement ML quotidien : Cloud Pub/Sub trigger → ML Service
- Notifications événements : Cloud Pub/Sub → Services concernés
- Intégration factures : Invoices Service → Pub/Sub → Stocks Service (mise à jour asynchrone)

**Data Flow Patterns:**
- **Write Path:** API Gateway → Service → PostgreSQL (immédiat) + BigQuery (async pour analytics)
- **Read Path:** Service → PostgreSQL (données récentes) ou BigQuery (analytics/historique)
- **Cache Pattern:** Redis pour cache produits fréquemment accédés (TTL 5 min)

---

## External APIs

Cette section documente toutes les intégrations avec des services externes nécessaires au fonctionnement du système. Chaque intégration est documentée avec ses endpoints, méthodes d'authentification, limites de taux, et considérations de sécurité.

### 1. Google Cloud Vertex AI

**Purpose:**  
Infrastructure ML complète pour l'entraînement, le déploiement, et la gestion du cycle de vie des modèles de prédiction de rupture de stocks. Utilisé par le ML Service pour toutes les opérations ML.

**Documentation:**  
https://cloud.google.com/vertex-ai/docs

**Base URL(s):**
- **Training API:** `https://{region}-aiplatform.googleapis.com/v1`
- **Prediction API:** `https://{region}-aiplatform.googleapis.com/v1`
- **Model Registry:** `https://{region}-aiplatform.googleapis.com/v1`

**Region:** `europe-west1` (Belgium) pour conformité données européennes

**Authentication:**  
Service Account avec credentials JSON stockés dans Secret Manager (GCP). Le ML Service utilise Application Default Credentials (ADC) pour authentification automatique.

**Key Endpoints Used:**

- **`POST /projects/{project}/locations/{location}/trainingPipelines`** - Créer pipeline d'entraînement
  - Utilisé pour: Réentraînement quotidien automatique des modèles
  - Payload: Configuration pipeline (dataset, modèle type, hyperparamètres)
  - Response: `training_pipeline` avec `name` pour tracking

- **`GET /projects/{project}/locations/{location}/trainingPipelines/{pipeline_id}`** - Statut entraînement
  - Utilisé pour: Vérifier progression réentraînement quotidien
  - Response: `state` (PIPELINE_STATE_RUNNING, SUCCEEDED, FAILED)

- **`POST /projects/{project}/locations/{location}/models/{model}/versions`** - Créer version modèle
  - Utilisé pour: Versioning modèles après entraînement réussi
  - Payload: Artifact URI, framework (TensorFlow/PyTorch), labels

- **`POST /projects/{project}/locations/{location}/endpoints/{endpoint}/predict`** - Prédictions
  - Utilisé pour: Obtenir prédictions rupture stocks en production
  - Payload: Instances (données produits: stock actuel, historique ventes, features)
  - Response: Prédictions avec dates rupture, confiance, explications

- **`GET /projects/{project}/locations/{location}/models/{model}/evaluations`** - Métriques modèles
  - Utilisé pour: Obtenir accuracy, precision, recall, F1-score pour dashboard

**Rate Limits:**
- **Training:** 10 requêtes/minute par projet (gestion via queue Cloud Pub/Sub)
- **Prediction:** 1000 requêtes/minute par endpoint (auto-scaling Vertex AI)
- **Model Registry:** 100 requêtes/minute

**Integration Notes:**
- **Modèle Type:** Time-series forecasting (LSTM ou Prophet) pour prédictions rupture
- **Cold Start:** Modèles pré-entraînés déployés pour nouveaux tenants sans historique
- **Réentraînement:** Job quotidien via Cloud Scheduler → Cloud Pub/Sub → ML Service → Vertex AI
- **Coûts:** Facturation par heure GPU/CPU utilisée pour training + requêtes prédiction
- **Monitoring:** Métriques Vertex AI intégrées dans Cloud Monitoring
- **Fallback:** En cas d'indisponibilité Vertex AI, utiliser modèles locaux déployés dans ML Service container

**Error Handling:**
- Retry avec exponential backoff pour erreurs temporaires (5xx)
- Circuit breaker pour éviter surcharge si Vertex AI down
- Fallback vers modèles locaux si Vertex AI indisponible > 30 secondes

---

### 2. Google Cloud Vision API

**Purpose:**  
Extraction automatique de texte et données structurées depuis photos de factures fournisseurs. Utilisé par le Invoices Service pour OCR des factures (feature Premium Plus).

**Documentation:**  
https://cloud.google.com/vision/docs

**Base URL(s):**
- **OCR API:** `https://vision.googleapis.com/v1`
- **Batch Processing:** `https://vision.googleapis.com/v1/files:asyncBatchAnnotate`

**Authentication:**  
Service Account avec credentials JSON stockés dans Secret Manager. Le Invoices Service utilise Application Default Credentials (ADC).

**Key Endpoints Used:**

- **`POST /images:annotate`** - Extraction texte depuis image
  - Utilisé pour: OCR factures uploadées (JPEG, PNG, PDF)
  - Payload: Image base64 ou Cloud Storage URI
  - Features: `TEXT_DETECTION` (texte libre) + `DOCUMENT_TEXT_DETECTION` (structure document)
  - Response: Texte extrait avec bounding boxes et confiance scores

- **`POST /files:asyncBatchAnnotate`** - Traitement batch fichiers volumineux
  - Utilisé pour: Factures PDF multi-pages ou fichiers > 20MB
  - Response: `operation` name pour polling statut

- **`GET /operations/{operation_name}`** - Statut traitement batch
  - Utilisé pour: Vérifier progression OCR batch

**Rate Limits:**
- **Free Tier:** 1000 requêtes/mois gratuites
- **Paid Tier:** 1800 requêtes/minute par projet
- **File Size:** Max 20MB par requête (utiliser batch pour fichiers plus gros)

**Integration Notes:**
- **Format Support:** JPEG, PNG, GIF, BMP, WEBP, PDF, TIFF
- **Languages:** Support multi-langues (FR, EN, ES, DE, etc.) détection automatique
- **Confidence Threshold:** Minimum 0.85 pour accepter extraction (sinon demander nouvelle photo)
- **Data Extraction:** Parser custom pour extraire numéro facture, date, montant, lignes produits depuis texte brut
- **Matching Produits:** Fuzzy matching noms produits extraits avec produits existants (SKU, nom)
- **Coûts:** $1.50 par 1000 images (premières 1000 gratuites/mois)
- **Fallback:** Si OCR échoue (confiance < 0.85), permettre saisie manuelle

**Error Handling:**
- Retry avec exponential backoff pour erreurs temporaires
- Validation format image avant envoi (taille, format)
- Timeout 30 secondes pour requêtes OCR
- Logging détaillé pour debugging extraction échouées

---

### 3. Payment Terminals APIs

**Purpose:**  
Intégration avec terminaux de paiement pour capture automatique des données de ventes. Permet synchronisation automatique des ventes sans saisie manuelle (feature Premium Plus).

**Documentation:**  
Documentation spécifique selon terminal choisi (à déterminer selon besoins clients)

**Base URL(s):**
- **À déterminer** selon terminal choisi (exemples: Square, Stripe Terminal, SumUp, etc.)
- **Format attendu:** REST API avec endpoints ventes/historique

**Authentication:**  
OAuth2 ou API Key selon terminal. Credentials stockés dans Secret Manager par tenant (chaque PME peut avoir terminal différent).

**Key Endpoints Used (Exemple - Square API):**

- **`GET /v2/locations/{location_id}/transactions`** - Historique transactions
  - Utilisé pour: Synchroniser ventes depuis terminal
  - Query Params: `begin_time`, `end_time`, `sort_order`
  - Response: Liste transactions avec produits vendus, quantités, prix

- **`GET /v2/locations/{location_id}/items`** - Catalogue produits terminal
  - Utilisé pour: Mapping produits terminal → produits FlowStock (SKU matching)

**Rate Limits:**
- **Variable** selon terminal choisi (typiquement 100-500 requêtes/minute)
- **Gestion:** Rate limiting côté application avec retry queue

**Integration Notes:**
- **Scope MVP:** Support terminaux principaux (Square, Stripe Terminal, SumUp) - extensible
- **Synchronisation:** Job quotidien ou manuel via bouton "Sync Sales" dans UI
- **Mapping Produits:** Configuration manuelle initiale pour mapper produits terminal → produits FlowStock
- **Déduplication:** Vérifier transactions déjà importées (ID transaction unique)
- **Format Données:** Normaliser données différentes terminaux vers format FlowStock standard
- **Période Sync:** Par défaut sync 24h dernières, option pour période personnalisée
- **Erreurs:** Logging détaillé si sync échoue, permettre sync manuelle CSV fallback

**Supported Terminals (MVP):**
- **Square:** API Square Connect (https://developer.squareup.com/docs)
- **Stripe Terminal:** Stripe API (https://stripe.com/docs/terminal)
- **SumUp:** SumUp API (https://developer.sumup.com/docs)

**Future Terminals (V2):**
- Extensible via plugin system pour ajouter nouveaux terminaux

**Error Handling:**
- Retry avec exponential backoff pour erreurs temporaires
- Validation données avant import (quantités positives, dates valides)
- Alertes si sync échoue 3 jours consécutifs
- Fallback CSV manual si API terminal indisponible

---

### 4. Google Cloud Pub/Sub

**Purpose:**  
Message queue pour communication asynchrone entre services. Utilisé pour réentraînement ML quotidien, notifications événements, et découplage services.

**Documentation:**  
https://cloud.google.com/pubsub/docs

**Base URL(s):**
- **REST API:** `https://pubsub.googleapis.com/v1`
- **Client Libraries:** Node.js (`@google-cloud/pubsub`) et Python (`google-cloud-pubsub`)

**Authentication:**  
Service Account avec permissions Pub/Sub. Application Default Credentials (ADC).

**Topics Used:**

- **`ml-retraining-trigger`** - Déclenchement réentraînement ML
  - Publisher: Cloud Scheduler (job quotidien 2h du matin)
  - Subscriber: ML Service
  - Message: `{ tenant_id, force: boolean }`
  - Delivery: At-least-once delivery garantie

- **`order-events`** - Événements commandes
  - Publisher: Orders Service
  - Subscribers: ML Service (pour mise à jour modèles), Analytics Service (pour stats)
  - Message: `{ event_type: 'created'|'approved'|'received', order_id, tenant_id }`
  - Usage: Notifications asynchrones, découplage services

- **`invoice-processed`** - Factures traitées
  - Publisher: Invoices Service
  - Subscribers: Orders Service (vérification), Stocks Service (mise à jour stock)
  - Message: `{ invoice_id, tenant_id, status: 'extracted'|'verified'|'integrated' }`

- **`stock-alerts`** - Alertes stock faible
  - Publisher: Stocks Service
  - Subscribers: Analytics Service (dashboard), Notifications Service (emails - V2)
  - Message: `{ product_id, tenant_id, alert_type: 'low'|'critical', current_quantity }`

**Rate Limits:**
- **Publishing:** 10,000 messages/seconde par topic
- **Subscribing:** Auto-scaling selon charge
- **Message Size:** Max 10MB par message

**Integration Notes:**
- **Delivery Guarantee:** At-least-once (gérer idempotence côté subscribers)
- **Acknowledgment:** Messages doivent être ack dans 600 secondes (10 min)
- **Dead Letter Queue:** Messages non ack après 3 tentatives → dead letter topic pour debugging
- **Monitoring:** Métriques Pub/Sub (messages publiés, messages non ack) dans Cloud Monitoring
- **Coûts:** $40 par million messages (premiers 10GB/mois gratuits)

**Error Handling:**
- Retry automatique Pub/Sub pour messages non ack
- Dead letter queue pour messages en échec répétés
- Circuit breaker si topic indisponible (fallback synchrone)

---

### 5. Google Cloud Storage

**Purpose:**  
Stockage fichiers utilisateurs : photos factures, exports CSV, fichiers import. Utilisé par Invoices Service et Stocks Service.

**Documentation:**  
https://cloud.google.com/storage/docs

**Base URL(s):**
- **REST API:** `https://storage.googleapis.com/storage/v1`
- **Client Libraries:** Node.js (`@google-cloud/storage`) et Python (`google-cloud-storage`)

**Authentication:**  
Service Account avec permissions Cloud Storage. Application Default Credentials (ADC).

**Buckets Used:**

- **`flowstock-invoices-{env}`** - Photos factures
  - Structure: `{tenant_id}/invoices/{invoice_id}/{filename}`
  - Lifecycle: Suppression automatique après 7 ans (compliance)
  - Access: Private (accès via signed URLs)

- **`flowstock-exports-{env}`** - Exports CSV/Excel
  - Structure: `{tenant_id}/exports/{export_id}/{filename}`
  - Lifecycle: Suppression automatique après 30 jours
  - Access: Private (accès via signed URLs temporaires)

- **`flowstock-imports-{env}`** - Fichiers import temporaires
  - Structure: `{tenant_id}/imports/{upload_id}/{filename}`
  - Lifecycle: Suppression automatique après 24h
  - Access: Private

**Key Operations:**

- **`POST /b/{bucket}/o`** - Upload fichier
  - Utilisé pour: Upload photos factures, fichiers import CSV
  - Method: Multipart upload ou resumable upload pour gros fichiers

- **`GET /b/{bucket}/o/{object}`** - Download fichier
  - Utilisé pour: Téléchargement exports, affichage photos factures
  - Access: Signed URLs (expiration 1h pour photos, 24h pour exports)

- **`DELETE /b/{bucket}/o/{object}`** - Supprimer fichier
  - Utilisé pour: Nettoyage fichiers temporaires, suppression factures

**Rate Limits:**
- **Operations:** 5,000 requêtes/seconde par bucket
- **Upload Size:** Max 5TB par objet (utiliser resumable upload pour > 5MB)

**Integration Notes:**
- **Multi-Tenant Isolation:** Préfixe `{tenant_id}` dans path pour isolation
- **Signed URLs:** Génération URLs signées pour accès sécurisé fichiers
- **CDN:** Cloud CDN activé pour photos factures (cache 24h)
- **Versioning:** Activé pour factures (rollback possible)
- **Encryption:** Encryption at rest activée (GCP managed keys)
- **Coûts:** $0.020/GB stockage standard, $0.12/GB transfert sortant (premiers 1GB/mois gratuits)

**Error Handling:**
- Retry avec exponential backoff pour erreurs temporaires
- Validation taille fichier avant upload (max 50MB pour factures)
- Validation format fichier (JPEG, PNG, PDF pour factures)
- Cleanup automatique fichiers temporaires non utilisés

---

### 6. Google Cloud Identity & Access Management (IAM)

**Purpose:**  
Gestion authentification et autorisation utilisateurs. Utilisé par API Gateway pour validation JWT tokens et gestion OAuth2/OIDC (optionnel pour SSO enterprise).

**Documentation:**  
https://cloud.google.com/iam/docs

**Base URL(s):**
- **Identity Platform API:** `https://identitytoolkit.googleapis.com/v1`
- **OAuth2/OIDC:** Endpoints standards OAuth2

**Authentication:**  
Service Account avec permissions IAM. Application Default Credentials (ADC).

**Key Features Used:**

- **JWT Token Validation:** Validation tokens JWT émis par notre système
- **OAuth2/OIDC (V2):** SSO avec Google Workspace, Microsoft Azure AD (feature enterprise)
- **Multi-Factor Authentication (V2):** Support MFA pour sécurité renforcée

**Integration Notes:**
- **MVP:** Authentification custom avec JWT (pas d'OAuth2 externe)
- **V2:** Intégration OAuth2/OIDC pour SSO enterprise clients
- **Token Validation:** Middleware API Gateway valide JWT avec secret stocké Secret Manager
- **Session Management:** Refresh tokens stockés Redis avec expiration 7 jours
- **Permissions:** Rôles basiques (owner, admin, user) gérés en BDD, pas via IAM

**Error Handling:**
- Validation JWT avec expiration check
- Refresh token automatique si access token expiré
- Fallback vers authentification custom si IAM indisponible

---

### Integration Summary Table

| Service | Purpose | Used By | Auth Method | Rate Limits | Cost Model |
|---------|---------|---------|-------------|-------------|------------|
| **Vertex AI** | ML Training & Predictions | ML Service | Service Account | 1000 req/min (prediction) | Pay-per-use (GPU/CPU hours) |
| **Cloud Vision API** | OCR Factures | Invoices Service | Service Account | 1800 req/min | $1.50/1000 images |
| **Payment Terminals** | Sync Ventes | Stocks Service | OAuth2/API Key | Variable (100-500/min) | Variable selon terminal |
| **Cloud Pub/Sub** | Message Queue | Tous services | Service Account | 10K msg/sec | $40/million messages |
| **Cloud Storage** | File Storage | Invoices, Stocks Services | Service Account | 5K ops/sec | $0.020/GB storage |
| **Cloud IAM** | Authentication | API Gateway | Service Account | N/A | Included in GCP |

---

### Security Considerations

**Credentials Management:**
- Tous les credentials (API keys, service accounts) stockés dans Secret Manager (GCP)
- Rotation automatique credentials tous les 90 jours
- Accès secrets via Application Default Credentials (ADC) - pas de credentials hardcodés

**Network Security:**
- Toutes les communications HTTPS/TLS
- VPC (Virtual Private Cloud) pour isolation réseau services backend
- Firewall rules pour limiter accès services externes

**Rate Limiting:**
- Rate limiting côté application pour toutes les APIs externes
- Circuit breakers pour éviter cascading failures
- Retry avec exponential backoff pour résilience

**Monitoring:**
- Logging toutes les requêtes APIs externes (Cloud Logging)
- Alertes si taux erreur > 5% pour APIs externes
- Métriques latence et disponibilité dans Cloud Monitoring

---

## Core Workflows

Cette section décrit les workflows critiques du système via des diagrammes de séquence Mermaid. Ils servent de référence pour l’implémentation par les agents IA et pour la validation de bout en bout.

### 1. Workflow Prédiction IA Quotidienne

```mermaid
sequenceDiagram
    autonumber
    participant CS as Cloud Scheduler
    participant PS as Pub/Sub (ml-retraining-trigger)
    participant MLS as ML Service
    participant BQ as BigQuery
    participant VA as Vertex AI
    participant PG as PostgreSQL

    CS->>PS: Publish message réentraînement quotidien\n{ tenant_id, force }
    PS-->>MLS: Deliver message (subscription)
    MLS->>BQ: Fetch historique ventes (time-series)
    MLS->>PG: Fetch métadonnées produits/tenants
    MLS->>VA: Créer TrainingPipeline (trainingPipelines.create)
    VA-->>MLS: Pipeline en cours (PIPELINE_STATE_RUNNING)
    VA-->>MLS: Pipeline terminé (SUCCEEDED) + Model ID
    MLS->>VA: Créer nouvelle version modèle + déploiement endpoint
    VA-->>MLS: Endpoint prêt (prediction endpoint URL)
    MLS->>VA: Appels batch /predict pour chaque produit actif
    VA-->>MLS: Prédictions rupture + confiance
    MLS->>PG: Upsert records `predictions` par produit
    MLS->>PG: Upsert record `ml_models` (version, métriques)
    MLS-->>MLS: Calcul métriques globales (accuracy, F1, etc.)
```

**Notes:**
- Le réentraînement est déclenché quotidiennement par Cloud Scheduler via Pub/Sub.
- Les prédictions sont stockées dans PostgreSQL et exposées via l’API Predictions.
- BigQuery reste la source de vérité pour les historiques long terme.

---

### 2. Workflow Création & Validation Commande IA

```mermaid
sequenceDiagram
    autonumber
    participant U as User (PME)
    participant FE as Frontend
    participant API as API Gateway
    participant ORD as Orders Service
    participant MLS as ML Service
    participant STK as Stocks Service
    participant PG as PostgreSQL

    U->>FE: Ouvre écran "Recommandations commandes"
    FE->>API: GET /orders/recommendations\n(Authorization: Bearer JWT)
    API->>MLS: GET /predictions + règles commande
    MLS->>PG: Lire `predictions`, `products`, `suppliers`
    MLS-->>API: Liste recommandations (produit, qty, urgence, explication)
    API-->>FE: Payload recommandations IA
    FE-->>U: Affiche recommandations + explications

    U->>FE: Sélectionne recommandations + clique "Créer commande"
    FE->>API: POST /orders\n(body: recommandations sélectionnées)
    API->>ORD: Créer commande en statut `draft`
    ORD->>PG: INSERT `orders` + `order_items`
    ORD-->>API: Commande créée (id, order_number, status=draft)
    API-->>FE: Détails commande
    FE-->>U: Affiche commande + bouton "Approuver"

    U->>FE: Clique "Approuver commande"
    FE->>API: POST /orders/:id/approve
    API->>ORD: Approve order (status -> approved)
    ORD->>PG: UPDATE `orders.status = 'approved'`
    ORD-->>API: Commande approuvée
    API-->>FE: Statut mis à jour
```

**Variantes:**
- Mode auto-approbation (Premium Plus) : après certaines conditions (confiance IA, historique), l’étape manuelle d’approbation peut être sautée.

---

### 3. Workflow Réception Commande & Mise à Jour Stocks

```mermaid
sequenceDiagram
    autonumber
    participant U as User
    participant FE as Frontend
    participant API as API Gateway
    participant ORD as Orders Service
    participant STK as Stocks Service
    participant PG as PostgreSQL
    participant PS as Pub/Sub (order-events)

    U->>FE: Ouvre commande et clique "Marquer comme reçue"
    FE->>API: POST /orders/:id/receive\n(body: items_received, dates)
    API->>ORD: Receive order
    ORD->>PG: UPDATE `orders` (status=received,\nactual_delivery_date)
    ORD->>STK: HTTP call /stock-movements\npour chaque item reçu
    STK->>PG: INSERT `stock_movements` + UPDATE `products.currentQuantity`
    STK-->>ORD: Confirmation mise à jour stock
    ORD->>PS: Publish message `order-events`\n{ event_type: 'received', order_id }
    PS-->>STK: (optionnel) event pour recalcul alertes
    PS-->>MLS: Event pour rafraîchir features ML
    ORD-->>API: Commande reçue + stock mis à jour
    API-->>FE: Réponse succès
    FE-->>U: Confirme réception + nouvelle quantité stock
```

**Points clés:**
- La mise à jour stock est atomique par produit via `stock_movements`.
- L’événement Pub/Sub permet au ML Service d’intégrer rapidement les nouvelles données de stock.

---

### 4. Workflow Facture Photo → OCR → Intégration

```mermaid
sequenceDiagram
    autonumber
    participant U as User
    participant FE as Frontend
    participant API as API Gateway
    participant INV as Invoices Service
    participant CS as Cloud Storage
    participant CV as Cloud Vision API
    participant ORD as Orders Service
    participant STK as Stocks Service
    participant PG as PostgreSQL
    participant PS as Pub/Sub (invoice-processed)

    U->>FE: Upload photo facture (mobile/web)
    FE->>API: POST /invoices/upload (multipart)
    API->>INV: Forward upload
    INV->>CS: Upload fichier dans bucket invoices
    CS-->>INV: URL stockage (gs://...)
    INV->>PG: INSERT `invoices` (status='uploaded', photo_url)
    INV-->>API: Invoice créée + id
    API-->>FE: Réponse succès (status=uploaded)

    INV->>CV: POST /images:annotate\n(TEXT_DETECTION + DOCUMENT_TEXT_DETECTION)
    CV-->>INV: Texte + structure + confidence
    INV-->>INV: Parsing custom\n(numéro facture, date, lignes produits, montants)
    INV->>ORD: Récupérer commande associée (si order_id connu)
    ORD-->>INV: Détails commande (produits, quantités, prix)
    INV-->>INV: Comparaison facture vs commande\n(détection écarts)
    INV->>PG: UPDATE `invoices`\n(status='verified' ou 'error', extractedData, verificationErrors)
    INV->>PS: Publish `invoice-processed`\n{ invoice_id, status }

    alt Vérification OK et utilisateur confirme intégration
        U->>FE: Clique "Intégrer facture"
        FE->>API: POST /invoices/:id/integrate
        API->>INV: Intégrer facture
        INV->>STK: Créer `stock_movements` pour chaque ligne
        STK->>PG: INSERT `stock_movements` + UPDATE quantités
        INV->>PG: UPDATE `invoices.status = 'integrated'`
        INV-->>API: Intégration terminée
        API-->>FE: Réponse succès
    else OCR insuffisant
        INV-->>FE: Status 'error' + message\n(demander nouvelle photo ou saisie manuelle)
    end
```

**Comportement attendu:**
- Si `aiConfidence < 0.85`, l’UI doit proposer soit une nouvelle photo, soit la saisie manuelle.
- Toutes les intégrations créent des `stock_movements` traçables.

---

### 5. Workflow Sync Ventes depuis Terminal de Paiement

```mermaid
sequenceDiagram
    autonumber
    participant U as User
    participant FE as Frontend
    participant API as API Gateway
    participant STK as Stocks Service
    participant PT as Payment Terminal API
    participant PG as PostgreSQL
    participant PS as Pub/Sub (sales-sync)

    U->>FE: Clique "Synchroniser ventes terminal"
    FE->>API: POST /sales/sync\n(body: terminal_id, date range)
    API->>STK: Forward /sales/sync
    STK->>PT: Appel API terminal\n(GET transactions sur période)
    PT-->>STK: Liste transactions brutes
    STK-->>STK: Normalisation format\n+ mapping produits terminal → produits FlowStock
    STK-->>STK: Déduplication transactions\n(basée sur transaction_id)
    STK->>PG: INSERT `sales` + `stock_movements` associés
    STK->>PS: Publish events `sales-sync`\n(par ex. pour analytics/ML)
    STK-->>API: Résumé sync\n{ synced, duplicates_skipped }
    API-->>FE: Résultat sync affiché
    FE-->>U: Affiche nombre ventes importées + erreurs
```

**Objectifs:**
- Permettre à l’IA d’avoir des données de ventes riches sans saisie manuelle.
- Garantir que les stocks sont mis à jour de manière cohérente avec les ventes réelles.

---

## API Specification

L’API complète du système FlowStock est définie en détail dans le document séparé `docs/api-specifications.md`. Ce document d’architecture s’appuie sur cette spécification comme source de vérité pour tous les endpoints.

### Vue d’ensemble

- **Style d’API:** RESTful, JSON, versionnée (`/api/v1`).
- **Auth:** JWT Bearer pour tous les endpoints hors `/auth/*`.
- **Standardisation:** Format de réponse uniforme (`success`, `data`, `error`, `meta`), pagination standard, codes d’erreurs normalisés.
- **Multi‑tenancy:** Contexte tenant implicite via JWT + RLS PostgreSQL.

### Groupes d’APIs principaux

- **Auth Service (`/auth`)**
  - Inscription, login, refresh, logout, reset password.
  - Retourne user, tenant, subscription et tokens.

- **Products & Stocks (`/products`, `/stock-movements`)**
  - CRUD produits, import CSV, historique de mouvements, filtres (low stock, supplier, location).

- **Sales (`/sales`)**
  - Saisie manuelle, import CSV, sync terminaux de paiement.

- **Predictions (`/predictions`)**
  - Liste prédictions, détails par produit, métriques modèles, déclenchement réentraînement manuel.

- **Orders (`/orders`)**
  - CRUD commandes, recommandations IA, workflow d’approbation, réception.

- **Invoices (`/invoices`)**
  - Upload photo, extraction OCR, vérification vs commande, intégration dans stocks, saisie manuelle fallback.

- **Analytics & Dashboard (`/dashboard`, `/analytics/*`)**
  - Données agrégées pour dashboard et vues analytiques.

- **Subscriptions (`/subscriptions`)**
  - Lecture abonnement courant, upgrade/downgrade.

Pour les détails complets (schémas de requêtes/réponses, exemples, codes erreurs), se référer à `docs/api-specifications.md`. Toute évolution d’API doit commencer par une mise à jour de ce document, puis un alignement de cette architecture.

---

## Database Schema

Le schéma de base de données PostgreSQL complet est décrit dans `docs/database-schema.md`. Cette section résume les décisions structurantes et les patterns importants pour l’architecture.

### Multi‑Tenancy

- **Stratégie:** Row‑Level Security (RLS) sur une base unique par environnement.
- **Colonne `tenant_id`:** Présente sur toutes les tables métier (sauf `tenants`).
- **Règles RLS:** Politiques PostgreSQL appliquées sur `tenant_id` + variable de session `app.current_tenant`.
- **Avantages:** Simplicité opérationnelle pour le MVP, isolation forte des données, coûts maîtrisés.

### Tables clés

- **`tenants`**
  - Représente chaque entreprise cliente (PME).
  - Contient `company_name`, `slug`, `settings`, `is_active`.

- **`subscriptions`**
  - Gère les tiers d’abonnement (`normal`, `premium`, `premium_plus`) et leur statut.
  - Contrainte: une seule subscription active par tenant.

- **`users`**
  - Utilisateurs avec rôles (`owner`, `admin`, `user`), email unique par tenant, hash de mot de passe.

- **`products`, `locations`, `suppliers`**
  - Modélisent le catalogue, les emplacements physiques et les fournisseurs.
  - Liens N:N via tables de liaison (ex: `product_locations`).

- **`sales`**
  - Historique ventes (source: manuel, import, terminal paiement).
  - Aussi répliquées (ou agrégées) dans BigQuery pour analytics/ML.

- **`orders`, `order_items`**
  - Cycle de vie commandes (statuts: `recommended`, `pending`, `approved`, `placed`, `received`, `cancelled`).

- **`invoices`, `invoice_items`**
  - Factures fournisseurs, données extraites par IA, liens vers commandes, statut de traitement.

- **`stock_movements`**
  - Table d’historique centralisée de tous les mouvements de stock (in/out/adjustment/sale/purchase).
  - Permet la traçabilité complète et la reconstruction de `currentQuantity`.

- **Tables ML (`predictions`, `ml_models`)**
  - Stockent les prédictions par produit, la version de modèle utilisée et les métriques de performance.

### Patterns structurants

- **Soft delete:** Colonnes `is_active` pour la plupart des entités (tenants, users, products, suppliers, locations).
- **Audit & traçabilité:** Colonnes `created_at`, `updated_at`, parfois `created_by` et `approved_by`.
- **Indexes:** Index ciblés sur colonnes de filtrage fréquentes (tenant_id, status, dates, foreign keys).
- **Extensions:** Utilisation de TimescaleDB/partitionnement temporel pour les données de ventes (si nécessaire) afin de supporter la croissance.

Pour les DDL SQL complets, contraintes précises et indexes détaillés, se référer à `docs/database-schema.md`. Toute évolution des modèles conceptuels dans cette architecture doit être répercutée dans ce document et dans les migrations SQL.

---

## Frontend Architecture

Cette section définit l'architecture détaillée du frontend React, incluant l'organisation des composants, la gestion d'état, le routing, les services API, et les patterns de développement. Cette architecture est conçue pour être claire et implémentable par des agents IA.

### 1. Component Architecture

#### 1.1 Philosophy & Patterns

**Approche:** Architecture basée sur composants React avec séparation claire des responsabilités. Inspiration Atomic Design pour hiérarchie composants, mais adaptée aux besoins spécifiques de l'application.

**Principes:**
- **Composants réutilisables:** Maximum de réutilisabilité via composants UI de base (shadcn/ui)
- **Composants métier:** Composants spécifiques métier (ProductCard, OrderStatusBadge) dans domaines séparés
- **Séparation présentation/logique:** Hooks custom pour logique métier, composants pour présentation
- **Type Safety:** TypeScript strict partout, types partagés depuis `packages/shared`
- **Accessibilité:** WCAG AA minimum, composants shadcn/ui accessibles par défaut

#### 1.2 Component Organization

**Structure de répertoires:**

```
apps/web/
├── src/
│   ├── components/              # Composants UI réutilisables
│   │   ├── ui/                  # Composants shadcn/ui (Button, Card, Input, etc.)
│   │   ├── layout/               # Layout components (Header, Sidebar, Footer)
│   │   ├── forms/               # Form components réutilisables
│   │   └── feedback/            # Toast, Alert, Loading, ErrorBoundary
│   │
│   ├── features/                # Features organisées par domaine métier
│   │   ├── auth/
│   │   │   ├── components/      # LoginForm, RegisterForm
│   │   │   ├── hooks/           # useAuth, useLogin
│   │   │   └── services/        # authService
│   │   ├── products/
│   │   │   ├── components/      # ProductCard, ProductList, ProductForm
│   │   │   ├── hooks/           # useProducts, useProduct
│   │   │   └── services/        # productsService
│   │   ├── orders/
│   │   │   ├── components/      # OrderCard, OrderRecommendations, OrderForm
│   │   │   ├── hooks/           # useOrders, useOrderRecommendations
│   │   │   └── services/        # ordersService
│   │   ├── predictions/
│   │   │   ├── components/       # PredictionCard, PredictionChart
│   │   │   ├── hooks/           # usePredictions
│   │   │   └── services/        # predictionsService
│   │   ├── invoices/
│   │   │   ├── components/       # InvoiceUpload, InvoiceVerification
│   │   │   ├── hooks/           # useInvoices
│   │   │   └── services/        # invoicesService
│   │   └── dashboard/
│   │       ├── components/       # DashboardSummary, SalesChart, AlertsList
│   │       ├── hooks/           # useDashboard
│   │       └── services/         # dashboardService
│   │
│   ├── pages/                    # Pages/Views (routes)
│   │   ├── DashboardPage.tsx
│   │   ├── ProductsPage.tsx
│   │   ├── OrdersPage.tsx
│   │   ├── PredictionsPage.tsx
│   │   ├── InvoicesPage.tsx
│   │   └── SettingsPage.tsx
│   │
│   ├── hooks/                    # Hooks globaux réutilisables
│   │   ├── useAuth.ts           # Authentification globale
│   │   ├── useApi.ts             # Hook générique pour appels API
│   │   └── useToast.ts           # Notifications toast
│   │
│   ├── services/                 # Services API (couche abstraction)
│   │   ├── api/
│   │   │   ├── client.ts         # Configuration axios/fetch
│   │   │   ├── interceptors.ts  # Intercepteurs (auth, errors)
│   │   │   └── types.ts          # Types API responses
│   │   └── [feature]Service.ts  # Services par feature (voir Frontend Services)
│   │
│   ├── stores/                   # State management (Zustand stores)
│   │   ├── authStore.ts          # État authentification
│   │   ├── uiStore.ts            # État UI (sidebar open, theme, etc.)
│   │   └── subscriptionStore.ts # État abonnement tenant
│   │
│   ├── lib/                      # Utilitaires et helpers
│   │   ├── utils.ts              # Fonctions utilitaires
│   │   ├── constants.ts          # Constantes application
│   │   └── validations.ts        # Schémas validation (Zod)
│   │
│   ├── types/                    # Types TypeScript locaux (si pas dans shared)
│   │   └── index.ts
│   │
│   ├── styles/                   # Styles globaux
│   │   ├── globals.css           # Styles Tailwind globaux
│   │   └── themes.css            # Variables thème (dark mode)
│   │
│   ├── App.tsx                    # Composant racine avec providers
│   ├── main.tsx                  # Point d'entrée
│   └── router.tsx                # Configuration routing
│
├── public/                       # Assets statiques
├── tests/                        # Tests E2E (Playwright)
└── package.json
```

**Conventions de nommage:**
- **Composants:** PascalCase (`ProductCard.tsx`, `OrderForm.tsx`)
- **Hooks:** camelCase avec préfixe `use` (`useProducts.ts`, `useAuth.ts`)
- **Services:** camelCase avec suffixe `Service` (`productsService.ts`, `authService.ts`)
- **Stores:** camelCase avec suffixe `Store` (`authStore.ts`, `uiStore.ts`)
- **Utils:** camelCase (`formatDate.ts`, `validateEmail.ts`)

#### 1.3 Component Template

**Template standard pour composants:**

```typescript
// components/products/ProductCard.tsx
import { Product } from '@flowstock/shared/types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useProduct } from '@/features/products/hooks/useProduct';

interface ProductCardProps {
  product: Product;
  onSelect?: (product: Product) => void;
  showActions?: boolean;
}

export function ProductCard({ 
  product, 
  onSelect, 
  showActions = true 
}: ProductCardProps) {
  const { updateProduct, isLoading } = useProduct(product.id);

  const handleClick = () => {
    onSelect?.(product);
  };

  return (
    <Card 
      className="hover:shadow-md transition-shadow cursor-pointer"
      onClick={handleClick}
      role="button"
      tabIndex={0}
      aria-label={`Product ${product.name}`}
    >
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{product.name}</span>
          <Badge variant={product.stockStatus === 'low' ? 'destructive' : 'default'}>
            {product.stockStatus}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            SKU: {product.sku}
          </p>
          <p className="font-semibold">
            Stock: {product.currentQuantity} {product.unit}
          </p>
          {product.prediction && (
            <p className="text-xs text-muted-foreground">
              Rupture prévue: {formatDate(product.prediction.predictedRuptureDate)}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
```

**Patterns composants:**
- **Props interface explicite:** Toujours typer les props avec interface
- **Composition:** Préférer composition à props drilling
- **Accessibilité:** Attributs ARIA appropriés, keyboard navigation
- **Performance:** `React.memo` pour composants lourds, `useMemo`/`useCallback` si nécessaire
- **Error boundaries:** Composants critiques wrappés dans ErrorBoundary

---

### 2. State Management Architecture

#### 2.1 Strategy: React Query + Zustand

**Répartition des responsabilités:**

- **React Query (TanStack Query):** Gestion état serveur (cache API, synchronisation, refetching)
- **Zustand:** État UI local et état global client (auth, UI preferences, subscription)

**Rationale:**
- React Query gère automatiquement cache, refetching, optimistic updates pour données serveur
- Zustand simple et léger pour état UI qui ne nécessite pas synchronisation serveur
- Séparation claire: données serveur vs état client

#### 2.2 React Query Setup

**Configuration:**

```typescript
// lib/react-query.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export function ReactQueryProvider({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
```

**Usage dans hooks:**

```typescript
// features/products/hooks/useProducts.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productsService } from '../services/productsService';
import { Product } from '@flowstock/shared/types';

export function useProducts(filters?: ProductFilters) {
  return useQuery({
    queryKey: ['products', filters],
    queryFn: () => productsService.getAll(filters),
  });
}

export function useProduct(productId: string) {
  return useQuery({
    queryKey: ['products', productId],
    queryFn: () => productsService.getById(productId),
    enabled: !!productId,
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: productsService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}
```

#### 2.3 Zustand Stores

**Auth Store:**

```typescript
// stores/authStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, Tenant } from '@flowstock/shared/types';

interface AuthState {
  user: User | null;
  tenant: Tenant | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, tenant: Tenant, tokens: { access: string; refresh: string }) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      tenant: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      setAuth: (user, tenant, tokens) => set({
        user,
        tenant,
        accessToken: tokens.access,
        refreshToken: tokens.refresh,
        isAuthenticated: true,
      }),
      clearAuth: () => set({
        user: null,
        tenant: null,
        accessToken: null,
        refreshToken: null,
        isAuthenticated: false,
      }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
        tenant: state.tenant,
      }),
    }
  )
);
```

**UI Store:**

```typescript
// stores/uiStore.ts
import { create } from 'zustand';

interface UIState {
  sidebarOpen: boolean;
  theme: 'light' | 'dark' | 'system';
  toggleSidebar: () => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  theme: 'system',
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setTheme: (theme) => set({ theme }),
}));
```

#### 2.4 State Management Patterns

- **Données serveur:** Toujours via React Query (queries/mutations)
- **État UI local:** useState pour état composant isolé
- **État UI global:** Zustand pour sidebar, theme, modals
- **État auth:** Zustand avec persistence localStorage
- **Optimistic updates:** React Query `onMutate` pour updates optimistes
- **Cache invalidation:** `invalidateQueries` après mutations réussies

---

### 3. Routing Architecture

#### 3.1 Routing Strategy

**Library:** React Router v6+ avec route protection et lazy loading.

**Structure routes:**

```typescript
// router.tsx
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Layout } from '@/components/layout/Layout';

// Lazy loading pages
const DashboardPage = lazy(() => import('@/pages/DashboardPage'));
const ProductsPage = lazy(() => import('@/pages/ProductsPage'));
const OrdersPage = lazy(() => import('@/pages/OrdersPage'));
const PredictionsPage = lazy(() => import('@/pages/PredictionsPage'));
const InvoicesPage = lazy(() => import('@/pages/InvoicesPage'));
const SettingsPage = lazy(() => import('@/pages/SettingsPage'));
const LoginPage = lazy(() => import('@/pages/LoginPage'));
const RegisterPage = lazy(() => import('@/pages/RegisterPage'));

export const router = createBrowserRouter([
  {
    path: '/auth',
    children: [
      { path: 'login', element: <LoginPage /> },
      { path: 'register', element: <RegisterPage /> },
    ],
  },
  {
    path: '/',
    element: <ProtectedRoute><Layout /></ProtectedRoute>,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard', element: <DashboardPage /> },
      { path: 'products', element: <ProductsPage /> },
      { path: 'products/:id', element: <ProductDetailPage /> },
      { path: 'orders', element: <OrdersPage /> },
      { path: 'orders/recommendations', element: <OrderRecommendationsPage /> },
      { path: 'orders/:id', element: <OrderDetailPage /> },
      { path: 'predictions', element: <PredictionsPage /> },
      { path: 'invoices', element: <InvoicesPage /> },
      { path: 'invoices/:id', element: <InvoiceDetailPage /> },
      { path: 'settings', element: <SettingsPage /> },
    ],
  },
]);
```

#### 3.2 Protected Routes

**Pattern protection routes:**

```typescript
// components/auth/ProtectedRoute.tsx
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useSubscriptionStore } from '@/stores/subscriptionStore';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredTier?: 'premium' | 'premium_plus';
}

export function ProtectedRoute({ children, requiredTier }: ProtectedRouteProps) {
  const { isAuthenticated } = useAuthStore();
  const { subscription } = useSubscriptionStore();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  if (requiredTier && subscription?.tier !== requiredTier && subscription?.tier !== 'premium_plus') {
    return <Navigate to="/settings/subscription" replace />;
  }

  return <>{children}</>;
}
```

**Routes avec restrictions tier:**

```typescript
// Exemple: route predictions nécessite Premium+
{ 
  path: 'predictions', 
  element: (
    <ProtectedRoute requiredTier="premium">
      <PredictionsPage />
    </ProtectedRoute>
  ) 
},
```

#### 3.3 Route Definitions Table

| Route | Path | Component | Auth Required | Tier Required | Description |
|-------|------|-----------|---------------|---------------|-------------|
| Login | `/auth/login` | LoginPage | No | - | Page connexion |
| Register | `/auth/register` | RegisterPage | No | - | Page inscription |
| Dashboard | `/dashboard` | DashboardPage | Yes | - | Vue d'ensemble |
| Products List | `/products` | ProductsPage | Yes | - | Liste produits |
| Product Detail | `/products/:id` | ProductDetailPage | Yes | - | Détails produit |
| Orders List | `/orders` | OrdersPage | Yes | - | Liste commandes |
| Order Recommendations | `/orders/recommendations` | OrderRecommendationsPage | Yes | Premium+ | Recommandations IA |
| Order Detail | `/orders/:id` | OrderDetailPage | Yes | - | Détails commande |
| Predictions | `/predictions` | PredictionsPage | Yes | Premium+ | Prédictions IA |
| Invoices | `/invoices` | InvoicesPage | Yes | Premium+ | Factures |
| Invoice Detail | `/invoices/:id` | InvoiceDetailPage | Yes | Premium+ | Détails facture |
| Settings | `/settings` | SettingsPage | Yes | - | Paramètres |

---

### 4. Frontend Services Layer

#### 4.1 API Client Setup

**Configuration axios:**

```typescript
// services/api/client.ts
import axios from 'axios';
import { useAuthStore } from '@/stores/authStore';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: ajouter JWT token
apiClient.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().accessToken;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: gérer refresh token, erreurs
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Si 401 et pas déjà retry, essayer refresh token
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const refreshToken = useAuthStore.getState().refreshToken;
        const response = await axios.post('/auth/refresh', { refresh_token: refreshToken });
        const { access_token } = response.data.data;
        
        useAuthStore.getState().setAuth(
          useAuthStore.getState().user!,
          useAuthStore.getState().tenant!,
          { access: access_token, refresh: refreshToken }
        );
        
        originalRequest.headers.Authorization = `Bearer ${access_token}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        useAuthStore.getState().clearAuth();
        window.location.href = '/auth/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
```

#### 4.2 Service Examples

**Products Service:**

```typescript
// services/productsService.ts
import apiClient from './api/client';
import { Product, ProductFilters, CreateProductDto, UpdateProductDto } from '@flowstock/shared/types';

export const productsService = {
  getAll: async (filters?: ProductFilters): Promise<Product[]> => {
    const response = await apiClient.get('/products', { params: filters });
    return response.data.data;
  },

  getById: async (id: string): Promise<Product> => {
    const response = await apiClient.get(`/products/${id}`);
    return response.data.data;
  },

  create: async (data: CreateProductDto): Promise<Product> => {
    const response = await apiClient.post('/products', data);
    return response.data.data;
  },

  update: async (id: string, data: UpdateProductDto): Promise<Product> => {
    const response = await apiClient.put(`/products/${id}`, data);
    return response.data.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/products/${id}`);
  },

  import: async (file: File): Promise<{ imported: number; failed: number }> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post('/products/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data.data;
  },
};
```

**Pattern service standard:**
- Fonctions async retournant types TypeScript
- Utilisation `apiClient` configuré
- Extraction `response.data.data` (format standard API)
- Types depuis `@flowstock/shared/types`

---

### 5. Styling Architecture

#### 5.1 Tailwind CSS + shadcn/ui

**Configuration Tailwind:**

```typescript
// tailwind.config.js
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // shadcn/ui colors
        border: 'hsl(var(--border))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        // ... autres couleurs shadcn
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
```

**Usage composants shadcn/ui:**

```typescript
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

// Composants accessibles et stylés automatiquement
```

#### 5.2 Dark Mode

**Support via CSS variables et Zustand:**

```typescript
// stores/uiStore.ts (déjà vu plus haut)
// Application theme via useEffect dans App.tsx
useEffect(() => {
  const root = window.document.documentElement;
  root.classList.remove('light', 'dark');
  if (theme === 'system') {
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    root.classList.add(systemTheme);
  } else {
    root.classList.add(theme);
  }
}, [theme]);
```

---

### 6. Performance Optimization

#### 6.1 Code Splitting

- **Lazy loading routes:** Toutes les pages chargées via `lazy()` et `Suspense`
- **Dynamic imports:** Composants lourds importés dynamiquement si nécessaire

#### 6.2 Image Optimization

- **Format:** WebP avec fallback JPEG/PNG
- **Lazy loading:** Attribut `loading="lazy"` sur images
- **CDN:** Cloud CDN pour assets statiques

#### 6.3 Re-render Optimization

- **React.memo:** Composants listes (ProductCard, OrderCard)
- **useMemo/useCallback:** Calculs coûteux et callbacks stables
- **React Query:** Cache automatique évite re-renders inutiles

#### 6.4 Bundle Size

- **Tree shaking:** Import nommés uniquement
- **Purge CSS:** Tailwind purge classes non utilisées
- **Analyse:** `vite-bundle-visualizer` pour identifier gros chunks

---

### 7. Testing Strategy (Frontend)

**Unit Tests (Vitest + React Testing Library):**

```typescript
// components/products/__tests__/ProductCard.test.tsx
import { render, screen } from '@testing-library/react';
import { ProductCard } from '../ProductCard';
import { Product } from '@flowstock/shared/types';

const mockProduct: Product = {
  id: '1',
  name: 'Test Product',
  sku: 'TEST-001',
  currentQuantity: 10,
  // ... autres champs
};

describe('ProductCard', () => {
  it('renders product information', () => {
    render(<ProductCard product={mockProduct} />);
    expect(screen.getByText('Test Product')).toBeInTheDocument();
    expect(screen.getByText('TEST-001')).toBeInTheDocument();
  });
});
```

**E2E Tests (Playwright):** Voir section Testing Strategy complète.

---

### 8. Accessibility

**Standards WCAG AA:**
- **Semantic HTML:** Utilisation balises HTML5 appropriées
- **ARIA:** Attributs ARIA quand nécessaire (shadcn/ui les inclut)
- **Keyboard Navigation:** Tous composants interactifs accessibles au clavier
- **Focus Management:** Focus visible et logique
- **Screen Readers:** Labels appropriés, alt text images

---

Cette architecture frontend fournit une base solide et claire pour l'implémentation par des agents IA, avec patterns cohérents et séparation claire des responsabilités.

---

## Backend Architecture

Cette section définit l'architecture détaillée des services backend Node.js/TypeScript, incluant l'organisation des routes, controllers, services métier, repositories, middleware, validation, et patterns de développement. Cette architecture s'applique à tous les microservices backend (Stocks, Orders, Invoices, Analytics) ainsi qu'à l'API Gateway.

### 1. Service Architecture Overview

#### 1.1 Structure Standard d'un Microservice

**Organisation des fichiers:**

```
apps/[service-name]/
├── src/
│   ├── routes/                  # Routes Express (définition endpoints)
│   │   ├── index.ts             # Aggrégation routes
│   │   ├── products.routes.ts
│   │   └── stockMovements.routes.ts
│   │
│   ├── controllers/             # Controllers (logique HTTP)
│   │   ├── products.controller.ts
│   │   └── stockMovements.controller.ts
│   │
│   ├── services/                 # Services métier (logique business)
│   │   ├── products.service.ts
│   │   └── stockMovements.service.ts
│   │
│   ├── repositories/            # Data access layer (abstraction DB)
│   │   ├── products.repository.ts
│   │   └── stockMovements.repository.ts
│   │
│   ├── models/                   # Modèles Prisma/TypeORM (si utilisé)
│   │   └── index.ts
│   │
│   ├── middleware/               # Middleware Express
│   │   ├── auth.middleware.ts   # Validation JWT
│   │   ├── tenant.middleware.ts # Extraction tenant_id depuis JWT
│   │   ├── validation.middleware.ts # Validation Zod
│   │   ├── error.middleware.ts  # Error handler global
│   │   └── rateLimit.middleware.ts
│   │
│   ├── utils/                   # Utilitaires
│   │   ├── logger.ts            # Winston/Pino logger
│   │   ├── errors.ts             # Classes erreurs custom
│   │   └── validators.ts         # Schémas Zod
│   │
│   ├── types/                    # Types TypeScript
│   │   └── index.ts
│   │
│   ├── config/                   # Configuration
│   │   ├── database.ts           # Config DB
│   │   ├── redis.ts              # Config Redis
│   │   └── env.ts                # Validation env vars
│   │
│   └── index.ts                  # Point d'entrée (Express app)
│
├── tests/                        # Tests
│   ├── unit/
│   ├── integration/
│   └── fixtures/
│
├── Dockerfile
├── package.json
└── tsconfig.json
```

#### 1.2 Patterns Architecturaux

**Séparation des responsabilités:**

1. **Routes:** Définition endpoints HTTP uniquement, délègue aux controllers
2. **Controllers:** Gestion requêtes/réponses HTTP, validation input, appel services
3. **Services:** Logique métier pure, orchestration entre repositories
4. **Repositories:** Accès données uniquement, abstraction couche DB
5. **Models:** Définitions schémas DB (Prisma/TypeORM)

**Flow de données:**
```
HTTP Request → Route → Controller → Service → Repository → Database
                                                      ↓
HTTP Response ← Route ← Controller ← Service ← Repository ← Database
```

---

### 2. Route Layer

#### 2.1 Route Definition Pattern

**Exemple route:**

```typescript
// routes/products.routes.ts
import { Router } from 'express';
import { ProductsController } from '../controllers/products.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { tenantMiddleware } from '../middleware/tenant.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import { createProductSchema, updateProductSchema, getProductsQuerySchema } from '../utils/validators';

const router = Router();
const controller = new ProductsController();

// Toutes les routes nécessitent auth + tenant
router.use(authMiddleware);
router.use(tenantMiddleware);

// GET /products - Liste produits avec filtres
router.get(
  '/',
  validateRequest({ query: getProductsQuerySchema }),
  controller.getAll.bind(controller)
);

// GET /products/:id - Détails produit
router.get(
  '/:id',
  validateRequest({ params: z.object({ id: z.string().uuid() }) }),
  controller.getById.bind(controller)
);

// POST /products - Créer produit
router.post(
  '/',
  validateRequest({ body: createProductSchema }),
  controller.create.bind(controller)
);

// PUT /products/:id - Mettre à jour produit
router.put(
  '/:id',
  validateRequest({ 
    params: z.object({ id: z.string().uuid() }),
    body: updateProductSchema 
  }),
  controller.update.bind(controller)
);

// DELETE /products/:id - Soft delete produit
router.delete(
  '/:id',
  validateRequest({ params: z.object({ id: z.string().uuid() }) }),
  controller.delete.bind(controller)
);

// POST /products/import - Import CSV
router.post(
  '/import',
  upload.single('file'), // multer middleware
  validateRequest({ body: z.object({ file: z.any() }) }),
  controller.import.bind(controller)
);

export default router;
```

**Patterns routes:**
- Routes groupées par domaine métier (products, orders, etc.)
- Middleware appliqué au niveau router pour routes communes
- Validation via middleware `validateRequest` avec schémas Zod
- Binding explicite controllers pour préserver `this` context

---

### 3. Controller Layer

#### 3.1 Controller Pattern

**Exemple controller:**

```typescript
// controllers/products.controller.ts
import { Request, Response, NextFunction } from 'express';
import { ProductsService } from '../services/products.service';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';
import { Product, CreateProductDto, UpdateProductDto, ProductFilters } from '@flowstock/shared/types';

export class ProductsController {
  constructor(private productsService: ProductsService) {}

  /**
   * GET /products
   * Liste produits avec filtres et pagination
   */
  async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenantId!; // Défini par tenantMiddleware
      const filters: ProductFilters = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20,
        search: req.query.search as string,
        locationId: req.query.location_id as string,
        supplierId: req.query.supplier_id as string,
        lowStock: req.query.low_stock === 'true',
      };

      const result = await this.productsService.getAll(tenantId, filters);

      res.status(200).json({
        success: true,
        data: result.products,
        pagination: result.pagination,
        meta: {
          timestamp: new Date().toISOString(),
          request_id: req.requestId, // Défini par requestIdMiddleware
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /products/:id
   * Détails produit avec historique
   */
  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const productId = req.params.id;

      const product = await this.productsService.getById(tenantId, productId);

      if (!product) {
        throw new AppError('Product not found', 404, 'NOT_FOUND');
      }

      res.status(200).json({
        success: true,
        data: product,
        meta: {
          timestamp: new Date().toISOString(),
          request_id: req.requestId,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /products
   * Créer nouveau produit
   */
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const userId = req.userId!; // Défini par authMiddleware
      const data: CreateProductDto = req.body;

      const product = await this.productsService.create(tenantId, userId, data);

      res.status(201).json({
        success: true,
        data: product,
        meta: {
          timestamp: new Date().toISOString(),
          request_id: req.requestId,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /products/:id
   * Mettre à jour produit
   */
  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const productId = req.params.id;
      const data: UpdateProductDto = req.body;

      const product = await this.productsService.update(tenantId, productId, data);

      res.status(200).json({
        success: true,
        data: product,
        meta: {
          timestamp: new Date().toISOString(),
          request_id: req.requestId,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /products/:id
   * Soft delete produit
   */
  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const productId = req.params.id;

      await this.productsService.delete(tenantId, productId);

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /products/import
   * Import produits depuis CSV
   */
  async import(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const userId = req.userId!;
      const file = req.file;

      if (!file) {
        throw new AppError('File is required', 400, 'VALIDATION_ERROR');
      }

      const result = await this.productsService.importFromCSV(tenantId, userId, file);

      res.status(200).json({
        success: true,
        data: result,
        meta: {
          timestamp: new Date().toISOString(),
          request_id: req.requestId,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}
```

**Patterns controllers:**
- Méthodes async avec try/catch, délègue erreurs à `next()`
- Extraction `tenantId` et `userId` depuis request (middleware)
- Format réponse standardisé (`success`, `data`, `meta`)
- Codes HTTP appropriés (200, 201, 204, etc.)
- Logging via logger utilitaire

---

### 4. Service Layer

#### 4.1 Service Pattern

**Exemple service métier:**

```typescript
// services/products.service.ts
import { ProductsRepository } from '../repositories/products.repository';
import { StockMovementsRepository } from '../repositories/stockMovements.repository';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';
import { Product, CreateProductDto, UpdateProductDto, ProductFilters } from '@flowstock/shared/types';
import { PubSubClient } from '../utils/pubsub';

export class ProductsService {
  constructor(
    private productsRepository: ProductsRepository,
    private stockMovementsRepository: StockMovementsRepository,
    private pubSubClient: PubSubClient
  ) {}

  /**
   * Récupérer tous les produits avec filtres et pagination
   */
  async getAll(tenantId: string, filters: ProductFilters): Promise<{
    products: Product[];
    pagination: PaginationMeta;
  }> {
    const { products, total } = await this.productsRepository.findAll(tenantId, filters);

    // Enrichir avec prédictions IA si disponible (appel ML Service si nécessaire)
    const enrichedProducts = await this.enrichWithPredictions(tenantId, products);

    return {
      products: enrichedProducts,
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total,
        totalPages: Math.ceil(total / filters.limit),
        hasNext: filters.page * filters.limit < total,
        hasPrev: filters.page > 1,
      },
    };
  }

  /**
   * Récupérer produit par ID avec historique
   */
  async getById(tenantId: string, productId: string): Promise<Product | null> {
    const product = await this.productsRepository.findById(tenantId, productId);
    
    if (!product) {
      return null;
    }

    // Enrichir avec historique mouvements
    const movements = await this.stockMovementsRepository.findByProductId(tenantId, productId);
    const prediction = await this.getPrediction(tenantId, productId);

    return {
      ...product,
      recentMovements: movements.slice(0, 10),
      prediction,
    };
  }

  /**
   * Créer nouveau produit
   */
  async create(tenantId: string, userId: string, data: CreateProductDto): Promise<Product> {
    // Validation métier
    await this.validateProductData(tenantId, data);

    // Vérifier SKU unique
    const existingProduct = await this.productsRepository.findBySku(tenantId, data.sku);
    if (existingProduct) {
      throw new AppError(`Product with SKU ${data.sku} already exists`, 409, 'CONFLICT');
    }

    // Créer produit
    const product = await this.productsRepository.create(tenantId, {
      ...data,
      currentQuantity: data.quantity || 0,
      createdBy: userId,
    });

    // Créer mouvement stock initial si quantité > 0
    if (data.quantity && data.quantity > 0) {
      await this.stockMovementsRepository.create(tenantId, {
        productId: product.id,
        type: 'in',
        quantity: data.quantity,
        previousQuantity: 0,
        newQuantity: data.quantity,
        reason: 'Initial stock',
        referenceType: 'manual',
        createdBy: userId,
      });
    }

    // Publier événement pour ML Service
    await this.pubSubClient.publish('product-events', {
      eventType: 'created',
      tenantId,
      productId: product.id,
    });

    logger.info(`Product created: ${product.id}`, { tenantId, userId, productId: product.id });

    return product;
  }

  /**
   * Mettre à jour produit
   */
  async update(tenantId: string, productId: string, data: UpdateProductDto): Promise<Product> {
    const product = await this.productsRepository.findById(tenantId, productId);
    
    if (!product) {
      throw new AppError('Product not found', 404, 'NOT_FOUND');
    }

    // Validation métier
    await this.validateProductData(tenantId, data, productId);

    // Mettre à jour
    const updatedProduct = await this.productsRepository.update(tenantId, productId, data);

    logger.info(`Product updated: ${productId}`, { tenantId, productId, changes: data });

    return updatedProduct;
  }

  /**
   * Soft delete produit
   */
  async delete(tenantId: string, productId: string): Promise<void> {
    const product = await this.productsRepository.findById(tenantId, productId);
    
    if (!product) {
      throw new AppError('Product not found', 404, 'NOT_FOUND');
    }

    await this.productsRepository.softDelete(tenantId, productId);

    logger.info(`Product deleted: ${productId}`, { tenantId, productId });
  }

  /**
   * Import produits depuis CSV
   */
  async importFromCSV(tenantId: string, userId: string, file: Express.Multer.File): Promise<{
    imported: number;
    failed: number;
    errors: Array<{ row: number; sku: string; error: string }>;
  }> {
    // Parser CSV
    const csvData = await this.parseCSV(file.buffer);
    
    const results = {
      imported: 0,
      failed: 0,
      errors: [] as Array<{ row: number; sku: string; error: string }>,
    };

    // Traiter chaque ligne
    for (let i = 0; i < csvData.length; i++) {
      try {
        const row = csvData[i];
        await this.create(tenantId, userId, {
          sku: row.sku,
          name: row.name,
          // ... mapping autres colonnes
        });
        results.imported++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          row: i + 2, // +2 car ligne 1 = headers
          sku: csvData[i].sku || 'unknown',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return results;
  }

  // Méthodes privées helpers
  private async validateProductData(tenantId: string, data: CreateProductDto | UpdateProductDto, excludeProductId?: string): Promise<void> {
    // Validation métier (ex: minQuantity < maxQuantity, etc.)
  }

  private async enrichWithPredictions(tenantId: string, products: Product[]): Promise<Product[]> {
    // Appel ML Service pour enrichir avec prédictions (si Premium+)
    // Ou récupération depuis cache Redis
  }

  private async getPrediction(tenantId: string, productId: string): Promise<Prediction | null> {
    // Récupération prédiction depuis ML Service ou cache
  }

  private async parseCSV(buffer: Buffer): Promise<Array<Record<string, string>>> {
    // Parser CSV (utiliser csv-parse)
  }
}
```

**Patterns services:**
- Logique métier pure, pas de logique HTTP
- Orchestration entre repositories
- Validation métier avant persistance
- Publication événements Pub/Sub pour découplage
- Logging actions importantes
- Gestion erreurs avec AppError custom

---

### 5. Repository Layer

#### 5.1 Repository Pattern

**Exemple repository avec Prisma:**

```typescript
// repositories/products.repository.ts
import { PrismaClient, Product, Prisma } from '@prisma/client';
import { ProductFilters } from '@flowstock/shared/types';

export class ProductsRepository {
  constructor(private prisma: PrismaClient) {}

  /**
   * Trouver tous les produits avec filtres
   */
  async findAll(tenantId: string, filters: ProductFilters): Promise<{
    products: Product[];
    total: number;
  }> {
    const where: Prisma.ProductWhereInput = {
      tenantId,
      isActive: true,
      ...(filters.search && {
        OR: [
          { name: { contains: filters.search, mode: 'insensitive' } },
          { sku: { contains: filters.search, mode: 'insensitive' } },
        ],
      }),
      ...(filters.locationId && {
        locations: {
          some: {
            locationId: filters.locationId,
          },
        },
      }),
      ...(filters.supplierId && {
        supplierId: filters.supplierId,
      }),
      ...(filters.lowStock && {
        currentQuantity: {
          lte: Prisma.sql`min_quantity`,
        },
      }),
    };

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
        orderBy: filters.sort ? { [filters.sort]: filters.order || 'desc' } : { createdAt: 'desc' },
        include: {
          supplier: true,
          locations: {
            include: {
              location: true,
            },
          },
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    return { products, total };
  }

  /**
   * Trouver produit par ID
   */
  async findById(tenantId: string, productId: string): Promise<Product | null> {
    return this.prisma.product.findFirst({
      where: {
        id: productId,
        tenantId,
        isActive: true,
      },
      include: {
        supplier: true,
        locations: {
          include: {
            location: true,
          },
        },
      },
    });
  }

  /**
   * Trouver produit par SKU
   */
  async findBySku(tenantId: string, sku: string): Promise<Product | null> {
    return this.prisma.product.findFirst({
      where: {
        sku,
        tenantId,
        isActive: true,
      },
    });
  }

  /**
   * Créer produit
   */
  async create(tenantId: string, data: Prisma.ProductCreateInput): Promise<Product> {
    return this.prisma.product.create({
      data: {
        ...data,
        tenant: {
          connect: { id: tenantId },
        },
      },
      include: {
        supplier: true,
      },
    });
  }

  /**
   * Mettre à jour produit
   */
  async update(tenantId: string, productId: string, data: Prisma.ProductUpdateInput): Promise<Product> {
    return this.prisma.product.update({
      where: {
        id: productId,
        tenantId, // Vérification tenant_id via where
      },
      data,
      include: {
        supplier: true,
      },
    });
  }

  /**
   * Soft delete produit
   */
  async softDelete(tenantId: string, productId: string): Promise<void> {
    await this.prisma.product.update({
      where: {
        id: productId,
        tenantId,
      },
      data: {
        isActive: false,
        updatedAt: new Date(),
      },
    });
  }
}
```

**Patterns repositories:**
- Abstraction complète de la couche DB
- Toujours filtrer par `tenantId` pour multi-tenancy
- Utilisation Prisma pour type safety
- Transactions pour opérations atomiques
- Include relations nécessaires explicitement

---

### 6. Middleware Layer

#### 6.1 Authentication Middleware

```typescript
// middleware/auth.middleware.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from '../utils/errors';

interface JWTPayload {
  userId: string;
  tenantId: string;
  email: string;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      userEmail?: string;
      userRole?: string;
    }
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Missing or invalid authorization header', 401, 'UNAUTHORIZED');
    }

    const token = authHeader.substring(7);
    const secret = process.env.JWT_SECRET!;

    if (!secret) {
      throw new Error('JWT_SECRET not configured');
    }

    const decoded = jwt.verify(token, secret) as JWTPayload;

    // Attacher user info à request
    req.userId = decoded.userId;
    req.userEmail = decoded.email;
    req.userRole = decoded.role;

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(new AppError('Invalid token', 401, 'UNAUTHORIZED'));
    } else {
      next(error);
    }
  }
}
```

#### 6.2 Tenant Middleware

```typescript
// middleware/tenant.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';

declare global {
  namespace Express {
    interface Request {
      tenantId?: string;
    }
  }
}

export function tenantMiddleware(req: Request, res: Response, next: NextFunction): void {
  try {
    // tenantId extrait depuis JWT dans authMiddleware
    const tenantId = (req as any).tenantId; // Déjà défini par authMiddleware si JWT contient tenantId
    
    if (!tenantId) {
      throw new AppError('Tenant ID not found in token', 401, 'UNAUTHORIZED');
    }

    req.tenantId = tenantId;
    next();
  } catch (error) {
    next(error);
  }
}
```

#### 6.3 Validation Middleware

```typescript
// middleware/validation.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { AppError } from '../utils/errors';

interface ValidationSchema {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}

export function validateRequest(schemas: ValidationSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (schemas.body) {
        req.body = schemas.body.parse(req.body);
      }
      if (schemas.query) {
        req.query = schemas.query.parse(req.query);
      }
      if (schemas.params) {
        req.params = schemas.params.parse(req.params);
      }
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const details = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));
        next(new AppError('Validation error', 400, 'VALIDATION_ERROR', details));
      } else {
        next(error);
      }
    }
  };
}
```

#### 6.4 Error Handler Middleware

```typescript
// middleware/error.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';

export function errorHandler(
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  logger.error('Error occurred', {
    error: err.message,
    stack: err.stack,
    requestId: req.requestId,
    path: req.path,
    method: req.method,
  });

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        ...(err.details && { details: err.details }),
      },
      meta: {
        timestamp: new Date().toISOString(),
        request_id: req.requestId,
      },
    });
  } else {
    // Erreur non gérée
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
      },
      meta: {
        timestamp: new Date().toISOString(),
        request_id: req.requestId,
      },
    });
  }
}
```

---

### 7. Application Entry Point

#### 7.1 Express App Setup

```typescript
// src/index.ts
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { errorHandler } from './middleware/error.middleware';
import { requestIdMiddleware } from './middleware/requestId.middleware';
import { logger } from './utils/logger';
import productsRoutes from './routes/products.routes';
import stockMovementsRoutes from './routes/stockMovements.routes';

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging
app.use(morgan('combined', { stream: { write: (msg) => logger.info(msg.trim()) } }));

// Request ID pour tracing
app.use(requestIdMiddleware);

// Health check
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'stocks-service',
    timestamp: new Date().toISOString(),
  });
});

// Routes
app.use('/api/v1/products', productsRoutes);
app.use('/api/v1/stock-movements', stockMovementsRoutes);

// Error handler (doit être dernier)
app.use(errorHandler);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  logger.info(`Stocks Service listening on port ${PORT}`);
});
```

---

### 8. Configuration & Environment

#### 8.1 Environment Variables Validation

```typescript
// config/env.ts
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  PORT: z.string().transform(Number).default('3000'),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  FRONTEND_URL: z.string().url(),
  PUBSUB_PROJECT_ID: z.string(),
  GCP_PROJECT_ID: z.string(),
});

export const env = envSchema.parse(process.env);
```

---

### 9. Testing Patterns

**Unit Tests (Jest):**

```typescript
// services/__tests__/products.service.test.ts
import { ProductsService } from '../products.service';
import { ProductsRepository } from '../../repositories/products.repository';

describe('ProductsService', () => {
  let service: ProductsService;
  let mockRepository: jest.Mocked<ProductsRepository>;

  beforeEach(() => {
    mockRepository = {
      findAll: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
    } as any;

    service = new ProductsService(mockRepository, ...);
  });

  describe('getAll', () => {
    it('should return products with pagination', async () => {
      const mockProducts = [{ id: '1', name: 'Test' }];
      mockRepository.findAll.mockResolvedValue({ products: mockProducts, total: 1 });

      const result = await service.getAll('tenant-1', { page: 1, limit: 20 });

      expect(result.products).toEqual(mockProducts);
      expect(result.pagination.total).toBe(1);
    });
  });
});
```

**Integration Tests (Supertest):**

```typescript
// routes/__tests__/products.routes.test.ts
import request from 'supertest';
import app from '../../index';

describe('Products Routes', () => {
  it('GET /api/v1/products should return 401 without auth', async () => {
    const response = await request(app).get('/api/v1/products');
    expect(response.status).toBe(401);
  });
});
```

---

Cette architecture backend fournit une structure claire et maintenable pour tous les microservices, avec séparation des responsabilités et patterns cohérents pour l'implémentation par des agents IA.

---

## Unified Project Structure

Cette section définit la structure complète du monorepo utilisant Turborepo pour gérer les workspaces, les dépendances partagées, et les builds coordonnés. Cette structure facilite le développement full-stack avec partage de code entre frontend et backend.

### 1. Monorepo Overview

**Tool:** Turborepo pour orchestration builds, cache, et parallélisation.

**Rationale:**
- Partage code/types entre frontend et backend (types TypeScript partagés)
- Dépendances coordonnées (même version React, Node.js, etc.)
- Déploiements atomiques (frontend + backend versionnés ensemble)
- CI/CD simplifié (un seul repo, builds coordonnés)
- Cache intelligent pour builds incrémentaux rapides

### 2. Complete Directory Structure

```
bmad-stock-agent/
├── .github/                      # GitHub workflows CI/CD
│   └── workflows/
│       ├── ci.yml               # Tests, lint, build
│       ├── deploy-staging.yml   # Déploiement staging
│       └── deploy-production.yml # Déploiement production
│
├── apps/                         # Applications (workspaces)
│   ├── web/                      # Frontend React application
│   │   ├── src/                  # Source code (voir Frontend Architecture)
│   │   ├── public/               # Assets statiques
│   │   ├── tests/                # Tests E2E Playwright
│   │   ├── Dockerfile            # Container frontend
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── vite.config.ts
│   │   └── tailwind.config.js
│   │
│   ├── api/                      # API Gateway
│   │   ├── src/                  # Source code (voir Backend Architecture)
│   │   ├── tests/
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── stocks-service/          # Stocks microservice
│   │   ├── src/
│   │   │   ├── routes/
│   │   │   ├── controllers/
│   │   │   ├── services/
│   │   │   ├── repositories/
│   │   │   ├── middleware/
│   │   │   └── index.ts
│   │   ├── tests/
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── ml-service/              # ML/IA microservice (Python)
│   │   ├── app/
│   │   │   ├── main.py          # FastAPI app
│   │   │   ├── models/          # ML models code
│   │   │   ├── services/        # ML services
│   │   │   └── utils/
│   │   ├── tests/
│   │   ├── Dockerfile
│   │   ├── requirements.txt
│   │   └── pyproject.toml
│   │
│   ├── orders-service/         # Orders microservice
│   │   ├── src/
│   │   ├── tests/
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── invoices-service/       # Invoices microservice
│   │   ├── src/
│   │   ├── tests/
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── analytics-service/       # Analytics microservice
│       ├── src/
│       ├── tests/
│       ├── Dockerfile
│       ├── package.json
│       └── tsconfig.json
│
├── packages/                     # Packages partagés (workspaces)
│   ├── shared/                   # Types et utilitaires partagés
│   │   ├── src/
│   │   │   ├── types/           # Types TypeScript partagés
│   │   │   │   ├── product.ts
│   │   │   │   ├── order.ts
│   │   │   │   ├── invoice.ts
│   │   │   │   ├── user.ts
│   │   │   │   └── index.ts
│   │   │   ├── constants/        # Constantes partagées
│   │   │   │   ├── subscription-tiers.ts
│   │   │   │   └── error-codes.ts
│   │   │   └── utils/            # Utilitaires partagés
│   │   │       ├── date.ts
│   │   │       └── validation.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── ui/                       # Composants UI partagés (optionnel)
│   │   ├── src/
│   │   │   └── components/
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── config/                   # Configurations partagées
│       ├── eslint/               # ESLint config
│       │   ├── base.js
│       │   ├── react.js
│       │   └── node.js
│       ├── typescript/            # TypeScript configs
│       │   ├── base.json
│       │   ├── frontend.json
│       │   └── backend.json
│       └── jest/                  # Jest configs
│           ├── jest.config.js
│           └── setup.ts
│
├── infrastructure/               # Infrastructure as Code
│   ├── terraform/                # Terraform modules
│   │   ├── gcp/
│   │   │   ├── cloud-run/
│   │   │   ├── cloud-sql/
│   │   │   ├── cloud-storage/
│   │   │   └── vertex-ai/
│   │   └── environments/
│   │       ├── dev/
│   │       ├── staging/
│   │       └── production/
│   └── docker/                   # Dockerfiles additionnels si nécessaire
│
├── scripts/                      # Scripts utilitaires
│   ├── setup.sh                  # Setup initial projet
│   ├── db-migrate.sh             # Migration DB
│   └── deploy.sh                 # Script déploiement
│
├── docs/                         # Documentation
│   ├── architecture.md           # Ce document
│   ├── api-specifications.md
│   ├── database-schema.md
│   ├── prd.md
│   └── README.md
│
├── .env.example                  # Template variables environnement
├── .gitignore
├── docker-compose.yml            # Développement local (tous services)
├── package.json                  # Root package.json (workspaces)
├── turbo.json                    # Configuration Turborepo
├── tsconfig.base.json            # TypeScript config de base
├── pnpm-workspace.yaml           # Configuration pnpm workspaces
└── README.md                     # Documentation principale
```

### 3. Root Package.json Configuration

```json
{
  "name": "bmad-stock-agent",
  "version": "1.0.0",
  "private": true,
  "workspaces": [
    "apps/*",
    "packages/*"
  ],
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "lint": "turbo run lint",
    "test": "turbo run test",
    "clean": "turbo run clean",
    "format": "prettier --write \"**/*.{ts,tsx,js,jsx,json,md}\"",
    "type-check": "turbo run type-check"
  },
  "devDependencies": {
    "@types/node": "^20.10.0",
    "prettier": "^3.1.0",
    "turbo": "^1.11.0",
    "typescript": "^5.3.3"
  },
  "engines": {
    "node": ">=20.0.0",
    "pnpm": ">=8.0.0"
  },
  "packageManager": "pnpm@8.15.0"
}
```

### 4. Turborepo Configuration

```json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": ["**/.env.*local"],
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", "build/**", ".next/**", "!.next/cache/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "dependsOn": ["^build"],
      "outputs": []
    },
    "test": {
      "dependsOn": ["^build"],
      "outputs": ["coverage/**"],
      "inputs": ["src/**/*.tsx", "src/**/*.ts", "test/**/*.ts", "test/**/*.tsx"]
    },
    "type-check": {
      "dependsOn": ["^build"],
      "outputs": []
    },
    "clean": {
      "cache": false
    }
  }
}
```

**Explications:**
- **`dependsOn: ["^build"]`:** Attend que les dépendances soient buildées
- **`outputs`:** Définit ce qui est mis en cache
- **`persistent: true`:** Pour `dev`, processus qui tournent en continu
- **`inputs`:** Fichiers qui déclenchent rebuild si modifiés

### 5. Shared Package Structure

#### 5.1 Package `@flowstock/shared`

**package.json:**

```json
{
  "name": "@flowstock/shared",
  "version": "1.0.0",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    },
    "./types": {
      "types": "./dist/types/index.d.ts",
      "default": "./dist/types/index.js"
    },
    "./constants": {
      "types": "./dist/constants/index.d.ts",
      "default": "./dist/constants/index.js"
    }
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "zod": "^3.22.4"
  },
  "devDependencies": {
    "typescript": "^5.3.3"
  }
}
```

**Usage dans apps:**

```typescript
// apps/web/src/components/ProductCard.tsx
import { Product } from '@flowstock/shared/types';

// apps/stocks-service/src/services/products.service.ts
import { Product, CreateProductDto } from '@flowstock/shared/types';
```

#### 5.2 Types Partagés

**packages/shared/src/types/product.ts:**

```typescript
import { z } from 'zod';

export const ProductSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  sku: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  unit: z.string(),
  currentQuantity: z.number(),
  minQuantity: z.number(),
  maxQuantity: z.number().nullable(),
  purchasePrice: z.number().nullable(),
  sellingPrice: z.number().nullable(),
  supplierId: z.string().uuid().nullable(),
  isActive: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Product = z.infer<typeof ProductSchema>;

export const CreateProductDtoSchema = ProductSchema.omit({
  id: true,
  tenantId: true,
  createdAt: true,
  updatedAt: true,
}).partial({
  description: true,
  maxQuantity: true,
  purchasePrice: true,
  sellingPrice: true,
  supplierId: true,
});

export type CreateProductDto = z.infer<typeof CreateProductDtoSchema>;
```

### 6. Workspace Dependencies

#### 6.1 Frontend App Dependencies

**apps/web/package.json:**

```json
{
  "name": "@flowstock/web",
  "version": "1.0.0",
  "private": true,
  "dependencies": {
    "@flowstock/shared": "workspace:*",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.20.0",
    "@tanstack/react-query": "^5.12.0",
    "zustand": "^4.4.7",
    "axios": "^1.6.2",
    "zod": "^3.22.4"
  },
  "devDependencies": {
    "@flowstock/config": "workspace:*",
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "typescript": "^5.3.3",
    "vite": "^5.0.0",
    "vitest": "^1.0.0"
  }
}
```

#### 6.2 Backend Service Dependencies

**apps/stocks-service/package.json:**

```json
{
  "name": "@flowstock/stocks-service",
  "version": "1.0.0",
  "private": true,
  "dependencies": {
    "@flowstock/shared": "workspace:*",
    "express": "^4.18.2",
    "@prisma/client": "^5.7.0",
    "zod": "^3.22.4",
    "jsonwebtoken": "^9.0.2",
    "bcrypt": "^5.1.1"
  },
  "devDependencies": {
    "@flowstock/config": "workspace:*",
    "@types/express": "^4.17.21",
    "@types/node": "^20.10.0",
    "prisma": "^5.7.0",
    "typescript": "^5.3.3",
    "jest": "^29.7.0",
    "supertest": "^6.3.3"
  }
}
```

**Pattern `workspace:*`:** Référence au package local dans le monorepo.

### 7. TypeScript Configuration

#### 7.1 Base Config

**tsconfig.base.json:**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "lib": ["ES2022"],
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "allowJs": true,
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "composite": true,
    "incremental": true,
    "paths": {
      "@flowstock/shared": ["./packages/shared/src"],
      "@flowstock/shared/*": ["./packages/shared/src/*"]
    }
  },
  "exclude": ["node_modules", "dist", "build"]
}
```

#### 7.2 App-Specific Configs

**apps/web/tsconfig.json:**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "jsx": "react-jsx",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"],
  "references": [
    { "path": "../../packages/shared" }
  ]
}
```

**apps/stocks-service/tsconfig.json:**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "module": "CommonJS",
    "moduleResolution": "node",
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src"],
  "references": [
    { "path": "../../packages/shared" }
  ]
}
```

### 8. Docker Compose pour Développement Local

**docker-compose.yml:**

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: flowstock
      POSTGRES_PASSWORD: flowstock_dev
      POSTGRES_DB: flowstock_dev
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  # Services backend (optionnel pour dev local)
  # Les services peuvent tourner via `pnpm dev` ou dans Docker
  api:
    build:
      context: .
      dockerfile: apps/api/Dockerfile
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgresql://flowstock:flowstock_dev@postgres:5432/flowstock_dev
      REDIS_URL: redis://redis:6379
    depends_on:
      - postgres
      - redis

volumes:
  postgres_data:
```

### 9. Development Workflow

#### 9.1 Setup Initial

```bash
# Installer dépendances
pnpm install

# Setup base de données
pnpm run db:migrate

# Build packages partagés
pnpm run build --filter=@flowstock/shared

# Démarrer tous les services en dev
pnpm dev
```

#### 9.2 Commandes Turborepo

```bash
# Démarrer tous les apps en dev
pnpm dev

# Build tous les packages/apps
pnpm build

# Linter tous les packages/apps
pnpm lint

# Tests tous les packages/apps
pnpm test

# Build seulement un workspace spécifique
pnpm build --filter=@flowstock/web

# Build avec dépendances
pnpm build --filter=@flowstock/web...@flowstock/shared
```

### 10. CI/CD Integration

**GitHub Actions workflow:**

```yaml
# .github/workflows/ci.yml
name: CI

on: [push, pull_request]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      - uses: actions/setup-node@v3
        with:
          node-version: 20
          cache: 'pnpm'
      
      - run: pnpm install
      - run: pnpm build
      - run: pnpm lint
      - run: pnpm test
```

### 11. Benefits de cette Structure

**Pour développement:**
- Types partagés garantissent cohérence frontend/backend
- Hot reload coordonné entre apps
- Dépendances gérées centralement

**Pour CI/CD:**
- Builds parallélisés et cachés (Turborepo)
- Tests isolés par workspace
- Déploiements atomiques

**Pour maintenance:**
- Code organisé et découvrable
- Refactoring facilité (types partagés)
- Onboarding simplifié (structure claire)

---

Cette structure de monorepo fournit une base solide pour le développement full-stack avec partage de code efficace et builds optimisés.

---

## Development Workflow

Cette section décrit le workflow de développement complet : setup initial, commandes quotidiennes, configuration environnement, debugging, et bonnes pratiques pour travailler efficacement dans le monorepo.

### 1. Prerequisites & Installation

#### 1.1 Système Requirements

**Obligatoires:**
- **Node.js:** Version 20.x LTS ou supérieure
- **pnpm:** Version 8.0.0 ou supérieure (gestionnaire de packages)
- **Docker & Docker Compose:** Pour services locaux (PostgreSQL, Redis)
- **Git:** Pour version control

**Optionnels mais recommandés:**
- **VS Code:** Éditeur recommandé avec extensions (ESLint, Prettier, Prisma)
- **Postman/Insomnia:** Pour tester APIs
- **DBeaver/pgAdmin:** Pour gestion base de données

#### 1.2 Installation Initiale

```bash
# 1. Cloner le repository
git clone https://github.com/your-org/bmad-stock-agent.git
cd bmad-stock-agent

# 2. Installer pnpm si pas déjà installé
npm install -g pnpm@8.15.0

# 3. Installer toutes les dépendances
pnpm install

# 4. Vérifier installation
pnpm --version
node --version
docker --version
```

### 2. Environment Configuration

#### 2.1 Variables d'Environnement

**Créer fichiers `.env` pour chaque environnement:**

```bash
# .env.local (développement local - gitignored)
# Copier depuis .env.example et remplir valeurs

# .env.example (template versionné)
```

**Structure `.env.local` (root):**

```bash
# Database
DATABASE_URL=postgresql://flowstock:flowstock_dev@localhost:5432/flowstock_dev

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-super-secret-jwt-key-min-32-chars-change-in-production
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Frontend URL
FRONTEND_URL=http://localhost:5173

# GCP (pour services cloud en dev)
GCP_PROJECT_ID=flowstock-dev
PUBSUB_PROJECT_ID=flowstock-dev

# API Base URL
API_BASE_URL=http://localhost:3000/api/v1
```

**Apps spécifiques peuvent avoir leurs propres `.env.local`:**

```bash
# apps/web/.env.local
VITE_API_BASE_URL=http://localhost:3000/api/v1
VITE_APP_NAME=FlowStock

# apps/stocks-service/.env.local
PORT=3001
DATABASE_URL=postgresql://flowstock:flowstock_dev@localhost:5432/flowstock_dev
```

#### 2.2 Setup Base de Données Locale

```bash
# 1. Démarrer PostgreSQL et Redis via Docker Compose
docker-compose up -d postgres redis

# 2. Vérifier que les services sont up
docker-compose ps

# 3. Créer la base de données (si nécessaire)
docker-compose exec postgres psql -U flowstock -c "CREATE DATABASE flowstock_dev;"

# 4. Exécuter migrations Prisma
cd apps/stocks-service
pnpm prisma migrate dev
pnpm prisma generate

# 5. (Optionnel) Seed données de test
pnpm prisma db seed
```

### 3. Initial Setup

#### 3.1 Premier Setup Complet

```bash
# 1. Installer dépendances
pnpm install

# 2. Build packages partagés (nécessaire avant de démarrer apps)
pnpm build --filter=@flowstock/shared

# 3. Générer clients Prisma pour tous les services
pnpm --filter="./apps/*-service" exec prisma generate

# 4. Setup base de données
docker-compose up -d
pnpm --filter="./apps/*-service" exec prisma migrate dev

# 5. Démarrer tous les services en mode dev
pnpm dev
```

**Résultat attendu:**
- Frontend: `http://localhost:5173`
- API Gateway: `http://localhost:3000`
- Stocks Service: `http://localhost:3001`
- Orders Service: `http://localhost:3002`
- Invoices Service: `http://localhost:3003`
- Analytics Service: `http://localhost:3004`
- ML Service: `http://localhost:8000` (Python FastAPI)

### 4. Development Commands

#### 4.1 Commandes Principales

**Root level (tous les workspaces):**

```bash
# Démarrer tous les services en mode dev (watch mode)
pnpm dev

# Build tous les packages/apps
pnpm build

# Linter tous les packages/apps
pnpm lint

# Exécuter tous les tests
pnpm test

# Type check tous les packages/apps
pnpm type-check

# Nettoyer tous les builds
pnpm clean
```

**Workspace spécifique:**

```bash
# Démarrer seulement le frontend
pnpm dev --filter=@flowstock/web

# Build seulement stocks-service
pnpm build --filter=@flowstock/stocks-service

# Tests seulement pour shared package
pnpm test --filter=@flowstock/shared

# Build avec dépendances (build shared avant web)
pnpm build --filter=@flowstock/web...@flowstock/shared
```

**Patterns Turborepo:**
- `--filter=package-name`: Cible un workspace spécifique
- `...dependency`: Inclut les dépendances
- `--parallel`: Exécute en parallèle (défaut pour dev)
- `--no-cache`: Ignore le cache

#### 4.2 Commandes par Workspace

**Frontend (apps/web):**

```bash
cd apps/web

# Dev server avec hot reload
pnpm dev

# Build production
pnpm build

# Preview build production
pnpm preview

# Tests unitaires
pnpm test

# Tests E2E (Playwright)
pnpm test:e2e

# Linter
pnpm lint

# Format code
pnpm format
```

**Backend Service (ex: apps/stocks-service):**

```bash
cd apps/stocks-service

# Dev server avec watch (nodemon/tsx)
pnpm dev

# Build TypeScript
pnpm build

# Run build production
pnpm start

# Tests unitaires
pnpm test

# Tests intégration
pnpm test:integration

# Prisma migrations
pnpm prisma migrate dev
pnpm prisma generate
pnpm prisma studio  # UI pour explorer DB

# Linter
pnpm lint
```

**ML Service (apps/ml-service):**

```bash
cd apps/ml-service

# Dev server FastAPI avec auto-reload
pnpm dev  # ou: uvicorn app.main:app --reload

# Tests pytest
pnpm test  # ou: pytest

# Linter (ruff/flake8)
pnpm lint

# Format (black)
pnpm format
```

### 5. Daily Development Workflow

#### 5.1 Démarrage Journée

```bash
# 1. Pull dernières modifications
git pull origin main

# 2. Installer nouvelles dépendances si nécessaire
pnpm install

# 3. Démarrer services infrastructure
docker-compose up -d

# 4. Vérifier migrations DB à jour
pnpm --filter="./apps/*-service" exec prisma migrate deploy

# 5. Démarrer services en dev
pnpm dev
```

#### 5.2 Workflow Feature Development

**1. Créer branche:**

```bash
git checkout -b feature/product-import-csv
```

**2. Développer feature:**

```bash
# Modifier code dans workspace concerné
# Hot reload actif automatiquement

# Si modification types partagés:
pnpm build --filter=@flowstock/shared
# Les apps qui dépendent de shared se rebuildent automatiquement
```

**3. Tester localement:**

```bash
# Tests unitaires
pnpm test --filter=@flowstock/stocks-service

# Tests E2E frontend
cd apps/web && pnpm test:e2e

# Vérifier types
pnpm type-check
```

**4. Commit:**

```bash
git add .
git commit -m "feat: add CSV import for products"
```

#### 5.3 Debugging

**Frontend (VS Code):**

```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "chrome",
      "request": "launch",
      "name": "Debug Frontend",
      "url": "http://localhost:5173",
      "webRoot": "${workspaceFolder}/apps/web/src"
    }
  ]
}
```

**Backend (VS Code):**

```json
// .vscode/launch.json
{
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Stocks Service",
      "runtimeExecutable": "pnpm",
      "runtimeArgs": ["dev", "--filter=@flowstock/stocks-service"],
      "cwd": "${workspaceFolder}",
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    }
  ]
}
```

**Logs:**

```bash
# Voir logs Docker Compose
docker-compose logs -f postgres redis

# Logs spécifiques service
docker-compose logs -f api

# Logs avec filtrage
docker-compose logs -f | grep ERROR
```

### 6. Hot Reload & Watch Mode

#### 6.1 Frontend Hot Reload

**Vite (apps/web):**
- Hot Module Replacement (HMR) automatique
- Changements dans composants → refresh instantané
- Changements dans types partagés → rebuild automatique si configuré

**Configuration Vite:**

```typescript
// apps/web/vite.config.ts
export default defineConfig({
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
```

#### 6.2 Backend Watch Mode

**Node.js Services:**
- Utiliser `tsx` ou `nodemon` pour watch TypeScript
- Auto-restart sur changement fichiers

**Configuration (package.json):**

```json
{
  "scripts": {
    "dev": "tsx watch src/index.ts"
  }
}
```

**Prisma:**
- `prisma generate` doit être réexécuté si schéma change
- Watch mode: `pnpm prisma generate --watch`

### 7. Database Management

#### 7.1 Migrations

```bash
# Créer nouvelle migration
cd apps/stocks-service
pnpm prisma migrate dev --name add_product_categories

# Appliquer migrations (production-like)
pnpm prisma migrate deploy

# Reset DB (dev seulement - supprime toutes données)
pnpm prisma migrate reset

# Status migrations
pnpm prisma migrate status
```

#### 7.2 Prisma Studio

```bash
# Ouvrir UI Prisma pour explorer DB
pnpm prisma studio

# Ouvre http://localhost:5555
```

#### 7.3 Seed Data

```bash
# Exécuter seed script
pnpm prisma db seed

# Seed script défini dans package.json:
# "prisma": { "seed": "tsx prisma/seed.ts" }
```

### 8. Dependency Management

#### 8.1 Ajouter Dépendance

```bash
# Root level (dev dependency partagée)
pnpm add -D -w typescript@^5.3.3

# Workspace spécifique
pnpm add express --filter=@flowstock/stocks-service

# Workspace avec version spécifique
pnpm add react@^18.2.0 --filter=@flowstock/web
```

#### 8.2 Mettre à Jour Dépendances

```bash
# Vérifier outdated
pnpm outdated

# Mettre à jour toutes dépendances
pnpm update

# Mettre à jour package spécifique
pnpm update react --filter=@flowstock/web

# Mettre à jour vers dernière version majeure (attention!)
pnpm update --latest
```

#### 8.3 Gérer Workspace Dependencies

```bash
# Ajouter dépendance workspace (package local)
pnpm add @flowstock/shared --filter=@flowstock/web --workspace

# Pattern workspace:* dans package.json gère automatiquement
```

### 9. Useful Scripts

#### 9.1 Scripts Personnalisés Root

**Ajouter dans root `package.json`:**

```json
{
  "scripts": {
    "dev": "turbo run dev --parallel",
    "build": "turbo run build",
    "lint": "turbo run lint",
    "test": "turbo run test",
    "clean": "turbo run clean && rm -rf node_modules",
    "format": "prettier --write \"**/*.{ts,tsx,js,jsx,json,md}\"",
    "type-check": "turbo run type-check",
    "db:migrate": "pnpm --filter=\"./apps/*-service\" exec prisma migrate dev",
    "db:studio": "pnpm --filter=\"./apps/stocks-service\" exec prisma studio",
    "db:seed": "pnpm --filter=\"./apps/stocks-service\" exec prisma db seed",
    "docker:up": "docker-compose up -d",
    "docker:down": "docker-compose down",
    "docker:logs": "docker-compose logs -f",
    "prepare": "husky install"
  }
}
```

#### 9.2 Scripts Utilitaires

**Clean build artifacts:**

```bash
# Nettoyer tous les dist/build folders
pnpm clean

# Nettoyer aussi node_modules (si nécessaire)
pnpm clean && rm -rf node_modules && pnpm install
```

**Format code:**

```bash
# Formatter tout le code
pnpm format

# Vérifier format sans modifier
pnpm format:check
```

### 10. Troubleshooting

#### 10.1 Problèmes Courants

**Port déjà utilisé:**

```bash
# Trouver processus utilisant port
lsof -i :3000  # macOS/Linux
netstat -ano | findstr :3000  # Windows

# Tuer processus
kill -9 <PID>  # macOS/Linux
taskkill /PID <PID> /F  # Windows
```

**Cache Turborepo corrompu:**

```bash
# Nettoyer cache Turborepo
pnpm turbo clean

# Ou supprimer manuellement
rm -rf .turbo
```

**Problèmes Prisma:**

```bash
# Régénérer client Prisma
pnpm prisma generate

# Reset migrations si nécessaire (dev seulement)
pnpm prisma migrate reset
```

**Dépendances désynchronisées:**

```bash
# Supprimer node_modules et lockfile
rm -rf node_modules pnpm-lock.yaml

# Réinstaller
pnpm install
```

#### 10.2 Vérification Setup

**Script de vérification:**

```bash
# Vérifier versions
node --version  # Doit être >= 20.0.0
pnpm --version  # Doit être >= 8.0.0
docker --version

# Vérifier services Docker
docker-compose ps

# Vérifier connexion DB
docker-compose exec postgres psql -U flowstock -d flowstock_dev -c "SELECT 1;"

# Vérifier build
pnpm build --filter=@flowstock/shared
```

### 11. Best Practices

#### 11.1 Workflow Git

- **Branches:** `feature/`, `fix/`, `chore/`, `docs/`
- **Commits:** Conventional Commits (`feat:`, `fix:`, `chore:`, etc.)
- **Pull Requests:** Toujours linter + tests passent avant merge

#### 11.2 Code Quality

- **Linter:** Exécuter avant commit (husky pre-commit hook)
- **Tests:** Écrire tests pour nouvelles features
- **Types:** Toujours typer explicitement, éviter `any`

#### 11.3 Performance

- **Builds:** Utiliser cache Turborepo (ne pas utiliser `--no-cache` sauf debug)
- **Dependencies:** Éviter dépendances inutiles, vérifier taille bundle
- **Hot Reload:** Ne pas redémarrer manuellement si hot reload fonctionne
---

Ce workflow de développement fournit une base solide pour travailler efficacement dans le monorepo, avec outils et commandes claires pour tous les aspects du développement.

---

## Deployment Architecture

Cette section décrit la stratégie de déploiement complète sur Google Cloud Platform (GCP) pour le frontend, les microservices backend et le service ML. Elle couvre le packaging Docker, Cloud Run, la gestion des environnements, les secrets, le rollback, et l’intégration CI/CD.

### 1. Environments

**Environnements cibles :**
- **Development (local):** Dev sur machines des développeurs (Docker Compose + pnpm dev)
- **Staging:** Environnement pré-production pour tests d’intégration et UAT
- **Production:** Environnement live pour clients PME

**Régions GCP :**
- **Région principale:** `europe-west1` (Belgium) — conformité RGPD
- **Région secondaire (optionnelle):** `europe-west4` pour haute disponibilité

### 2. Containerization Strategy

**Docker partout :**
- Chaque service (web, api, stocks-service, orders-service, invoices-service, analytics-service, ml-service) est packagé dans sa propre image Docker.
- Images construites dans CI et poussées vers **Artifact Registry** (`europe-west1-docker.pkg.dev`).

**Tags d’images :**
- `app-name:main-<short-sha>` pour builds sur main
- `app-name:pr-<pr-number>` pour builds de PR (staging/preview)
- `app-name:release-<semver>` pour releases

**Exemple Dockerfile (Node service) :**

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/dist ./dist
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --prod --frozen-lockfile
CMD [\"node\", \"dist/index.js\"]
```

### 3. Cloud Run Deployment

**Services déployés sur Cloud Run :**
- `flowstock-web` — Frontend (servi en mode statique via Node/nginx ou Cloud Run + Cloud CDN)
- `flowstock-api-gateway`
- `flowstock-stocks-service`
- `flowstock-orders-service`
- `flowstock-invoices-service`
- `flowstock-analytics-service`
- `flowstock-ml-service` (si non délégué entièrement à Vertex AI)

**Configuration Cloud Run (principes) :**
- **CPU:** 1–2 vCPU selon service (ML peut nécessiter plus)
- **Memory:** 512 Mo–2 Go selon service
- **Concurrency:** 40–80 requêtes par instance (ajusté par service)
- **Min instances:** 0 en staging, 1–2 en production pour réduire cold starts
- **Max instances:** Limité pour contrôler coûts (ex: 50 instances pour API Gateway)
- **Autoscaling:** Basé sur taux de requêtes et CPU

**Networking & sécurité :**
- Toutes les requêtes passent par HTTPS (Cloud Load Balancer + Cloud CDN pour frontend)
- Services internes peuvent être restreints via IAM & VPC (optionnel MVP)

### 4. Environment Configuration & Secrets

**Secrets & config :**
- **Secret Manager (GCP)** pour :
  - Credentials DB (Cloud SQL)
  - JWT secrets
  - API keys externes (Vision API, terminaux de paiement)
  - Credentials service accounts (si nécessaires)
- **Variables d’environnement Cloud Run** pour :
  - URLs internes (services, DB, Pub/Sub topics)
  - Flags feature (ex: activer/désactiver intégrations)

**Pattern 12-factor :**
- Aucune cred dans le code ou dans les images Docker
- Toutes les configs sensibles passent par env vars + Secret Manager

### 5. Database & Data Layer Deployment

**Cloud SQL (PostgreSQL) :**
- Instance principale `flowstock-postgres` en `europe-west1`
- Auto backups quotidiens, rétention 7–30 jours
- Optionnel : replica en région secondaire

**BigQuery :**
- Dataset `flowstock_analytics`
- Tables partitionnées par date pour ventes, prédictions, etc.

**Cloud Storage :**
- Buckets par environnement :
  - `flowstock-invoices-dev`, `flowstock-invoices-staging`, `flowstock-invoices-prod`
  - `flowstock-exports-*`, `flowstock-imports-*`

### 6. CI/CD Pipeline

**Outil :** GitHub Actions (ou équivalent) orchestrant :
- Build & tests
- Build images Docker
- Push vers Artifact Registry
- Déploiement Cloud Run
- Migrations DB

**Workflow typique (main) :**

```yaml
name: CI/CD

on:
  push:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm

      - name: Install deps
        run: pnpm install

      - name: Run tests & lint
        run: |
          pnpm lint
          pnpm test

      - name: Build apps
        run: pnpm build

      - name: Configure gcloud
        uses: google-github-actions/auth@v2
        with:
          workload_identity_provider: ${{ secrets.GCP_WORKLOAD_ID_PROVIDER }}
          service_account: ${{ secrets.GCP_SERVICE_ACCOUNT_EMAIL }}

      - uses: google-github-actions/setup-gcloud@v2
        with:
          project_id: ${{ secrets.GCP_PROJECT_ID }}

      - name: Build & push Docker images
        run: |
          gcloud builds submit --tag europe-west1-docker.pkg.dev/$PROJECT_ID/flowstock/flowstock-api-gateway ./apps/api
          # ... idem pour autres services

      - name: Deploy to Cloud Run
        run: |
          gcloud run deploy flowstock-api-gateway \\
            --image europe-west1-docker.pkg.dev/$PROJECT_ID/flowstock/flowstock-api-gateway \\
            --region europe-west1 \\
            --platform managed \\
            --allow-unauthenticated
          # ... idem pour autres services
```

**Branches & environnements :**
- **`feature/*` branches :** CI (lint + tests), déploiement optionnel vers environnements preview
- **`main` :** Déploiement staging + (après validation) déploiement production
- **`release/*` tags :** Déclenche déploiement production stable

### 7. Rollback Strategy

**Cloud Run :**
- Historique des révisions conservé par service
- Rollback = promotion d’une révision précédente comme active
- Possibilité de déployer blue/green (nouvelle révision en parallèle puis switch trafic)

**Base de données :**
- Migrations versionnées (Prisma)
- Stratégie :
  - Migrations **backwards compatible** autant que possible
  - En cas de rollback application, DB reste compatible
  - Pour migrations breaking, prévoir scripts de rollback dédiés

**Images Docker :**
- Tags versionnés (`release-1.2.3`) permettent redeploiement exact

### 8. Observability & Monitoring (Vue Déploiement)

**Cloud Logging :**
- Tous les services écrivent dans stdout/stderr
- Logs centralisés dans Cloud Logging
- Filtres par service, severity, requestId

**Cloud Monitoring :**
- Dashboards pour :
  - Latence API
  - Taux d’erreurs par service
  - Concurrence & autoscaling
  - Utilisation CPU/mémoire

**Alerting :**
- Alertes sur :
  - Taux d’erreurs > X% pendant Y minutes
  - Latence P95 au‑dessus d’un seuil
  - Erreurs spécifiques (par ex. `INTERNAL_ERROR`, `SERVICE_UNAVAILABLE`)

### 9. Environments Table

| Environment | Frontend URL | API URL | Description | Déploiement |
|------------|--------------|---------|-------------|-------------|
| Dev (local) | `http://localhost:5173` | `http://localhost:3000` | Dev local sur machine dev | `pnpm dev` + Docker Compose |
| Staging | `https://staging.app.flowstock.io` | `https://staging-api.flowstock.io` | Pré-production, tests intégration | Auto depuis `main` |
| Production | `https://app.flowstock.io` | `https://api.flowstock.io` | Environnement client live | Auto depuis releases ou `main` approuvée |

---

## Security and Performance

Cette section décrit les exigences et patterns de **sécurité** et **performance** pour l'ensemble du système (frontend, backend, ML et infrastructure). Elle complète les choix d'architecture et de déploiement pour assurer un service fiable, sécurisé et rapide.

### 1. Security

#### 1.1 Authentication & Authorization

- **Auth principale:** JWT stateless avec :
  - Access tokens courte durée (15 minutes)
  - Refresh tokens longue durée (7 jours) stockés de manière sécurisée
- **Stockage tokens côté frontend :**
  - Access token en mémoire (Zustand), jamais dans localStorage
  - Refresh token stocké dans cookie `httpOnly` (recommandé pour prod) ou localStorage chiffré si nécessaire
- **Rôles & permissions :**
  - Rôles simples : `owner`, `admin`, `user`
  - Contrôle d'accès au niveau service/API selon rôle + tier d'abonnement
  - Middleware d'authorization spécifique pour endpoints sensibles (auto-commands, ML admin, etc.)

#### 1.2 Data Security

- **Encryption in transit :**
  - HTTPS/TLS pour toutes les communications externes (frontend ↔ API, API ↔ services externes)
  - Connexions DB (Cloud SQL) via SSL/TLS
- **Encryption at rest :**
  - Cloud SQL, BigQuery, Cloud Storage chiffrés par GCP (KMS géré)
  - Option futures : CMEK (Customer-Managed Encryption Keys) pour clients enterprise
- **Data isolation/multi-tenant :**
  - `tenant_id` sur toutes les tables métier + RLS PostgreSQL
  - Aucun endpoint ne permet de filtrer explicitement sur un autre `tenant_id`
- **Sensitive data :**
  - Hash mots de passe avec `bcrypt` (cost factor adapté, ex: 12)
  - Pas de stockage de données cartes bancaires (paiement géré par terminaux externes)
  - Logs ne contiennent jamais de données sensibles (mots de passe, tokens complets, secrets)

#### 1.3 API & Service Security

- **Rate limiting :**
  - Rate limiting au niveau API Gateway par IP + tenant
  - Seuils par tier d'abonnement (Normal/Premium/Premium+)
- **Input validation :**
  - Validation systématique des inputs avec Zod côté backend
  - Sanitization des champs texte (pour éviter injections, XSS/reflected)
- **CORS :**
  - Origines autorisées restreintes (`FRONTEND_URL` par environnement)
  - Credentials uniquement si nécessaire
- **Protection contre attaques communes :**
  - CSRF : non applicable pour APIs purement stateless + JWT, mais à considérer si cookies `httpOnly` sont utilisés
  - XSS : encodage sortie côté frontend, composants UI sûrs, pas de `dangerouslySetInnerHTML` sauf cas contrôlés
  - SQL Injection : Prisma/ORM, pas de concaténation SQL manuelle
  - SSRF : Pas d'appels arbitraires vers URLs user-provided sans validation

#### 1.4 Infrastructure Security

- **IAM :**
  - Principe du moindre privilège pour tous les service accounts GCP
  - Service accounts séparés par service (API Gateway, ML, etc.)
- **Networking :**
  - Utilisation de VPC pour limiter exposition des services internes
  - Cloud Run services potentiellement accessibles uniquement via API Gateway (backend-only endpoints)
- **Secrets :**
  - Tous secrets gérés via **Secret Manager**
  - Rotation régulière (90 jours) des clés et secrets critiques

#### 1.5 Auditing & Compliance (MVP)

- **Logs d'accès :**
  - Logging des appels API critiques (auth, commandes, factures, ML retrain)
  - Corrélation via `request_id`
- **Traçabilité inventaire :**
  - `stock_movements` sert de log d'audit pour tous mouvements de stock

---

### 2. Performance

#### 2.1 Frontend Performance

**Objectifs :**
- Temps de chargement initial raisonnable sur connexions PME (3G/4G)
- Navigation fluide dans dashboard et listes (produits, commandes)

**Techniques :**
- **Vite + code splitting :**
  - Lazy loading des pages lourdes (Predictions, Invoices)
  - Découpage par routes et chunks logiques
- **Caching via React Query :**
  - `staleTime` et `cacheTime` configurés pour limiter refetch
  - Pré-fetch des données critiques (dashboard, produits les plus consultés)
- **UI optimisée :**
  - Pagination côté serveur sur toutes les grosses listes (produits, ventes, commandes)
  - Composants listés optimisés (`React.memo`, virtualization si nécessaire)
- **Images :**
  - Format WebP pour assets
  - Lazy loading des images de factures

#### 2.2 Backend Performance

**Objectifs :**
- NFR : réponse < 2s pour visualisation de stock, < 5s pour prédictions IA

**Patterns :**
- **DB :**
  - Indexes sur colonnes fréquemment filtrées (tenant_id, status, dates, foreign keys)
  - Partitionnement/time-series pour tables de ventes si volumétrie importante
- **Caching :**
  - Redis pour :
    - Résultats de prédictions populaires
    - Dashboard summary
    - Configurations tenant (settings)
- **API :**
  - Endpoints REST optimisés (sélection colonnes nécessaires, pas de sur-fetch)
  - Pagination et filtrage côté SQL, pas côté mémoire
- **Asynchronisme :**
  - Tâches lourdes (réentraînement ML, sync ventes, OCR factures) traitées asynchrones via Pub/Sub

#### 2.3 ML Performance

**Objectifs :**
- Réentraînement quotidien en fenêtre nocturne acceptable (ex: < 1h)
- Prédictions < 2-3 secondes pour UX fluide

**Optimisations :**
- **Batching :**
  - Appels batch à Vertex AI pour prédictions multi-produits
- **Feature store :**
  - Utilisation BigQuery + caches en mémoire pour features ML
- **Monitoring modèles :**
  - Suivi latency endpoints ML
  - Suivi taux erreurs et dégradation de performance modèles

---

### 3. Performance Monitoring & Tuning

- **Metrics clés :**
  - P95 latence par endpoint
  - Taux d'erreurs (4xx, 5xx) par service
  - Temps de réponse moyenne ML
  - Temps moyen de génération dashboard
- **Outillage :**
  - Google Cloud Monitoring + alertes
  - Profils de performance (Node.js, Python) si nécessaire
  - Logs de timings dans endpoints critiques

---

Cette section sécurité et performance complète les choix d'architecture, de stack et de déploiement pour garantir un système robuste, sûr et performant, prêt pour une montée en charge progressive avec les PME clientes.

---

## Testing Strategy

Cette section définit la stratégie de tests complète pour le système FlowStock, couvrant les tests unitaires, d'intégration, E2E, et ML. Elle suit la pyramide de tests avec une base large de tests unitaires et une pointe étroite de tests E2E.

### 1. Testing Pyramid

```
        /\
       /  \      E2E Tests (Playwright)
      /____\     - Critical user journeys
     /      \    
    /        \   Integration Tests
   /__________\  - API endpoints
  /            \ 
 /              \ Unit Tests
/________________\ - Components, Services, Utils
```

**Répartition cible :**
- **70% Unit Tests** - Tests rapides, isolés, nombreux
- **20% Integration Tests** - Tests API, DB, services
- **10% E2E Tests** - Tests user journeys critiques

### 2. Frontend Testing

#### 2.1 Unit Tests (Vitest + React Testing Library)

**Outils :**
- **Vitest** : Runner de tests (compatible Vite, rapide)
- **React Testing Library** : Testing des composants React
- **@testing-library/user-event** : Simulation interactions utilisateur

**Ce qui est testé :**
- Composants UI isolés (rendu, props, interactions)
- Hooks custom (useProducts, useAuth, etc.)
- Utilitaires et helpers
- Services API (mocking des appels HTTP)

**Exemple test composant :**

```typescript
// components/products/__tests__/ProductCard.test.tsx
import { render, screen } from '@testing-library/react';
import { ProductCard } from '../ProductCard';
import { Product } from '@flowstock/shared/types';

const mockProduct: Product = {
  id: '1',
  tenantId: 'tenant-1',
  sku: 'TEST-001',
  name: 'Test Product',
  currentQuantity: 10,
  minQuantity: 5,
  stockStatus: 'ok',
  // ... autres champs
};

describe('ProductCard', () => {
  it('renders product information correctly', () => {
    render(<ProductCard product={mockProduct} />);
    
    expect(screen.getByText('Test Product')).toBeInTheDocument();
    expect(screen.getByText('TEST-001')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
  });

  it('shows low stock badge when stock is low', () => {
    const lowStockProduct = { ...mockProduct, stockStatus: 'low' };
    render(<ProductCard product={lowStockProduct} />);
    
    expect(screen.getByText('low')).toBeInTheDocument();
  });

  it('calls onSelect when clicked', async () => {
    const onSelect = vi.fn();
    const { user } = render(<ProductCard product={mockProduct} onSelect={onSelect} />);
    
    await user.click(screen.getByRole('button'));
    expect(onSelect).toHaveBeenCalledWith(mockProduct);
  });
});
```

**Exemple test hook :**

```typescript
// hooks/__tests__/useProducts.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useProducts } from '../useProducts';
import { productsService } from '@/services/productsService';

vi.mock('@/services/productsService');

describe('useProducts', () => {
  it('fetches products successfully', async () => {
    const mockProducts = [{ id: '1', name: 'Product 1' }];
    vi.mocked(productsService.getAll).mockResolvedValue(mockProducts);

    const queryClient = new QueryClient();
    const wrapper = ({ children }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useProducts(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockProducts);
  });
});
```

**Coverage cible :** 80%+ pour composants et hooks critiques

#### 2.2 Integration Tests (Frontend)

**Ce qui est testé :**
- Intégration composants + hooks + services
- Flows utilisateur complets dans une page
- Gestion d'erreurs API

**Exemple :**

```typescript
// features/products/__tests__/ProductsPage.integration.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import { ProductsPage } from '../ProductsPage';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

describe('ProductsPage Integration', () => {
  it('loads and displays products list', async () => {
    // Mock API responses
    // Render page
    // Assert products are displayed
  });
});
```

#### 2.3 E2E Tests (Playwright)

**Outils :**
- **Playwright** : Tests navigateur cross-browser
- **@playwright/test** : Framework de tests

**User journeys testés :**
- Inscription et connexion
- Création produit
- Visualisation dashboard
- Création commande depuis recommandations IA
- Upload et traitement facture (Premium Plus)

**Exemple test E2E :**

```typescript
// tests/e2e/products.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Products Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/auth/login');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
  });

  test('should create a new product', async ({ page }) => {
    await page.goto('/products');
    await page.click('text=Add Product');
    
    await page.fill('[name="sku"]', 'E2E-TEST-001');
    await page.fill('[name="name"]', 'E2E Test Product');
    await page.fill('[name="quantity"]', '50');
    await page.fill('[name="minQuantity"]', '10');
    
    await page.click('button[type="submit"]');
    
    await expect(page.locator('text=E2E Test Product')).toBeVisible();
  });

  test('should filter products by low stock', async ({ page }) => {
    await page.goto('/products');
    await page.check('[name="lowStock"]');
    
    // Assert only low stock products are shown
    const products = page.locator('[data-testid="product-card"]');
    await expect(products).toHaveCount(/* expected count */);
  });
});
```

**Configuration Playwright :**

```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: process.env.FRONTEND_URL || 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
  ],
});
```

---

### 3. Backend Testing

#### 3.1 Unit Tests (Jest)

**Outils :**
- **Jest** : Framework de tests Node.js
- **Supertest** : Tests HTTP (pour tests d'intégration)
- **@types/jest** : Types TypeScript

**Ce qui est testé :**
- Services métier (logique business pure)
- Repositories (mocking Prisma)
- Utilitaires et helpers
- Validation schemas (Zod)

**Exemple test service :**

```typescript
// services/__tests__/products.service.test.ts
import { ProductsService } from '../products.service';
import { ProductsRepository } from '../../repositories/products.repository';
import { AppError } from '../../utils/errors';

describe('ProductsService', () => {
  let service: ProductsService;
  let mockRepository: jest.Mocked<ProductsRepository>;

  beforeEach(() => {
    mockRepository = {
      findAll: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
    } as any;

    service = new ProductsService(mockRepository, ...);
  });

  describe('getAll', () => {
    it('should return products with pagination', async () => {
      const mockProducts = [{ id: '1', name: 'Product 1' }];
      mockRepository.findAll.mockResolvedValue({
        products: mockProducts,
        total: 1,
      });

      const result = await service.getAll('tenant-1', { page: 1, limit: 20 });

      expect(result.products).toEqual(mockProducts);
      expect(result.pagination.total).toBe(1);
    });
  });

  describe('create', () => {
    it('should throw error if SKU already exists', async () => {
      mockRepository.findBySku.mockResolvedValue({ id: '1', sku: 'EXISTING' } as any);

      await expect(
        service.create('tenant-1', 'user-1', { sku: 'EXISTING', name: 'Test' })
      ).rejects.toThrow(AppError);
    });
  });
});
```

**Exemple test repository (avec Prisma mock) :**

```typescript
// repositories/__tests__/products.repository.test.ts
import { ProductsRepository } from '../products.repository';
import { PrismaClient } from '@prisma/client';

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(),
}));

describe('ProductsRepository', () => {
  let repository: ProductsRepository;
  let mockPrisma: jest.Mocked<PrismaClient>;

  beforeEach(() => {
    mockPrisma = {
      product: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
      },
    } as any;

    repository = new ProductsRepository(mockPrisma as any);
  });

  it('should filter by tenant_id', async () => {
    await repository.findAll('tenant-1', { page: 1, limit: 20 });

    expect(mockPrisma.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ tenantId: 'tenant-1' }),
      })
    );
  });
});
```

#### 3.2 Integration Tests (Supertest)

**Ce qui est testé :**
- Endpoints API complets (routes → controllers → services → DB)
- Authentification et authorization
- Validation des inputs
- Gestion d'erreurs

**Setup test DB :**

```typescript
// tests/setup.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

beforeAll(async () => {
  // Setup test database
  await prisma.$connect();
});

afterAll(async () => {
  await prisma.$disconnect();
});

beforeEach(async () => {
  // Clean database before each test
  await prisma.product.deleteMany();
  await prisma.tenant.deleteMany();
});
```

**Exemple test intégration API :**

```typescript
// routes/__tests__/products.routes.integration.test.ts
import request from 'supertest';
import app from '../../index';
import { createTestUser, createTestTenant } from '../helpers/test-helpers';

describe('Products API Integration', () => {
  let authToken: string;
  let tenantId: string;

  beforeAll(async () => {
    const { tenant, user, token } = await createTestUser();
    tenantId = tenant.id;
    authToken = token;
  });

  describe('GET /api/v1/products', () => {
    it('should return 401 without auth', async () => {
      const response = await request(app).get('/api/v1/products');
      expect(response.status).toBe(401);
    });

    it('should return products for authenticated user', async () => {
      const response = await request(app)
        .get('/api/v1/products')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('POST /api/v1/products', () => {
    it('should create product with valid data', async () => {
      const productData = {
        sku: 'INT-TEST-001',
        name: 'Integration Test Product',
        quantity: 100,
        minQuantity: 20,
      };

      const response = await request(app)
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${authToken}`)
        .send(productData);

      expect(response.status).toBe(201);
      expect(response.body.data.sku).toBe(productData.sku);
    });

    it('should return 400 with invalid data', async () => {
      const response = await request(app)
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ sku: '' }); // Invalid

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });
});
```

---

### 4. ML Service Testing

#### 4.1 Unit Tests (pytest)

**Outils :**
- **pytest** : Framework de tests Python
- **pytest-mock** : Mocking
- **pytest-asyncio** : Tests async

**Ce qui est testé :**
- Fonctions de preprocessing données
- Logique de feature engineering
- Validation des inputs ML
- Parsing des réponses Vertex AI

**Exemple test ML :**

```python
# tests/test_ml_service.py
import pytest
from app.services.prediction_service import PredictionService
from app.models.product import Product

def test_prepare_features():
    service = PredictionService()
    sales_history = [10, 12, 15, 14, 16]
    features = service.prepare_features(sales_history, current_stock=50)
    
    assert 'avg_daily_consumption' in features
    assert features['avg_daily_consumption'] > 0

@pytest.mark.asyncio
async def test_get_prediction(mock_vertex_ai):
    service = PredictionService()
    prediction = await service.get_prediction('product-1', 'tenant-1')
    
    assert prediction['predicted_rupture_date'] is not None
    assert 0 <= prediction['confidence'] <= 1
```

#### 4.2 Integration Tests ML

**Ce qui est testé :**
- Endpoints FastAPI complets
- Intégration avec Vertex AI (mocking)
- Intégration avec BigQuery (test DB)

---

### 5. Test Data Management

#### 5.1 Fixtures & Factories

**Frontend (Vitest) :**

```typescript
// tests/fixtures/products.ts
import { Product } from '@flowstock/shared/types';

export const createMockProduct = (overrides?: Partial<Product>): Product => ({
  id: '1',
  tenantId: 'tenant-1',
  sku: 'TEST-001',
  name: 'Test Product',
  currentQuantity: 10,
  minQuantity: 5,
  // ... defaults
  ...overrides,
});
```

**Backend (Jest) :**

```typescript
// tests/factories/product.factory.ts
import { Prisma } from '@prisma/client';

export const createProductData = (
  tenantId: string,
  overrides?: Partial<Prisma.ProductCreateInput>
): Prisma.ProductCreateInput => ({
  tenant: { connect: { id: tenantId } },
  sku: 'FACTORY-001',
  name: 'Factory Product',
  currentQuantity: 100,
  // ... defaults
  ...overrides,
});
```

#### 5.2 Test Database

**Stratégie :**
- Base de données de test séparée (`flowstock_test`)
- Reset avant chaque suite de tests d'intégration
- Seeds pour données de référence (tenants, users de test)

---

### 6. Test Coverage & CI/CD

#### 6.1 Coverage Targets

- **Unit Tests :** 80%+ coverage
- **Integration Tests :** Couvrir tous les endpoints critiques
- **E2E Tests :** Tous les user journeys critiques

**Outils :**
- **Vitest coverage** : `vitest --coverage`
- **Jest coverage** : `jest --coverage`
- **pytest-cov** : `pytest --cov`

#### 6.2 CI/CD Integration

**GitHub Actions workflow :**

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      
      - run: pnpm install
      - run: pnpm test --filter=@flowstock/web
      - run: pnpm test:e2e --filter=@flowstock/web

  test-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
      
      - run: pnpm install
      - run: pnpm test --filter=@flowstock/stocks-service
      # ... autres services

  test-ml:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      
      - run: pip install -r apps/ml-service/requirements.txt
      - run: pytest apps/ml-service/tests
```

---

### 7. Testing Best Practices

#### 7.1 Principes

- **Tests isolés :** Chaque test indépendant, pas de dépendances entre tests
- **Tests rapides :** Unit tests < 100ms, integration < 1s
- **Tests déterministes :** Pas de flakiness, utiliser mocks pour données aléatoires
- **Tests maintenables :** Code de test clair, réutilisable (fixtures)

#### 7.2 Naming Conventions

- **Fichiers :** `*.test.ts`, `*.spec.ts`, `*.test.tsx`
- **Describe blocks :** Nom de la fonction/classe testée
- **Test names :** `should [expected behavior] when [condition]`

**Exemple :**
```typescript
describe('ProductsService', () => {
  describe('create', () => {
    it('should create product when SKU is unique', () => {});
    it('should throw error when SKU already exists', () => {});
  });
});
```

---

Cette stratégie de tests fournit une couverture complète du système avec une approche pyramidale efficace, garantissant qualité et confiance dans les déploiements.

---

## Coding Standards

Cette section définit les standards de codage **critiques et minimaux** pour l'implémentation par des agents IA. Ces règles sont conçues pour être explicites, non ambiguës, et prévenir les erreurs communes. Elles complètent les configurations ESLint/Prettier existantes.

### 1. Principes Généraux

**Règles d'or pour agents IA :**
- **Explicite > Implicite** : Toujours être explicite, éviter la magie
- **Type Safety** : TypeScript strict partout, jamais `any` sauf cas exceptionnels documentés
- **Consistance** : Suivre les patterns établis dans le codebase existant
- **Simplicité** : Préférer code simple et lisible à code "intelligent"
- **Documentation** : Commenter pourquoi, pas quoi (code auto-documenté)

### 2. TypeScript Standards

#### 2.1 Types & Interfaces

**Règles strictes :**
- **Toujours typer explicitement** les paramètres de fonction et valeurs de retour
- **Utiliser types partagés** depuis `@flowstock/shared/types`, ne pas redéfinir
- **Interfaces > Types** pour objets extensibles
- **Types utilitaires** : Utiliser `Pick`, `Omit`, `Partial` quand approprié

**✅ Bon :**
```typescript
import { Product, CreateProductDto } from '@flowstock/shared/types';

function createProduct(data: CreateProductDto): Promise<Product> {
  // ...
}
```

**❌ Mauvais :**
```typescript
function createProduct(data: any): any {
  // ...
}
```

#### 2.2 Null Safety

- **Toujours gérer null/undefined** explicitement
- **Utiliser optional chaining** (`?.`) et nullish coalescing (`??`)
- **Ne pas utiliser `!` (non-null assertion)** sauf cas très spécifiques documentés

**✅ Bon :**
```typescript
const quantity = product.maxQuantity ?? product.minQuantity * 2;
const supplierName = product.supplier?.name ?? 'Unknown';
```

**❌ Mauvais :**
```typescript
const quantity = product.maxQuantity!; // Risque runtime error
```

#### 2.3 Imports

- **Imports nommés** pour types et fonctions
- **Imports absolus** avec alias `@/` pour frontend, chemins relatifs pour backend
- **Grouper imports** : externes → internes → types

**✅ Bon :**
```typescript
import { useState, useEffect } from 'react';
import { Product } from '@flowstock/shared/types';
import { productsService } from '@/services/productsService';
import { formatDate } from '@/lib/utils';
```

**❌ Mauvais :**
```typescript
import * as React from 'react'; // Trop verbeux
import Product from '../../../shared/types'; // Chemins relatifs profonds
```

### 3. Frontend Standards (React)

#### 3.1 Composants

**Règles critiques :**
- **Composants fonctionnels uniquement** (pas de classes)
- **Props interface explicite** avant composant
- **Destructuring props** dans signature fonction
- **Keys uniques** pour listes (jamais index sauf liste statique)

**✅ Bon :**
```typescript
interface ProductCardProps {
  product: Product;
  onSelect?: (product: Product) => void;
}

export function ProductCard({ product, onSelect }: ProductCardProps) {
  return (
    <Card onClick={() => onSelect?.(product)}>
      {/* ... */}
    </Card>
  );
}
```

**❌ Mauvais :**
```typescript
export function ProductCard(props: any) {
  return <Card onClick={props.onSelect}>{props.product.name}</Card>;
}
```

#### 3.2 Hooks

- **Hooks custom** : Préfixe `use` obligatoire
- **Dépendances useEffect** : Toujours inclure toutes dépendances, utiliser ESLint rule
- **Pas de hooks conditionnels** : Toujours au top level

**✅ Bon :**
```typescript
function useProduct(productId: string) {
  const { data, isLoading } = useQuery({
    queryKey: ['products', productId],
    queryFn: () => productsService.getById(productId),
    enabled: !!productId, // Condition dans config, pas hook conditionnel
  });

  return { product: data, isLoading };
}
```

**❌ Mauvais :**
```typescript
if (productId) {
  const { data } = useQuery(...); // Hook conditionnel = erreur
}
```

#### 3.3 State Management

- **React Query** pour données serveur (toujours)
- **Zustand** pour état UI global (sidebar, theme)
- **useState** pour état composant local uniquement
- **Pas de prop drilling** : Utiliser context ou Zustand si > 2 niveaux

**✅ Bon :**
```typescript
// Données serveur
const { data: products } = useQuery({
  queryKey: ['products'],
  queryFn: productsService.getAll,
});

// État UI global
const { sidebarOpen, toggleSidebar } = useUIStore();

// État local
const [isEditing, setIsEditing] = useState(false);
```

### 4. Backend Standards (Node.js/Express)

#### 4.1 Controllers

**Pattern strict :**
- **Toujours async/await**, jamais callbacks
- **Try/catch avec next(error)** pour gestion erreurs
- **Extraction tenantId/userId** depuis request (défini par middleware)
- **Format réponse standardisé** : `{ success, data, meta }`

**✅ Bon :**
```typescript
async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const tenantId = req.tenantId!;
    const products = await this.productsService.getAll(tenantId, req.query);
    res.status(200).json({
      success: true,
      data: products,
      meta: { timestamp: new Date().toISOString(), request_id: req.requestId },
    });
  } catch (error) {
    next(error);
  }
}
```

**❌ Mauvais :**
```typescript
getAll(req, res) {
  this.productsService.getAll(req.tenantId, req.query).then(products => {
    res.json(products); // Pas de format standardisé, pas de gestion erreur
  });
}
```

#### 4.2 Services

- **Logique métier pure** : Pas de logique HTTP (pas de `req`, `res`)
- **Toujours filtrer par tenantId** : Premier paramètre de toutes les méthodes
- **Validation métier** avant persistance
- **Gérer erreurs métier** avec `AppError` custom

**✅ Bon :**
```typescript
async create(tenantId: string, userId: string, data: CreateProductDto): Promise<Product> {
  // Validation métier
  if (data.minQuantity < 0) {
    throw new AppError('Min quantity must be positive', 400, 'VALIDATION_ERROR');
  }

  // Vérifier SKU unique
  const existing = await this.repository.findBySku(tenantId, data.sku);
  if (existing) {
    throw new AppError('SKU already exists', 409, 'CONFLICT');
  }

  return this.repository.create(tenantId, { ...data, createdBy: userId });
}
```

#### 4.3 Repositories

- **Abstraction DB complète** : Pas de logique métier
- **Toujours filtrer par tenantId** dans where clauses
- **Utiliser Prisma types** : `Prisma.ProductCreateInput`, etc.
- **Transactions** pour opérations atomiques

**✅ Bon :**
```typescript
async create(tenantId: string, data: Prisma.ProductCreateInput): Promise<Product> {
  return this.prisma.product.create({
    data: {
      ...data,
      tenant: { connect: { id: tenantId } },
    },
  });
}
```

### 5. Python/ML Standards

#### 5.1 Type Hints

- **Type hints obligatoires** pour toutes les fonctions publiques
- **Utiliser `typing` module** : `Optional`, `List`, `Dict`, etc.

**✅ Bon :**
```python
from typing import List, Optional
from app.models.product import Product

def get_predictions(tenant_id: str, product_ids: Optional[List[str]] = None) -> List[dict]:
    # ...
```

#### 5.2 FastAPI

- **Pydantic models** pour validation request/response
- **Dependency injection** pour services partagés
- **Error handling** avec `HTTPException`

**✅ Bon :**
```python
from fastapi import HTTPException
from pydantic import BaseModel

class PredictionRequest(BaseModel):
    product_id: str
    tenant_id: str

@app.post("/predictions")
async def get_prediction(request: PredictionRequest) -> PredictionResponse:
    if not request.product_id:
        raise HTTPException(status_code=400, detail="product_id required")
    # ...
```

### 6. Conventions de Nommage

#### 6.1 Variables & Functions

- **camelCase** pour variables et fonctions
- **PascalCase** pour composants React et classes
- **UPPER_SNAKE_CASE** pour constantes
- **Noms descriptifs** : `productList` pas `list`, `getUserById` pas `get`

**✅ Bon :**
```typescript
const PRODUCTS_PER_PAGE = 20;
const productList = await getProducts();
const user = await getUserById(userId);
```

**❌ Mauvais :**
```typescript
const x = 20;
const list = await get();
const u = await getU(id);
```

#### 6.2 Files & Directories

- **Fichiers** : `kebab-case.ts` (ex: `product-card.tsx`, `products.service.ts`)
- **Dossiers** : `kebab-case` ou `camelCase` selon convention workspace
- **Composants React** : `PascalCase.tsx` (ex: `ProductCard.tsx`)

### 7. Structure de Code

#### 7.1 Ordre dans Fichiers

**Frontend (React) :**
1. Imports (externes → internes → types)
2. Types/interfaces
3. Composant principal
4. Hooks custom (si dans même fichier)
5. Utilitaires locaux

**Backend (Service) :**
1. Imports
2. Types/interfaces
3. Classe avec méthodes publiques d'abord
4. Méthodes privées à la fin

#### 7.2 Fonction Length

- **Maximum 50 lignes** par fonction (idéalement < 30)
- **Extraire logique complexe** dans fonctions helpers
- **Single Responsibility** : Une fonction = une responsabilité

### 8. Error Handling

#### 8.1 Frontend

- **Toujours gérer erreurs** dans React Query avec `onError`
- **Afficher messages utilisateur** clairs (pas de stack traces)
- **Error boundaries** pour erreurs React

**✅ Bon :**
```typescript
const { data, error } = useQuery({
  queryKey: ['products'],
  queryFn: productsService.getAll,
  onError: (error) => {
    toast.error('Failed to load products. Please try again.');
  },
});
```

#### 8.2 Backend

- **AppError custom** pour erreurs métier
- **Toujours passer erreurs** à `next()` dans controllers
- **Middleware error handler** centralisé

**✅ Bon :**
```typescript
try {
  const product = await this.service.getById(tenantId, productId);
  if (!product) {
    throw new AppError('Product not found', 404, 'NOT_FOUND');
  }
  // ...
} catch (error) {
  next(error); // Passe à error middleware
}
```

### 9. Documentation

#### 9.1 Comments

- **Commenter pourquoi**, pas quoi
- **JSDoc** pour fonctions publiques complexes
- **TODO comments** avec contexte : `// TODO: Optimize query when we have > 1000 products`

**✅ Bon :**
```typescript
/**
 * Calculates predicted stockout date based on sales history.
 * Uses exponential smoothing to account for trends.
 */
function calculateStockoutDate(salesHistory: number[], currentStock: number): Date {
  // Exponential smoothing alpha = 0.3 for recent sales weighting
  const avgConsumption = calculateSmoothedAverage(salesHistory, 0.3);
  // ...
}
```

#### 9.2 README

- **README.md** dans chaque workspace avec :
  - Description du service
  - Setup local
  - Commandes principales
  - Variables d'environnement

### 10. Règles Critiques Anti-Erreurs

#### 10.1 Multi-Tenancy

**⚠️ CRITIQUE :**
- **Toujours filtrer par tenantId** : Premier paramètre, toujours vérifié
- **Jamais de requête sans tenantId** : Même pour admin
- **Vérifier tenantId dans middleware** avant d'atteindre controllers

**✅ Bon :**
```typescript
async getAll(tenantId: string, filters: ProductFilters) {
  return this.repository.findAll(tenantId, filters); // tenantId toujours premier
}
```

**❌ Mauvais :**
```typescript
async getAll(filters: ProductFilters) {
  return this.repository.findAll(filters); // OUBLI tenantId = fuite données!
}
```

#### 10.2 Database Queries

- **Toujours utiliser Prisma/ORM** : Jamais de SQL brut concaténé
- **Vérifier résultats null** avant utilisation
- **Transactions** pour opérations multiples

#### 10.3 API Calls

- **Toujours gérer erreurs** : Try/catch ou `.catch()`
- **Timeout configuré** pour appels externes
- **Retry logic** pour erreurs temporaires (si applicable)

#### 10.4 Environment Variables

- **Validation Zod** pour env vars au démarrage
- **Jamais de valeurs hardcodées** : Secrets, URLs, configs
- **Types pour env vars** : `process.env.VITE_API_URL` → typer

### 11. Code Review Checklist (pour Agents IA)

Avant de considérer code complet, vérifier :

- [ ] Tous les types TypeScript définis (pas de `any`)
- [ ] `tenantId` présent et vérifié partout
- [ ] Gestion d'erreurs complète (try/catch, onError)
- [ ] Format réponse API standardisé
- [ ] Validation inputs (Zod schemas)
- [ ] Tests écrits pour nouvelle fonctionnalité
- [ ] Pas de secrets hardcodés
- [ ] Logging approprié pour actions critiques
- [ ] Documentation (JSDoc si nécessaire)

---

Ces standards de codage fournissent des règles claires et explicites pour l'implémentation par des agents IA, minimisant les erreurs communes et garantissant la cohérence du codebase.

---

## Error Handling Strategy

Cette section définit une stratégie de gestion d'erreurs unifiée pour le frontend, le backend et le service ML. L'objectif est d'avoir :
- Un **format d'erreur standard** côté API
- Des **patterns clairs** pour lever, logger et afficher les erreurs
- Une **expérience utilisateur cohérente** pour les erreurs fonctionnelles et techniques

### 1. Format d'Erreur Standard (API)

Toutes les APIs REST retournent, en cas d'erreur, un payload de la forme :

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format"
      }
    ]
  },
  "meta": {
    "timestamp": "2026-01-21T22:00:00Z",
    "request_id": "uuid"
  }
}
```

**Champs :**
- `error.code` : code machine lisible (ex: `VALIDATION_ERROR`, `UNAUTHORIZED`, `NOT_FOUND`)
- `error.message` : message humain lisible (en anglais, UI peut traduire si nécessaire)
- `error.details` : optionnel, liste de détails (surtout pour validation)
- `meta.request_id` : ID de requête pour corrélation logs

### 2. Backend Error Handling

#### 2.1 AppError Custom

**Classe d'erreur métier :**

```typescript
// utils/errors.ts
export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code: string = 'INTERNAL_ERROR',
    public details?: Array<{ field?: string; message: string }>
  ) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
```

**Règles :**
- **Toujours lever AppError** pour erreurs métier prévisibles (validation, not found, forbidden)
- **Ne jamais** exposer messages internes (stack, erreurs DB) dans `message` pour client
- Utiliser des `code` cohérents avec table d'erreurs (`docs/api-specifications.md`)

#### 2.2 Error Handler Middleware

**Pattern global :**
- Tous les controllers utilisent `try/catch` et `next(error)`
- Middleware `errorHandler` unique à la fin de la chaîne Express
- `AppError` → mapping direct vers format standard
- Erreurs non gérées → `500 INTERNAL_ERROR` générique

```typescript
// middleware/error.middleware.ts
export function errorHandler(
  err: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  logger.error('Error occurred', {
    error: err.message,
    stack: err.stack,
    requestId: req.requestId,
    path: req.path,
    method: req.method,
  });

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        ...(err.details && { details: err.details }),
      },
      meta: {
        timestamp: new Date().toISOString(),
        request_id: req.requestId,
      },
    });
    return;
  }

  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    },
    meta: {
      timestamp: new Date().toISOString(),
      request_id: req.requestId,
    },
  });
}
```

#### 2.3 Validation Errors

**Pattern avec Zod :**

```typescript
// middleware/validation.middleware.ts
if (error instanceof ZodError) {
  const details = error.errors.map((err) => ({
    field: err.path.join('.'),
    message: err.message,
  }));
  return next(new AppError('Validation error', 400, 'VALIDATION_ERROR', details));
}
```

### 3. Frontend Error Handling

#### 3.1 React Query

**Gestion erreurs API standardisées :**

```typescript
function useProducts() {
  const { toast } = useToast();

  return useQuery({
    queryKey: ['products'],
    queryFn: productsService.getAll,
    onError: (error) => {
      const apiError = toApiError(error);
      if (apiError.code === 'UNAUTHORIZED') {
        // Rediriger vers login ou rafraîchir token
      }
      toast({
        variant: 'destructive',
        title: 'Erreur de chargement',
        description: apiError.message ?? 'Impossible de charger les produits.',
      });
    },
  });
}
```

**Helper de mapping erreurs :**

```typescript
// lib/api-error.ts
export interface ApiError {
  code: string;
  message: string;
  details?: Array<{ field?: string; message: string }>;
}

export function toApiError(error: unknown): ApiError {
  // axios error
  if (axios.isAxiosError(error) && error.response?.data?.error) {
    return error.response.data.error;
  }
  return {
    code: 'INTERNAL_ERROR',
    message: 'Une erreur inattendue est survenue. Veuillez réessayer.',
  };
}
```

#### 3.2 UX d’Erreur

**Principes :**
- Messages d’erreur **clairs et humains**, jamais techniques
- Différencier :
  - **Erreurs de validation** (infos manquantes, format incorrect)
  - **Erreurs fonctionnelles** (mauvais statut, action impossible)
  - **Erreurs techniques** (serveur indisponible, timeout)
- Utiliser composants cohérents (Alert, Toast, inline errors)

### 4. ML Error Handling

#### 4.1 FastAPI

- Utiliser `HTTPException` pour erreurs HTTP
- Retourner format cohérent (succès/erreur) avec API principale
- Ne jamais exposer stack traces ou détails internes aux clients

```python
from fastapi import HTTPException

@app.post(\"/predictions\")\nasync def get_prediction(request: PredictionRequest) -> PredictionResponse:\n    try:\n        # ... logique ML\n    except ModelNotFoundError:\n        raise HTTPException(status_code=503, detail={\n            \"code\": \"ML_MODEL_UNAVAILABLE\",\n            \"message\": \"Le modèle de prédiction n'est pas disponible pour le moment.\",\n        })\n    except Exception as e:\n        logger.exception(\"Unexpected ML error\")\n        raise HTTPException(status_code=500, detail={\n            \"code\": \"INTERNAL_ERROR\",\n            \"message\": \"Erreur interne du service ML.\",\n        })\n```

#### 4.2 Robustesse

- **Timeouts** pour appels Vertex AI et BigQuery
- **Retries** avec backoff pour erreurs temporaires
- Fallback vers valeurs par défaut ou messages explicites si ML indisponible

### 5. Logging & Observability

- **Request ID** : Middleware qui ajoute `requestId` à chaque requête + logs
- **Context** : Logs incluent tenantId, userId si disponibles
- **Levels** :
  - `info` : événements normaux (création produit, commande)
  - `warn` : comportements inattendus mais non bloquants
  - `error` : erreurs bloquantes ou exceptions

### 6. Résumé des Règles Critiques

- **Backend** :
  - Toujours `try/catch` dans controllers et `next(error)`
  - Lever `AppError` pour toutes erreurs métier contrôlées
  - Ne jamais exposer stack/error internes au client
- **Frontend** :
  - Toujours gérer `onError` dans React Query
  - Utiliser mapping `toApiError` pour erreurs API
  - Afficher messages utilisateur clairs
- **ML** :
  - Utiliser `HTTPException` avec codes cohérents
  - Logger exceptions avec contexte (tenant, product)

---

Cette stratégie de gestion d'erreurs unifiée garantit une expérience cohérente pour les utilisateurs, facilite le debugging et la corrélation des événements, et réduit le risque de fuite d'informations sensibles.

---

## Monitoring and Observability

Cette section décrit la stratégie de **monitoring** et **observabilité** pour le système FlowStock, couvrant logs, métriques, traces et alerting. Objectif : rendre les incidents visibles rapidement, diagnostiquer efficacement, et suivre la santé globale du système.

### 1. Objectifs d’Observabilité

- **Visibilité** sur :
  - Santé des services (up/down, erreurs, latence)
  - Santé de la base de données et de l’infra
  - Qualité des prédictions ML
- **Diagnostic rapide** :
  - Pouvoir remonter d’une alerte (ex: latence élevée) à une requête concrète
  - Suivre un `request_id` à travers les services
- **Données pour amélioration continue** :
  - Identifier endpoints lents, services instables, modèles ML dégradés

### 2. Logging Strategy

#### 2.1 Standards de Logging

- **Format structuré** (JSON) pour exploitation par Cloud Logging / outils d’analyse
- Logguer au minimum :
  - `timestamp`
  - `level` (`info`, `warn`, `error`)
  - `service` (api-gateway, stocks-service, ml-service, etc.)
  - `request_id` (si dans contexte requête)
  - `tenant_id`, `user_id` (si disponibles)
  - `message`
  - `context` (détails métier pertinents)

**Exemple log (backend Node) :**

```json
{
  "timestamp": "2026-01-28T10:15:30.123Z",
  "level": "info",
  "service": "stocks-service",
  "request_id": "req-123",
  "tenant_id": "tenant-1",
  "user_id": "user-1",
  "message": "Product created",
  "context": {
    "product_id": "prod-1",
    "sku": "COFFEE-001"
  }
}
```

#### 2.2 Request ID Middleware

- Middleware dans API Gateway et services backend :
  - Génère un `requestId` unique si absent
  - L’ajoute à `req.requestId` (Express) / `X-Request-ID` (en-tête)
  - Tous les logs de la requête incluent ce `requestId`

```typescript
// middleware/requestId.middleware.ts
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const requestId = req.headers['x-request-id'] || randomUUID();
  req.requestId = String(requestId);
  res.setHeader('X-Request-ID', String(requestId));
  next();
}
```

#### 2.3 Niveaux de Logs

- `info` : événements normaux (connexion utilisateur, création commande)
- `warn` : comportements inattendus mais non bloquants (timeouts API externe récupérés)
- `error` : erreurs bloquantes, exceptions non gérées

**Règles :**
- Ne pas logguer de données sensibles
- Logguer une seule fois par erreur (dans middleware d’erreur)

### 3. Metrics & Dashboards

#### 3.1 Metrics Clés

- **API Gateway & Backend :**
  - Latence P50/P95/P99 par endpoint
  - Taux d’erreurs (4xx, 5xx) par service
  - Nombre de requêtes par seconde (RPS)
  - Concurrency et autoscaling (instances Cloud Run)
- **DB & Data Layer :**
  - Temps de réponse requêtes DB
  - Verrous/locks si pertinents
  - Taille des tables critiques (ventes, stock_movements)
- **ML :**
  - Latence des prédictions
  - Taux d’erreurs ML (échec prédiction, timeout)
  - Métriques modèles (accuracy, F1, etc.) exposées par Vertex AI
- **Frontend (via RUM / Sentry plus tard) :**
  - Core Web Vitals (LCP, FID, CLS)
  - Erreurs JS côté client

#### 3.2 Dashboards

**Dashboards dans Google Cloud Monitoring :**
- **Dashboard “API Health” :**
  - Latence par endpoint
  - Taux d’erreurs par service
  - RPS global et par tenant (si possible)
- **Dashboard “Infra & DB” :**
  - CPU/mémoire des services Cloud Run
  - Connections DB, temps de réponse
  - Utilisation Storage/BigQuery
- **Dashboard “ML” :**
  - Latence endpoints ML
  - Métriques modèles (globales + par tenant si dispo)
  - Fréquence réentraînements et succès/échecs

### 4. Alerting Strategy

#### 4.1 Règles d’Alerte

**Alertes minimales :**
- **Disponibilité :**
  - Uptime check échoué pour API Gateway ou web > N minutes
- **Erreurs :**
  - Taux d’erreurs 5xx > 2–5% pendant 5 minutes
  - Explosion de `INTERNAL_ERROR` ou `SERVICE_UNAVAILABLE`
- **Latence :**
  - P95 latence > seuil (ex: 2s pour API clés) pendant 5–10 minutes
- **DB :**
  - Temps réponse Cloud SQL > seuil
  - Taux erreurs DB (timeouts, connexions refusées)
- **ML :**
  - Taux d’erreurs prédiction > seuil
  - Latence Vertex AI > seuil

#### 4.2 Destinataires

- **Notifications :**
  - Email/SMS/Slack pour l’équipe technique
  - Différencier alertes “warning” vs “critical”

### 5. Tracing & Correlation

#### 5.1 Correlation IDs

- `request_id` propagé :
  - Frontend → API Gateway (header `X-Request-ID`)
  - API Gateway → microservices
  - Microservices → ML service (si applicable)
- Logs et traces utilisent `request_id` pour reconstruire le parcours d’une requête.

#### 5.2 Traces Distribuées (V2)

- Adoption future possible de **OpenTelemetry** :
  - Instrumentation automatique HTTP clients/serveurs
  - Export traces vers Cloud Trace ou autre backend

### 6. Monitoring du Business

Outre la santé technique, suivre des **métriques produit** :
- Nombre de tenants actifs
- Taux d’utilisation des fonctionnalités IA (prédictions, recommandations)
- Temps moyen entre prédiction et commande
- Taux de succès OCR factures (confiance > seuil)

Ces métriques peuvent être calculées via BigQuery + dashboards internes.

---

Cette stratégie de monitoring et d’observabilité assure que le système est non seulement fonctionnel, mais aussi **transparent** et **diagnosticable**, permettant de détecter et résoudre rapidement les problèmes, et d’améliorer le produit en continu.

---

## Checklist Results Report

Ce rapport synthétise les résultats de la checklist Architect appliquée au document `docs/architecture.md` et aux artefacts associés (`prd.md`, `api-specifications.md`, `database-schema.md`).

### 1. Executive Summary

- **Architecture readiness:** **Élevée** (High) pour un MVP ambitieux, avec une couverture complète des aspects critiques (tech stack, data, API, déploiement, sécurité, tests).
- **Forces clés :**
  - Architecture microservices claire sur GCP (Cloud Run, Cloud SQL, BigQuery, Vertex AI).
  - Modèle de données et schéma DB complets, alignés avec le PRD (multi-tenant, RLS).
  - Spécification API exhaustive (`api-specifications.md`) couvrant tous les services.
  - Stratégie ML bien intégrée (Vertex AI, réentraînement quotidien, endpoints prédictions).
  - Monorepo structuré, patterns frontend/backend détaillés, standards pour agents IA.
- **Risques principaux :**
  - Complexité globale (microservices + ML + multi-tenant) pour un MVP → risque de surcharge initiale.
  - Coûts GCP (Vertex AI, BigQuery, Cloud Run) si usage mal calibré.
  - Charge opérationnelle (monitoring, CI/CD, migrations) non triviale pour petite équipe.
- **Recommandation globale :**
  - MVP **prêt à entrer en phase d’implémentation** avec une équipe disciplinée, en gardant une vigilance sur la simplification progressive et le phasage des features avancées (ML, intégrations terminaux, OCR).

### 2. Section Analysis (Checklist)

**1. Requirements Alignment**  
- Couverture fonctionnelle et non-fonctionnelle en bonne adéquation avec le PRD (FR1–FR32, NFR1–NFRx).  
- Recommandation : garder le PRD et l’architecture synchronisés lors de toute évolution de scope.

**2. Architecture Fundamentals**  
- Architecture haute-niveau clairement documentée (diagrammes Mermaid, séparation services, data flows).  
- Séparation des responsabilités UI / business / data bien définie.  
- Patterns d’architecture listés et justifiés (microservices, API Gateway, CQRS léger, multi-tenancy, event-driven).

**3. Tech Stack & Decisions**  
- Stack bien figée (React + TS, Node + TS, Python ML, PostgreSQL, BigQuery, Vertex AI, Turborepo).  
- Versions explicites, rationnel fourni, alternatives discutées (AWS/Azure).  
- Cohérence forte entre composants (type sharing, REST + OpenAPI).

**4. Frontend Design & Implementation**  
- Architecture frontend détaillée : structure dossiers, composants, hooks, state management, routing, services.  
- Intégration backend (API client, interceptors, ProtectedRoute) bien définie.  
- Patterns performance et accessibilité couverts.

**5. Resilience & Operational Readiness**  
- Stratégies de résilience évoquées : retry, Pub/Sub, monitoring, rollback.  
- Recommandation : détailler davantage les patterns de circuit breaker côté code (lib ou pattern choisi).

**6. Security & Compliance**  
- Sécurité couverte à tous les niveaux (auth, data, API, infra, secrets, multi-tenant).  
- Recommandation : formaliser plus tard des exigences de conformité (RGPD, logs de consentement, data retention fine).

**7. Implementation Guidance**  
- Standards de codage détaillés, workflow de dev, tests, guidelines pour agents IA bien présents.  
- Bonne base pour que des agents/autres devs implémentent sans ambiguïté.

**8. Dependency & Integration Management**  
- Intégrations externes (Vertex AI, Cloud Vision, terminaux de paiement, Pub/Sub, Storage) bien décrites.  
- Recommandation : pour chaque intégration, prévoir une matrice “feature → dépendance → fallback” pour gérer indisponibilités.

**9. AI Agent Implementation Suitability**  
- Modularity, clarté, conventions nommage, structures de dossiers, patterns très adaptés pour agents IA.  
- Règles critiques (tenantId, AppError, types partagés) explicitement formulées.

**10. Accessibility Implementation (frontend)**  
- Principes couverts (shadcn/ui, Tailwind, focus, ARIA).  
- Recommandation : ajouter plus tard une checklist d’accessibilité par composant/page.

### 3. Risk Assessment (Top 5)

1. **Complexité microservices + ML pour MVP**  
   - *Impact:* Élevé (risque de délais, bugs d’intégration).  
   - *Mitigation:* Approche progressive (commencer avec moins de services, éventuellement regrouper certains dans un monorepo “backend” unique pour MVP puis extraire plus tard).

2. **Coût GCP (Vertex AI, BigQuery, Cloud Run)**  
   - *Impact:* Moyen à élevé.  
   - *Mitigation:* Limiter réentraînement ML au strict nécessaire, utiliser quotas, surveiller coûts via budgets/alertes GCP, commencer avec configurations modestes (min instances faibles).

3. **Charge opérationnelle DevOps**  
   - *Impact:* Moyen.  
   - *Mitigation:* Automatiser au maximum (CI/CD, migrations, seeding), documenter clairement procédures, commencer avec pipeline CI/CD simple puis enrichir.

4. **Qualité données pour ML**  
   - *Impact:* Moyen (précision IA dépend fortement de la qualité des données).  
   - *Mitigation:* Mettre en place validations et nettoyages de données, dashboards qualité données, mécanismes de feedback utilisateur sur prédictions.

5. **Intégration terminaux de paiement multiples**  
   - *Impact:* Moyen.  
   - *Mitigation:* Commencer avec 1 intégration prioritaire (ex: Stripe Terminal) et un framework extensible, garder le reste en V2.

### 4. Recommendations

**Must-fix avant implémentation massive :**
- Geler une **première version simplifiée de la topologie des services** (ex: regrouper certains services backend au début).
- Définir **plus précisément la stratégie de migration DB** entre environnements (dev/staging/prod).

**Should-fix (pour qualité) :**
- Documenter des **exemples de flows complets** (de la requête frontend à la DB) pour 2–3 cas critiques (ex: création produit, création commande IA, traitement facture).
- Préciser davantage certains paramètres de scaling (min/max instances par service) dans un tableau.

**Nice-to-have :**
- Ajouter des docs “How-to” ciblés (ex: “Comment ajouter un nouvel endpoint API?”, “Comment ajouter un nouveau champ à Product?”).

### 5. AI Implementation Readiness

- **Clarté globale :** Haute. Les patterns et conventions sont explicitement documentés, avec types partagés et structures de dossiers claires.
- **Points forts pour agents IA :**
  - Types et schémas centralisés (`@flowstock/shared` + Zod + Prisma).
  - Standards de codage détaillés (niveaux frontend/backend/ML).
  - Stratégies de tests/templates fournis.
- **Complexity hotspots :**
  - Multi-tenancy + microservices + ML : interactions complexes entre services, à bien tester.
  - Intégrations externes (Vertex AI, Vision, terminaux) : doivent être soigneusement mockées en tests.

### 6. Frontend-Specific Assessment

- **Complétude architecture frontend :** Élevée (routing, state management, services, UI, perf, accessibilité).
- **Alignement avec doc principale :** Bon (routes, API, types, services cohérents).
- **UI/UX coverage :** Solide côté architecture, les détails UX visuels pourront être affinés au fur et à mesure.

---

Globalement, l’architecture est **mûre et bien documentée** pour démarrer l’implémentation du MVP, avec une excellente base pour un développement piloté par IA, sous réserve de garder un œil attentif sur la complexité et les coûts lors des premières itérations.

---
