"""
Chat Service for AI conversationnel avec mémoire contextuelle
Handles conversation management, context memory, and LLM integration
"""
import os
import uuid
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
import httpx
from app.database import Database


class ChatMessage:
    """Represents a chat message"""
    def __init__(
        self,
        id: str,
        conversation_id: str,
        role: str,
        content: str,
        metadata: Dict[str, Any],
        created_at: datetime
    ):
        self.id = id
        self.conversation_id = conversation_id
        self.role = role
        self.content = content
        self.metadata = metadata
        self.created_at = created_at


class ChatResponse:
    """Response from chat service"""
    def __init__(
        self,
        conversation_id: str,
        response: str,
        context_used: bool
    ):
        self.conversation_id = conversation_id
        self.response = response
        self.context_used = context_used


class ChatService:
    """Service for managing chat conversations with AI"""
    
    def __init__(self):
        self.openai_api_key = os.getenv("OPENAI_API_KEY")
        self.openai_api_url = "https://api.openai.com/v1/chat/completions"
        self.stocks_service_url = os.getenv("STOCKS_SERVICE_URL", "http://localhost:3000")
    
    async def create_conversation(
        self,
        tenant_id: str,
        user_id: str
    ) -> str:
        """Create a new conversation"""
        conversation_id = str(uuid.uuid4())
        
        await Database.execute_with_tenant(
            tenant_id,
            """
            INSERT INTO chat_conversations (id, tenant_id, user_id, created_at, updated_at)
            VALUES ($1::uuid, $2::uuid, $3::uuid, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            """,
            conversation_id,
            tenant_id,
            user_id
        )
        
        return conversation_id
    
    async def send_message(
        self,
        tenant_id: str,
        user_id: str,
        conversation_id: Optional[str],
        message: str,
        access_token: str = ""
    ) -> ChatResponse:
        """Send a message and get AI response"""
        # Create conversation if needed
        if not conversation_id:
            conversation_id = await self.create_conversation(tenant_id, user_id)
        
        # Save user message
        await self._save_message(tenant_id, conversation_id, "user", message, {})
        
        # Load context and history
        context = await self._load_context(tenant_id, conversation_id)
        history = await self._get_conversation_history(tenant_id, conversation_id, limit=10)
        
        # Get stock information (uses user's JWT to call API)
        stock_info = await self._get_stock_info(tenant_id, message, access_token)
        
        # Build LLM prompt
        prompt = self._build_llm_prompt(history, stock_info, context, tenant_id)
        
        # Call LLM
        ai_response = await self._call_llm(prompt)
        
        # Save AI response
        await self._save_message(tenant_id, conversation_id, "assistant", ai_response, {})
        
        # Update context
        await self._save_context(tenant_id, conversation_id, {
            "last_query": message,
            "products_mentioned": stock_info.get("products", []),
            "updated_at": datetime.now().isoformat()
        })
        
        return ChatResponse(
            conversation_id=conversation_id,
            response=ai_response,
            context_used=context is not None
        )
    
    async def get_conversation_history(
        self,
        tenant_id: str,
        conversation_id: str,
        limit: int = 50
    ) -> List[ChatMessage]:
        """Get conversation history"""
        return await self._get_conversation_history(tenant_id, conversation_id, limit)
    
    async def _save_message(
        self,
        tenant_id: str,
        conversation_id: str,
        role: str,
        content: str,
        metadata: Dict[str, Any]
    ) -> None:
        """Save a message to database"""
        import json
        await Database.execute_with_tenant(
            tenant_id,
            """
            INSERT INTO chat_messages (id, conversation_id, role, content, metadata, created_at)
            VALUES (gen_random_uuid(), $1, $2, $3, $4::jsonb, CURRENT_TIMESTAMP)
            """,
            conversation_id,
            role,
            content,
            json.dumps(metadata)
        )
    
    async def _get_conversation_history(
        self,
        tenant_id: str,
        conversation_id: str,
        limit: int = 50
    ) -> List[ChatMessage]:
        """Get conversation history from database"""
        rows = await Database.query_with_tenant(
            tenant_id,
            """
            SELECT id, conversation_id, role, content, metadata, created_at
            FROM chat_messages
            WHERE conversation_id = $1::uuid
            ORDER BY created_at ASC
            LIMIT $2
            """,
            conversation_id,
            limit
        )
        
        messages = []
        for row in rows:
            messages.append(ChatMessage(
                id=str(row["id"]),
                conversation_id=str(row["conversation_id"]),
                role=row["role"],
                content=row["content"],
                metadata=row["metadata"] or {},
                created_at=row["created_at"]
            ))
        
        return messages
    
    async def _load_context(
        self,
        tenant_id: str,
        conversation_id: str
    ) -> Optional[Dict[str, Any]]:
        """Load conversation context"""
        row = await Database.fetchrow_with_tenant(
            tenant_id,
            """
            SELECT context_data, expires_at
            FROM chat_context
            WHERE conversation_id = $1::uuid AND expires_at > CURRENT_TIMESTAMP
            """,
            conversation_id
        )
        
        if row:
            return row["context_data"]
        return None
    
    async def _save_context(
        self,
        tenant_id: str,
        conversation_id: str,
        context_data: Dict[str, Any]
    ) -> None:
        """Save conversation context"""
        import json
        expires_at = datetime.now() + timedelta(hours=1)
        
        await Database.execute_with_tenant(
            tenant_id,
            """
            INSERT INTO chat_context (conversation_id, context_data, expires_at)
            VALUES ($1::uuid, $2::jsonb, $3)
            ON CONFLICT (conversation_id) 
            DO UPDATE SET context_data = $2::jsonb, expires_at = $3
            """,
            conversation_id,
            json.dumps(context_data),
            expires_at
        )
    
    async def _get_stock_info(
        self,
        tenant_id: str,
        query: str,
        access_token: str = ""
    ) -> Dict[str, Any]:
        """Get stock information by calling Stocks Service API (uses user's JWT)"""
        # Use user's token; fallback to INTERNAL_API_TOKEN for service-to-service if needed
        token = access_token or os.getenv("INTERNAL_API_TOKEN", "")

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                headers = {"Authorization": f"Bearer {token}"} if token else {}

                # Search products
                products_response = await client.get(
                    f"{self.stocks_service_url}/products",
                    params={"search": query, "limit": 20},
                    headers=headers
                )

                products = []
                if products_response.status_code == 200:
                    products_data = products_response.json()
                    if products_data.get("success") and products_data.get("data"):
                        products = products_data["data"][:5]  # Limit to 5 products

                # If no match with search, try without search to get all products for context
                if not products and query:
                    products_response = await client.get(
                        f"{self.stocks_service_url}/products",
                        params={"limit": 20},
                        headers=headers
                    )
                    if products_response.status_code == 200:
                        products_data = products_response.json()
                        if products_data.get("success") and products_data.get("data"):
                            # Filter locally by query in name/sku
                            q = query.lower()
                            products = [p for p in products_data["data"] if q in (p.get("name", "") or "").lower() or q in (p.get("sku", "") or "").lower()][:5]

                # Get stock estimates
                estimates_response = await client.get(
                    f"{self.stocks_service_url}/stock-estimates",
                    params={"period_days": 30},
                    headers=headers
                )
                
                estimates = []
                if estimates_response.status_code == 200:
                    estimates_data = estimates_response.json()
                    if estimates_data.get("success") and estimates_data.get("data"):
                        estimates = estimates_data["data"][:10]  # Limit to 10 estimates
                
                return {
                    "products": products,
                    "estimates": estimates
                }
        except Exception as e:
            # Log error but don't fail the chat
            print(f"Error fetching stock info: {e}")
            return {"products": [], "estimates": []}
    
    def _build_llm_prompt(
        self,
        history: List[ChatMessage],
        stock_info: Dict[str, Any],
        context: Optional[Dict[str, Any]],
        tenant_id: str
    ) -> str:
        """Build prompt for LLM"""
        system_prompt = """Tu es un assistant IA pour la gestion de stocks. Tu aides les gérants de PME à obtenir rapidement des informations sur leurs stocks via conversation naturelle.

Règles importantes:
- Réponds de manière concise et claire (< 200 mots pour réponses simples)
- Si l'utilisateur fait référence à quelque chose de précédent (ex: "leurs prix"), utilise le contexte de la conversation
- Pour les analyses complexes, redirige vers le Dashboard
- Sois précis avec les données de stocks fournies
"""
        
        # Add context if available
        if context:
            system_prompt += f"\nContexte de la conversation: {context}\n"

        # Add stock information if available
        if stock_info.get("products") or stock_info.get("estimates"):
            system_prompt += f"\nDonnées de stocks à disposition (utilise-les pour répondre) : {stock_info}\n"
        else:
            system_prompt += "\nAucune donnée de stocks n'a pu être récupérée. Dis à l'utilisateur de vérifier qu'il a bien importé des produits et que son token est valide.\n"
        
        # Build conversation history
        conversation = []
        for msg in history:
            conversation.append({
                "role": msg.role,
                "content": msg.content
            })
        
        return {
            "system": system_prompt,
            "messages": conversation
        }
    
    async def _call_llm(self, prompt: Dict[str, Any]) -> str:
        """Call LLM API (OpenAI GPT-4)"""
        if not self.openai_api_key:
            # Return dummy response for development
            return "Je suis désolé, mais la clé API OpenAI n'est pas configurée. Configurez OPENAI_API_KEY pour activer les réponses réelles."
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    self.openai_api_url,
                    headers={
                        "Authorization": f"Bearer {self.openai_api_key}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": "gpt-4",
                        "messages": [
                            {"role": "system", "content": prompt["system"]},
                            *prompt["messages"]
                        ],
                        "temperature": 0.7,
                        "max_tokens": 500
                    }
                )
                response.raise_for_status()
                data = response.json()
                return data["choices"][0]["message"]["content"]
        except Exception as e:
            # Return error message
            return f"Erreur lors de la génération de la réponse: {str(e)}"
