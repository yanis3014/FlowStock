"""
Unit tests for JWT authentication middleware
Tests: token verification, payload extraction, error handling
"""
import os
import pytest
from unittest.mock import patch
from fastapi import HTTPException
from jose import jwt

from app.middleware.auth import verify_token, JWTPayload


JWT_SECRET = os.environ.get("JWT_SECRET", "test-secret-key-for-jwt-minimum-32-chars!!")


@pytest.fixture
def valid_payload():
    return {
        "userId": "22222222-2222-2222-2222-222222222222",
        "tenantId": "11111111-1111-1111-1111-111111111111",
        "email": "test@example.com",
        "role": "admin"
    }


@pytest.fixture
def valid_token(valid_payload):
    return jwt.encode(valid_payload, JWT_SECRET, algorithm="HS256")


class TestVerifyToken:
    """Tests for verify_token"""

    def test_valid_token_returns_jwt_payload(self, valid_token):
        """verify_token should return JWTPayload for a valid token"""
        with patch.dict(os.environ, {"JWT_SECRET": JWT_SECRET}):
            result = verify_token(valid_token)

        assert isinstance(result, JWTPayload)
        assert result.user_id == "22222222-2222-2222-2222-222222222222"
        assert result.tenant_id == "11111111-1111-1111-1111-111111111111"
        assert result.email == "test@example.com"
        assert result.role == "admin"

    def test_supports_camelcase_fields(self):
        """verify_token should support camelCase JWT fields (userId, tenantId)"""
        payload = {
            "userId": "user-123",
            "tenantId": "tenant-456",
            "email": "a@b.com",
            "role": "user"
        }
        token = jwt.encode(payload, JWT_SECRET, algorithm="HS256")

        with patch.dict(os.environ, {"JWT_SECRET": JWT_SECRET}):
            result = verify_token(token)

        assert result.user_id == "user-123"
        assert result.tenant_id == "tenant-456"

    def test_supports_snake_case_fields(self):
        """verify_token should support snake_case JWT fields (user_id, tenant_id)"""
        payload = {
            "user_id": "user-789",
            "tenant_id": "tenant-012",
            "email": "b@c.com",
            "role": "manager"
        }
        token = jwt.encode(payload, JWT_SECRET, algorithm="HS256")

        with patch.dict(os.environ, {"JWT_SECRET": JWT_SECRET}):
            result = verify_token(token)

        assert result.user_id == "user-789"
        assert result.tenant_id == "tenant-012"

    def test_missing_jwt_secret_raises_500(self):
        """verify_token should raise 500 when JWT_SECRET is not configured"""
        with patch.dict(os.environ, {"JWT_SECRET": ""}, clear=False):
            # Remove JWT_SECRET
            env_copy = dict(os.environ)
            env_copy.pop("JWT_SECRET", None)
            with patch.dict(os.environ, env_copy, clear=True):
                with pytest.raises(HTTPException) as exc_info:
                    verify_token("any-token")
                assert exc_info.value.status_code == 500

    def test_invalid_token_raises_401(self):
        """verify_token should raise 401 for an invalid token"""
        with patch.dict(os.environ, {"JWT_SECRET": JWT_SECRET}):
            with pytest.raises(HTTPException) as exc_info:
                verify_token("not-a-valid-jwt")
            assert exc_info.value.status_code == 401

    def test_wrong_secret_raises_401(self, valid_payload):
        """verify_token should raise 401 when token was signed with a different secret"""
        token = jwt.encode(valid_payload, "wrong-secret-key-that-is-long-enough!!", algorithm="HS256")

        with patch.dict(os.environ, {"JWT_SECRET": JWT_SECRET}):
            with pytest.raises(HTTPException) as exc_info:
                verify_token(token)
            assert exc_info.value.status_code == 401

    def test_missing_user_id_raises_401(self):
        """verify_token should raise 401 when user_id is missing from token"""
        payload = {
            "tenantId": "11111111-1111-1111-1111-111111111111",
            "email": "test@example.com"
        }
        token = jwt.encode(payload, JWT_SECRET, algorithm="HS256")

        with patch.dict(os.environ, {"JWT_SECRET": JWT_SECRET}):
            with pytest.raises(HTTPException) as exc_info:
                verify_token(token)
            assert exc_info.value.status_code == 401

    def test_missing_tenant_id_raises_401(self):
        """verify_token should raise 401 when tenant_id is missing from token"""
        payload = {
            "userId": "22222222-2222-2222-2222-222222222222",
            "email": "test@example.com"
        }
        token = jwt.encode(payload, JWT_SECRET, algorithm="HS256")

        with patch.dict(os.environ, {"JWT_SECRET": JWT_SECRET}):
            with pytest.raises(HTTPException) as exc_info:
                verify_token(token)
            assert exc_info.value.status_code == 401

    def test_default_role_is_user(self):
        """verify_token should default role to 'user' when not in token"""
        payload = {
            "userId": "user-1",
            "tenantId": "tenant-1",
            "email": "test@example.com"
        }
        token = jwt.encode(payload, JWT_SECRET, algorithm="HS256")

        with patch.dict(os.environ, {"JWT_SECRET": JWT_SECRET}):
            result = verify_token(token)

        assert result.role == "user"

    def test_default_email_is_empty(self):
        """verify_token should default email to empty string when not in token"""
        payload = {
            "userId": "user-1",
            "tenantId": "tenant-1",
        }
        token = jwt.encode(payload, JWT_SECRET, algorithm="HS256")

        with patch.dict(os.environ, {"JWT_SECRET": JWT_SECRET}):
            result = verify_token(token)

        assert result.email == ""
