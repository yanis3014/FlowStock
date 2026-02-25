"""
Model registry: list versions, get/set active version, rollback.
Supports multiple saved versions (model_{version}.joblib).
Epic 5 Story 5.1 - Infrastructure ML & Modèles de base.
"""
import logging
import shutil
from pathlib import Path
from typing import List, Optional, Tuple

from app.ml.models.baseline import (
    BaselineConsumptionModel,
    _default_baseline_artifact_dir,
    load_baseline_model,
)

logger = logging.getLogger("bmad.ml.registry")


def _version_file_path(artifact_dir: Path, version: str) -> Path:
    """Return the path for a versioned model file."""
    safe_version = version.replace("/", "_").replace("\\", "_")
    return artifact_dir / f"model_{safe_version}.joblib"


def list_registered_versions() -> List[Tuple[str, Optional[str]]]:
    """
    List registered model versions from baseline_artifacts directory.
    Returns list of (version, file_path). Always includes 'default' (in-memory baseline).
    """
    artifact_dir = _default_baseline_artifact_dir()
    versions: List[Tuple[str, Optional[str]]] = []

    # Always available: the built-in default
    versions.append(("default", None))

    if artifact_dir.exists():
        # Scan all model_*.joblib files
        for model_file in sorted(artifact_dir.glob("model_*.joblib")):
            # Extract version from filename: model_{version}.joblib
            stem = model_file.stem  # e.g. "model_1234567890" or "model_latest"
            ver = stem.replace("model_", "", 1)
            if ver != "latest":
                versions.append((ver, str(model_file)))

        # Also check version.txt for the "latest" pointer
        version_file = artifact_dir / "version.txt"
        latest_path = artifact_dir / "model_latest.joblib"
        if version_file.exists() and latest_path.exists():
            v = version_file.read_text().strip()
            # Only add if not already in the list
            if not any(existing_v == v for existing_v, _ in versions):
                versions.append((v, str(latest_path)))

    return versions


def save_model_version(model: BaselineConsumptionModel, version: str) -> Path:
    """
    Save a model with a specific version identifier.
    Also updates model_latest.joblib and version.txt.
    Returns the versioned file path.
    """
    artifact_dir = _default_baseline_artifact_dir()
    artifact_dir.mkdir(parents=True, exist_ok=True)

    # Save versioned copy
    versioned_path = _version_file_path(artifact_dir, version)
    model.save(versioned_path)

    # Update latest pointer
    latest_path = artifact_dir / "model_latest.joblib"
    model.save(latest_path)
    (artifact_dir / "version.txt").write_text(version)

    logger.info("Saved model version=%s to %s (+ latest)", version, versioned_path)
    return versioned_path


def load_version(version: str) -> Optional[BaselineConsumptionModel]:
    """Load a specific version (by version id). For 'default', use built-in baseline."""
    if version == "default":
        model, _ = load_baseline_model()
        return model

    artifact_dir = _default_baseline_artifact_dir()

    # Try versioned file first
    versioned_path = _version_file_path(artifact_dir, version)
    if versioned_path.exists():
        logger.info("Loading model version=%s from %s", version, versioned_path)
        return BaselineConsumptionModel.load(versioned_path)

    # Try latest if version matches version.txt
    version_file = artifact_dir / "version.txt"
    latest_path = artifact_dir / "model_latest.joblib"
    if version_file.exists() and latest_path.exists():
        stored_version = version_file.read_text().strip()
        if stored_version == version:
            logger.info("Loading model version=%s from latest", version)
            return BaselineConsumptionModel.load(latest_path)

    logger.warning("Model version=%s not found in registry", version)
    return None


def rollback_to_version(version: str) -> bool:
    """
    Set active model to the given version (reload and set in inference module).
    Returns True if rollback succeeded.
    """
    from app.ml.inference import set_active_model

    model = load_version(version)
    if model is None:
        logger.error("Rollback failed: version=%s not found", version)
        return False
    set_active_model(model, version)
    logger.info("Rollback successful: active model set to version=%s", version)
    return True
