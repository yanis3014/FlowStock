"""
Database connection and utilities for ML Service
Handles PostgreSQL connections with multi-tenant RLS support
"""
import os
import asyncpg
from typing import Optional, Any, AsyncIterator
from contextlib import asynccontextmanager
from dotenv import load_dotenv

# Load .env file
load_dotenv()


class Database:
    """Database connection pool with tenant-aware queries"""

    _pool: Optional[asyncpg.Pool] = None

    @classmethod
    async def initialize(cls) -> None:
        """Initialize database connection pool"""
        database_url = os.getenv("DATABASE_URL")
        if not database_url:
            # Construct from individual env vars
            host = os.getenv("POSTGRES_HOST", "localhost")
            port = os.getenv("POSTGRES_PORT", "5432")
            user = os.getenv("POSTGRES_USER", "bmad")
            password = os.getenv("POSTGRES_PASSWORD", "bmad")
            database = os.getenv("POSTGRES_DB", "bmad_stock_agent")
            database_url = f"postgresql://{user}:{password}@{host}:{port}/{database}"

        cls._pool = await asyncpg.create_pool(
            database_url,
            min_size=2,
            max_size=10,
            command_timeout=60,
        )

    @classmethod
    async def close(cls) -> None:
        """Close database connection pool"""
        if cls._pool:
            await cls._pool.close()
            cls._pool = None

    @classmethod
    @asynccontextmanager
    async def connection(cls, tenant_id: Optional[str] = None) -> AsyncIterator[asyncpg.Connection]:
        """
        Async context manager for a database connection with optional tenant context.
        Prefer this over get_connection/release_connection to avoid connection leaks.

        Usage:
            async with Database.connection(tenant_id) as conn:
                await conn.fetch(...)
        """
        conn = await cls.get_connection(tenant_id)
        try:
            yield conn
        finally:
            await cls.release_connection(conn)

    @classmethod
    async def get_connection(cls, tenant_id: Optional[str] = None) -> asyncpg.Connection:
        """
        Get a database connection with optional tenant context (RLS).
        For most code, prefer using Database.connection(tenant_id) as async context manager
        so the connection is always released. tenant_id must be a UUID string when provided.
        """
        if not cls._pool:
            await cls.initialize()

        connection = await cls._pool.acquire()
        try:
            if tenant_id:
                # Set tenant context for RLS (asyncpg expects str for UUID)
                await connection.execute(
                    "SELECT set_tenant_context($1::uuid)",
                    str(tenant_id),
                )
            return connection
        except Exception:
            await cls._pool.release(connection)
            raise

    @classmethod
    async def release_connection(cls, connection: asyncpg.Connection) -> None:
        """Release a database connection back to the pool"""
        if cls._pool:
            await cls._pool.release(connection)
    
    @classmethod
    async def query_with_tenant(
        cls,
        tenant_id: str,
        query: str,
        *args: Any
    ):
        """Execute a query with tenant context for RLS"""
        conn = await cls.get_connection(tenant_id)
        try:
            return await conn.fetch(query, *args)
        finally:
            await cls.release_connection(conn)
    
    @classmethod
    async def execute_with_tenant(
        cls,
        tenant_id: str,
        query: str,
        *args: Any
    ):
        """Execute a command (INSERT/UPDATE/DELETE) with tenant context"""
        conn = await cls.get_connection(tenant_id)
        try:
            return await conn.execute(query, *args)
        finally:
            await cls.release_connection(conn)
    
    @classmethod
    async def fetchrow_with_tenant(
        cls,
        tenant_id: str,
        query: str,
        *args: Any
    ):
        """Fetch a single row with tenant context"""
        conn = await cls.get_connection(tenant_id)
        try:
            return await conn.fetchrow(query, *args)
        finally:
            await cls.release_connection(conn)


# Lifespan context manager for FastAPI
@asynccontextmanager
async def lifespan(app):
    """Lifespan manager for FastAPI app - initialize database and ML model, then cleanup"""
    import asyncio
    await Database.initialize()
    app.state.loop = asyncio.get_running_loop()
    # Epic 5.1: load baseline ML model at startup (cold start)
    import logging
    _logger = logging.getLogger("bmad.ml")
    try:
        from app.ml.inference import load_model_at_startup
        load_model_at_startup()
        _logger.info("ML baseline model loaded successfully at startup")
    except Exception as exc:
        _logger.warning("Failed to load ML model at startup: %s. Service will run without ML predictions.", exc)
    # Story 5.4: daily retrain job scheduler
    try:
        from app.scheduler import start_scheduler, stop_scheduler
        start_scheduler(app)
    except Exception as exc:
        _logger.warning("Retrain scheduler not started: %s", exc)
    yield
    try:
        from app.scheduler import stop_scheduler
        stop_scheduler()
    except Exception:
        pass
    await Database.close()
