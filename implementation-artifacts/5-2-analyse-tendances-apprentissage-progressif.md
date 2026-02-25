# Story 5.2: Analyse Tendances & Apprentissage Progressif

**Status:** done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

**As a** système,  
**I want** analyser les tendances de consommation à partir des données de ventes,  
**so that** je peux comprendre les patterns et améliorer les prédictions.

## Acceptance Criteria

**Given** des données de ventes sont disponibles  
**When** le système analyse les tendances  
**Then** l'algorithme d'analyse tendances fonctionne (saisonnalité, tendances linéaires, patterns)  
**And** l'apprentissage progressif à partir des ventes quotidiennes fonctionne  
**And** l'adaptation modèle par entreprise (fine-tuning) fonctionne  
**And** la gestion cold start fonctionne (fonctionnement avec minimum de données)  
**And** l'amélioration précision au fil du temps fonctionne  
**And** les logs apprentissage pour debugging sont disponibles

## Tasks / Subtasks

- [x] Task 1 (AC: algorithme analyse tendances)
  - [x] Implémenter module d'analyse tendances : saisonnalité (hebdomadaire, mensuelle), tendance linéaire, patterns
  - [x] Exposer API ou fonction pour analyser une série temporelle (ventes par jour) et retourner métriques (tendance, saisonnalité, confiance)
  - [x] Tester avec données synthétiques (tendance croissante, saisonnalité 7j)

- [x] Task 2 (AC: apprentissage progressif)
  - [x] Implémenter mécanisme d'apprentissage progressif : mise à jour du modèle à partir des ventes quotidiennes
  - [x] Prévoir incrémentalité (éviter réentraînement complet à chaque nouveau jour) ou batch léger
  - [x] Tester : ajout de journées de ventes améliore ou ajuste les prédictions

- [x] Task 3 (AC: fine-tuning par entreprise)
  - [x] Adapter le pipeline d'entraînement pour fine-tuning par tenant_id : charger modèle baseline ou dernier modèle tenant, entraîner sur données tenant
  - [x] Persister un modèle par tenant (ou répertoire/registre tenant-aware)
  - [x] Tester isolation : entraînement tenant A n'affecte pas tenant B

- [x] Task 4 (AC: cold start avec minimum de données)
  - [x] Garantir que l'analyse et le modèle fonctionnent avec peu de données (ex: 1–7 jours)
  - [x] Retourner indicateur de confiance faible si données insuffisantes
  - [x] Tester avec 1, 3, 7, 30 jours de ventes

- [x] Task 5 (AC: amélioration précision au fil du temps)
  - [x] Exposer métrique ou log indiquant l'évolution de la précision (ou erreur) sur les données connues
  - [x] Intégrer dans le pipeline ou endpoint pour suivi longitudinal

- [x] Task 6 (AC: logs apprentissage)
  - [x] Logger paramètres d'entraînement, métriques, durée, tenant_id dans le pipeline
  - [x] Utiliser MLflow pour tracer les runs et permettre debugging
  - [x] Tests unitaires et intégration pour les flux d'apprentissage

## Dev Notes

### Contexte Epic 5

- **Epic 5 : Moteur IA de Prédictions** — FR4, FR5, FR6, FR20. Valeur : prédictions précises de rupture, apprentissage progressif, réentraînement automatique.
- **Story 5.1 (done)** : Infrastructure ML, modèle baseline, pipeline entraînement, versioning, rollback, health ML. Base prête pour 5.2.
- **Stories suivantes** : 5.3 (prédiction ruptures), 5.4 (réentraînement quotidien), 5.5 (monitoring performance IA).

### État actuel (post 5.1)

- **ml-service** : `app/ml/` avec models/baseline, training/pipeline, inference, registry, metrics. Pipeline supporte `tenant_id`, MLflow. Modèle baseline : régression linéaire / consommation.
- **Données ventes** : dans l'API (sales) ou BDD ; le pipeline peut recevoir un DataFrame (date, quantity) ou charger via API/DB selon implémentation.
- **À étendre** : ajouter module `app/ml/trends/` ou `app/ml/analysis/` pour analyse tendances ; enrichir le pipeline pour fine-tuning tenant.

### Architecture (docs/architecture.md)

- Analyse tendances : saisonnalité, tendances linéaires, patterns. Possibles librairies : statsmodels (saisonnalité), Prophet (optionnel), ou scikit-learn/stats simples pour MVP.
- NFR12 : cold start avec minimum de données. NFR16 : isolation par tenant.

### Références

- [Source: planning-artifacts/epics.md] — Epic 5, Story 5.2
- [Source: apps/ml-service/README-ML.md] — Flux entraînement, structure, pipeline
- [Source: apps/ml-service/app/ml/training/pipeline.py] — run_training_pipeline(tenant_id, sales_data, model_version)
- [Source: apps/ml-service/app/ml/models/baseline.py] — BaselineConsumptionModel, fit(X, y)

