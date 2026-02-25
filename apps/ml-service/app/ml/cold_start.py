"""
Cold start handling: ensure analysis and models work with minimal data.
Returns confidence indicators when data is insufficient.

Epic 5 Story 5.2 - Task 4: Cold start avec minimum de données.
NFR12: cold start avec minimum de données.
"""
import logging
from dataclasses import dataclass, asdict
from typing import List, Optional, Union

import numpy as np
import pandas as pd

from app.ml.models.baseline import BaselineConsumptionModel
from app.ml.trends.analyzer import TrendAnalysisResult, analyze_time_series

logger = logging.getLogger("bmad.ml.cold_start")

# Confidence thresholds
CONFIDENCE_VERY_LOW = 0.15
CONFIDENCE_LOW = 0.35
CONFIDENCE_MODERATE = 0.55
CONFIDENCE_HIGH = 0.75

# Minimum data requirements
MIN_DAYS_FOR_TRENDS = 7
MIN_DAYS_FOR_SEASONALITY = 14
MIN_DAYS_FOR_RELIABLE = 30


@dataclass
class ColdStartResult:
    """Result from cold-start-aware analysis."""

    # Model output
    daily_consumption: float
    days_until_stockout: Optional[float]

    # Confidence
    confidence: float
    confidence_level: str  # "very_low", "low", "moderate", "high"
    data_sufficient: bool

    # Data info
    data_points: int
    recommendations: List[str]

    # Trend analysis (if enough data)
    trend_analysis: Optional[TrendAnalysisResult] = None

    def to_dict(self) -> dict:
        d = asdict(self)
        return d


def _classify_confidence(confidence: float) -> str:
    """Classify confidence into human-readable level."""
    if confidence < CONFIDENCE_VERY_LOW:
        return "very_low"
    elif confidence < CONFIDENCE_LOW:
        return "low"
    elif confidence < CONFIDENCE_MODERATE:
        return "moderate"
    elif confidence < CONFIDENCE_HIGH:
        return "high"
    else:
        return "very_high"


def _generate_recommendations(data_points: int, confidence_level: str) -> List[str]:
    """Generate actionable recommendations based on data availability."""
    recs = []
    if data_points < 7:
        recs.append("Ajoutez au moins 7 jours de données de ventes pour des tendances fiables.")
    if data_points < 14:
        recs.append("14 jours minimum recommandés pour détecter la saisonnalité hebdomadaire.")
    if data_points < 30:
        recs.append("30 jours de données permettront des prédictions plus précises.")
    if confidence_level in ("very_low", "low"):
        recs.append("Confiance faible : les prédictions sont indicatives, pas fiables.")
    return recs


def analyze_with_cold_start(
    dates: List[Union[pd.Timestamp, object]],
    quantities: List[float],
    current_stock: Optional[float] = None,
    model: Optional[BaselineConsumptionModel] = None,
) -> ColdStartResult:
    """
    Analyze sales data with cold-start awareness.
    Works with any amount of data (even 1 day) and provides
    appropriate confidence indicators.

    Args:
        dates: List of date/datetime objects.
        quantities: List of sale quantities.
        current_stock: Current stock level (for stockout prediction).
        model: Existing model to use (optional, creates default otherwise).

    Returns:
        ColdStartResult with predictions, confidence, and recommendations.
    """
    n = len(dates) if dates else 0

    # Handle empty data
    if n == 0:
        return ColdStartResult(
            daily_consumption=1.0,
            days_until_stockout=current_stock if current_stock is not None else None,
            confidence=0.0,
            confidence_level="very_low",
            data_sufficient=False,
            data_points=0,
            recommendations=[
                "Aucune donnée de ventes disponible. Le modèle utilise une valeur par défaut.",
                "Commencez à saisir vos ventes quotidiennes pour activer les prédictions.",
            ],
        )

    # Compute mean daily consumption from available data
    mean_consumption = float(np.mean(quantities))
    if mean_consumption <= 0:
        mean_consumption = 1e-6

    # Use provided model or create one
    if model is None:
        model = BaselineConsumptionModel(daily_consumption=mean_consumption)
    else:
        # Update model with observed data if we have any
        model.daily_consumption = max(1e-6, mean_consumption)

    # Compute stockout prediction
    days_until_stockout = None
    if current_stock is not None:
        days_until_stockout = model.predict_days_until_stockout(current_stock)

    # Compute confidence based on data quantity
    # Scale: 1 day → ~0.12, 3 days → ~0.16, 7 days → ~0.35, 30 days → ~0.6, 90 days → ~0.8
    data_factor = min(1.0, np.log1p(n) / np.log1p(365))
    confidence = round(float(0.85 * data_factor + 0.15 * min(1.0, n / 30.0)), 3)

    confidence_level = _classify_confidence(confidence)
    data_sufficient = n >= MIN_DAYS_FOR_TRENDS

    # Run trend analysis if we have enough data
    trend_analysis = None
    if n >= 2:
        try:
            trend_analysis = analyze_time_series(dates, quantities)
            # Blend trend confidence with cold-start confidence
            confidence = round(float(0.6 * confidence + 0.4 * trend_analysis.confidence), 3)
            confidence_level = _classify_confidence(confidence)
        except Exception as exc:
            logger.warning("Trend analysis failed in cold start: %s", exc)

    recommendations = _generate_recommendations(n, confidence_level)

    result = ColdStartResult(
        daily_consumption=model.daily_consumption,
        days_until_stockout=days_until_stockout,
        confidence=confidence,
        confidence_level=confidence_level,
        data_sufficient=data_sufficient,
        data_points=n,
        recommendations=recommendations,
        trend_analysis=trend_analysis,
    )

    logger.info(
        "Cold start analysis: n=%d, confidence=%.3f (%s), sufficient=%s",
        n, confidence, confidence_level, data_sufficient,
    )

    return result
