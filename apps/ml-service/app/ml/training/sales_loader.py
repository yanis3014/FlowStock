"""
Load sales data from database for ML training (tenant-scoped).
Story 5.4: Réentraînement automatique — charger données ventes réelles depuis BDD.
"""
import asyncio
import logging
from typing import List, Optional

import pandas as pd

from app.database import Database

logger = logging.getLogger("bmad.ml.training.sales_loader")


async def get_active_tenant_ids() -> List[str]:
    """
    Return list of active tenant IDs that can be used for retraining.
    Uses tenants table (no RLS) so we can list without tenant context.
    """
    conn = await Database.get_connection(tenant_id=None)
    try:
        rows = await conn.fetch(
            "SELECT id FROM tenants WHERE is_active = true ORDER BY id"
        )
        return [str(r["id"]) for r in rows]
    finally:
        await Database.release_connection(conn)


async def load_sales_for_tenant_async(tenant_id: str) -> pd.DataFrame:
    """
    Load daily aggregated sales for a tenant (date, quantity) for ML training.
    Requires tenant context for RLS on sales table.
    """
    conn = await Database.get_connection(tenant_id=str(tenant_id))
    try:
        rows = await conn.fetch(
            """
            SELECT DATE(sale_date AT TIME ZONE 'UTC') AS date,
                   SUM(quantity_sold::float) AS quantity
            FROM sales
            GROUP BY DATE(sale_date AT TIME ZONE 'UTC')
            ORDER BY date
            """
        )
        if not rows:
            logger.info("No sales data for tenant=%s", tenant_id)
            return pd.DataFrame(columns=["date", "quantity"])

        df = pd.DataFrame([dict(r) for r in rows])
        df["date"] = pd.to_datetime(df["date"]).dt.normalize()
        return df[["date", "quantity"]]
    finally:
        await Database.release_connection(conn)


async def load_sales_with_db_init(tenant_id: str) -> pd.DataFrame:
    """
    Load sales for a tenant after ensuring DB pool is initialized.
    Use from CLI: asyncio.run(load_sales_with_db_init(tenant_id)).
    """
    await Database.initialize()
    return await load_sales_for_tenant_async(tenant_id)
