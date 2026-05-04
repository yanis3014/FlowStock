'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useApi } from '@/hooks/useApi';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { Skeleton } from '@/components/ui/Skeleton';

type QuestionId =
  | 'stock_critique'
  | 'menu_faisable'
  | 'vin_rouge'
  | 'stock_produit'
  | 'ruptures_soir'
  | 'bilan_semaine'
  | 'bon_commande'
  | 'tendances'
  | 'pertes'
  | 'previsions';

const SERVEUR_QUESTIONS: { id: QuestionId; label: string; icon: string }[] = [
  { id: 'stock_critique', label: "⚠️ Qu'est-ce qui manque ?", icon: '⚠️' },
  { id: 'menu_faisable', label: '🍽️ Combien de menus du jour ?', icon: '🍽️' },
  { id: 'vin_rouge', label: '🍷 Stock vin rouge ce soir ?', icon: '🍷' },
  { id: 'stock_produit', label: "🔍 Stock d'un produit spécifique", icon: '🔍' },
  { id: 'ruptures_soir', label: '🚨 Risques de rupture ce soir ?', icon: '🚨' },
];

const GERANT_QUESTIONS: { id: QuestionId; label: string; icon: string }[] = [
  { id: 'bilan_semaine', label: '📊 Bilan de la semaine', icon: '📊' },
  { id: 'bon_commande', label: '📦 Générer un bon de commande', icon: '📦' },
  { id: 'tendances', label: '📈 Tendances de consommation', icon: '📈' },
  { id: 'pertes', label: '🗑️ Pertes déclarées ce mois', icon: '🗑️' },
  { id: 'previsions', label: '🔮 Prévisions stock 7 prochains jours', icon: '🔮' },
];

type ApiOk<T> = { success: true; data: T } & Record<string, unknown>;

type PredictionRow = {
  product_id: string;
  product_name: string;
  sku: string;
  unit: string;
  current_stock: number;
  days_until_stockout: number | null;
  predicted_stockout_date: string | null;
  alert_level: 'ok' | 'warning' | 'critical';
};

type ProductAnalyticsRow = {
  product_id: string;
  product_name?: string;
  avg_7d: number | null;
  avg_30d: number | null;
  trend_direction: 'up' | 'down' | 'stable';
};

type ProductRow = {
  id: string;
  name: string;
  sku: string;
  unit: string;
  quantity: number;
  min_quantity: number | null;
};

type RecipeIngredient = {
  ingredient_name: string;
  quantity: number;
  unit: string;
  product_id?: string | null;
};

type RecipeRow = {
  id: string;
  name: string;
  ingredients: RecipeIngredient[];
};

type LossRow = {
  id: string;
  product_id: string;
  product_name: string;
  product_sku: string;
  quantity_before: number | null;
  quantity_after: number | null;
  quantity_lost: number | null;
  reason: string | null;
  created_at: string;
};

type DashboardSummary = {
  sales_yesterday?: { total_amount?: number; transaction_count?: number };
  current_stock?: { critical_stock_count?: number; low_stock_count?: number; product_count?: number };
  alerts?: unknown[];
  unread_alert_count?: number;
};

type BriefingData = {
  criticalUnderThresholdCount: number;
  trendDownCount: number;
  nextStockout: { product_name: string; days_remaining: number | null } | null;
  watchedCount: number;
  inAlertCount: number;
  minDaysRemaining: number | null;
};

type ResponseState = 'idle' | 'loading' | 'success' | 'error';

function isApiOk<T>(v: unknown): v is ApiOk<T> {
  return typeof v === 'object' && v !== null && (v as any).success === true;
}

async function parseApiJson<T>(res: Response): Promise<T> {
  const json = (await res.json().catch(() => null)) as unknown;
  if (!res.ok) {
    const msg =
      (json && typeof json === 'object' && (json as any).error && String((json as any).error)) ||
      `Erreur ${res.status}`;
    throw new Error(msg);
  }
  if (!isApiOk<T>(json)) {
    const msg =
      (json && typeof json === 'object' && (json as any).error && String((json as any).error)) ||
      'Réponse API invalide';
    throw new Error(msg);
  }
  return json.data;
}

function classNames(...xs: Array<string | false | null | undefined>): string {
  return xs.filter(Boolean).join(' ');
}

function formatInteger(val: number | null | undefined): string {
  if (val == null || !Number.isFinite(val)) return '—';
  return new Intl.NumberFormat('fr-FR').format(val);
}

function formatCurrencyEUR(val: number | null | undefined): string {
  if (val == null || !Number.isFinite(val)) return '—';
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(val);
}

