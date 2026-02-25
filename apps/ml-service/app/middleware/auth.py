"""
JWT Authentication middleware for FastAPI
Extracts tenant_id and user_id from JWT tokens
"""
import logging
import os
from typing import Optional
from fastapi import HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger("bmad.ml.auth")


security = HTTPBearer()


class JWTPayload:
    """JWT payload structure"""
    def __init__(self, user_id: str, tenant_id: str, email: str, role: str):
        self.user_id = user_id
        self.tenant_id = tenant_id
        self.email = email
        self.role = role


def verify_token(token: str) -> JWTPayload:
    """Verify JWT token and extract payload"""
    jwt_secret = os.getenv("JWT_SECRET")
    if not jwt_secret:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="JWT_SECRET not configured"
        )
    
    try:
        payload = jwt.decode(
            token,
            jwt_secret,
            algorithms=["HS256"]
        )
        
        # Extract required fields
        user_id = payload.get("userId") or payload.get("user_id")
        tenant_id = payload.get("tenantId") or payload.get("tenant_id")
        email = payload.get("email")
        role = payload.get("role")
        
        if not user_id or not tenant_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token: missing user_id or tenant_id"
            )
        
        return JWTPayload(
            user_id=str(user_id),
            tenant_id=str(tenant_id),
            email=str(email) if email else "",
            role=str(role) if role else "user"
        )
    except JWTError as e:
        logger.debug("Invalid or expired token: %s", e)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> JWTPayload:
    """Dependency to get current authenticated user from JWT"""
    token = credentials.credentials
    return verify_token(token)
