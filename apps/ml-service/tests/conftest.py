"""
Shared test fixtures for ML Service tests
"""
import os
import pytest
from unittest.mock import AsyncMock, MagicMock, patch

# Set test environment variables before any imports
os.environ.setdefault("JWT_SECRET", "test-secret-key-for-jwt-minimum-32-chars!!")
os.environ.setdefault("OPENAI_API_KEY", "")
os.environ.setdefault("STOCKS_SERVICE_URL", "http://localhost:3000")
os.environ.setdefault("DATABASE_URL", "postgresql://bmad:bmad@localhost:5432/bmad_stock_agent_test")


@pytest.fixture
def mock_database():
    """Mock Database class for unit tests"""
    with patch("app.services.chat_service.Database") as mock_db:
        mock_db.execute_with_tenant = AsyncMock()
        mock_db.query_with_tenant = AsyncMock(return_value=[])
        mock_db.fetchrow_with_tenant = AsyncMock(return_value=None)
        yield mock_db


@pytest.fixture
def sample_tenant_id():
    return "11111111-1111-1111-1111-111111111111"


@pytest.fixture
def sample_user_id():
    return "22222222-2222-2222-2222-222222222222"


@pytest.fixture
def sample_conversation_id():
    return "33333333-3333-3333-3333-333333333333"


@pytest.fixture
def jwt_token(sample_tenant_id, sample_user_id):
    """Generate a valid JWT token for testing"""
    from jose import jwt
    payload = {
        "userId": sample_user_id,
        "tenantId": sample_tenant_id,
        "email": "test@example.com",
        "role": "user"
    }
    return jwt.encode(payload, os.environ["JWT_SECRET"], algorithm="HS256")
