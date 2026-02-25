# Story 5.4: Réentraînement Automatique Quotidien

**Status:** review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

**As a** système,  
**I want** réentraîner automatiquement les modèles IA quotidiennement,  
**so that** les prédictions s'améliorent continuellement avec les nouvelles données.

## Acceptance Criteria

**Given** l'infrastructure ML est opérationnelle  
**When** le job automatique quotidien s'exécute  
**Then** le job automatique quotidien pour réentraînement fonctionne (cron/scheduler)  
**And** le réentraînement incrémental fonctionne (optimisation coûts)  
**And** la validation du nouveau modèle avant déploiement fonctionne (tests précision)  
**And** le rollback automatique fonctionne si nouveau modèle moins performant  
**And** les logs réentraînement sont disponibles (durée, performance, coûts)  
**And** le monitoring coûts infrastructure ML fonctionne  
**And** le batch processing pour optimiser ressources fonctionne

## Tasks / Subtasks

- [x] Task 1 (AC: job quotidien)
  - [x] Choisir et configurer un scheduler (APScheduler BackgroundScheduler)
  - [x] Définir l'heure d'exécution quotidienne (RETRAIN_DAILY_HOUR, défaut 2h)
  - [x] Exécuter le pipeline de réentraînement par tenant (run_retrain_job)
  - [x] Tests : endpoint admin trigger + tests unitaires retrain_job

- [x] Task 2 (AC: réentraînement incrémental)
  - [x] Réutiliser `tenant_pipeline` (run_tenant_training avec save_model optionnel)
  - [x] Charger les données ventes réelles depuis BDD (sales_loader.py, run_cli.py)
  - [x] Stratégie : entraînement par tenant, pas de full retrain global
  - [x] Tests : sales_loader, run_cli avec --tenant-id

- [x] Task 3 (AC: validation avant déploiement)
  - [x] Après entraînement : évaluer précision (AccuracyTracker.evaluate_accuracy)
  - [x] Seuil DEGRADATION_THRESHOLD (RETRAIN_DEGRADATION_THRESHOLD, défaut 1.05)
  - [x] Déployer (save_tenant_model) seulement si new_mae <= current_mae * threshold
  - [x] Tests : test_run_retrain_for_tenant_deploys_when_better, rollback_when_worse

- [x] Task 4 (AC: rollback automatique)
  - [x] Si nouveau modèle moins performant : ne pas appeler save_tenant_model
  - [x] Logger la décision (rollback, raison) en WARNING
  - [x] Tests : test_run_retrain_for_tenant_rollback_when_worse

- [x] Task 5 (AC: logs réentraînement)
  - [x] Logger durée totale, par tenant, métriques (MAE), tenant_id (RetrainResult, summary.to_log_dict)
  - [x] Logs structurés dans run_retrain_for_tenant et run_retrain_job
  - [x] Tests : RetrainJobSummary.to_log_dict, champs dans results

- [x] Task 6 (AC: monitoring coûts infrastructure ML)
  - [x] Résumé job : duration_seconds, deployed, rollback, failed (endpoint admin retourne summary)
  - [x] Documenter : RETRAIN_DAILY_HOUR, RETRAIN_DEGRADATION_THRESHOLD, RETRAIN_BATCH_SIZE

- [x] Task 7 (AC: batch processing)
  - [x] Traiter les tenants par batch (RETRAIN_BATCH_SIZE, défaut 1)
  - [x] Boucle for avec batch_size dans run_retrain_job, asyncio.gather par batch
  - [x] Tests : run_retrain_job avec liste de tenants

## Dev Notes

### Contexte Epic 5

- **Epic 5 : Moteur IA de Prédictions** — Stories 5.1 (done), 5.2 (done), 5.3 (done). 5.4 enchaîne sur le pipeline et le registre tenant pour automatiser le réentraînement.
- **Stories suivantes :** 5.5 (monitoring performance IA).

### Dépendances techniques

- **5.1 :** Pipeline d'entraînement, MLflow, modèle baseline, versioning/rollback manuel.
- **5.2 :** `tenant_pipeline.py`, `IncrementalTrainer`, `AccuracyTracker`, `registry_tenant`, chargement données (à compléter pour données réelles dans run_cli / API).
- **run_cli.py :** TODO(Story 5.4) pour chargement des données réelles (API ou BDD).

### Références

- [Source: planning-artifacts/epics.md] — Story 5.4
- [Source: docs/prd.md] — Story 5.4 Acceptance Criteria
- [Source: apps/ml-service/README-ML.md] — Pipeline, réentraînement
- [Source: apps/ml-service/app/ml/training/run_cli.py] — Point d'entrée entraînement
- [Source: apps/ml-service/app/ml/training/tenant_pipeline.py] — Fine-tuning par tenant

## Dev Agent Record

### File List

**Nouveaux fichiers :**
- apps/ml-service/app/ml/training/sales_loader.py
- apps/ml-service/app/ml/training/retrain_job.py
- apps/ml-service/app/scheduler.py
- apps/ml-service/tests/ml/test_sales_loader.py
- apps/ml-service/tests/ml/test_retrain_job.py

**Fichiers modifiés :**
- apps/ml-service/app/ml/training/run_cli.py (chargement ventes BDD, run_tenant_training si tenant_id)
- apps/ml-service/app/ml/training/tenant_pipeline.py (paramètre save_model)
- apps/ml-service/app/database.py (lifespan: app.state.loop, start/stop scheduler)
- apps/ml-service/app/main.py (POST /api/v1/admin/retrain/trigger)
- apps/ml-service/pyproject.toml (apscheduler)

## Change Log

- 2026-02-13 : Création story 5.4 (create-story) — Réentraînement automatique quotidien, 7 tasks, dépendances 5.1/5.2.
- 2026-02-13 : Implémentation dev-story — sales_loader, retrain_job (validation + rollback), scheduler APScheduler, endpoint admin trigger, tests.