function waitMs(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export default function ChatPage() {
  const { token, isLoading } = useAuth();
  const { fetchApi } = useApi();

  const [tab, setTab] = useState<'questions' | 'chat'>('questions');

  const [mode, setMode] = useState<'serveur' | 'gerant'>('serveur');
  const [activeQuestion, setActiveQuestion] = useState<QuestionId | null>(null);
  const [responseData, setResponseData] = useState<unknown>(null);
  const [responseState, setResponseState] = useState<ResponseState>('idle');

  const [briefing, setBriefing] = useState<BriefingData | null>(null);
  const [briefingState, setBriefingState] = useState<'loading' | 'success' | 'error'>('loading');

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);

  const retryRef = useRef<(() => void) | null>(null);

  const questions = useMemo(() => (mode === 'serveur' ? SERVEUR_QUESTIONS : GERANT_QUESTIONS), [mode]);

  const loadBriefing = useCallback(async () => {
    if (!token) return;
    setBriefingState('loading');
    try {
      const predictionsPromise = fetchApi('/predictions').then((r) => parseApiJson<PredictionRow[]>(r));
      const summaryPromise = fetchApi('/dashboard/summary').then((r) => parseApiJson<DashboardSummary>(r));
      const analyticsPromise = fetchApi('/predictions/analytics')
        .then((r) => parseApiJson<ProductAnalyticsRow[]>(r))
        .catch(() => [] as ProductAnalyticsRow[]);

      const [predictions, summary, analytics] = await Promise.all([
        predictionsPromise,
        summaryPromise,
        analyticsPromise,
      ]);

      const criticalUnderThresholdCount = summary?.current_stock?.critical_stock_count ?? 0;
      const trendDownCount = analytics.filter((a) => a.trend_direction === 'down').length;

      const criticalPredictions = predictions
        .filter((p) => p.alert_level === 'critical')
        .sort((a, b) => (a.days_until_stockout ?? 9999) - (b.days_until_stockout ?? 9999));

      const nextStockout =
        criticalPredictions[0]
          ? {
              product_name: criticalPredictions[0].product_name,
              days_remaining: criticalPredictions[0].days_until_stockout,
            }
          : null;

      const inAlertCount = predictions.filter((p) => p.alert_level === 'critical' || p.alert_level === 'warning').length;
      const minDaysRemaining = (() => {
        const days = predictions
          .map((p) => p.days_until_stockout)
          .filter((d): d is number => typeof d === 'number' && Number.isFinite(d));
        return days.length ? Math.min(...days) : null;
      })();

      setBriefing({
        criticalUnderThresholdCount,
        trendDownCount,
        nextStockout,
        watchedCount: predictions.length,
        inAlertCount,
        minDaysRemaining,
      });
      setBriefingState('success');
    } catch {
      setBriefing(null);
      setBriefingState('error');
    }
  }, [token, fetchApi]);

  useEffect(() => {
    if (!token) return;
    loadBriefing();
  }, [token, loadBriefing]);

  const withMinLoader = useCallback(async <T,>(promise: Promise<T>, minMs: number): Promise<T> => {
    const [result] = await Promise.all([promise, waitMs(minMs)]);
    return result;
  }, []);

  const handleQuestion = useCallback(
    async (id: QuestionId) => {
      if (!token) return;
      setActiveQuestion(id);
      setResponseState('loading');
      setResponseData(null);

      const run = async () => {
        try {
          const result = await withMinLoader(
            (async () => {
              if (id === 'stock_critique' || id === 'ruptures_soir') {
                const [predictions, products] = await Promise.all([
                  fetchApi('/predictions').then((r) => parseApiJson<PredictionRow[]>(r)),
                  fetchApi('/products?limit=200').then((r) => parseApiJson<ProductRow[]>(r)).catch(() => [] as ProductRow[]),
                ]);
                const minByProductId = new Map(products.map((p) => [p.id, p.min_quantity]));
                const mapped = predictions
                  .map((p) => ({
                    product_name: p.product_name,
                    sku: p.sku,
                    current_stock: p.current_stock,
                    min_quantity: minByProductId.get(p.product_id) ?? null,
                    days_remaining: p.days_until_stockout,
                    urgency: p.alert_level === 'critical' ? 'critical' : p.alert_level === 'warning' ? 'high' : 'ok',
                    unit: p.unit,
                  }))
                  .filter((p) => p.urgency === 'critical' || p.urgency === 'high')
                  .filter((p) => (id === 'ruptures_soir' ? (p.days_remaining ?? 9999) <= 1 : true))
                  .sort((a, b) => (a.days_remaining ?? 9999) - (b.days_remaining ?? 9999));
                return { kind: id, items: mapped };
              }

              if (id === 'vin_rouge') {
                const params = new URLSearchParams();
                params.set('search', 'vin rouge');
                params.set('limit', '3');
                const products = await fetchApi(`/products?${params.toString()}`).then((r) => parseApiJson<ProductRow[]>(r));
                const total = products.reduce((sum, p) => sum + (Number.isFinite(p.quantity) ? p.quantity : 0), 0);
                const min = products
                  .map((p) => p.min_quantity)
                  .filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
                const minThreshold = min.length ? Math.min(...min) : null;
                return { kind: id, total, unit: products[0]?.unit ?? '', minThreshold };
              }

              if (id === 'menu_faisable') {
                const [recipes, products] = await Promise.all([
                  fetchApi('/recipes?limit=50').then((r) => parseApiJson<RecipeRow[]>(r)),
                  fetchApi('/products?limit=200').then((r) => parseApiJson<ProductRow[]>(r)),
                ]);
                const byId = new Map(products.map((p) => [p.id, p]));
                const scored = recipes
                  .map((rec) => {
                    const ingredientPortions: number[] = [];
                    for (const ing of rec.ingredients ?? []) {
                      const pid = ing.product_id ?? null;
                      if (!pid) return null;
                      const product = byId.get(pid);
                      if (!product) return null;
                      const q = typeof product.quantity === 'number' ? product.quantity : 0;
                      const need = typeof ing.quantity === 'number' ? ing.quantity : 0;
                      if (need <= 0) return null;
                      ingredientPortions.push(Math.floor(q / need));
                    }
                    if (!ingredientPortions.length) return null;
                    const portions = Math.min(...ingredientPortions);
                    return { recipe_id: rec.id, recipe_name: rec.name, portions };
                  })
                  .filter((x): x is NonNullable<typeof x> => Boolean(x))
                  .sort((a, b) => b.portions - a.portions)
                  .slice(0, 5);
                return { kind: id, items: scored };
              }

              if (id === 'bilan_semaine') {
                const [summary, losses] = await Promise.all([
                  fetchApi('/dashboard/summary').then((r) => parseApiJson<DashboardSummary>(r)),
                  fetchApi('/losses?limit=50').then((r) => parseApiJson<LossRow[]>(r)),
                ]);
                const totalLossQty = losses.reduce((sum, l) => sum + (l.quantity_lost ?? 0), 0);
                const byProduct = new Map<string, number>();
                for (const l of losses) {
                  const qty = l.quantity_lost ?? 0;
                  byProduct.set(l.product_name, (byProduct.get(l.product_name) ?? 0) + qty);
                }
                const topLosses = Array.from(byProduct.entries())
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 5)
                  .map(([product_name, quantity_lost]) => ({ product_name, quantity_lost }));
                return {
                  kind: id,
                  salesAmount: summary?.sales_yesterday?.total_amount ?? null,
                  transactions: summary?.sales_yesterday?.transaction_count ?? null,
                  totalLossQty,
                  topLosses,
                };
              }

              if (id === 'bon_commande') {
                const rec = await fetchApi('/recommendations/generate', { method: 'POST' }).then((r) =>
                  parseApiJson<any>(r)
                );
                return { kind: id, recommendation: rec };
              }

              if (id === 'tendances') {
                const analytics = await fetchApi('/predictions/analytics').then((r) =>
                  parseApiJson<ProductAnalyticsRow[]>(r)
                );
                const up = analytics
                  .filter((a) => a.trend_direction === 'up')
                  .slice(0, 5)
                  .map((a) => ({ product_name: a.product_name ?? a.product_id, avg_7d: a.avg_7d }));
                const down = analytics
                  .filter((a) => a.trend_direction === 'down')
                  .slice(0, 5)
                  .map((a) => ({ product_name: a.product_name ?? a.product_id, avg_7d: a.avg_7d }));
                return { kind: id, up, down };
              }

              if (id === 'pertes') {
                const losses = await fetchApi('/losses?limit=100').then((r) => parseApiJson<LossRow[]>(r));
                const byReason = new Map<string, number>();
                for (const l of losses) {
                  const key = l.reason ?? 'Non précisée';
                  byReason.set(key, (byReason.get(key) ?? 0) + (l.quantity_lost ?? 0));
                }
                const grouped = Array.from(byReason.entries())
                  .sort((a, b) => b[1] - a[1])
                  .map(([reason, qty]) => ({ reason, qty }));
                return { kind: id, total: losses.reduce((s, l) => s + (l.quantity_lost ?? 0), 0), grouped };
              }

              if (id === 'previsions') {
                const [predictions, analytics] = await Promise.all([
                  fetchApi('/predictions').then((r) => parseApiJson<PredictionRow[]>(r)),
                  fetchApi('/predictions/analytics')
                    .then((r) => parseApiJson<ProductAnalyticsRow[]>(r))
                    .catch(() => [] as ProductAnalyticsRow[]),
                ]);
                const analyticsByProductId = new Map(analytics.map((a) => [a.product_id, a]));
                const rows = predictions.map((p) => {
                  const a = analyticsByProductId.get(p.product_id);
                  const avg7d = a?.avg_7d ?? null;
                  const estimated =
                    avg7d != null && Number.isFinite(avg7d) ? Math.max(0, p.current_stock - avg7d * 7) : null;
                  return {
                  product_name: p.product_name,
                  current_stock: p.current_stock,
                  estimated_stock_7d: estimated != null ? Math.round(estimated * 100) / 100 : null,
                  status: p.alert_level,
                };
                });
                return { kind: id, rows };
              }

              if (id === 'stock_produit') {
                return { kind: id, hint: true };
              }

              return { kind: id, unsupported: true };
            })(),
            500
          );

          setResponseData(result);
          setResponseState('success');
        } catch (e) {
          setResponseState('error');
          setResponseData(e);
        }
      };

      retryRef.current = run;
      await run();
    },
    [token, fetchApi, withMinLoader]
  );

  const resetQuestions = useCallback(() => {
    setActiveQuestion(null);
    setResponseData(null);
    setResponseState('idle');
    setSearch('');
  }, []);

  const retry = useCallback(() => {
    retryRef.current?.();
  }, []);

  const [productSearchState, setProductSearchState] = useState<ResponseState>('idle');
  const [productSearchResults, setProductSearchResults] = useState<ProductRow[]>([]);
  const productSearchAbortRef = useRef<AbortController | null>(null);

  // ─────────────────────────────────────────────────────────────
  // Phase 2 — Chat IA (GPT-4o-mini via backend)
  // ─────────────────────────────────────────────────────────────

  type ChatMessage = { role: 'user' | 'assistant'; content: string; created_at?: string };
  type ConversationItem = { id: string; title: string | null; updated_at: string };

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatConversationId, setChatConversationId] = useState<string | null>(null);
  const [chatConversations, setChatConversations] = useState<ConversationItem[]>([]);
  const [chatLoadingHistory, setChatLoadingHistory] = useState(false);
  const [chatSending, setChatSending] = useState(false);
  const [chatError, setChatError] = useState('');
  const [chatInput, setChatInput] = useState('');
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);

  const hideBriefingOnMobile = tab === 'chat';

  const loadChatConversations = useCallback(() => {
    if (!token) return;
    fetchApi('/chat/conversations')
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        const items = json?.data?.conversations;
        if (Array.isArray(items)) setChatConversations(items);
      })
      .catch(() => {});
  }, [token, fetchApi]);

  const loadChatHistory = useCallback(
    async (convId: string) => {
      setChatLoadingHistory(true);
      setChatError('');
      try {
        const res = await fetchApi(`/chat/history?conversation_id=${encodeURIComponent(convId)}`);
        const json = await res.json().catch(() => null);
        if (!res.ok || !json?.success) {
          setChatError(json?.error || `Erreur ${res.status}`);
          setChatMessages([]);
          return;
        }
        const rows = json?.data?.messages;
        if (Array.isArray(rows)) {
          setChatMessages(
            rows.map((m: any) => ({
              role: m.role,
              content: m.content,
              created_at: m.created_at,
            }))
          );
        } else setChatMessages([]);
      } catch {
        setChatError('Erreur réseau');
        setChatMessages([]);
      } finally {
        setChatLoadingHistory(false);
      }
    },
    [fetchApi]
  );

  const handleSelectConversation = useCallback(
    (convId: string) => {
      setChatConversationId(convId);
      loadChatHistory(convId);
    },
    [loadChatHistory]
  );

  const handleNewConversation = useCallback(() => {
    setChatConversationId(null);
    setChatMessages([]);
    setChatError('');
    setChatInput('');
    setTimeout(() => chatInputRef.current?.focus(), 0);
  }, []);

  const sendChat = useCallback(async () => {
    const text = chatInput.trim();
    if (!token || !text || chatSending) return;

    setChatSending(true);
    setChatError('');
    setChatInput('');
    setChatMessages((prev) => [...prev, { role: 'user', content: text, created_at: new Date().toISOString() }]);

    try {
      const res = await fetchApi('/chat/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, conversation_id: chatConversationId }),
      });

      if (res.status === 429) {
        setChatError('Quota dépassé, réessayez dans quelques instants.');
        return;
      }
      if (res.status === 500) {
        const errorJson = await res.json().catch(() => ({}));
        const errorMsg = (errorJson as { error?: string } | null)?.error ?? 'Le service IA est temporairement indisponible.';
        setChatError(`Erreur : ${errorMsg}`);
        // eslint-disable-next-line no-console
        console.error('[Chat Frontend] Erreur 500 détail:', errorJson);
        return;
      }

      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) {
        setChatError(json?.error || `Erreur ${res.status}`);
        return;
      }

      const convId = json?.data?.conversation_id as string | undefined;
      const response = json?.data?.response as string | undefined;
      if (convId) setChatConversationId(convId);
      setChatMessages((prev) => [...prev, { role: 'assistant', content: response || '—', created_at: new Date().toISOString() }]);
      loadChatConversations();
    } catch {
      setChatError('Erreur réseau');
    } finally {
      setChatSending(false);
      setTimeout(() => chatInputRef.current?.focus(), 0);
    }
  }, [chatInput, token, chatSending, fetchApi, chatConversationId, loadChatConversations]);

  useEffect(() => {
    if (!token) return;
    if (tab !== 'chat') return;
    loadChatConversations();
  }, [token, tab, loadChatConversations]);

  useEffect(() => {
    if (tab !== 'chat') return;
    messagesEndRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'end',
    });
  }, [tab, chatMessages, chatSending, chatLoadingHistory]);

  useEffect(() => {
    if (!token) return;
    if (activeQuestion !== 'stock_produit') return;
    const q = debouncedSearch.trim();
    if (q.length === 0) {
      setProductSearchState('idle');
      setProductSearchResults([]);
      return;
    }

    productSearchAbortRef.current?.abort();
    const controller = new AbortController();
    productSearchAbortRef.current = controller;
    setProductSearchState('loading');

    const params = new URLSearchParams();
    params.set('search', q);
    params.set('limit', '5');

    fetchApi(`/products?${params.toString()}`, { signal: controller.signal })
      .then((r) => parseApiJson<ProductRow[]>(r))
      .then((data) => {
        setProductSearchResults(data);
        setProductSearchState('success');
      })
      .catch((e) => {
        if (e instanceof Error && e.name === 'AbortError') return;
        setProductSearchResults([]);
        setProductSearchState('error');
      });

    return () => controller.abort();
  }, [token, activeQuestion, debouncedSearch, fetchApi]);

  if (!token && isLoading) return null;
  if (!token) return null;

  const chipBase =
    'bg-white border border-charcoal/12 rounded-xl px-4 py-3 text-sm font-medium text-charcoal hover:bg-cream hover:border-charcoal/30 transition-all min-h-[48px] text-left cursor-pointer';

  const renderBriefing = () => {
    if (briefingState === 'loading') {
      return (
        <div className="rounded-2xl bg-charcoal p-6 text-white">
          <div className="space-y-3">
            <Skeleton className="h-5 w-40 rounded bg-white/15" />
            <Skeleton className="h-4 w-64 rounded bg-white/10" />
            <Skeleton className="h-4 w-64 rounded bg-white/10" />
            <Skeleton className="h-4 w-64 rounded bg-white/10" />
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <Skeleton className="h-14 rounded-xl bg-white/10" />
            <Skeleton className="h-14 rounded-xl bg-white/10" />
            <Skeleton className="h-14 rounded-xl bg-white/10" />
          </div>
        </div>
      );
    }

    if (briefingState === 'error') {
      return (
        <div className="rounded-2xl bg-charcoal p-6 text-white">
          <p className="font-display text-base font-bold">Bonjour 👋</p>
          <p className="mt-2 text-sm text-cream/80">Impossible de charger votre briefing.</p>
          <button
            type="button"
            onClick={loadBriefing}
            className="mt-3 min-h-[48px] rounded-xl bg-white/10 px-4 py-3 text-sm font-medium text-white hover:bg-white/15"
          >
            Réessayer
          </button>
        </div>
      );
    }

    const criticalN = briefing?.criticalUnderThresholdCount ?? 0;
    const trendDownN = briefing?.trendDownCount ?? 0;
    const next = briefing?.nextStockout;

    return (
      <div className="rounded-2xl bg-charcoal p-6 text-white">
        <p className="font-display text-base font-bold">Bonjour 👋</p>
        <p className="mt-1 text-sm text-cream/80">Voici votre situation aujourd&apos;hui.</p>

        <div className="mt-4 space-y-2 text-sm">
          <div className="flex items-start gap-2">
            <span aria-hidden>⚠️</span>
            <span className={criticalN > 0 ? 'text-red-alert font-semibold' : 'text-green-bright font-semibold'}>
              {formatInteger(criticalN)} produits sous le seuil critique
            </span>
          </div>
          <div className="flex items-start gap-2">
            <span aria-hidden>📉</span>
            <span className={trendDownN > 0 ? 'text-gold font-semibold' : 'text-cream/80'}>
              {formatInteger(trendDownN)} produits en tendance baisse
            </span>
          </div>
          <div className="flex items-start gap-2">
            <span aria-hidden>💡</span>
            {next ? (
              <span className="text-cream">
                Prochaine rupture estimée : <span className="font-semibold">{next.product_name}</span>
                {next.days_remaining != null ? ` (≈ ${next.days_remaining}j)` : ''}
              </span>
            ) : (
              <span className="text-cream">✅ Tout va bien, aucune rupture prévue ce soir.</span>
            )}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <div className="rounded-xl bg-white/10 p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-cream/70">Surveillés</p>
            <p className="mt-1 font-display text-lg font-bold text-white">{formatInteger(briefing?.watchedCount ?? 0)}</p>
          </div>
          <div className="rounded-xl bg-white/10 p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-cream/70">En alerte</p>
            <p className="mt-1 font-display text-lg font-bold text-white">{formatInteger(briefing?.inAlertCount ?? 0)}</p>
          </div>
          <div className="rounded-xl bg-white/10 p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-cream/70">Min (jours)</p>
            <p className="mt-1 font-display text-lg font-bold text-white">{formatInteger(briefing?.minDaysRemaining)}</p>
          </div>
        </div>
      </div>
    );
  };

  const renderResponse = () => {
    if (!activeQuestion) return null;

    if (responseState === 'loading') {
      return (
        <div className="rounded-2xl border border-charcoal/8 bg-white p-6">
          <div className="space-y-3 animate-pulse">
            <div className="h-4 w-3/4 rounded bg-charcoal/8" />
            <div className="h-4 w-2/3 rounded bg-charcoal/8" />
            <div className="h-4 w-1/2 rounded bg-charcoal/8" />
          </div>
        </div>
      );
    }

    if (responseState === 'error') {
      return (
        <div className="rounded-2xl border border-charcoal/8 bg-white p-6">
          <div className="rounded-xl border border-red-alert/30 bg-red-alert/10 p-4">
            <p className="font-medium text-red-alert">Impossible de charger les données</p>
            <button onClick={retry} className="mt-2 min-h-[48px] text-sm font-medium text-red-alert underline">
              Réessayer
            </button>
          </div>
          <button onClick={resetQuestions} className="mt-4 min-h-[48px] text-sm text-charcoal/50 underline">
            ← Retour aux questions
          </button>
        </div>
      );
    }

    const data: any = responseData;

    const footer = (
      <button onClick={resetQuestions} className="mt-4 min-h-[48px] text-sm text-charcoal/50 underline">
        ← Retour aux questions
      </button>
    );

    if (activeQuestion === 'stock_produit') {
      return (
        <div className="rounded-2xl border border-charcoal/8 bg-white p-6">
          <p className="font-display text-sm font-bold text-charcoal">Stock d&apos;un produit</p>
          <div className="mt-3 space-y-3">
            <input
              placeholder="Nom ou SKU du produit..."
              className="w-full rounded-xl border border-charcoal/20 px-4 py-3 text-sm text-charcoal min-h-[48px]"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            {productSearchState === 'loading' ? (
              <div className="space-y-2 animate-pulse">
                <div className="h-10 rounded-xl bg-charcoal/6" />
                <div className="h-10 rounded-xl bg-charcoal/6" />
              </div>
            ) : productSearchState === 'error' ? (
              <div className="rounded-xl border border-red-alert/30 bg-red-alert/10 p-4">
                <p className="font-medium text-red-alert">Impossible de charger les données</p>
                <button onClick={retry} className="mt-2 min-h-[48px] text-sm font-medium text-red-alert underline">
                  Réessayer
                </button>
              </div>
            ) : productSearchResults.length === 0 && debouncedSearch.trim().length > 0 ? (
              <p className="text-sm text-charcoal/60">Aucun résultat.</p>
            ) : (
              <ul className="space-y-2">
                {productSearchResults.map((p) => {
                  const minQ = p.min_quantity;
                  const isCritical = minQ != null && p.quantity <= minQ;
                  const isLow = minQ != null && p.quantity <= minQ * 1.2;
                  return (
                    <li key={p.id} className="rounded-xl border border-charcoal/10 bg-cream/30 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-medium text-charcoal truncate">{p.name}</p>
                          <p className="mt-0.5 text-xs text-charcoal/60">SKU: {p.sku}</p>
                        </div>
                        <span
                          className={classNames(
                            'shrink-0 rounded-full border px-2 py-1 text-[10px] font-bold uppercase',
                            isCritical
                              ? 'border-red-alert/30 bg-red-alert/10 text-red-alert'
                              : isLow
                                ? 'border-orange-warn/30 bg-orange-warn/10 text-orange-warn'
                                : 'border-green-bright/30 bg-green-bright/10 text-green-bright'
                          )}
                        >
                          {isCritical ? 'Critique' : isLow ? 'À surveiller' : 'OK'}
                        </span>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-charcoal">
                        <span className="font-display font-bold">{formatInteger(p.quantity)}</span>
                        <span className="text-charcoal/60">{p.unit}</span>
                        <span className="text-charcoal/40">·</span>
                        <span className="text-charcoal/60">Seuil: {minQ != null ? formatInteger(minQ) : '—'}</span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          {footer}
        </div>
      );
    }

    if (activeQuestion === 'vin_rouge') {
      const total = data?.total as number | undefined;
      const unit = String(data?.unit ?? '');
      const minThreshold = data?.minThreshold as number | null | undefined;
      const isCritical = minThreshold != null && typeof total === 'number' && total <= minThreshold;
      return (
        <div className="rounded-2xl border border-charcoal/8 bg-white p-6">
          <p className="text-sm font-medium text-charcoal/60">Stock vin rouge (ce soir)</p>
          <p
            className={classNames(
              'mt-2 font-display text-5xl font-black',
              isCritical ? 'text-red-alert' : 'text-green-deep'
            )}
          >
            {formatInteger(total)}
          </p>
          <p className="mt-1 text-sm text-charcoal/60">{unit || '—'}</p>
          {footer}
        </div>
      );
    }

    if (activeQuestion === 'stock_critique' || activeQuestion === 'ruptures_soir') {
      const items = (data?.items ?? []) as Array<{
        product_name: string;
        sku: string;
        current_stock: number;
        min_quantity: number | null;
        days_remaining: number | null;
        urgency: 'critical' | 'high' | 'ok';
        unit: string;
      }>;
      return (
        <div className="rounded-2xl border border-charcoal/8 bg-white p-6">
          {activeQuestion === 'ruptures_soir' && (
            <p className="mb-3 text-sm font-medium text-charcoal">
              Ces produits risquent de manquer <span className="font-bold">ce soir</span> :
            </p>
          )}
          {items.length === 0 ? (
            <div className="rounded-xl border border-green-bright/30 bg-green-bright/10 p-4">
              <p className="font-medium text-green-deep">Aucun produit en rupture prévue 🎉</p>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((p) => (
                <div
                  key={`${p.sku}-${p.urgency}`}
                  className={classNames(
                    'rounded-xl border p-4',
                    p.urgency === 'critical'
                      ? 'border-red-alert/30 bg-red-alert/10'
                      : 'border-orange-warn/30 bg-orange-warn/10'
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-display font-bold text-charcoal truncate">{p.product_name}</p>
                      <p className="mt-0.5 text-xs text-charcoal/60">SKU: {p.sku}</p>
                    </div>
                    <span
                      className={classNames(
                        'shrink-0 rounded-full border px-2 py-1 text-[10px] font-bold uppercase',
                        p.urgency === 'critical'
                          ? 'border-red-alert/30 bg-white/50 text-red-alert'
                          : 'border-orange-warn/30 bg-white/50 text-orange-warn'
                      )}
                    >
                      {p.urgency === 'critical' ? 'Critique' : 'Élevé'}
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                    <div className="rounded-lg bg-white/60 p-3">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-charcoal/50">Stock actuel</p>
                      <p className="mt-1 font-display font-bold text-charcoal">
                        {formatInteger(p.current_stock)} {p.unit}
                      </p>
                    </div>
                    <div className="rounded-lg bg-white/60 p-3">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-charcoal/50">Seuil min</p>
                      <p className="mt-1 font-display font-bold text-charcoal">
                        {p.min_quantity != null ? `${formatInteger(p.min_quantity)} ${p.unit}` : '—'}
                      </p>
                    </div>
                    <div className="col-span-2 rounded-lg bg-white/60 p-3">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-charcoal/50">
                        Jours restants (est.)
                      </p>
                      <p className="mt-1 font-display font-bold text-charcoal">
                        {p.days_remaining != null ? `${formatInteger(p.days_remaining)} j` : '—'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {footer}
        </div>
      );
    }

    if (activeQuestion === 'menu_faisable') {
      const items = (data?.items ?? []) as Array<{ recipe_id: string; recipe_name: string; portions: number }>;
      return (
        <div className="rounded-2xl border border-charcoal/8 bg-white p-6">
          <p className="font-display text-sm font-bold text-charcoal">Top 5 recettes faisables</p>
          <div className="mt-4 space-y-2">
            {items.length === 0 ? (
              <p className="text-sm text-charcoal/60">Aucune recette calculable (ingrédients non reliés aux produits).</p>
            ) : (
              items.map((it) => (
                <div
                  key={it.recipe_id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-charcoal/10 bg-cream/30 p-4"
                >
                  <p className="min-w-0 truncate font-medium text-charcoal">{it.recipe_name}</p>
                  <span className="shrink-0 rounded-full bg-green-deep/10 px-3 py-1 text-xs font-bold text-green-deep">
                    {formatInteger(it.portions)} portions
                  </span>
                </div>
              ))
            )}
          </div>
          {footer}
        </div>
      );
    }

    if (activeQuestion === 'bilan_semaine') {
      return (
        <div className="rounded-2xl border border-charcoal/8 bg-white p-6">
          <p className="font-display text-sm font-bold text-charcoal">Bilan</p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-charcoal/8 bg-cream/30 p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-charcoal/50">Ventes (hier)</p>
              <p className="mt-1 font-display text-xl font-bold text-charcoal">{formatCurrencyEUR(data?.salesAmount ?? null)}</p>
              <p className="mt-0.5 text-xs text-charcoal/60">{formatInteger(data?.transactions ?? null)} transactions</p>
            </div>
            <div className="rounded-xl border border-charcoal/8 bg-cream/30 p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-charcoal/50">Pertes (échantillon)</p>
              <p className="mt-1 font-display text-xl font-bold text-charcoal">{formatInteger(data?.totalLossQty ?? null)}</p>
              <p className="mt-0.5 text-xs text-charcoal/60">quantité totale (50 dernières)</p>
            </div>
          </div>
          <div className="mt-4">
            <p className="text-xs font-bold uppercase tracking-wider text-charcoal/50">Top pertes</p>
            <div className="mt-2 space-y-2">
              {(data?.topLosses ?? []).length === 0 ? (
                <p className="text-sm text-charcoal/60">Aucune perte récente.</p>
              ) : (
                (data?.topLosses ?? []).map((it: any) => (
                  <div
                    key={it.product_name}
                    className="flex items-center justify-between gap-3 rounded-xl border border-charcoal/10 bg-white p-3"
                  >
                    <p className="min-w-0 truncate text-sm font-medium text-charcoal">{it.product_name}</p>
                    <span className="shrink-0 text-sm font-bold text-terracotta">{formatInteger(it.quantity_lost)}</span>
                  </div>
                ))
              )}
            </div>
          </div>
          {footer}
        </div>
      );
    }

    if (activeQuestion === 'bon_commande') {
      const validated = data?.validated ?? null;
      const rec = data?.recommendation ?? null;
      const recId = rec?.id ? String(rec.id) : null;
      const items = Array.isArray(rec?.items) ? rec.items : [];
      const onValidate = async () => {
        if (!recId) return;
        setResponseState('loading');
        try {
          const validated = await withMinLoader(
            fetchApi(`/recommendations/${encodeURIComponent(recId)}/validate`, { method: 'POST' }).then((r) =>
              parseApiJson<any>(r)
            ),
            500
          );
          setResponseData({ kind: 'bon_commande', validated });
          setResponseState('success');
        } catch (e) {
          setResponseState('error');
          setResponseData(e);
        }
      };
      return (
        <div className="rounded-2xl border border-charcoal/8 bg-white p-6">
          <p className="font-display text-sm font-bold text-charcoal">Bon de commande</p>
          {validated ? (
            <div className="mt-4 rounded-xl border border-green-bright/30 bg-green-bright/10 p-4">
              <p className="font-medium text-green-deep">Commande validée.</p>
            </div>
          ) : null}
          <div className="mt-4 space-y-2">
            {items.length === 0 ? (
              <p className="text-sm text-charcoal/60">Aucun produit recommandé.</p>
            ) : (
              items.slice(0, 30).map((it: any, idx: number) => (
                <div
                  key={`${it.product_id ?? idx}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-charcoal/10 bg-cream/30 p-4"
                >
                  <p className="min-w-0 truncate text-sm font-medium text-charcoal">{String(it.product_name ?? 'Produit')}</p>
                  <span className="shrink-0 rounded-full bg-green-deep/10 px-3 py-1 text-xs font-bold text-green-deep">
                    {formatInteger(it.recommended_quantity ?? it.quantity ?? null)}
                  </span>
                </div>
              ))
            )}
          </div>
          <button
            type="button"
            onClick={onValidate}
            disabled={!recId || Boolean(validated)}
            className="mt-4 min-h-[48px] rounded-xl bg-green-deep px-4 py-3 text-sm font-bold text-cream hover:bg-forest-green disabled:opacity-50"
          >
            {validated ? 'Commande validée' : 'Valider la commande'}
          </button>
          {footer}
        </div>
      );
    }

    if (activeQuestion === 'tendances') {
      const up = (data?.up ?? []) as Array<{ product_name: string; avg_7d: number | null }>;
      const down = (data?.down ?? []) as Array<{ product_name: string; avg_7d: number | null }>;
      return (
        <div className="rounded-2xl border border-charcoal/8 bg-white p-6">
          <p className="font-display text-sm font-bold text-charcoal">Tendances</p>
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-charcoal/50">↑ En hausse</p>
              <div className="mt-2 space-y-2">
                {up.length === 0 ? (
                  <p className="text-sm text-charcoal/60">Aucune hausse détectée.</p>
                ) : (
                  up.map((x) => (
                    <div
                      key={`up-${x.product_name}`}
                      className="flex items-center justify-between gap-3 rounded-xl border border-charcoal/10 bg-white p-3"
                    >
                      <p className="min-w-0 truncate text-sm font-medium text-charcoal">{x.product_name}</p>
                      <span className="shrink-0 rounded-full border border-green-bright/30 bg-green-bright/10 px-2 py-1 text-xs font-bold text-green-bright">
                        ↑ {x.avg_7d != null ? x.avg_7d.toFixed(1) : '—'}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-charcoal/50">↓ En baisse</p>
              <div className="mt-2 space-y-2">
                {down.length === 0 ? (
                  <p className="text-sm text-charcoal/60">Aucune baisse détectée.</p>
                ) : (
                  down.map((x) => (
                    <div
                      key={`down-${x.product_name}`}
                      className="flex items-center justify-between gap-3 rounded-xl border border-charcoal/10 bg-white p-3"
                    >
                      <p className="min-w-0 truncate text-sm font-medium text-charcoal">{x.product_name}</p>
                      <span className="shrink-0 rounded-full border border-red-alert/30 bg-red-alert/10 px-2 py-1 text-xs font-bold text-red-alert">
                        ↓ {x.avg_7d != null ? x.avg_7d.toFixed(1) : '—'}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
          {footer}
        </div>
      );
    }

    if (activeQuestion === 'pertes') {
      const grouped = (data?.grouped ?? []) as Array<{ reason: string; qty: number }>;
      return (
        <div className="rounded-2xl border border-charcoal/8 bg-white p-6">
          <p className="font-display text-sm font-bold text-charcoal">Pertes (mois)</p>
          <p className="mt-2 text-sm text-charcoal/60">
            Total: <span className="font-bold text-terracotta">{formatInteger(data?.total ?? null)}</span>
          </p>
          <div className="mt-4 space-y-2">
            {grouped.length === 0 ? (
              <p className="text-sm text-charcoal/60">Aucune perte sur la période.</p>
            ) : (
              grouped.map((g) => (
                <div
                  key={g.reason}
                  className="flex items-center justify-between gap-3 rounded-xl border border-charcoal/10 bg-cream/30 p-4"
                >
                  <p className="min-w-0 truncate text-sm font-medium text-charcoal">{g.reason}</p>
                  <span className="shrink-0 text-sm font-bold text-terracotta">{formatInteger(g.qty)}</span>
                </div>
              ))
            )}
          </div>
          {footer}
        </div>
      );
    }

    if (activeQuestion === 'previsions') {
      const rows = (data?.rows ?? []) as Array<{
        product_name: string;
        current_stock: number;
        estimated_stock_7d: number | null;
        status: 'ok' | 'warning' | 'critical';
      }>;
      return (
        <div className="rounded-2xl border border-charcoal/8 bg-white p-6">
          <p className="font-display text-sm font-bold text-charcoal">Prévisions 7 jours</p>
          <div className="mt-4 overflow-x-auto rounded-xl border border-charcoal/10">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-cream/60">
                <tr className="border-b border-charcoal/10">
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-charcoal/50">Produit</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-charcoal/50">Stock actuel</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-charcoal/50">Estimé (7j)</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-charcoal/50">Statut</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 30).map((r) => (
                  <tr key={r.product_name} className="border-b border-charcoal/8 last:border-0">
                    <td className="px-4 py-3 font-medium text-charcoal">{r.product_name}</td>
                    <td className="px-4 py-3 text-charcoal">{formatInteger(r.current_stock)}</td>
                    <td className="px-4 py-3 text-charcoal">{r.estimated_stock_7d != null ? formatInteger(r.estimated_stock_7d) : '—'}</td>
                    <td className="px-4 py-3">
                      <span
                        className={classNames(
                          'inline-block rounded-full border px-2 py-1 text-[10px] font-bold uppercase',
                          r.status === 'critical'
                            ? 'border-red-alert/30 bg-red-alert/10 text-red-alert'
                            : r.status === 'warning'
                              ? 'border-orange-warn/30 bg-orange-warn/10 text-orange-warn'
                              : 'border-green-bright/30 bg-green-bright/10 text-green-bright'
                        )}
                      >
                        {r.status === 'critical' ? 'Critique' : r.status === 'warning' ? 'Attention' : 'OK'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {footer}
        </div>
      );
    }

    return (
      <div className="rounded-2xl border border-charcoal/8 bg-white p-6">
        <p className="text-sm text-charcoal/60">Réponse indisponible.</p>
        {footer}
      </div>
    );
  };

  return (
    <div
      className={classNames(
        'flex flex-col overflow-hidden bg-cream font-body',
        /* h-12 header + main p-4 (2rem vertical) ; mobile : pt-4 + pb-20 */
        'h-[calc(100vh-3rem-2rem)] max-md:h-[calc(100vh-3rem-6rem)]'
      )}
    >
      <div className="mx-auto flex h-full min-h-0 w-full max-w-6xl flex-col">
        <div
          className={classNames(
            'grid min-h-0 flex-1 gap-4 overflow-hidden',
            'grid-cols-1 md:grid-cols-[340px_1fr] lg:grid-cols-[300px_1fr] md:gap-6'
          )}
        >
          <section
            aria-label="Briefing automatique"
            className={classNames(
              'h-fit max-h-full flex-shrink-0 overflow-y-auto',
              hideBriefingOnMobile ? 'hidden md:block' : 'block'
            )}
          >
            {renderBriefing()}
          </section>

          <section
            aria-label="Questions et réponses"
            className="flex min-h-0 flex-1 flex-col overflow-hidden md:min-h-0"
          >
            <div className="mb-4 flex flex-shrink-0 flex-wrap items-center justify-between gap-3">
              <div className="flex gap-2 rounded-xl bg-charcoal/8 p-1 w-fit">
                <button
                  type="button"
                  className={classNames(
                    'min-h-[48px] rounded-lg px-4 py-2 text-sm font-medium transition-all',
                    tab === 'questions' ? 'bg-white shadow-sm text-charcoal' : 'text-charcoal/60 hover:text-charcoal'
                  )}
                  onClick={() => setTab('questions')}
                >
                  🧩 Questions
                </button>
                <button
                  type="button"
                  className={classNames(
                    'min-h-[48px] rounded-lg px-4 py-2 text-sm font-medium transition-all',
                    tab === 'chat' ? 'bg-white shadow-sm text-charcoal' : 'text-charcoal/60 hover:text-charcoal'
                  )}
                  onClick={() => setTab('chat')}
                >
                  💬 Chat IA
                </button>
              </div>

              {tab === 'questions' ? (
                <div className="flex gap-2 rounded-xl bg-charcoal/8 p-1 w-fit">
                  <button
                    type="button"
                    className={classNames(
                      'min-h-[48px] rounded-lg px-4 py-2 text-sm font-medium transition-all',
                      mode === 'serveur' ? 'bg-white shadow-sm text-charcoal' : 'text-charcoal/60 hover:text-charcoal'
                    )}
                    onClick={() => setMode('serveur')}
                  >
                    🧑‍🍳 Serveur
                  </button>
                  <button
                    type="button"
                    className={classNames(
                      'min-h-[48px] rounded-lg px-4 py-2 text-sm font-medium transition-all',
                      mode === 'gerant' ? 'bg-white shadow-sm text-charcoal' : 'text-charcoal/60 hover:text-charcoal'
                    )}
                    onClick={() => setMode('gerant')}
                  >
                    👔 Gérant
                  </button>
                </div>
              ) : null}

              {tab === 'questions' && !activeQuestion ? (
                <button
                  type="button"
                  onClick={loadBriefing}
                  className="min-h-[48px] rounded-xl border border-charcoal/10 bg-white px-4 py-3 text-sm font-medium text-charcoal hover:bg-cream-dark/40"
                >
                  Actualiser
                </button>
              ) : null}
            </div>

            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              {tab === 'questions' && !activeQuestion ? (
                <div className="min-h-0 flex-1 overflow-y-auto">
                  <div className="flex flex-wrap gap-3">
                    {questions.map((q) => (
                      <button key={q.id} type="button" className={chipBase} onClick={() => handleQuestion(q.id)}>
                        {q.label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : tab === 'questions' ? (
                <div className="min-h-0 flex-1 overflow-y-auto pr-1">{renderResponse()}</div>
              ) : (
                <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-charcoal/8 bg-white">
                  <div className="flex flex-shrink-0 flex-wrap items-center gap-3 border-b border-charcoal/8 p-3">
                    <button
                      type="button"
                      onClick={handleNewConversation}
                      className="min-h-[48px] rounded-xl border border-charcoal/10 bg-cream/50 px-4 py-3 text-sm font-medium text-charcoal hover:bg-cream-dark/40"
                    >
                      Nouvelle conversation
                    </button>
                  </div>

                  <div className="flex min-h-0 flex-1 flex-col overflow-hidden sm:flex-row">
                    {chatConversations.length > 0 ? (
                      <div className="flex-shrink-0 border-b border-charcoal/8 bg-cream p-2 sm:hidden">
                        <label htmlFor="chat-conv-mobile" className="mb-1 block text-xs font-bold uppercase tracking-wider text-charcoal/50">
                          Conversation
                        </label>
                        <select
                          id="chat-conv-mobile"
                          className="min-h-[44px] w-full rounded-xl border border-charcoal/15 bg-white px-3 text-sm text-charcoal"
                          value={chatConversationId ?? ''}
                          onChange={(e) => {
                            const id = e.target.value;
                            if (id) handleSelectConversation(id);
                          }}
                        >
                          <option value="">— Choisir —</option>
                          {chatConversations.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.title || 'Conversation'}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : null}

                    {chatConversations.length > 0 ? (
                      <aside
                        className="hidden w-52 flex-shrink-0 overflow-y-auto border-r border-charcoal/8 bg-cream p-3 sm:block"
                        aria-label="Conversations"
                      >
                        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-charcoal/50">Conversations</p>
                        <ul className="space-y-1">
                          {chatConversations.slice(0, 20).map((c) => (
                            <li key={c.id}>
                              <button
                                type="button"
                                onClick={() => handleSelectConversation(c.id)}
                                className={classNames(
                                  'min-h-[48px] w-full rounded-xl px-3 py-2 text-left text-sm',
                                  chatConversationId === c.id
                                    ? 'bg-green-deep/10 font-medium text-green-deep'
                                    : 'text-charcoal hover:bg-charcoal/5'
                                )}
                              >
                                <div className="truncate">{c.title || 'Conversation'}</div>
                                <div className="mt-0.5 text-xs text-charcoal/50">
                                  {new Date(c.updated_at).toLocaleString('fr-FR', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </div>
                              </button>
                            </li>
                          ))}
                        </ul>
                      </aside>
                    ) : null}

                    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
                      {chatError ? (
                        <div
                          className="flex-shrink-0 border-b border-charcoal/8 bg-red-alert/10 px-4 py-3 text-sm text-red-alert"
                          role="alert"
                        >
                          {chatError}
                        </div>
                      ) : null}

                      <div
                        ref={messagesContainerRef}
                        className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4"
                        role="log"
                        aria-label="Messages du chat"
                      >
                        {chatLoadingHistory ? (
                          <div className="space-y-2 animate-pulse">
                            <div className="h-10 rounded-xl bg-charcoal/6" />
                            <div className="h-10 rounded-xl bg-charcoal/6" />
                            <div className="h-10 rounded-xl bg-charcoal/6" />
                          </div>
                        ) : chatMessages.length === 0 ? (
                          <p className="text-sm text-charcoal/60">Posez une question sur vos stocks…</p>
                        ) : (
                          chatMessages.map((m, idx) => (
                            <div
                              key={`${idx}-${m.role}`}
                              className={classNames(
                                'max-w-[92%] rounded-xl px-4 py-3 break-words',
                                m.role === 'user'
                                  ? 'ml-auto bg-green-deep text-cream'
                                  : 'mr-auto border border-charcoal/8 bg-white text-charcoal'
                              )}
                            >
                              <div className="whitespace-pre-wrap">{m.content}</div>
                            </div>
                          ))
                        )}
                        {chatSending ? (
                          <div className="mr-auto max-w-[80%] rounded-xl border border-charcoal/8 bg-white px-4 py-3 italic text-charcoal/60">
                            IA écrit…
                          </div>
                        ) : null}
                        <div ref={messagesEndRef} />
                      </div>

                      <div className="flex flex-shrink-0 gap-2 border-t border-charcoal/8 bg-white p-3">
                        <input
                          ref={chatInputRef}
                          type="text"
                          value={chatInput}
                          onChange={(e) => setChatInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              sendChat();
                            }
                          }}
                          placeholder="Écrire un message…"
                          className="min-h-[48px] min-w-0 flex-1 rounded-xl border border-charcoal/15 px-4 py-3 text-base text-charcoal transition-colors focus:border-green-deep focus:outline-none focus:ring-1 focus:ring-green-deep/20"
                          disabled={chatSending}
                          maxLength={2000}
                        />
                        <button
                          type="button"
                          onClick={sendChat}
                          disabled={chatSending || !chatInput.trim()}
                          className="min-h-[48px] rounded-xl bg-green-deep px-4 py-3 font-display text-sm font-bold text-cream hover:bg-forest-green disabled:opacity-50"
                        >
                          Envoyer
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

