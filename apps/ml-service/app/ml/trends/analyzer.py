"""
Trend analysis module: seasonality, linear trends, patterns.
Epic 5 Story 5.2 - Analyse Tendances & Apprentissage Progressif.

Analyses a time series of (date, quantity) and returns metrics:
- Linear trend (slope, direction, R²)
- Seasonality detection (weekly, monthly, dominant period)
- Day-of-week consumption patterns
- Confidence indicator based on data quality/quantity
"""
import logging
from dataclasses import dataclass, field, asdict
from typing import Dict, List, Optional, Union

import numpy as np
import pandas as pd
from sklearn.linear_model import LinearRegression

logger = logging.getLogger("bmad.ml.trends")

# Thresholds for trend classification
_TREND_SLOPE_THRESHOLD = 0.1  # absolute slope below this → "stable"


@dataclass
class TrendAnalysisResult:
    """Result of trend analysis on a sales time series."""

    # Linear trend
    trend_slope: float = 0.0
    trend_intercept: float = 0.0
    trend_r_squared: float = 0.0
    trend_direction: str = "stable"  # "increasing", "decreasing", "stable"

    # Seasonality
    weekly_seasonality_strength: float = 0.0  # 0-1
    monthly_seasonality_strength: float = 0.0  # 0-1
    dominant_period: Optional[int] = None  # dominant seasonal period in days

    # Patterns
    day_of_week_pattern: Dict[str, float] = field(default_factory=dict)

    # Overall quality
    confidence: float = 0.0  # 0-1
    data_points: int = 0
    date_range_days: int = 0

    def to_dict(self) -> dict:
        """Convert to dictionary for JSON serialization."""
        return asdict(self)


