# Story 5.1: Infrastructure ML & Modèles de Base

**Status:** done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

**As a** système,  
**I want** une infrastructure ML opérationnelle avec modèles de base,  
**so that** l'IA peut fonctionner même sans données historiques (cold start).

## Acceptance Criteria

**Given** l'infrastructure de base est configurée  
**When** je configure l'infrastructure ML  
**Then** l'infrastructure ML est configurée (Python, TensorFlow/PyTorch, MLflow)  
**And** les modèles de base pré-entraînés sur données agrégées anonymisées sont disponibles  
**And** le pipeline d'entraînement est configuré  
**And** le système de déploiement modèles fonctionne (versioning, rollback)  
**And** le monitoring infrastructure ML fonctionne (ressources, latence)  
**And** la documentation architecture ML est créée

## Tasks / Subtasks

- [x] Task 1 (AC: infrastructure ML Python, TensorFlow/PyTorch, MLflow)
  - [x] Ajouter dépendances ML dans `apps/ml-service/pyproject.toml` : TensorFlow 2.15+ ou PyTorch 2.1+, MLflow, pandas, numpy, scikit-learn
  - [x] Configurer MLflow (tracking URI local ou distant, expériences) dans le service
  - [x] Structurer le module ML : `app/ml/` ou `app/services/ml/` (training, models, inference) sans casser le chat existant
  - [x] Vérifier Python 3.11+ et compatibilité des versions

