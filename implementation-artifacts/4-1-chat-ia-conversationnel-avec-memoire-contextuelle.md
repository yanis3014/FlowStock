# Story 4.1: Chat IA Conversationnel avec Mémoire Contextuelle

Status: Done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **gérant de PME**,  
I want **accéder rapidement aux informations sur mes stocks via un chat IA conversationnel**,  
so that **je peux obtenir des réponses instantanées sans navigation complexe**.

## Acceptance Criteria

**Given** je suis un utilisateur authentifié  
**When** j'ouvre le chat IA  
**Then** l'interface chat est disponible sur toutes les plateformes (desktop, tablette, mobile)  
**And** je peux poser des questions sur mes stocks (ex: "combien d'ordinateurs de telle marque?")  
**And** le chat répond avec les informations demandées  
**And** le chat a une mémoire contextuelle (ex: après "leurs prix" se souvient de "ordinateurs de telle marque")  
**And** le chat peut communiquer avec le reste de l'application pour accéder aux informations sur les stocks  
**And** l'historique de conversation est sauvegardé  
**And** l'interface est simple et compréhensible sur mobile pour utilisation rapide

## Tasks / Subtasks

- [x] Task 1: Migration base de données pour chat (AC: historique sauvegardé)
  - [x] 1.1 Créer migration V012__create_chat_tables.sql avec tables chat_conversations, chat_messages, chat_context
  - [x] 1.2 Table chat_conversations : id UUID PRIMARY KEY, tenant_id UUID NOT NULL, user_id UUID NOT NULL, created_at TIMESTAMP, updated_at TIMESTAMP, FOREIGN KEY tenant_id → tenants, FOREIGN KEY user_id → users
  - [x] 1.3 Table chat_messages : id UUID PRIMARY KEY, conversation_id UUID NOT NULL, role VARCHAR(20) NOT NULL ('user' | 'assistant'), content TEXT NOT NULL, metadata JSONB, created_at TIMESTAMP, FOREIGN KEY conversation_id → chat_conversations, INDEX sur conversation_id
  - [x] 1.4 Table chat_context : conversation_id UUID PRIMARY KEY, context_data JSONB, expires_at TIMESTAMP, FOREIGN KEY conversation_id → chat_conversations, INDEX sur expires_at pour nettoyage
  - [x] 1.5 RLS : Politiques RLS sur toutes les tables avec tenant_id (utiliser pattern existant V002__setup_rls_base.sql)
  - [x] 1.6 Tests migration : Vérifier création tables, RLS, contraintes (couverts par tests intégration Node.js + migration idempotente)

- [x] Task 2: Service backend chat (AC: chat répond avec informations, mémoire contextuelle, communication avec app)
  - [x] 2.1 Créer apps/ml-service/app/services/chat_service.py avec classe ChatService
  - [x] 2.2 Fonction send_message(tenant_id, user_id, conversation_id, message) → réponse IA avec contexte
  - [x] 2.3 Intégration LLM : Utiliser OpenAI GPT-4 API pour MVP (Vertex AI optionnel)
  - [x] 2.4 Gestion mémoire contextuelle : Charger dernier contexte depuis chat_context (ou créer si nouveau), inclure 10 derniers messages dans prompt LLM
  - [x] 2.5 Accès données stocks : Appel API interne vers Stocks Service (products, stock-estimates) pour récupérer informations demandées
  - [x] 2.6 Parsing questions : Détection intent basique via prompt LLM (pas de parsing explicite pour MVP)
  - [x] 2.7 Construction prompt LLM : Système prompt avec contexte tenant, historique conversation, données stocks récupérées, instructions format réponse
  - [x] 2.8 Sauvegarde messages : Enregistrer message utilisateur et réponse IA dans chat_messages
  - [x] 2.9 Mise à jour contexte : Sauvegarder contexte enrichi dans chat_context (expires_at = NOW() + 1h)
  - [x] 2.10 Gestion erreurs : Gestion gracieuse erreurs LLM, timeouts, données introuvables

