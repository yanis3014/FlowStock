'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Send, MessageSquarePlus, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const ML_SERVICE_URL = typeof process.env.NEXT_PUBLIC_ML_SERVICE_URL === 'string' && process.env.NEXT_PUBLIC_ML_SERVICE_URL
  ? process.env.NEXT_PUBLIC_ML_SERVICE_URL.replace(/\/$/, '')
  : 'http://localhost:8000';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at?: string;
}

interface ConversationItem {
  id: string;
  created_at: string;
  updated_at: string;
}

function formatTime(iso?: string): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

export default function ChatPage() {
  const { token, isLoading } = useAuth();
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!token && !isLoading) {
      router.push('/login?returnUrl=/chat');
      return;
    }
  }, [token, isLoading, router]);

  const fetchChat = useCallback(
    async (path: string, options: RequestInit = {}): Promise<Response> => {
      if (!token) throw new Error('Non connecté');
      const url = `${ML_SERVICE_URL}${path.startsWith('/') ? path : `/${path}`}`;
      const res = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          ...options.headers,
        },
      });
      if (res.status === 401) {
        router.push('/login?returnUrl=/chat&session_expired=1');
        throw new Error('Session expirée');
      }
      return res;
    },
    [token, router]
  );

  const loadConversations = useCallback(() => {
    if (!token) return;
    fetchChat('/api/v1/chat/conversations')
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { conversations?: ConversationItem[] } | null) => {
        if (data?.conversations) setConversations(data.conversations);
      })
      .catch(() => {});
  }, [token, fetchChat]);

  useEffect(() => {
    if (token) loadConversations();
  }, [token, loadConversations]);

  const loadHistory = useCallback(
    async (convId: string) => {
      setLoadingHistory(true);
      setError('');
      try {
        const res = await fetchChat(`/api/v1/chat/history?conversation_id=${encodeURIComponent(convId)}`);
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          setError(err?.detail || `Erreur ${res.status}`);
          setMessages([]);
          return;
        }
        const data = (await res.json()) as { messages?: ChatMessage[] };
        setMessages(data.messages || []);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erreur réseau');
        setMessages([]);
      } finally {
        setLoadingHistory(false);
      }
    },
    [fetchChat]
  );

  const handleSelectConversation = useCallback(
    (convId: string) => {
      setConversationId(convId);
      loadHistory(convId);
    },
    [loadHistory]
  );

  const handleNewConversation = useCallback(() => {
    setConversationId(null);
    setMessages([]);
    setError('');
    inputRef.current?.focus();
  }, []);

  const sendMessage = useCallback(() => {
    const text = inputValue.trim();
    if (!text || sending || !token) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setSending(true);
    setError('');

    const body: { message: string; conversation_id?: string } = { message: text };
    if (conversationId) body.conversation_id = conversationId;

    fetchChat('/api/v1/chat/message', {
      method: 'POST',
      body: JSON.stringify(body),
    })
      .then((res) => {
        if (!res.ok) {
          const status = res.status;
          return res.json().then((err: { detail?: string }) => {
            if (status >= 500) throw new Error('Le service IA est indisponible.');
            throw new Error(err?.detail || `Erreur ${status}`);
          });
        }
        return res.json();
      })
      .then((data: { conversation_id: string; response: string }) => {
        setConversationId(data.conversation_id);
        setMessages((prev) => [
          ...prev,
          {
            id: `assistant-${Date.now()}`,
            role: 'assistant',
            content: data.response,
            created_at: new Date().toISOString(),
          },
        ]);
        loadConversations();
      })
      .catch((e) => {
        const msg = e instanceof Error ? e.message : 'Erreur réseau';
        setError(msg);
      })
      .finally(() => {
        setSending(false);
        inputRef.current?.focus();
      });
  }, [inputValue, sending, token, conversationId, fetchChat, loadConversations]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  if (!token && isLoading) return null;
  if (!token) return null;

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col rounded-lg border border-gray-200 bg-white shadow-sm" role="region" aria-label="Chat IA">
      <header className="flex shrink-0 items-center justify-between border-b border-gray-200 bg-primary px-4 py-3 text-white">
        <h1 className="text-lg font-semibold">Chat IA</h1>
        <button
          type="button"
          onClick={handleNewConversation}
          className="flex items-center gap-2 rounded-md bg-white/20 px-3 py-2 text-sm font-medium hover:bg-white/30"
          aria-label="Nouvelle conversation"
        >
          <MessageSquarePlus className="h-4 w-4" />
          Nouvelle conversation
        </button>
      </header>

      <div className="flex min-h-0 flex-1">
        {conversations.length > 0 && (
          <aside className="hidden w-52 shrink-0 border-r border-gray-200 bg-gray-50 p-2 sm:block" aria-label="Conversations">
            <p className="mb-2 px-2 text-xs font-medium text-gray-500">Conversations</p>
            <ul className="space-y-1">
              {conversations.slice(0, 20).map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => handleSelectConversation(c.id)}
                    className={`w-full rounded px-2 py-1.5 text-left text-sm ${conversationId === c.id ? 'bg-primary/10 font-medium text-primary' : 'text-gray-700 hover:bg-gray-200'}`}
                  >
                    {new Date(c.updated_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </button>
                </li>
              ))}
            </ul>
          </aside>
        )}

        <div className="flex min-w-0 flex-1 flex-col">
          {error && (
            <div className="shrink-0 bg-error/10 px-4 py-2 text-sm text-error" role="alert">
              {error}
            </div>
          )}

          <div
            className="flex flex-1 flex-col gap-4 overflow-y-auto p-4"
            ref={messagesEndRef}
            role="log"
            aria-live="polite"
            aria-label="Messages de la conversation"
          >
            {loadingHistory ? (
              <div className="flex flex-1 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden />
                <span className="sr-only">Chargement de l’historique</span>
              </div>
            ) : messages.length === 0 && !sending ? (
              <div className="flex flex-1 items-center justify-center text-center text-gray-500" aria-live="polite">
                Posez votre question sur vos stocks…
              </div>
            ) : (
              <>
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={`max-w-[90%] sm:max-w-[80%] rounded-xl px-4 py-3 break-words ${
                      m.role === 'user'
                        ? 'ml-auto bg-primary text-white'
                        : 'mr-auto border border-gray-200 bg-white text-gray-800'
                    }`}
                    role={m.role === 'user' ? 'user' : 'assistant'}
                  >
                    <div className="whitespace-pre-wrap">{m.content}</div>
                    {m.created_at && (
                      <div className={`mt-1 text-xs ${m.role === 'user' ? 'text-white/80' : 'text-gray-500'}`}>
                        {formatTime(m.created_at)}
                      </div>
                    )}
                  </div>
                ))}
                {sending && (
                  <div className="mr-auto max-w-[80%] rounded-xl border border-gray-200 bg-white px-4 py-3 italic text-gray-500" aria-live="polite">
                    IA écrit…
                  </div>
                )}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          <div className="flex shrink-0 gap-2 border-t border-gray-200 bg-white p-4">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Posez votre question..."
              className="min-w-0 flex-1 rounded-lg border border-gray-300 px-4 py-3 text-base focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              aria-label="Votre message"
              disabled={sending}
              maxLength={2000}
            />
            <button
              type="button"
              onClick={sendMessage}
              disabled={sending || !inputValue.trim()}
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-3 font-medium text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Envoyer le message"
            >
              {sending ? (
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
              ) : (
                <Send className="h-5 w-5" aria-hidden />
              )}
              <span className="hidden sm:inline">Envoyer</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