def analyze_time_series(
    dates: List[Union[pd.Timestamp, object]],
    quantities: List[float],
) -> TrendAnalysisResult:
    """
    Analyse a time series of daily sales and return trend metrics.

    Args:
        dates: List of date/datetime objects (or pd.Timestamp).
        quantities: List of corresponding sale quantities.

    Returns:
        TrendAnalysisResult with trend, seasonality, patterns, confidence.

    Raises:
        ValueError: If data is empty or lengths mismatch.
    """
    # --- Validation ---
    if len(dates) == 0 or len(quantities) == 0:
        raise ValueError("No data provided: dates and quantities must be non-empty.")
    if len(dates) != len(quantities):
        raise ValueError(
            f"Length mismatch: dates has {len(dates)} elements, "
            f"quantities has {len(quantities)} elements."
        )

    # --- Build DataFrame ---
    df = pd.DataFrame({"date": pd.to_datetime(dates), "quantity": quantities})
    df = df.sort_values("date").reset_index(drop=True)
    n = len(df)

    result = TrendAnalysisResult(
        data_points=n,
        date_range_days=int((df["date"].iloc[-1] - df["date"].iloc[0]).days) if n > 1 else 0,
    )

    # --- Single data point: return minimal result ---
    if n == 1:
        result.trend_intercept = float(df["quantity"].iloc[0])
        result.confidence = _compute_confidence(n, 0.0)
        return result

    # --- Linear trend analysis ---
    day_idx = np.arange(n, dtype=float).reshape(-1, 1)
    y = df["quantity"].values.astype(float)

    lr = LinearRegression().fit(day_idx, y)
    result.trend_slope = float(lr.coef_[0])
    result.trend_intercept = float(lr.intercept_)
    result.trend_r_squared = float(lr.score(day_idx, y))

    # Classify direction based on slope magnitude relative to mean
    mean_qty = float(np.mean(y))
    # Normalize slope: if mean is near 0, use absolute threshold
    if mean_qty > 1e-6:
        relative_slope = abs(result.trend_slope) / mean_qty
    else:
        relative_slope = abs(result.trend_slope)

    if relative_slope < 0.005 or abs(result.trend_slope) < _TREND_SLOPE_THRESHOLD:
        result.trend_direction = "stable"
    elif result.trend_slope > 0:
        result.trend_direction = "increasing"
    else:
        result.trend_direction = "decreasing"

    # --- Detrend for seasonality analysis ---
    detrended = y - lr.predict(day_idx)

    # --- Seasonality detection via autocorrelation ---
    if n >= 14:  # need at least 2 weeks for weekly seasonality
        result.weekly_seasonality_strength = _autocorrelation_strength(detrended, 7)
    if n >= 60:  # need at least 2 months for monthly seasonality
        result.monthly_seasonality_strength = _autocorrelation_strength(detrended, 30)

    # --- Dominant period via FFT ---
    if n >= 7:
        result.dominant_period = _detect_dominant_period(detrended, min_period=3, max_period=min(n // 2, 90))

    # --- Day-of-week patterns ---
    if n >= 7:
        result.day_of_week_pattern = _compute_day_of_week_pattern(df)

    # --- Confidence ---
    result.confidence = _compute_confidence(n, result.trend_r_squared)

    logger.info(
        "Trend analysis: n=%d, slope=%.4f, direction=%s, R²=%.4f, "
        "weekly_season=%.3f, dominant_period=%s, confidence=%.3f",
        n, result.trend_slope, result.trend_direction, result.trend_r_squared,
        result.weekly_seasonality_strength, result.dominant_period, result.confidence,
    )

    return result


def _autocorrelation_strength(series: np.ndarray, lag: int) -> float:
    """
    Compute normalized autocorrelation at a given lag.
    Returns a value between 0 and 1 representing seasonality strength.

    Uses Pearson correlation between the series and itself shifted by `lag`.
    """
    if len(series) <= lag:
        return 0.0

    x = series[:-lag]
    y = series[lag:]

    # Normalize
    x_mean = np.mean(x)
    y_mean = np.mean(y)
    x_std = np.std(x)
    y_std = np.std(y)

    if x_std < 1e-10 or y_std < 1e-10:
        return 0.0

    correlation = float(np.mean((x - x_mean) * (y - y_mean)) / (x_std * y_std))
    # Clamp to [0, 1] — only positive correlation indicates seasonality
    return max(0.0, min(1.0, correlation))


def _detect_dominant_period(series: np.ndarray, min_period: int = 3, max_period: int = 90) -> Optional[int]:
    """
    Detect dominant periodic component using FFT.
    Returns the period in days of the strongest frequency, or None.
    """
    n = len(series)
    if n < 2 * min_period:
        return None

    # Apply FFT
    fft_vals = np.fft.rfft(series)
    magnitudes = np.abs(fft_vals)

    # Frequencies: freq[i] = i / n (cycles per day)
    freqs = np.fft.rfftfreq(n)

    # Convert to periods and find dominant
    # Skip DC component (index 0) and very low frequencies
    best_mag = 0.0
    best_period = None

    for i in range(1, len(freqs)):
        if freqs[i] <= 0:
            continue
        period = 1.0 / freqs[i]
        if min_period <= period <= max_period:
            if magnitudes[i] > best_mag:
                best_mag = magnitudes[i]
                best_period = round(period)

    # Only return if the dominant period is significantly above noise
    if best_period is not None and best_mag > 0:
        noise_floor = np.median(magnitudes[1:])
        if best_mag < 2.0 * noise_floor:
            return None  # not strong enough signal

    return best_period


def _compute_day_of_week_pattern(df: pd.DataFrame) -> Dict[str, float]:
    """
    Compute average quantity per day of week.
    Returns dict mapping day names to average quantities.
    """
    df_copy = df.copy()
    df_copy["dow"] = df_copy["date"].dt.day_name()
    pattern = df_copy.groupby("dow")["quantity"].mean().to_dict()
    # Round for readability
    return {day: round(float(val), 2) for day, val in pattern.items()}


def _compute_confidence(n: int, r_squared: float) -> float:
    """
    Compute a confidence score (0-1) based on data quantity and model fit.

    Factors:
    - Data quantity: more data → higher confidence (logarithmic scale)
    - Model fit: higher R² → higher confidence (for trend component)
    """
    # Data quantity factor: 0→0, 1→0.1, 7→0.4, 14→0.5, 30→0.65, 90→0.8, 365→0.95
    if n <= 0:
        return 0.0
    data_factor = min(1.0, np.log1p(n) / np.log1p(365))

    # R² factor (0 to 1): contributes up to 30% of confidence
    r2_factor = max(0.0, min(1.0, r_squared))

    # Weighted combination: data quantity is more important
    confidence = 0.7 * data_factor + 0.3 * r2_factor

    return round(float(min(1.0, max(0.0, confidence))), 3)
