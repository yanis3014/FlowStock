"""
Integration tests for Chat API routes (FastAPI TestClient)
Tests: endpoint validation, authentication, request/response shapes
"""
import os
import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from datetime import datetime

from httpx import AsyncClient, ASGITransport
from jose import jwt

# Ensure test env
os.environ.setdefault("JWT_SECRET", "test-secret-key-for-jwt-minimum-32-chars!!")
os.environ.setdefault("OPENAI_API_KEY", "")
os.environ.setdefault("DATABASE_URL", "postgresql://bmad:bmad@localhost:5432/bmad_stock_agent_test")

JWT_SECRET = os.environ["JWT_SECRET"]


def make_jwt(user_id="22222222-2222-2222-2222-222222222222",
             tenant_id="11111111-1111-1111-1111-111111111111",
             email="test@example.com",
             role="user"):
    """Helper to create a test JWT token"""
    payload = {
        "userId": user_id,
        "tenantId": tenant_id,
        "email": email,
        "role": role
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")


@pytest.fixture
def auth_headers():
    """Authorization headers with valid JWT"""
    token = make_jwt()
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def mock_db():
    """Mock Database to avoid real DB connections"""
    with patch("app.services.chat_service.Database") as mock_service_db, \
         patch("app.routes.chat_routes.Database", create=True) as mock_route_db, \
         patch("app.database.Database") as mock_main_db:
        for mock in [mock_service_db, mock_route_db, mock_main_db]:
            mock.execute_with_tenant = AsyncMock()
            mock.query_with_tenant = AsyncMock(return_value=[])
            mock.fetchrow_with_tenant = AsyncMock(return_value=None)
            mock.initialize = AsyncMock()
            mock.close = AsyncMock()
        yield mock_service_db


@pytest.fixture
async def client(mock_db):
    """Create async test client for FastAPI app"""
    # Patch Database.initialize and close at the module level
    with patch("app.database.Database.initialize", new_callable=AsyncMock), \
         patch("app.database.Database.close", new_callable=AsyncMock):
        from app.main import app
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            yield ac


class TestPostMessage:
    """Tests for POST /api/v1/chat/message"""

    @pytest.mark.asyncio
    async def test_send_message_returns_200(self, client, auth_headers, mock_db):
        """POST /message should return 200 with valid request"""
        response = await client.post(
            "/api/v1/chat/message",
            json={"message": "Combien de café en stock ?"},
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "conversation_id" in data
        assert "response" in data
        assert "context_used" in data

    @pytest.mark.asyncio
    async def test_send_message_with_conversation_id(self, client, auth_headers, mock_db):
        """POST /message should accept an existing conversation_id"""
        response = await client.post(
            "/api/v1/chat/message",
            json={
                "conversation_id": "33333333-3333-3333-3333-333333333333",
                "message": "Et leurs prix ?"
            },
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["conversation_id"] == "33333333-3333-3333-3333-333333333333"

    @pytest.mark.asyncio
    async def test_send_message_rejects_empty_message(self, client, auth_headers):
        """POST /message should return 422 for empty message"""
        response = await client.post(
            "/api/v1/chat/message",
            json={"message": ""},
            headers=auth_headers
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_send_message_requires_auth(self, client):
        """POST /message should return 401 without auth header"""
        response = await client.post(
            "/api/v1/chat/message",
            json={"message": "Hello"}
        )
        # HTTPBearer returns 401 (not 403) when no credentials are provided
        assert response.status_code in (401, 403)

    @pytest.mark.asyncio
    async def test_send_message_rejects_invalid_token(self, client):
        """POST /message should return 401 with invalid JWT"""
        response = await client.post(
            "/api/v1/chat/message",
            json={"message": "Hello"},
            headers={"Authorization": "Bearer invalid-token"}
        )
        assert response.status_code == 401


class TestGetHistory:
    """Tests for GET /api/v1/chat/history"""

    @pytest.mark.asyncio
    async def test_get_history_returns_200(self, client, auth_headers, mock_db):
        """GET /history should return 200 with valid conversation_id"""
        response = await client.get(
            "/api/v1/chat/history",
            params={"conversation_id": "33333333-3333-3333-3333-333333333333"},
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "messages" in data
        assert isinstance(data["messages"], list)

    @pytest.mark.asyncio
    async def test_get_history_requires_conversation_id(self, client, auth_headers):
        """GET /history should return 422 without conversation_id"""
        response = await client.get(
            "/api/v1/chat/history",
            headers=auth_headers
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_get_history_requires_auth(self, client):
        """GET /history should return 401 without auth header"""
        response = await client.get(
            "/api/v1/chat/history",
            params={"conversation_id": "33333333-3333-3333-3333-333333333333"}
        )
        assert response.status_code in (401, 403)

    @pytest.mark.asyncio
    async def test_get_history_returns_messages(self, client, auth_headers, mock_db):
        """GET /history should return messages from DB"""
        mock_db.query_with_tenant = AsyncMock(return_value=[
            {
                "id": "msg-1",
                "conversation_id": "33333333-3333-3333-3333-333333333333",
                "role": "user",
                "content": "Bonjour",
                "metadata": {},
                "created_at": datetime(2026, 2, 6, 10, 0, 0)
            },
            {
                "id": "msg-2",
                "conversation_id": "33333333-3333-3333-3333-333333333333",
                "role": "assistant",
                "content": "Comment puis-je vous aider ?",
                "metadata": {},
                "created_at": datetime(2026, 2, 6, 10, 0, 1)
            }
        ])

        response = await client.get(
            "/api/v1/chat/history",
            params={"conversation_id": "33333333-3333-3333-3333-333333333333"},
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data["messages"]) == 2
        assert data["messages"][0]["role"] == "user"
        assert data["messages"][1]["role"] == "assistant"


class TestCreateConversation:
    """Tests for POST /api/v1/chat/conversations"""

    @pytest.mark.asyncio
    async def test_create_conversation_returns_200(self, client, auth_headers, mock_db):
        """POST /conversations should return 200 with conversation_id"""
        response = await client.post(
            "/api/v1/chat/conversations",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "conversation_id" in data
        assert len(data["conversation_id"]) == 36  # UUID format

    @pytest.mark.asyncio
    async def test_create_conversation_requires_auth(self, client):
        """POST /conversations should return 401 without auth"""
        response = await client.post("/api/v1/chat/conversations")
        assert response.status_code in (401, 403)


class TestListConversations:
    """Tests for GET /api/v1/chat/conversations"""

    @pytest.mark.asyncio
    async def test_list_conversations_returns_200(self, client, auth_headers, mock_db):
        """GET /conversations should return 200 with empty list"""
        # mock_db.query_with_tenant is already mocked to return []
        # Need to also patch the Database import inside the route
        with patch("app.routes.chat_routes.Database") as route_db:
            route_db.query_with_tenant = AsyncMock(return_value=[])
            response = await client.get(
                "/api/v1/chat/conversations",
                headers=auth_headers
            )

        assert response.status_code == 200
        data = response.json()
        assert "conversations" in data
        assert isinstance(data["conversations"], list)

    @pytest.mark.asyncio
    async def test_list_conversations_returns_items(self, client, auth_headers, mock_db):
        """GET /conversations should return conversation list items"""
        with patch("app.database.Database.query_with_tenant", new_callable=AsyncMock) as mock_query:
            mock_query.return_value = [
                {
                    "id": "33333333-3333-3333-3333-333333333333",
                    "created_at": datetime(2026, 2, 6, 10, 0, 0),
                    "updated_at": datetime(2026, 2, 6, 11, 0, 0)
                }
            ]

            response = await client.get(
                "/api/v1/chat/conversations",
                headers=auth_headers
            )

        assert response.status_code == 200
        data = response.json()
        assert len(data["conversations"]) == 1
        assert data["conversations"][0]["id"] == "33333333-3333-3333-3333-333333333333"

    @pytest.mark.asyncio
    async def test_list_conversations_requires_auth(self, client):
        """GET /conversations should return 401 without auth"""
        response = await client.get("/api/v1/chat/conversations")
        assert response.status_code in (401, 403)
