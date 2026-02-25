"""
Tests for sales_loader: get_active_tenant_ids, load_sales_for_tenant_async.
Story 5.4.
"""
import pandas as pd
import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from app.ml.training.sales_loader import (
    get_active_tenant_ids,
    load_sales_for_tenant_async,
    load_sales_with_db_init,
)


@pytest.mark.asyncio
async def test_get_active_tenant_ids_empty():
    """When no tenants, returns empty list."""
    mock_conn = MagicMock()
    mock_conn.fetch = AsyncMock(return_value=[])
    mock_release = AsyncMock()

    with patch("app.ml.training.sales_loader.Database") as db:
        db.get_connection = AsyncMock(return_value=mock_conn)
        db.release_connection = mock_release
        result = await get_active_tenant_ids()
    assert result == []
    mock_release.assert_called_once_with(mock_conn)


@pytest.mark.asyncio
async def test_get_active_tenant_ids_returns_ids():
    """Returns list of tenant id strings."""
    mock_conn = MagicMock()
    mock_conn.fetch = AsyncMock(return_value=[
        {"id": "11111111-1111-1111-1111-111111111111"},
        {"id": "22222222-2222-2222-2222-222222222222"},
    ])
    mock_release = AsyncMock()

    with patch("app.ml.training.sales_loader.Database") as db:
        db.get_connection = AsyncMock(return_value=mock_conn)
        db.release_connection = mock_release
        result = await get_active_tenant_ids()
    assert result == [
        "11111111-1111-1111-1111-111111111111",
        "22222222-2222-2222-2222-222222222222",
    ]


@pytest.mark.asyncio
async def test_load_sales_for_tenant_empty():
    """When tenant has no sales, returns empty DataFrame with date/quantity columns."""
    mock_conn = MagicMock()
    mock_conn.fetch = AsyncMock(return_value=[])
    mock_release = AsyncMock()

    with patch("app.ml.training.sales_loader.Database") as db:
        db.get_connection = AsyncMock(return_value=mock_conn)
        db.release_connection = mock_release
        result = await load_sales_for_tenant_async("11111111-1111-1111-1111-111111111111")
    assert isinstance(result, pd.DataFrame)
    assert list(result.columns) == ["date", "quantity"]
    assert len(result) == 0


@pytest.mark.asyncio
async def test_load_sales_for_tenant_aggregates():
    """Returns daily aggregated sales as DataFrame with date, quantity."""
    from datetime import date
    mock_conn = MagicMock()
    mock_conn.fetch = AsyncMock(return_value=[
        {"date": date(2026, 2, 1), "quantity": 10.0},
        {"date": date(2026, 2, 2), "quantity": 15.0},
    ])
    mock_release = AsyncMock()

    with patch("app.ml.training.sales_loader.Database") as db:
        db.get_connection = AsyncMock(return_value=mock_conn)
        db.release_connection = mock_release
        result = await load_sales_for_tenant_async("11111111-1111-1111-1111-111111111111")
    assert len(result) == 2
    assert list(result.columns) == ["date", "quantity"]
    assert result["quantity"].tolist() == [10.0, 15.0]


@pytest.mark.asyncio
async def test_load_sales_with_db_init_calls_initialize():
    """load_sales_with_db_init initializes DB then loads sales."""
    with patch("app.ml.training.sales_loader.Database") as db:
        db.initialize = AsyncMock()
        db.get_connection = AsyncMock(return_value=MagicMock(fetch=AsyncMock(return_value=[])))
        db.release_connection = AsyncMock()
        await load_sales_with_db_init("11111111-1111-1111-1111-111111111111")
    db.initialize.assert_called_once()
