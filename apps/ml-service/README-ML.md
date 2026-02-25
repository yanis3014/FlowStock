# Architecture ML – Service IA/ML (Epic 5.1)

Ce document décrit l'infrastructure ML du `ml-service` : stack, flux entraînement/inférence, cold start, versioning et emplacements des artefacts.

## Stack technique

- **Langage:** Python 3.11+
- **API:** FastAPI 0.104+
- **ML (base):** scikit-learn (modèle baseline consommation), MLflow (tracking et versioning)
- **ML (avancé):** PyTorch 2.1+ (`pip install .[ml-torch]`) ou TensorFlow 2.15+ (`pip install .[ml-tensorflow]`) pour modèles LSTM/avancés (Stories 5.2+)
- **Données:** pandas, numpy
- **Monitoring:** psutil (métriques CPU/mémoire), logging structuré

## Structure des modules

```
app/ml/
├── __init__.py
├── config.py          # MLflow tracking URI, nom d'expérience
├── inference.py       # Modèle actif, chargement au démarrage, prédiction avec métriques
├── metrics.py         # Latence inférence, erreurs, CPU/mémoire (thread-safe)
├── registry.py        # Registre multi-versions, rollback
├── models/
│   ├── __init__.py
│   └── baseline.py    # BaselineConsumptionModel (cold start)
└── training/
    ├── __init__.py
    ├── pipeline.py    # Pipeline entraînement + MLflow
    └── run_cli.py     # CLI pour lancer l'entraînement
```

## Cold start

- Au démarrage du service, `load_model_at_startup()` charge le **modèle baseline**.
- Si un artefact existe dans `mlruns/baseline_artifacts/` (fichier `model_latest.joblib`), ce modèle est utilisé.
- Sinon, un modèle par défaut (consommation 1 unité/jour) est utilisé, sans erreur.
- Aucun entraînement tenant n'est requis pour faire tourner le service.

## Flux entraînement

1. **Données:** Les ventes peuvent être chargées depuis l'API stocks/sales ou une BDD (à brancher selon l'env).
2. **Pipeline:** `app.ml.training.pipeline.run_training_pipeline(tenant_id, sales_data, model_version)` :
   - préprocessing (agrégation quotidienne),
   - entraînement du modèle baseline (régression linéaire / consommation),
   - enregistrement dans MLflow (params, métriques, artifact),
   - sauvegarde versionnée via le registre (`model_{version}.joblib` + `model_latest.joblib`).
3. **Exécution:**
   - En local : `python -m app.ml.training.run_cli [--tenant-id ID] [--version VERSION] [--no-data]`
   - Ou appel du pipeline depuis un endpoint admin (réentraînement manuel, Story 5.4).

## Flux inférence

- Le **modèle actif** est un singleton (`app.ml.inference`: `get_active_model()`, `get_active_model_version()`).
- Il est chargé au démarrage (lifespan FastAPI) et peut être changé via **rollback** (voir ci-dessous).
- `predict_days_until_stockout(current_stock, tenant_id)` exécute la prédiction et **enregistre automatiquement** la latence et les erreurs dans le module metrics.
- Les métriques (latence, erreurs, CPU/mémoire) sont exposées dans `/api/v1/health/ml`.

## Versioning et rollback

- **Registre:** Fichiers dans `mlruns/baseline_artifacts/` : chaque version est stockée comme `model_{version}.joblib` + un pointeur `model_latest.joblib` + `version.txt`.
- **Versions:** "default" (modèle en mémoire, toujours disponible) + toutes les versions entraînées (stockées sur disque).
- **Rollback:** `POST /api/v1/admin/model/rollback?version=v1.0.0` (nécessite JWT admin) recharge le modèle spécifié et le définit comme actif.
- Les métadonnées du modèle actif (version, date) peuvent être persistées en BDD dans une story ultérieure (Epic 5.5).

### Installation des frameworks ML avancés

```bash
# PyTorch uniquement (pour LSTM, réseaux récurrents)
pip install .[ml-torch]

# TensorFlow uniquement
pip install .[ml-tensorflow]

# Tous les frameworks ML
pip install .[ml-all]
```

## Emplacements des artefacts

| Artefact              | Emplacement |
|-----------------------|------------|
| MLflow runs           | `MLFLOW_TRACKING_URI` (défaut: `apps/ml-service/mlruns`) |
| Modèle versionné      | `mlruns/baseline_artifacts/model_{version}.joblib` |
| Modèle latest         | `mlruns/baseline_artifacts/model_latest.joblib` |
| Version courante      | `mlruns/baseline_artifacts/version.txt` |

Le répertoire `mlruns/` est ignoré par git (`.gitignore`) pour ne pas versionner les gros binaires.

## Endpoints liés à l'ML

- `GET /health` – Santé globale du service.
- `GET /api/v1/health/ml` – Santé ML : `model_loaded`, `version`, `last_inference_latency_ms`, `inference_count`, `error_count`, `memory_rss_mb`, `cpu_percent`.
- `POST /api/v1/admin/model/rollback?version=...` – Rollback du modèle actif vers une version donnée. **Requiert un JWT admin** (Bearer token avec rôle `admin`).

## Référence

- Architecture globale : `docs/architecture.md`, section « 4. ML/IA Service ».
- Story : `implementation-artifacts/5-1-infrastructure-ml-modeles-de-base.md`.
