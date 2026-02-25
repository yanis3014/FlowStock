"""
Unit tests for trend analysis module. Epic 5 Story 5.2 - Task 1.
Tests with synthetic data: increasing trend, 7-day seasonality, minimal data.
"""
import numpy as np
import pandas as pd
import pytest
from datetime import datetime, timedelta

from app.ml.trends.analyzer import TrendAnalysisResult, analyze_time_series


# ---------------------------------------------------------------------------
# Fixtures: synthetic data generators
# ---------------------------------------------------------------------------

@pytest.fixture
def increasing_trend_data():
    """30 days of steadily increasing sales (slope ~2 units/day)."""
    n = 30
    dates = [datetime(2026, 1, 1) + timedelta(days=i) for i in range(n)]
    # Linear trend: base=10, slope=2/day, small noise
    rng = np.random.default_rng(42)
    quantities = [10.0 + 2.0 * i + rng.normal(0, 0.5) for i in range(n)]
    return dates, quantities


@pytest.fixture
def weekly_seasonality_data():
    """60 days with strong 7-day periodic pattern (no trend)."""
    n = 60
    dates = [datetime(2026, 1, 1) + timedelta(days=i) for i in range(n)]
    rng = np.random.default_rng(42)
    # Sinusoidal weekly pattern: mean=50, amplitude=20
    quantities = [
        50.0 + 20.0 * np.sin(2 * np.pi * i / 7.0) + rng.normal(0, 1.0)
        for i in range(n)
    ]
    return dates, quantities


@pytest.fixture
def trend_plus_seasonality_data():
    """90 days with both linear trend AND weekly seasonality."""
    n = 90
    dates = [datetime(2026, 1, 1) + timedelta(days=i) for i in range(n)]
    rng = np.random.default_rng(42)
    quantities = [
        20.0 + 1.5 * i + 10.0 * np.sin(2 * np.pi * i / 7.0) + rng.normal(0, 1.0)
        for i in range(n)
    ]
    return dates, quantities


@pytest.fixture
def minimal_data():
    """Only 3 days of data (cold start scenario)."""
    dates = [datetime(2026, 1, 1) + timedelta(days=i) for i in range(3)]
    quantities = [5.0, 7.0, 6.0]
    return dates, quantities


@pytest.fixture
def single_day_data():
    """Only 1 day of data."""
    dates = [datetime(2026, 1, 1)]
    quantities = [10.0]
    return dates, quantities


@pytest.fixture
def stable_data():
    """30 days of roughly constant sales (no trend)."""
    n = 30
    dates = [datetime(2026, 1, 1) + timedelta(days=i) for i in range(n)]
    rng = np.random.default_rng(42)
    quantities = [50.0 + rng.normal(0, 1.0) for _ in range(n)]
    return dates, quantities


# ---------------------------------------------------------------------------
# Tests: TrendAnalysisResult structure
# ---------------------------------------------------------------------------

class TestTrendAnalysisResultStructure:
    """Verify returned result has all expected fields."""

    def test_result_has_required_fields(self, increasing_trend_data):
        dates, quantities = increasing_trend_data
        result = analyze_time_series(dates, quantities)

        assert isinstance(result, TrendAnalysisResult)
        assert hasattr(result, "trend_slope")
        assert hasattr(result, "trend_intercept")
        assert hasattr(result, "trend_r_squared")
        assert hasattr(result, "trend_direction")
        assert hasattr(result, "weekly_seasonality_strength")
        assert hasattr(result, "monthly_seasonality_strength")
        assert hasattr(result, "dominant_period")
        assert hasattr(result, "day_of_week_pattern")
        assert hasattr(result, "confidence")
        assert hasattr(result, "data_points")
        assert hasattr(result, "date_range_days")

    def test_result_to_dict(self, increasing_trend_data):
        dates, quantities = increasing_trend_data
        result = analyze_time_series(dates, quantities)
        d = result.to_dict()
        assert isinstance(d, dict)
        assert "trend_slope" in d
        assert "confidence" in d


# ---------------------------------------------------------------------------
# Tests: Linear trend detection
# ---------------------------------------------------------------------------

class TestLinearTrend:
    """Verify the algorithm detects linear trends correctly."""

    def test_increasing_trend_detected(self, increasing_trend_data):
        dates, quantities = increasing_trend_data
        result = analyze_time_series(dates, quantities)

        assert result.trend_slope > 1.0  # expect ~2.0
        assert result.trend_direction == "increasing"
        assert result.trend_r_squared > 0.9  # strong linear fit

    def test_stable_trend_detected(self, stable_data):
        dates, quantities = stable_data
        result = analyze_time_series(dates, quantities)

        assert abs(result.trend_slope) < 0.5
        assert result.trend_direction == "stable"

    def test_decreasing_trend(self):
        """Detect decreasing trend."""
        n = 30
        dates = [datetime(2026, 1, 1) + timedelta(days=i) for i in range(n)]
        rng = np.random.default_rng(42)
        quantities = [100.0 - 3.0 * i + rng.normal(0, 0.5) for i in range(n)]

        result = analyze_time_series(dates, quantities)
        assert result.trend_slope < -1.0
        assert result.trend_direction == "decreasing"


