"""
Unit tests for cold start handling with minimal data.
Epic 5 Story 5.2 - Task 4.
Tests with 1, 3, 7, 30 days of sales data.
"""
import numpy as np
import pandas as pd
import pytest
from datetime import datetime, timedelta

from app.ml.cold_start import (
    ColdStartResult,
    analyze_with_cold_start,
    CONFIDENCE_LOW,
    CONFIDENCE_MODERATE,
    MIN_DAYS_FOR_TRENDS,
)
from app.ml.models.baseline import BaselineConsumptionModel


# ---------------------------------------------------------------------------
# Fixtures: data generators for different day counts
# ---------------------------------------------------------------------------

def _make_data(n_days: int, base_qty: float = 10.0):
    """Generate n_days of synthetic sales data."""
    rng = np.random.default_rng(42)
    dates = [datetime(2026, 1, 1) + timedelta(days=i) for i in range(n_days)]
    quantities = [base_qty + rng.normal(0, 0.5) for _ in range(n_days)]
    return dates, quantities


# ---------------------------------------------------------------------------
# Tests: Cold start with varying data sizes
# ---------------------------------------------------------------------------

class TestColdStartDataSizes:
    """Test cold start behavior with 0, 1, 3, 7, 30 days of data."""

    def test_zero_days(self):
        result = analyze_with_cold_start([], [], current_stock=100.0)
        assert isinstance(result, ColdStartResult)
        assert result.data_points == 0
        assert result.confidence == 0.0
        assert result.confidence_level == "very_low"
        assert not result.data_sufficient
        assert len(result.recommendations) > 0

    def test_one_day(self):
        dates, quantities = _make_data(1)
        result = analyze_with_cold_start(dates, quantities, current_stock=100.0)

        assert result.data_points == 1
        assert result.confidence < CONFIDENCE_LOW
        assert result.confidence_level in ("very_low", "low")
        assert not result.data_sufficient
        assert result.daily_consumption > 0
        assert result.days_until_stockout is not None

    def test_three_days(self):
        dates, quantities = _make_data(3)
        result = analyze_with_cold_start(dates, quantities, current_stock=100.0)

        assert result.data_points == 3
        assert result.confidence < CONFIDENCE_MODERATE
        assert not result.data_sufficient
        assert result.daily_consumption > 0

    def test_seven_days(self):
        dates, quantities = _make_data(7)
        result = analyze_with_cold_start(dates, quantities, current_stock=100.0)

        assert result.data_points == 7
        assert result.data_sufficient  # 7 days = minimum for trends
        assert result.daily_consumption > 0
        assert result.trend_analysis is not None

    def test_thirty_days(self):
        dates, quantities = _make_data(30)
        result = analyze_with_cold_start(dates, quantities, current_stock=100.0)

        assert result.data_points == 30
        assert result.data_sufficient
        assert result.confidence > CONFIDENCE_LOW
        assert result.daily_consumption > 0
        assert result.trend_analysis is not None


# ---------------------------------------------------------------------------
# Tests: Confidence increases with more data
# ---------------------------------------------------------------------------

class TestConfidenceProgression:
    """Confidence should increase as more data becomes available."""

    def test_confidence_increases_with_data(self):
        """More data → higher confidence."""
        confidences = {}
        for n in [1, 3, 7, 14, 30]:
            dates, quantities = _make_data(n, base_qty=10.0)
            result = analyze_with_cold_start(dates, quantities)
            confidences[n] = result.confidence

        # Each step should have higher or equal confidence
        assert confidences[3] >= confidences[1]
        assert confidences[7] >= confidences[3]
        assert confidences[14] >= confidences[7]
        assert confidences[30] >= confidences[14]

    def test_confidence_level_improves(self):
        """Confidence level should improve from very_low to higher."""
        dates_1, qty_1 = _make_data(1)
        dates_30, qty_30 = _make_data(30)

        r1 = analyze_with_cold_start(dates_1, qty_1)
        r30 = analyze_with_cold_start(dates_30, qty_30)

        levels = ["very_low", "low", "moderate", "high", "very_high"]
        assert levels.index(r30.confidence_level) > levels.index(r1.confidence_level)


# ---------------------------------------------------------------------------
# Tests: Recommendations
# ---------------------------------------------------------------------------

class TestRecommendations:
    """Recommendations should guide users to add more data."""

    def test_recommendations_for_1_day(self):
        dates, quantities = _make_data(1)
        result = analyze_with_cold_start(dates, quantities)
        # Should recommend adding more data
        assert len(result.recommendations) >= 2

    def test_recommendations_for_30_days(self):
        dates, quantities = _make_data(30)
        result = analyze_with_cold_start(dates, quantities)
        # Should have fewer recommendations with 30 days of data
        recs_1 = analyze_with_cold_start(*_make_data(1)).recommendations
        assert len(result.recommendations) < len(recs_1)

    def test_no_data_recommendations(self):
        result = analyze_with_cold_start([], [])
        assert any("aucune" in r.lower() or "commencez" in r.lower() for r in result.recommendations)


# ---------------------------------------------------------------------------
# Tests: Stockout prediction with cold start
# ---------------------------------------------------------------------------

class TestStockoutPrediction:
    """Stockout predictions should work even with minimal data."""

    def test_stockout_with_1_day(self):
        dates, quantities = _make_data(1, base_qty=10.0)
        result = analyze_with_cold_start(dates, quantities, current_stock=50.0)
        assert result.days_until_stockout is not None
        assert result.days_until_stockout > 0

    def test_stockout_with_7_days(self):
        dates, quantities = _make_data(7, base_qty=10.0)
        result = analyze_with_cold_start(dates, quantities, current_stock=50.0)
        assert result.days_until_stockout is not None
        # With ~10 units/day and 50 stock, should be ~5 days
        assert 2.0 < result.days_until_stockout < 20.0

    def test_stockout_none_without_stock(self):
        dates, quantities = _make_data(7)
        result = analyze_with_cold_start(dates, quantities, current_stock=None)
        assert result.days_until_stockout is None

    def test_zero_stock(self):
        dates, quantities = _make_data(7, base_qty=10.0)
        result = analyze_with_cold_start(dates, quantities, current_stock=0.0)
        assert result.days_until_stockout == 0.0


# ---------------------------------------------------------------------------
# Tests: Model integration
# ---------------------------------------------------------------------------

class TestModelIntegration:
    """Test integration with existing BaselineConsumptionModel."""

    def test_custom_model_used(self):
        model = BaselineConsumptionModel(daily_consumption=25.0)
        dates, quantities = _make_data(10, base_qty=25.0)
        result = analyze_with_cold_start(dates, quantities, model=model)
        assert result.daily_consumption > 0

    def test_result_to_dict(self):
        dates, quantities = _make_data(7)
        result = analyze_with_cold_start(dates, quantities)
        d = result.to_dict()
        assert isinstance(d, dict)
        assert "confidence" in d
        assert "confidence_level" in d
        assert "data_sufficient" in d
        assert "recommendations" in d

    def test_data_sufficient_boundary(self):
        """7 days should be the boundary for data_sufficient."""
        dates_6, qty_6 = _make_data(6)
        dates_7, qty_7 = _make_data(7)

        r6 = analyze_with_cold_start(dates_6, qty_6)
        r7 = analyze_with_cold_start(dates_7, qty_7)

        assert not r6.data_sufficient
        assert r7.data_sufficient