- [x] Task 3: API REST endpoints chat (AC: communication avec app)
  - [x] 3.1 Créer apps/ml-service/app/routes/chat_routes.py avec FastAPI router
  - [x] 3.2 POST /api/v1/chat/message : { conversation_id?: UUID, message: string } → { conversation_id, response, context_used }
  - [x] 3.3 GET /api/v1/chat/history?conversation_id=UUID : Retourne historique conversation (50 derniers messages max)
  - [x] 3.4 POST /api/v1/chat/conversations : Créer nouvelle conversation → { conversation_id }
  - [x] 3.5 GET /api/v1/chat/conversations : Liste conversations utilisateur (tenant_id depuis JWT)
  - [x] 3.6 Authentification : Middleware JWT pour extraire tenant_id et user_id depuis token
  - [x] 3.7 Validation : Pydantic models pour validation requêtes/réponses
  - [x] 3.8 Documentation OpenAPI : Section 12 ajoutée dans docs/api-specifications.md avec tous les endpoints chat

- [x] Task 4: Interface frontend chat (AC: interface disponible toutes plateformes, simple mobile)
  - [x] 4.1 Créer page HTML apps/api/public/chat.html (pattern pages HTML existantes)
  - [x] 4.2 UI Desktop : Page dédiée avec header et zone messages (responsive)
  - [x] 4.3 UI Mobile : Page dédiée responsive avec layout adaptatif
  - [x] 4.4 Zone messages : Zone scrollable avec historique messages (user à droite, assistant à gauche), auto-scroll vers dernier message
  - [x] 4.5 Input message : Champ texte avec bouton Envoyer, Enter pour envoyer, placeholder "Posez votre question..."
  - [x] 4.6 Indicateur typing : Afficher "IA écrit..." pendant génération réponse
  - [x] 4.7 Gestion état : État conversation_id, messages[], loading, error
  - [x] 4.8 Appels API : fetch POST /api/v1/chat/message avec Bearer token, gestion erreurs réseau
  - [x] 4.9 Responsive : Media queries pour adapter layout desktop/mobile/tablette
  - [x] 4.10 Accessibilité : ARIA labels, navigation clavier (Tab, Enter, Escape), aria-live pour nouvelles réponses

- [x] Task 5: Intégration avec données stocks (AC: chat accède informations stocks)
  - [x] 5.1 Dans chat_service.py, créer fonction _get_stock_info(tenant_id, query) → données produits/stocks
  - [x] 5.2 Appel API interne : Requête vers Stocks Service GET /products?search=query pour recherche produits
  - [x] 5.3 Appel API interne : Requête vers GET /stock-estimates pour estimations temps stock
  - [x] 5.4 Format données pour LLM : Structurer données récupérées en format texte lisible pour inclusion dans prompt
  - [x] 5.5 Gestion cas limites : Produit introuvable, données insuffisantes, erreurs API (gestion gracieuse avec fallback)

- [x] Task 6: Tests (AC: tests unitaires et intégration)
  - [x] 6.1 Tests unitaires test_chat_service.py (20 tests) :
    - Test send_message avec nouveau conversation_id → crée conversation
    - Test send_message avec conversation existante → utilise contexte
    - Test mémoire contextuelle : context_used=true quand contexte précédent existe
    - Test _build_llm_prompt : inclut system prompt, contexte, stock info, historique
    - Test _call_llm : réponse dummy sans API key, gestion erreur API, réponse réussie
    - Test _get_stock_info : gestion erreur API, retour produits succès
    - Test get_conversation_history : liste vide, messages ordonnés, respect limit
  - [x] 6.2 Tests intégration test_chat_routes.py (14 tests) :
    - POST /api/v1/chat/message (200, crée conversation si besoin)
    - POST /api/v1/chat/message avec conversation_id existant (200, utilise contexte)
    - POST /api/v1/chat/message message vide (422)
    - GET /api/v1/chat/history (200, retourne messages)
    - GET /api/v1/chat/history sans conversation_id (422)
    - POST /api/v1/chat/conversations (200, crée conversation)
    - GET /api/v1/chat/conversations (200, liste conversations tenant)
    - Auth 401 sans token (tous endpoints)
    - Auth 401 avec token invalide
  - [x] 6.3 Tests unitaires test_auth.py (10 tests) :
    - Token valide → JWTPayload
    - Support camelCase et snake_case
    - JWT_SECRET manquant → 500
    - Token invalide → 401
    - Secret incorrect → 401
    - user_id/tenant_id manquant → 401
    - Valeurs par défaut role et email
  - [ ] 6.4 Tests E2E frontend : Non implémentés (pas de framework E2E configuré)