- [x] Task 2 (AC: modèles de base pré-entraînés, cold start)
  - [x] Définir un modèle de base (ex: régression linéaire / moyenne glissante pour consommation) utilisable sans historique client
  - [x] Pré-entraîner ou fournir des poids par défaut sur données agrégées anonymisées (ou heuristiques documentées si pas de données réelles)
  - [x] Exposer un modèle "baseline" chargé au démarrage du service pour cold start (pas d'erreur si aucun entraînement tenant)
  - [x] Documenter le format et l'emplacement des artefacts (fichier ou registry) pour modèles de base

- [x] Task 3 (AC: pipeline d'entraînement)
  - [x] Créer un pipeline d'entraînement (script ou module) : chargement données ventes (API ou BDD), preprocessing, entraînement, enregistrement modèle (MLflow ou fichier)
  - [x] Intégrer le pipeline avec MLflow (log params, metrics, artifact modèle)
  - [x] Rendre le pipeline exécutable en local (CLI ou endpoint admin) pour tests et réentraînement futur (Story 5.4)
  - [x] Prévoir isolation par tenant (tenant_id) dans les données d'entraînement

- [x] Task 4 (AC: déploiement modèles, versioning, rollback)
  - [x] Définir un registre des modèles (MLflow Model Registry ou structure de fichiers versionnée) avec version (ex: semver ou timestamp)
  - [x] Implémenter chargement du modèle actif au démarrage du service (dernière version validée ou modèle de base)
  - [x] Exposer un mécanisme de rollback (activation d'une version précédente) : endpoint admin ou config + rechargement
  - [x] Persister métadonnées modèle actif (version, date) en BDD ou fichier pour traçabilité

- [x] Task 5 (AC: monitoring infrastructure ML)
  - [x] Ajouter métriques de base : latence inférence, utilisation mémoire/CPU pendant inférence (ou entraînement)
  - [x] Exposer un endpoint santé ML (ex: `/api/v1/health/ml` ou section dans `/health`) : modèle chargé oui/non, version
  - [x] Logger les erreurs d'inférence et les timeouts pour diagnostic
  - [x] Intégration optionnelle avec Cloud Monitoring / Prometheus si déjà en place (sinon logs structurés suffisants pour MVP)

- [x] Task 6 (AC: documentation architecture ML)
  - [x] Créer ou mettre à jour un document d'architecture ML : stack (Python, TF/PyTorch, MLflow), flux entraînement/inférence, cold start, versioning, emplacements des artefacts
  - [x] Documenter comment lancer le pipeline d'entraînement et comment activer un modèle (version/rollback)
  - [x] Placer la doc dans `docs/` ou `apps/ml-service/README.md` et référencer depuis `docs/architecture.md` (section ML/IA Service)

## Dev Notes

### Contexte Epic 5

- **Epic 5 : Moteur IA de Prédictions** — FR4, FR5, FR6, FR20. Valeur : prédictions précises de rupture, apprentissage progressif, réentraînement automatique.
- **Stories suivantes :** 5.2 (analyse tendances, apprentissage progressif), 5.3 (prédiction ruptures), 5.4 (réentraînement quotidien), 5.5 (monitoring performance IA). Cette story pose les fondations (infra + modèles de base + pipeline + versioning).

### État actuel du ml-service

- **Existant :** `apps/ml-service` avec FastAPI, chat (OpenAI), auth JWT, PostgreSQL (chat_conversations, chat_messages), routes `chat_routes`, `chat_service`. Pas encore de stack ML (TensorFlow/PyTorch, MLflow) ni de prédictions.
- **Fichiers clés :** `apps/ml-service/app/main.py`, `app/database.py`, `app/routes/chat_routes.py`, `app/services/chat_service.py`, `pyproject.toml`, `Dockerfile`, `tests/`.
- **À préserver :** Ne pas casser les routes chat et auth ; ajouter les modules ML à côté (nouveaux modules/routes pour prédictions et santé ML).

### Architecture (docs/architecture.md)

- **ML/IA Service :** Python 3.11+, FastAPI 0.104+, TensorFlow 2.15+ et/ou PyTorch 2.1+, MLflow, pandas, numpy. Vertex AI pour training/deployment en prod ; pour MVP, MLflow local ou fichier + déploiement in-process acceptable.
- **Cold start :** Modèles pré-entraînés sur données agrégées anonymisées + fine-tuning par client (Story 5.2). Cette story livre les modèles de base et le mécanisme de chargement.
- **Versioning / rollback :** MLflow Model Registry ou structure versionnée ; rollback documenté dans l'architecture.
- **Interfaces prévues (à préparer pour les stories suivantes) :** `GET /api/v1/predictions`, `GET /api/v1/predictions/:product_id`, `POST /api/v1/predictions/retrain`, `GET /api/v1/predictions/metrics`. Pour 5.1, on peut exposer uniquement un health ML et un endpoint minimal de prédiction baseline (optionnel) pour valider la chaîne.

### Multi-tenancy et données

- NFR16 : isolation stricte données et modèles par tenant. Dès le pipeline d'entraînement et le stockage des modèles, prévoir `tenant_id` (ex: répertoire par tenant, ou métadonnées MLflow par tenant).
- Données ventes : aujourd'hui dans l'API (sales) ; pour l'entraînement, le ml-service pourra appeler l'API ou lire une BDD partagée selon l'implémentation existante. Documenter la source des données dans la doc architecture ML.

### File Structure (recommandations)

- `apps/ml-service/app/ml/` ou `app/services/ml/` : `__init__.py`, `training/` (pipeline), `models/` (baseline, chargement), `inference.py` (prédiction avec modèle chargé).
- `apps/ml-service/mlruns/` ou répertoire dédié pour MLflow artifacts (ignoré par git si gros ; ou .gitignore).
- Modèles de base : `apps/ml-service/app/ml/models/baseline/` ou artefact MLflow "baseline" versionné.

### Testing Requirements

- Tests unitaires : chargement du modèle de base, préprocessing minimal, calcul d'une prédiction baseline (sans appel réseau).
- Tests d'intégration : endpoint santé ML retourne 200 et indique modèle chargé ; optionnel : endpoint de prédiction baseline avec tenant_id mock.
- pytest existant dans le service ; ajouter `tests/ml/` ou `tests/services/test_ml_*.py`. Pas d'E2E cross-service obligatoire pour cette story.

### Références

- [Source: planning-artifacts/epics.md] — Epic 5, Story 5.1 (AC complets)
- [Source: docs/architecture.md] — Section 4. ML/IA Service (stack, Vertex AI, MLflow, cold start, deployment)
- [Source: docs/architecture.md] — MLModel (schéma métadonnées : id, tenantId, version, modelType, status, accuracy, vertexAiModelId)
- [Source: docs/prd.md] — NFR12 (cold start), NFR16 (isolation tenant), NFR17 (rollback)
- [Source: apps/ml-service/pyproject.toml] — Dépendances actuelles (FastAPI, openai, asyncpg, etc.) à étendre

## Dev Agent Record

### Agent Model Used

dev-story (BMad workflow)

### Debug Log References

(Aucun)

### Completion Notes List

- Infra ML, module app/ml, cold start, endpoints health/ml et rollback. Doc README-ML.md. Tests ML et intégration health_ml.
- **Code Review (2026-02-11):** 5 HIGH + 5 MEDIUM issues trouvés et corrigés automatiquement :
  - H1: TensorFlow/PyTorch ajoutés aux optional-dependencies (ml-torch, ml-tensorflow, ml-all) + psutil
  - H2: Auth JWT ajoutée sur endpoint admin rollback (rôle admin requis)
  - H3: Métriques d'inférence câblées via `predict_days_until_stockout()` avec recording automatique
  - H4: Logging ajouté sur échec chargement ML au startup (remplace `pass` nu)
  - H5: Registre multi-versions implémenté (model_{version}.joblib)
  - M1: Métriques CPU/mémoire via psutil
  - M2: Flag `--no-data` corrigé dans run_cli.py
  - M3: Logging dans load_baseline_model() sur exception
  - M4: Métriques thread-safe avec threading.Lock
  - M5: Tests ajoutés : pipeline (5), registry (8), metrics (5), inference (4)
  - Fix: config.py file:// URI pour compatibilité Windows MLflow

### File List

- apps/ml-service/pyproject.toml, .gitignore, app/database.py, app/main.py
- apps/ml-service/app/ml/: __init__.py, config.py, inference.py, metrics.py, registry.py, models/__init__.py, models/baseline.py, training/__init__.py, training/pipeline.py, training/run_cli.py
- apps/ml-service/app/middleware/auth.py (utilisé par rollback endpoint)
- apps/ml-service/README-ML.md
- apps/ml-service/tests/ml/: __init__.py, test_baseline_model.py, test_inference.py, test_metrics.py, test_pipeline.py, test_registry.py
- apps/ml-service/tests/integration/test_health_ml.py
