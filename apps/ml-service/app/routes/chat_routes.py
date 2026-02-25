"""
Chat API routes for Epic 4 Story 4.1
"""
import logging
from typing import Optional, List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field
from app.middleware.auth import get_current_user, JWTPayload
from app.services.chat_service import ChatService, ChatMessage

logger = logging.getLogger("bmad.ml.chat")

router = APIRouter(prefix="/api/v1/chat", tags=["chat"])
chat_service = ChatService()


class ChatMessageRequest(BaseModel):
    """Request model for sending a chat message"""
    conversation_id: Optional[UUID] = Field(None, description="Conversation ID (optional, creates new if not provided)")
    message: str = Field(..., min_length=1, max_length=2000, description="User message")


class ChatMessageResponse(BaseModel):
    """Response model for chat message"""
    conversation_id: str
    response: str
    context_used: bool


class ChatHistoryResponse(BaseModel):
    """Response model for chat history"""
    messages: List[dict]


class ConversationResponse(BaseModel):
    """Response model for creating a conversation"""
    conversation_id: str


class ConversationListItem(BaseModel):
    """Model for conversation list item"""
    id: str
    created_at: str
    updated_at: str


class ConversationListResponse(BaseModel):
    """Response model for conversation list"""
    conversations: List[ConversationListItem]


@router.post("/message", response_model=ChatMessageResponse)
async def send_message(
    chat_request: ChatMessageRequest,
    http_request: Request,
    current_user: JWTPayload = Depends(get_current_user)
):
    """Send a message to the chat and get AI response"""
    # Extract user JWT to pass to stock API (ML service calls API on user's behalf)
    auth_header = http_request.headers.get("Authorization", "")
    access_token = auth_header.replace("Bearer ", "").strip() if auth_header.startswith("Bearer ") else ""

    try:
        conversation_id_str = str(chat_request.conversation_id) if chat_request.conversation_id else None
        result = await chat_service.send_message(
            tenant_id=current_user.tenant_id,
            user_id=current_user.user_id,
            conversation_id=conversation_id_str,
            message=chat_request.message,
            access_token=access_token
        )
        return ChatMessageResponse(
            conversation_id=result.conversation_id,
            response=result.response,
            context_used=result.context_used
        )
    except Exception as e:
        logger.exception("Error processing chat message: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erreur lors du traitement du message.",
        )


@router.get("/history", response_model=ChatHistoryResponse)
async def get_history(
    conversation_id: UUID,
    current_user: JWTPayload = Depends(get_current_user)
):
    """Get conversation history"""
    try:
        messages = await chat_service.get_conversation_history(
            tenant_id=current_user.tenant_id,
            conversation_id=str(conversation_id),
            limit=50
        )
        return ChatHistoryResponse(
            messages=[
                {
                    "id": msg.id,
                    "role": msg.role,
                    "content": msg.content,
                    "created_at": msg.created_at.isoformat(),
                    "metadata": msg.metadata
                }
                for msg in messages
            ]
        )
    except Exception as e:
        logger.exception("Error fetching conversation history: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erreur lors de la récupération de l'historique.",
        )


@router.post("/conversations", response_model=ConversationResponse)
async def create_conversation(
    current_user: JWTPayload = Depends(get_current_user)
):
    """Create a new conversation"""
    try:
        conversation_id = await chat_service.create_conversation(
            tenant_id=current_user.tenant_id,
            user_id=current_user.user_id
        )
        return ConversationResponse(conversation_id=conversation_id)
    except Exception as e:
        logger.exception("Error creating conversation: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erreur lors de la création de la conversation.",
        )


@router.get("/conversations", response_model=ConversationListResponse)
async def list_conversations(
    current_user: JWTPayload = Depends(get_current_user)
):
    """List all conversations for the current user"""
    try:
        from app.database import Database
        rows = await Database.query_with_tenant(
            current_user.tenant_id,
            """
            SELECT id, created_at, updated_at
            FROM chat_conversations
            WHERE tenant_id = $1::uuid AND user_id = $2::uuid
            ORDER BY updated_at DESC
            LIMIT 50
            """,
            current_user.tenant_id,
            current_user.user_id
        )
        
        conversations = [
            ConversationListItem(
                id=str(row["id"]),
                created_at=row["created_at"].isoformat(),
                updated_at=row["updated_at"].isoformat()
            )
            for row in rows
        ]
        
        return ConversationListResponse(conversations=conversations)
    except Exception as e:
        logger.exception("Error listing conversations: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erreur lors du chargement des conversations.",
        )