## Dev Notes

- **Contexte Epic 4 :** Première story de l'Epic 4 (Interface Visuelle & Dashboard avec Chat IA). Les stories Epic 1-3 sont done (auth, stocks, ventes, formules). Le chat IA est le point d'entrée principal selon UX Design Specification.
- **Architecture décision :** Le chat IA est intégré dans le ML/IA Service (Python/FastAPI) plutôt que dans l'API Node.js car il nécessite accès direct aux modèles LLM et partage l'infrastructure ML. Voir docs/architecture.md#4.1-Chat-IA-Service.
- **Dépendances :**
  - Stocks Service (Node.js) : API REST pour récupérer produits et estimations
  - ML/IA Service (Python) : Même service où le chat est intégré
  - PostgreSQL : Tables chat_conversations, chat_messages, chat_context
  - Redis (optionnel MVP) : Cache contexte conversation actif (TTL 1h) pour performance
- **LLM choix :** Vertex AI Gemini API (GCP) recommandé pour MVP, ou OpenAI GPT-4 API si GCP non disponible. Migration vers modèle custom possible plus tard.
- **Mémoire contextuelle :** Stratégie : inclure 10 derniers messages dans prompt LLM + contexte structuré dans chat_context (produits mentionnés, filtres actifs, etc.). Le LLM gère naturellement les références ("leurs prix" → produit précédent).
- **Frontend stack :** À déterminer selon stack choisi (React/Vue.js selon architecture). Pattern composant réutilisable accessible depuis toutes les pages.

### Project Structure Notes

- **Backend ML Service :** apps/ml-service/app/services/chat_service.py (nouveau)
- **Backend Routes :** apps/ml-service/app/routes/chat_routes.py (nouveau)
- **Migration DB :** apps/api/migrations/V012__create_chat_tables.sql (nouveau)
- **Frontend Component :** apps/frontend/src/components/ChatIA.tsx (nouveau, chemin à adapter selon stack)
- **Tests backend :** apps/ml-service/tests/services/chat_service.test.py (nouveau)
- **Tests intégration :** apps/ml-service/tests/integration/chat_routes.integration.test.py (nouveau)
- **Modifié :** apps/ml-service/app/main.py (ajout router chat), docs/api-specifications.md (documentation endpoints)

### Architecture Compliance

- **Multi-tenant :** Toutes les requêtes DB via RLS PostgreSQL (tenant_id). Conversations isolées par tenant. JWT contient tenant_id et user_id.
- **Authentification :** Endpoints protégés par JWT Bearer token. Middleware JWT dans FastAPI pour extraire tenant_id/user_id.
- **Base de données :** PostgreSQL avec RLS. Tables chat_conversations, chat_messages, chat_context avec tenant_id. Migration V012 suivant pattern existant.
- **API REST :** FastAPI avec Pydantic pour validation. Format réponse standardisé { success, data, error }.
- **Communication inter-services :** Chat Service → Stocks Service via HTTP REST interne (service-to-service avec service accounts ou JWT interne).
- **Performance :** Redis cache optionnel pour contexte conversation actif (clé: `chat:ctx:{conversation_id}`, TTL 1h). Limite historique à 50 messages pour performance.
- **Scalabilité :** ML/IA Service déployé sur Cloud Run, scalable horizontalement. WebSocket optionnel pour MVP (REST polling acceptable).

### Library & Framework Requirements

