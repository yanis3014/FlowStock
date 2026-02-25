"""
Unit tests for ChatService
Tests: conversation creation, send_message, context memory, LLM prompt building, error handling
"""
import os
import json
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime, timedelta

from app.services.chat_service import ChatService, ChatMessage, ChatResponse


@pytest.fixture
def chat_service():
    """Create a ChatService instance"""
    with patch.dict(os.environ, {"OPENAI_API_KEY": "", "STOCKS_SERVICE_URL": "http://localhost:3000"}):
        service = ChatService()
    return service


@pytest.fixture
def tenant_id():
    return "11111111-1111-1111-1111-111111111111"


@pytest.fixture
def user_id():
    return "22222222-2222-2222-2222-222222222222"


@pytest.fixture
def conversation_id():
    return "33333333-3333-3333-3333-333333333333"


class TestCreateConversation:
    """Tests for create_conversation"""

    @pytest.mark.asyncio
    async def test_creates_conversation_and_returns_uuid(self, chat_service, tenant_id, user_id):
        """create_conversation should insert into DB and return a UUID string"""
        with patch("app.services.chat_service.Database") as mock_db:
            mock_db.execute_with_tenant = AsyncMock()
            result = await chat_service.create_conversation(tenant_id, user_id)

        assert isinstance(result, str)
        assert len(result) == 36  # UUID length
        mock_db.execute_with_tenant.assert_called_once()
        call_args = mock_db.execute_with_tenant.call_args
        assert call_args[0][0] == tenant_id
        assert "INSERT INTO chat_conversations" in call_args[0][1]

    @pytest.mark.asyncio
    async def test_passes_tenant_and_user_ids(self, chat_service, tenant_id, user_id):
        """create_conversation should pass tenant_id and user_id to DB"""
        with patch("app.services.chat_service.Database") as mock_db:
            mock_db.execute_with_tenant = AsyncMock()
            await chat_service.create_conversation(tenant_id, user_id)

        call_args = mock_db.execute_with_tenant.call_args[0]
        # call_args: (tenant_id, sql, conversation_id, tenant_id, user_id)
        assert call_args[0] == tenant_id   # RLS tenant_id
        assert call_args[3] == tenant_id   # tenant_id SQL param
        assert call_args[4] == user_id     # user_id SQL param


class TestSendMessage:
    """Tests for send_message"""

    @pytest.mark.asyncio
    async def test_creates_conversation_when_none_provided(self, chat_service, tenant_id, user_id):
        """send_message should create a new conversation when conversation_id is None"""
        with patch("app.services.chat_service.Database") as mock_db:
            mock_db.execute_with_tenant = AsyncMock()
            mock_db.query_with_tenant = AsyncMock(return_value=[])
            mock_db.fetchrow_with_tenant = AsyncMock(return_value=None)

            result = await chat_service.send_message(tenant_id, user_id, None, "Hello")

        assert result.conversation_id is not None
        assert len(result.conversation_id) == 36
        assert isinstance(result.response, str)
        assert result.context_used is False

    @pytest.mark.asyncio
    async def test_uses_existing_conversation_id(self, chat_service, tenant_id, user_id, conversation_id):
        """send_message should use provided conversation_id"""
        with patch("app.services.chat_service.Database") as mock_db:
            mock_db.execute_with_tenant = AsyncMock()
            mock_db.query_with_tenant = AsyncMock(return_value=[])
            mock_db.fetchrow_with_tenant = AsyncMock(return_value=None)

            result = await chat_service.send_message(tenant_id, user_id, conversation_id, "Hello")

        assert result.conversation_id == conversation_id

    @pytest.mark.asyncio
    async def test_saves_user_and_ai_messages(self, chat_service, tenant_id, user_id, conversation_id):
        """send_message should save both user message and AI response"""
        with patch("app.services.chat_service.Database") as mock_db:
            mock_db.execute_with_tenant = AsyncMock()
            mock_db.query_with_tenant = AsyncMock(return_value=[])
            mock_db.fetchrow_with_tenant = AsyncMock(return_value=None)

            await chat_service.send_message(tenant_id, user_id, conversation_id, "Combien de café ?")

        # At minimum: 1 user message + 1 AI response + 1 context save = 3 execute calls
        assert mock_db.execute_with_tenant.call_count >= 3

    @pytest.mark.asyncio
    async def test_context_used_when_previous_context_exists(self, chat_service, tenant_id, user_id, conversation_id):
        """send_message should detect that previous context exists"""
        mock_context = {"last_query": "combien d'ordinateurs?", "products_mentioned": []}

        with patch("app.services.chat_service.Database") as mock_db:
            mock_db.execute_with_tenant = AsyncMock()
            mock_db.query_with_tenant = AsyncMock(return_value=[])
            mock_db.fetchrow_with_tenant = AsyncMock(
                return_value={"context_data": mock_context, "expires_at": datetime.now() + timedelta(hours=1)}
            )

            result = await chat_service.send_message(tenant_id, user_id, conversation_id, "leurs prix")

        assert result.context_used is True

    @pytest.mark.asyncio
    async def test_returns_dummy_response_without_api_key(self, chat_service, tenant_id, user_id, conversation_id):
        """send_message should return dummy response when OPENAI_API_KEY is not set"""
        with patch("app.services.chat_service.Database") as mock_db:
            mock_db.execute_with_tenant = AsyncMock()
            mock_db.query_with_tenant = AsyncMock(return_value=[])
            mock_db.fetchrow_with_tenant = AsyncMock(return_value=None)

            result = await chat_service.send_message(tenant_id, user_id, conversation_id, "Hello")

        assert "clé API OpenAI" in result.response or "OPENAI_API_KEY" in result.response