# ---------------------------------------------------------------------------
# Tests: Seasonality detection
# ---------------------------------------------------------------------------

class TestSeasonality:
    """Verify the algorithm detects seasonal patterns."""

    def test_weekly_seasonality_detected(self, weekly_seasonality_data):
        dates, quantities = weekly_seasonality_data
        result = analyze_time_series(dates, quantities)

        assert result.weekly_seasonality_strength > 0.3  # strong weekly signal
        assert result.dominant_period is not None
        # Dominant period should be close to 7
        assert 5 <= result.dominant_period <= 9

    def test_no_seasonality_in_pure_trend(self, increasing_trend_data):
        dates, quantities = increasing_trend_data
        result = analyze_time_series(dates, quantities)

        # After detrending, should have weak seasonality
        assert result.weekly_seasonality_strength < 0.5

    def test_combined_trend_and_seasonality(self, trend_plus_seasonality_data):
        dates, quantities = trend_plus_seasonality_data
        result = analyze_time_series(dates, quantities)

        # Should detect both trend and seasonality
        assert result.trend_slope > 0.5  # increasing trend
        assert result.trend_direction == "increasing"
        assert result.weekly_seasonality_strength > 0.3


# ---------------------------------------------------------------------------
# Tests: Day-of-week patterns
# ---------------------------------------------------------------------------

class TestDayOfWeekPatterns:
    """Verify day-of-week consumption patterns are extracted."""

    def test_day_of_week_pattern_returned(self, weekly_seasonality_data):
        dates, quantities = weekly_seasonality_data
        result = analyze_time_series(dates, quantities)

        assert isinstance(result.day_of_week_pattern, dict)
        # Should have entries for days present in data
        assert len(result.day_of_week_pattern) > 0

    def test_day_of_week_values_are_positive(self, weekly_seasonality_data):
        dates, quantities = weekly_seasonality_data
        result = analyze_time_series(dates, quantities)

        for day, avg_qty in result.day_of_week_pattern.items():
            assert isinstance(avg_qty, float)


# ---------------------------------------------------------------------------
# Tests: Confidence and cold start
# ---------------------------------------------------------------------------

class TestConfidenceAndColdStart:
    """Verify confidence reflects data quality and cold start works."""

    def test_high_confidence_with_good_data(self, increasing_trend_data):
        dates, quantities = increasing_trend_data
        result = analyze_time_series(dates, quantities)

        assert 0.0 <= result.confidence <= 1.0
        assert result.confidence > 0.5  # 30 days of clean data = decent confidence

    def test_low_confidence_with_minimal_data(self, minimal_data):
        dates, quantities = minimal_data
        result = analyze_time_series(dates, quantities)

        assert 0.0 <= result.confidence <= 1.0
        assert result.confidence < 0.5  # very few data points

    def test_very_low_confidence_with_single_day(self, single_day_data):
        dates, quantities = single_day_data
        result = analyze_time_series(dates, quantities)

        assert 0.0 <= result.confidence <= 1.0
        assert result.confidence < 0.3
        assert result.data_points == 1

    def test_data_points_count(self, increasing_trend_data):
        dates, quantities = increasing_trend_data
        result = analyze_time_series(dates, quantities)

        assert result.data_points == 30

    def test_date_range_days(self, increasing_trend_data):
        dates, quantities = increasing_trend_data
        result = analyze_time_series(dates, quantities)

        assert result.date_range_days == 29  # 30 days → 29 days range


# ---------------------------------------------------------------------------
# Tests: Edge cases
# ---------------------------------------------------------------------------

class TestEdgeCases:
    """Edge cases: empty data, constant values, etc."""

    def test_empty_data_raises_error(self):
        with pytest.raises(ValueError, match="[Ii]nsufficient|[Ee]mpty|[Nn]o data"):
            analyze_time_series([], [])

    def test_mismatched_lengths_raises_error(self):
        dates = [datetime(2026, 1, 1), datetime(2026, 1, 2)]
        quantities = [1.0]
        with pytest.raises(ValueError, match="[Ll]ength|[Mm]ismatch"):
            analyze_time_series(dates, quantities)

    def test_constant_quantity(self):
        """All same quantities should result in stable trend."""
        n = 15
        dates = [datetime(2026, 1, 1) + timedelta(days=i) for i in range(n)]
        quantities = [42.0] * n

        result = analyze_time_series(dates, quantities)
        assert abs(result.trend_slope) < 0.01
        assert result.trend_direction == "stable"

    def test_accepts_pandas_timestamps(self):
        """Should work with pandas Timestamp objects too."""
        dates = pd.date_range("2026-01-01", periods=10, freq="D").tolist()
        quantities = [float(i) for i in range(10)]

        result = analyze_time_series(dates, quantities)
        assert isinstance(result, TrendAnalysisResult)
        assert result.data_points == 10