## Dev Agent Record

### Agent Model Used

claude-4.6-opus-high-thinking (Cursor Agent)

### Debug Log References

- Correction tests Task 1 : méthodes de test statiques dans classes pytest nécessitaient `self`
- Correction Task 3 : `BaselineConsumptionModel.fit()` extrait la pente (slope) comme consommation, corrigé dans `tenant_pipeline.py` pour utiliser la moyenne quotidienne (plus pertinent pour les prédictions de rupture stock)

### Implementation Plan

**Architecture des modules créés :**
1. **Analyse tendances** (`app/ml/trends/analyzer.py`) : Détection tendance linéaire (sklearn), saisonnalité via autocorrélation et FFT, patterns jour-de-semaine, score de confiance
2. **Apprentissage incrémental** (`app/ml/training/incremental.py`) : IncrementalTrainer avec buffer roulant (90j max), SGDRegressor.partial_fit() pour updates online, full_retrain pour petits buffers (<30j)
3. **Registre tenant** (`app/ml/registry_tenant.py`) : Stockage modèles par tenant dans répertoires séparés (mlruns/tenant_models/{tenant_id}/), versioning, chargement, suppression isolée
4. **Pipeline tenant** (`app/ml/training/tenant_pipeline.py`) : Fine-tuning par tenant_id, consommation moyenne quotidienne, intégration MLflow
5. **Cold start** (`app/ml/cold_start.py`) : Analyse avec données minimales (1-365j), niveaux de confiance, recommandations utilisateur, intégration trend analysis
6. **Suivi précision** (`app/ml/accuracy_tracker.py`) : Snapshots MAE/RMSE/MAPE/R², évolution longitudinale, détection amélioration/dégradation, par tenant
7. **Logger apprentissage** (`app/ml/training/learning_logger.py`) : Context manager pour tracking runs, paramètres, métriques, durée, intégration MLflow, résumés

### Completion Notes List

- **Task 1** : Module `app/ml/trends/` créé. TrendAnalysisResult avec trend linéaire (slope, R², direction), saisonnalité (hebdo/mensuelle via autocorrélation, période dominante via FFT), patterns jour-de-semaine, confiance. 19 tests.
- **Task 2** : IncrementalTrainer avec buffer roulant (90j), dual strategy (full_retrain <30j, partial_fit >=30j via SGDRegressor). Mise à jour progressive sans réentraînement complet. 17 tests.
- **Task 3** : Registre tenant-aware (registry_tenant.py) + pipeline tenant (tenant_pipeline.py). Répertoires séparés par tenant_id, fine-tuning depuis modèle existant ou baseline. Tests d'isolation : A n'affecte pas B. 15 tests.
- **Task 4** : Module cold_start.py. Fonctionne avec 0 à N jours, indicateur confiance (very_low à very_high), data_sufficient flag, recommandations contextuelles. Testé 1/3/7/30 jours. 17 tests.
- **Task 5** : AccuracyTracker avec snapshots (MAE, RMSE, MAPE, R²), évolution longitudinale, détection improving/degrading/stable. Par tenant. 17 tests.
- **Task 6** : LearningLogger avec context manager track_training(), log structuré (params, métriques, durée, tenant_id), intégration MLflow optionnelle, résumé global. 17 tests.
- **Régression** : 174/174 tests passent (0 régression sur tests existants Story 5.1 + 104 nouveaux tests Story 5.2).

### File List

**Nouveaux fichiers :**
- apps/ml-service/app/ml/trends/__init__.py
- apps/ml-service/app/ml/trends/analyzer.py
- apps/ml-service/app/ml/training/incremental.py
- apps/ml-service/app/ml/training/tenant_pipeline.py
- apps/ml-service/app/ml/training/learning_logger.py
- apps/ml-service/app/ml/registry_tenant.py
- apps/ml-service/app/ml/cold_start.py
- apps/ml-service/app/ml/accuracy_tracker.py
- apps/ml-service/tests/ml/test_trends_analyzer.py
- apps/ml-service/tests/ml/test_incremental.py
- apps/ml-service/tests/ml/test_tenant_training.py
- apps/ml-service/tests/ml/test_cold_start.py
- apps/ml-service/tests/ml/test_accuracy_tracker.py
- apps/ml-service/tests/ml/test_learning_logger.py

**Fichiers modifiés :**
- implementation-artifacts/sprint-status.yaml (status: ready-for-dev → review)
- implementation-artifacts/5-2-analyse-tendances-apprentissage-progressif.md (tâches complétées, dev agent record)

## Change Log

- 2026-02-11 : Implémentation complète Story 5.2 — 6 tasks, 14 nouveaux fichiers, 104 nouveaux tests. Modules : analyse tendances (saisonnalité, trend, patterns), apprentissage incrémental (SGDRegressor partial_fit), fine-tuning tenant-aware avec isolation, cold start avec confiance graduée, suivi précision longitudinal, logger apprentissage structuré avec MLflow.