class TestBuildLlmPrompt:
    """Tests for _build_llm_prompt"""

    def test_builds_prompt_with_system_message(self, chat_service, tenant_id):
        """_build_llm_prompt should include system prompt"""
        prompt = chat_service._build_llm_prompt([], {}, None, tenant_id)
        assert "system" in prompt
        assert "messages" in prompt
        assert "gestion de stocks" in prompt["system"]

    def test_includes_context_when_available(self, chat_service, tenant_id):
        """_build_llm_prompt should include context in system prompt"""
        context = {"last_query": "ordinateurs", "products_mentioned": ["MacBook"]}
        prompt = chat_service._build_llm_prompt([], {}, context, tenant_id)
        assert "ordinateurs" in prompt["system"]

    def test_includes_stock_info_when_available(self, chat_service, tenant_id):
        """_build_llm_prompt should include stock info in system prompt"""
        stock_info = {"products": [{"name": "Café Arabica", "quantity": 50}], "estimates": []}
        prompt = chat_service._build_llm_prompt([], stock_info, None, tenant_id)
        assert "Café Arabica" in prompt["system"]

    def test_includes_conversation_history(self, chat_service, tenant_id):
        """_build_llm_prompt should include message history"""
        history = [
            ChatMessage("1", "conv1", "user", "Bonjour", {}, datetime.now()),
            ChatMessage("2", "conv1", "assistant", "Comment puis-je vous aider ?", {}, datetime.now()),
        ]
        prompt = chat_service._build_llm_prompt(history, {}, None, tenant_id)
        assert len(prompt["messages"]) == 2
        assert prompt["messages"][0]["role"] == "user"
        assert prompt["messages"][0]["content"] == "Bonjour"
        assert prompt["messages"][1]["role"] == "assistant"

    def test_empty_history_returns_empty_messages(self, chat_service, tenant_id):
        """_build_llm_prompt should return empty messages list for no history"""
        prompt = chat_service._build_llm_prompt([], {}, None, tenant_id)
        assert prompt["messages"] == []


class TestCallLlm:
    """Tests for _call_llm"""

    @pytest.mark.asyncio
    async def test_returns_dummy_without_api_key(self, chat_service):
        """_call_llm should return dummy message when no API key is configured"""
        chat_service.openai_api_key = None
        result = await chat_service._call_llm({"system": "test", "messages": []})
        assert "clé API OpenAI" in result or "OPENAI_API_KEY" in result

    @pytest.mark.asyncio
    async def test_handles_api_error_gracefully(self):
        """_call_llm should return error message on API failure"""
        with patch.dict(os.environ, {"OPENAI_API_KEY": "fake-key"}):
            service = ChatService()
            service.openai_api_key = "fake-key"

            with patch("httpx.AsyncClient") as mock_client_cls:
                mock_client = AsyncMock()
                mock_client.__aenter__ = AsyncMock(return_value=mock_client)
                mock_client.__aexit__ = AsyncMock(return_value=False)
                mock_client.post = AsyncMock(side_effect=Exception("Connection refused"))
                mock_client_cls.return_value = mock_client

                result = await service._call_llm({"system": "test", "messages": []})

        assert "Erreur" in result

    @pytest.mark.asyncio
    async def test_successful_api_call(self):
        """_call_llm should return LLM response on successful API call"""
        with patch.dict(os.environ, {"OPENAI_API_KEY": "fake-key"}):
            service = ChatService()
            service.openai_api_key = "fake-key"

            mock_response = MagicMock()
            mock_response.status_code = 200
            mock_response.raise_for_status = MagicMock()
            mock_response.json.return_value = {
                "choices": [{"message": {"content": "Il vous reste 45 unités de café."}}]
            }

            with patch("httpx.AsyncClient") as mock_client_cls:
                mock_client = AsyncMock()
                mock_client.__aenter__ = AsyncMock(return_value=mock_client)
                mock_client.__aexit__ = AsyncMock(return_value=False)
                mock_client.post = AsyncMock(return_value=mock_response)
                mock_client_cls.return_value = mock_client

                result = await service._call_llm({"system": "test", "messages": []})

        assert result == "Il vous reste 45 unités de café."