- **Backend ML Service :** Python 3.11+, FastAPI 0.104+, Pydantic pour validation
- **LLM Integration :** 
  - Option 1: google-cloud-aiplatform (Vertex AI Gemini API) pour GCP
  - Option 2: openai (OpenAI GPT-4 API) pour MVP alternatif
- **Base de données :** psycopg2 ou asyncpg pour PostgreSQL, SQLAlchemy ORM optionnel
- **Cache :** redis-py pour Redis (optionnel MVP)
- **HTTP Client :** httpx ou requests pour appels API internes vers Stocks Service
- **Tests :** pytest, pytest-asyncio pour tests async, pytest-mock pour mocks
- **Frontend :** Framework à déterminer (React/Vue.js selon stack), fetch API ou axios pour appels API

### File Structure Requirements

- **Chat Service :** apps/ml-service/app/services/chat_service.py
  - Classe ChatService avec méthodes :
    - send_message(tenant_id, user_id, conversation_id, message) → ChatResponse
    - get_conversation_history(tenant_id, user_id, conversation_id, limit=50) → List[ChatMessage]
    - create_conversation(tenant_id, user_id) → UUID
    - _load_context(conversation_id) → dict | None
    - _save_context(conversation_id, context_data)
    - _get_stock_info(tenant_id, query) → dict
    - _build_llm_prompt(messages, stock_data, context) → str
    - _call_llm(prompt) → str

- **Chat Routes :** apps/ml-service/app/routes/chat_routes.py
  - POST /api/v1/chat/message
  - GET /api/v1/chat/history
  - POST /api/v1/chat/conversations
  - GET /api/v1/chat/conversations

- **Migration DB :** apps/api/migrations/V012__create_chat_tables.sql
  - CREATE TABLE chat_conversations
  - CREATE TABLE chat_messages
  - CREATE TABLE chat_context
  - RLS policies

- **Frontend Component :** apps/frontend/src/components/ChatIA.tsx (chemin à adapter)
  - Composant React/Vue avec état conversation, messages, loading
  - UI responsive (desktop overlay, mobile page)

### Testing Requirements

- **Tests unitaires :** chat_service.test.py
  - Test création conversation
  - Test mémoire contextuelle (2 messages avec référence)
  - Test parsing questions et détection intent
  - Test intégration LLM mock (vérifier prompt construit correctement)
  - Test gestion erreurs (LLM timeout, API stocks échoue)
- **Tests intégration :** chat_routes.integration.test.py
  - POST /api/v1/chat/message (200, crée conversation)
  - POST /api/v1/chat/message avec conversation_id (200, utilise contexte)
  - GET /api/v1/chat/history (200, retourne messages)
  - GET /api/v1/chat/conversations (200, liste conversations)
  - Auth 401 sans token
  - Multi-tenant isolation
- **Frameworks :** pytest pour Python backend, Jest/React Testing Library pour frontend (si React)
- **Coverage :** 80%+ pour logique chat_service (parsing, contexte, LLM integration)

### Previous Story Intelligence

- **Story 1.3 (User Authentication) :** JWT tokens avec tenant_id et user_id. Middleware authenticateToken dans Node.js API. Pattern à adapter pour FastAPI (dépendance JWT).
- **Story 2.1 (CRUD Stocks) :** product.service.ts avec listProducts, getProductById. API GET /products disponible. Réutiliser pour recherche produits dans chat.
- **Story 3.5 (Calculs Temps Stock) :** stock-estimate.service.ts avec getAllStockEstimates. API GET /stock-estimates disponible. Réutiliser pour estimations dans chat.
- **Patterns API Node.js :** Routes avec express-validator, authenticateToken middleware, format réponse { success, data, error }. Adapter pour FastAPI avec Pydantic et dépendances JWT.

