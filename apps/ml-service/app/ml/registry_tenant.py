"""
Tenant-aware model registry: per-tenant model storage, loading, versioning.
Each tenant has its own model directory and version tracking.

Epic 5 Story 5.2 - Task 3: Fine-tuning par entreprise.
"""
import logging
from pathlib import Path
from typing import Dict, List, Optional, Tuple

from app.ml.models.baseline import BaselineConsumptionModel, _default_baseline_artifact_dir

logger = logging.getLogger("bmad.ml.registry_tenant")


def _tenant_artifact_dir(tenant_id: str) -> Path:
    """Return the artifact directory for a specific tenant."""
    base = _default_baseline_artifact_dir().parent  # mlruns/
    safe_id = tenant_id.replace("/", "_").replace("\\", "_")
    return base / "tenant_models" / safe_id


def save_tenant_model(
    model: BaselineConsumptionModel,
    tenant_id: str,
    version: str,
) -> Path:
    """
    Save a model for a specific tenant.
    Creates tenant-specific directory and versioned files.

    Returns the versioned file path.
    """
    artifact_dir = _tenant_artifact_dir(tenant_id)
    artifact_dir.mkdir(parents=True, exist_ok=True)

    # Save versioned copy
    safe_version = version.replace("/", "_").replace("\\", "_")
    versioned_path = artifact_dir / f"model_{safe_version}.joblib"
    model.save(versioned_path)

    # Update latest pointer
    latest_path = artifact_dir / "model_latest.joblib"
    model.save(latest_path)
    (artifact_dir / "version.txt").write_text(version)

    logger.info(
        "Saved tenant model: tenant=%s, version=%s, path=%s",
        tenant_id, version, versioned_path,
    )
    return versioned_path


def load_tenant_model(
    tenant_id: str,
    version: Optional[str] = None,
) -> Tuple[Optional[BaselineConsumptionModel], Optional[str]]:
    """
    Load a model for a specific tenant.

    Args:
        tenant_id: Tenant identifier.
        version: Specific version to load. If None, loads latest.

    Returns:
        (model, version) or (None, None) if no model found.
    """
    artifact_dir = _tenant_artifact_dir(tenant_id)

    if version is not None:
        # Load specific version
        safe_version = version.replace("/", "_").replace("\\", "_")
        path = artifact_dir / f"model_{safe_version}.joblib"
        if path.exists():
            model = BaselineConsumptionModel.load(path)
            logger.info("Loaded tenant model: tenant=%s, version=%s", tenant_id, version)
            return model, version
        logger.warning("Tenant model not found: tenant=%s, version=%s", tenant_id, version)
        return None, None

    # Load latest
    latest_path = artifact_dir / "model_latest.joblib"
    version_file = artifact_dir / "version.txt"

    if latest_path.exists():
        model = BaselineConsumptionModel.load(latest_path)
        ver = version_file.read_text().strip() if version_file.exists() else "unknown"
        logger.info("Loaded latest tenant model: tenant=%s, version=%s", tenant_id, ver)
        return model, ver

    logger.info("No model found for tenant=%s, will use global baseline", tenant_id)
    return None, None


def list_tenant_versions(tenant_id: str) -> List[Tuple[str, str]]:
    """
    List available model versions for a tenant.

    Returns list of (version, file_path).
    """
    artifact_dir = _tenant_artifact_dir(tenant_id)
    versions: List[Tuple[str, str]] = []

    if not artifact_dir.exists():
        return versions

    for model_file in sorted(artifact_dir.glob("model_*.joblib")):
        stem = model_file.stem
        ver = stem.replace("model_", "", 1)
        if ver != "latest":
            versions.append((ver, str(model_file)))

    return versions


def tenant_has_model(tenant_id: str) -> bool:
    """Check if a tenant has a trained model."""
    artifact_dir = _tenant_artifact_dir(tenant_id)
    latest = artifact_dir / "model_latest.joblib"
    return latest.exists()


def delete_tenant_models(tenant_id: str) -> int:
    """
    Delete all models for a tenant. Returns count of deleted files.
    Used for cleanup/testing.
    """
    import shutil
    artifact_dir = _tenant_artifact_dir(tenant_id)
    if not artifact_dir.exists():
        return 0

    count = sum(1 for _ in artifact_dir.glob("*.joblib"))
    shutil.rmtree(artifact_dir)
    logger.info("Deleted %d model files for tenant=%s", count, tenant_id)
    return count