class TestGetStockInfo:
    """Tests for _get_stock_info"""

    @pytest.mark.asyncio
    async def test_returns_empty_on_api_error(self, chat_service, tenant_id):
        """_get_stock_info should return empty results on API error"""
        with patch("httpx.AsyncClient") as mock_client_cls:
            mock_client = AsyncMock()
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=False)
            mock_client.get = AsyncMock(side_effect=Exception("Connection refused"))
            mock_client_cls.return_value = mock_client

            result = await chat_service._get_stock_info(tenant_id, "café")

        assert result == {"products": [], "estimates": []}

    @pytest.mark.asyncio
    async def test_returns_products_on_success(self, chat_service, tenant_id):
        """_get_stock_info should return products on successful API call"""
        products_resp = MagicMock()
        products_resp.status_code = 200
        products_resp.json.return_value = {
            "success": True,
            "data": [{"name": "Café", "quantity": 50}]
        }

        estimates_resp = MagicMock()
        estimates_resp.status_code = 200
        estimates_resp.json.return_value = {
            "success": True,
            "data": [{"product_name": "Café", "days_remaining": 15}]
        }

        with patch("httpx.AsyncClient") as mock_client_cls:
            mock_client = AsyncMock()
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=False)
            mock_client.get = AsyncMock(side_effect=[products_resp, estimates_resp])
            mock_client_cls.return_value = mock_client

            result = await chat_service._get_stock_info(tenant_id, "café")

        assert len(result["products"]) == 1
        assert result["products"][0]["name"] == "Café"
        assert len(result["estimates"]) == 1


class TestGetConversationHistory:
    """Tests for get_conversation_history"""

    @pytest.mark.asyncio
    async def test_returns_empty_list_for_no_messages(self, chat_service, tenant_id, conversation_id):
        """get_conversation_history should return empty list when no messages exist"""
        with patch("app.services.chat_service.Database") as mock_db:
            mock_db.query_with_tenant = AsyncMock(return_value=[])

            result = await chat_service.get_conversation_history(tenant_id, conversation_id)

        assert result == []

    @pytest.mark.asyncio
    async def test_returns_messages_in_order(self, chat_service, tenant_id, conversation_id):
        """get_conversation_history should return messages in chronological order"""
        mock_rows = [
            {
                "id": "msg-1",
                "conversation_id": conversation_id,
                "role": "user",
                "content": "Bonjour",
                "metadata": {},
                "created_at": datetime(2026, 2, 6, 10, 0, 0)
            },
            {
                "id": "msg-2",
                "conversation_id": conversation_id,
                "role": "assistant",
                "content": "Comment puis-je vous aider ?",
                "metadata": {},
                "created_at": datetime(2026, 2, 6, 10, 0, 1)
            },
        ]

        with patch("app.services.chat_service.Database") as mock_db:
            mock_db.query_with_tenant = AsyncMock(return_value=mock_rows)

            result = await chat_service.get_conversation_history(tenant_id, conversation_id)

        assert len(result) == 2
        assert result[0].role == "user"
        assert result[0].content == "Bonjour"
        assert result[1].role == "assistant"

    @pytest.mark.asyncio
    async def test_respects_limit_parameter(self, chat_service, tenant_id, conversation_id):
        """get_conversation_history should pass limit to DB query"""
        with patch("app.services.chat_service.Database") as mock_db:
            mock_db.query_with_tenant = AsyncMock(return_value=[])

            await chat_service.get_conversation_history(tenant_id, conversation_id, limit=10)

        call_args = mock_db.query_with_tenant.call_args[0]
        assert call_args[3] == 10  # limit parameter