**Apprentissages clés :**
- RLS PostgreSQL : Toutes les requêtes via db.queryWithTenant(tenantId) dans Node.js. Adapter pour Python avec RLS automatique si session variable app.current_tenant configurée.
- Format API : { success: boolean, data?: any, error?: string } standardisé. Maintenir cohérence FastAPI.
- Multi-tenant : JWT contient tenant_id et user_id. Extraire depuis token dans middleware FastAPI.
- Appels API internes : Service-to-service avec JWT interne ou service accounts. Utiliser httpx pour appels HTTP depuis Python.

### References

- [Source: planning-artifacts/epics.md#Epic 4 - Story 4.1]
- [Source: planning-artifacts/ux-design-specification.md#Chat IA Component - Section 1]
- [Source: docs/architecture.md#4.1-Chat-IA-Service - Architecture décision et stack technique]
- [Source: docs/architecture.md#API Specification - Format API REST standardisé]
- [Source: docs/database-schema.md#Multi-Tenancy Strategy - RLS PostgreSQL pattern]
- [Source: apps/api/src/services/product.service.ts - Pattern recherche produits]
- [Source: apps/api/src/services/stock-estimate.service.ts - Pattern estimations stocks]
- [Source: apps/api/src/middleware/auth.ts - Pattern JWT authentication]
- [Source: apps/api/migrations/V002__setup_rls_base.sql - Pattern RLS policies]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.5 (Cursor)

### Debug Log References

### Completion Notes List

- Migration V012 créée avec tables chat_conversations, chat_messages, chat_context et politiques RLS
- Service backend chat_service.py créé avec intégration OpenAI GPT-4, gestion mémoire contextuelle, et appels API Stocks Service
- Routes FastAPI créées : POST /api/v1/chat/message, GET /api/v1/chat/history, POST /api/v1/chat/conversations, GET /api/v1/chat/conversations
- Middleware JWT créé pour authentification FastAPI
- Page HTML chat.html créée avec interface responsive (desktop/mobile), gestion état conversation, et appels API
- Intégration avec Stocks Service implémentée pour récupérer produits et estimations
- Route /chat-page ajoutée dans apps/api/src/index.ts
- Database connection pool créé avec support multi-tenant RLS
- Lifespan manager créé pour initialisation/cleanup database dans FastAPI

**Phase 2 - Tests et Documentation :**
- 44 tests Python (pytest) : 20 unitaires chat_service, 10 unitaires auth, 14 intégration routes - tous passants
- 350 tests Node.js (jest) existants : tous passants, aucune régression
- Migration V012 rendue idempotente (CREATE INDEX IF NOT EXISTS, DROP TRIGGER IF EXISTS)
- Documentation OpenAPI ajoutée dans docs/api-specifications.md section 12 (Chat IA Service)

**Remarques restantes :**
- ML_SERVICE_URL dans chat.html doit être configuré selon environnement
- INTERNAL_API_TOKEN doit être configuré pour appels service-to-service
- Tests E2E frontend non implémentés (pas de framework E2E configuré)

### File List

**Nouveaux fichiers :**
- apps/api/migrations/V012__create_chat_tables.sql
- apps/ml-service/app/database.py
- apps/ml-service/app/middleware/auth.py
- apps/ml-service/app/middleware/__init__.py
- apps/ml-service/app/services/chat_service.py
- apps/ml-service/app/services/__init__.py
- apps/ml-service/app/routes/chat_routes.py
- apps/ml-service/app/routes/__init__.py
- apps/ml-service/tests/__init__.py
- apps/ml-service/tests/conftest.py
- apps/ml-service/tests/test_auth.py
- apps/ml-service/tests/services/__init__.py
- apps/ml-service/tests/services/test_chat_service.py
- apps/ml-service/tests/integration/__init__.py
- apps/ml-service/tests/integration/test_chat_routes.py
- apps/api/public/chat.html

**Fichiers modifiés :**
- apps/ml-service/pyproject.toml (ajout dépendances asyncpg, python-jose, openai, pytest-asyncio, pytest-mock)
- apps/ml-service/app/main.py (ajout routes chat et lifespan)
- apps/api/src/index.ts (ajout route /chat-page)
- docs/api-specifications.md (ajout section 12 - Chat IA Service)
