'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ChefHat,
  Cloud,
  CreditCard,
  Droplet,
  Leaf,
  Package,
  RefreshCw,
  Sparkles,
  TrendingUp,
  UtensilsCrossed,
} from 'lucide-react';
import type { Product, Recipe, StockDiscrepancy, DiscrepancyReport } from '@bmad/shared';
import { PageHeader } from '@/components/ui/PageHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { useApi } from '@/hooks/useApi';
import { toast } from 'sonner';

type Tab = 'economies' | 'plat';

interface StockEstimate {
  product_id: string;
  product_name: string;
  sku: string;
  current_stock: number;
  unit: string;
  avg_daily_consumption: number | null;
  days_remaining: number | null;
  estimated_stockout_date: string | null;
  confidence_level: 'high' | 'medium' | 'low' | 'insufficient';
  sales_days_count: number;
  period_days: number;
}

type ApiSuccess<T> = { success?: boolean; data?: T; error?: string };

type RiskProduct = Product & { days_remaining: number | null };

type SuggestionUrgence = 'haute' | 'moyenne' | 'faible';
type IngredientUrgence = 'critique' | 'bientot' | 'normal';

interface AiSuggestion {
  nom: string;
  raison: string;
  ingredients_a_utiliser: Array<{
    nom: string;
    quantite_suggeree: string;
    urgence: IngredientUrgence;
    conseil: string;
  }>;
  estimation_cout_matiere: string;
  marge_estimee: string;
  conseil_chef: string;
  urgence_globale: SuggestionUrgence;
}

interface AiResponsePayload {
  suggestions: AiSuggestion[];
  message_du_jour: string;
}

function eur(amount: number, maxFractionDigits = 0): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: maxFractionDigits,
  }).format(amount);
}

function clampNumber(n: number): number {
  return Number.isFinite(n) ? n : 0;
}

function safeJson<T>(v: unknown): T | null {
  try {
    return v as T;
  } catch {
    return null;
  }
}

function daysSortKey(v: number | null): number {
  return v == null ? Number.POSITIVE_INFINITY : v;
}

function riskChipClass(days: number | null): string {
  if (days != null && days <= 2) return 'border-terracotta/30 bg-terracotta/10 text-terracotta';
  if (days != null && days <= 5) return 'border-gold/30 bg-gold/10 text-gold';
  return 'border-charcoal/15 bg-cream-dark text-charcoal';
}

function ingredientChipClass(urgence: IngredientUrgence): string {
  if (urgence === 'critique') return 'border-terracotta/30 bg-terracotta/10 text-terracotta';
  if (urgence === 'bientot') return 'border-gold/30 bg-gold/10 text-gold';
  return 'border-charcoal/15 bg-cream-dark text-charcoal';
}

function urgenceBadge(urgence: SuggestionUrgence): { className: string; label: string } {
  if (urgence === 'haute') {
    return { className: 'bg-terracotta/15 text-terracotta', label: '🔴 Écouler aujourd’hui' };
  }
  if (urgence === 'moyenne') {
    return { className: 'bg-gold/15 text-gold', label: '🟡 Ce soir idéalement' };
  }
  return { className: 'bg-green-bright/15 text-green-bright', label: '🟢 Cette semaine' };
}

function suggestionRankPill(i: number): string {
  if (i === 0) return 'bg-green-deep text-cream';
  if (i === 1) return 'bg-gold text-charcoal';
  return 'bg-terracotta/80 text-cream';
}

function sumLossesKg(report: DiscrepancyReport | null): number {
  if (!report?.items?.length) return 0;
  return report.items.reduce((sum: number, it: StockDiscrepancy) => sum + clampNumber(it.total_losses), 0);
}

export default function IaDurabilitePage() {
  const { token } = useAuth();
  const { fetchApi } = useApi();

  const [activeTab, setActiveTab] = useState<Tab>('economies');

  // Onglet 1 — Économies & Impact
  const [impactLoading, setImpactLoading] = useState(true);
  const [impactError, setImpactError] = useState<string>('');
  const [impactComputedAt, setImpactComputedAt] = useState<Date | null>(null);
  const [impactData, setImpactData] = useState<{
    lossCurrentKg: number;
    lossPrevKg: number;
    savingsKg: number;
    savingsEur: number;
    trendPct: number | null;
    avgPurchasePriceKg: number;
    stockValueEur: number;
    alertCount: number;
    wasteAvoidedKg: number;
    co2Kg: number;
    waterLiters: number;
    mealsEq: number;
  } | null>(null);

  const loadImpact = useCallback(() => {
    if (!token) return;
    setImpactLoading(true);
    setImpactError('');

    const calls = [
      fetchApi('/products?limit=200').then((r) => (r.ok ? r.json() : null)),
      fetchApi('/discrepancies?period_days=30').then((r) => (r.ok ? r.json() : null)),
      fetchApi('/discrepancies?period_days=60').then((r) => (r.ok ? r.json() : null)),
    ] as const;

    Promise.allSettled(calls)
      .then((results) => {
        const productsRes = results[0].status === 'fulfilled' ? (results[0].value as ApiSuccess<Product[]>) : null;
        const disc30Res = results[1].status === 'fulfilled' ? (results[1].value as ApiSuccess<DiscrepancyReport>) : null;
        const disc60Res = results[2].status === 'fulfilled' ? (results[2].value as ApiSuccess<DiscrepancyReport>) : null;

        const products = productsRes?.success && Array.isArray(productsRes.data) ? productsRes.data : [];
        const report30 = disc30Res?.success ? (disc30Res.data ?? null) : null;
        const report60 = disc60Res?.success ? (disc60Res.data ?? null) : null;

        const lossCurrentKg = sumLossesKg(report30);
        const total60Kg = sumLossesKg(report60);
        const lossPrevKg = Math.max(0, total60Kg - lossCurrentKg);
        const savingsKg = Math.max(0, lossPrevKg - lossCurrentKg);

        const priced = products.filter((p) => typeof p.purchase_price === 'number' && Number.isFinite(p.purchase_price));
        const avgPurchasePriceKg =
          priced.length > 0
            ? priced.reduce((s, p) => s + (p.purchase_price as number), 0) / priced.length
            : 4.8;

        const savingsEur = savingsKg * avgPurchasePriceKg;
        const trendPct = lossPrevKg > 0 ? ((lossPrevKg - lossCurrentKg) / lossPrevKg) * 100 : null;

        const stockValueEur = priced.reduce((s, p) => s + clampNumber(p.quantity) * clampNumber(p.purchase_price as number), 0);
        const alertCount = products.filter((p) => p.stock_status === 'critical' || p.stock_status === 'low').length;

        const wasteAvoidedKg = savingsKg > 0 ? savingsKg : lossCurrentKg * 0.15;
        const co2Kg = wasteAvoidedKg * 2.5;
        const waterLiters = wasteAvoidedKg * 1800;
        const mealsEq = wasteAvoidedKg * 2.5;

        setImpactData({
          lossCurrentKg,
          lossPrevKg,
          savingsKg,
          savingsEur,
          trendPct,
          avgPurchasePriceKg,
          stockValueEur,
          alertCount,
          wasteAvoidedKg,
          co2Kg,
          waterLiters,
          mealsEq,
        });
        setImpactComputedAt(new Date());

        if (!productsRes?.success && !disc30Res?.success && !disc60Res?.success) {
          setImpactError('Impossible de calculer les métriques pour le moment.');
        }
      })
      .catch(() => setImpactError('Erreur réseau lors du recalcul.'))
      .finally(() => setImpactLoading(false));
  }, [token, fetchApi]);

  useEffect(() => {
    if (token) loadImpact();
  }, [token, loadImpact]);

  // Onglet 2 — Plat du jour IA
  const [pdjLoading, setPdjLoading] = useState(false);
  const [pdjError, setPdjError] = useState<string>('');
  const [riskProducts, setRiskProducts] = useState<RiskProduct[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const pdjLoadedOnceRef = useRef(false);

  const loadPdjData = useCallback(() => {
    if (!token) return;
    setPdjLoading(true);
    setPdjError('');

    const calls = [
      fetchApi('/products?low_stock=true&limit=30').then((r) => (r.ok ? r.json() : null)),
      fetchApi('/stock-estimates?period_days=30').then((r) => (r.ok ? r.json() : null)),
      fetchApi('/recipes?limit=50').then((r) => (r.ok ? r.json() : null)),
    ] as const;

    Promise.allSettled(calls)
      .then((results) => {
        const productsRes = results[0].status === 'fulfilled' ? (results[0].value as ApiSuccess<Product[]>) : null;
        const estimatesRes = results[1].status === 'fulfilled' ? (results[1].value as ApiSuccess<StockEstimate[]>) : null;
        const recipesRes = results[2].status === 'fulfilled' ? (results[2].value as ApiSuccess<Recipe[]>) : null;

        const products = productsRes?.success && Array.isArray(productsRes.data) ? productsRes.data : [];
        const estimates = estimatesRes?.success && Array.isArray(estimatesRes.data) ? estimatesRes.data : [];
        const recipeList = recipesRes?.success && Array.isArray(recipesRes.data) ? recipesRes.data : [];

        const daysByProductId: Record<string, number | null> = {};
        estimates.forEach((e) => {
          daysByProductId[e.product_id] = e.days_remaining ?? null;
        });

        const enriched: RiskProduct[] = products.map((p) => ({
          ...p,
          days_remaining: daysByProductId[p.id] ?? null,
        }));

        enriched.sort((a, b) => {
          const aCrit = a.stock_status === 'critical';
          const bCrit = b.stock_status === 'critical';
          if (aCrit !== bCrit) return aCrit ? -1 : 1;

          if (aCrit && bCrit) return daysSortKey(a.days_remaining) - daysSortKey(b.days_remaining);

          const aLow = a.stock_status === 'low';
          const bLow = b.stock_status === 'low';
          if (aLow !== bLow) return aLow ? -1 : 1;

          const aSoon = a.days_remaining != null && a.days_remaining <= 7;
          const bSoon = b.days_remaining != null && b.days_remaining <= 7;
          if (aSoon !== bSoon) return aSoon ? -1 : 1;

          return daysSortKey(a.days_remaining) - daysSortKey(b.days_remaining);
        });

        setRiskProducts(enriched);
        setRecipes(recipeList);

        if (!productsRes?.success && !estimatesRes?.success && !recipesRes?.success) {
          setPdjError('Impossible de charger les données “Plat du jour IA”.');
        }
      })
      .catch(() => setPdjError('Erreur réseau lors du chargement.'))
      .finally(() => setPdjLoading(false));
  }, [token, fetchApi]);

  useEffect(() => {
    if (activeTab !== 'plat') return;
    if (pdjLoadedOnceRef.current) return;
    pdjLoadedOnceRef.current = true;
    loadPdjData();
  }, [activeTab, loadPdjData]);

  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string>('');
  const [suggestions, setSuggestions] = useState<AiSuggestion[]>([]);
  const [messageDuJour, setMessageDuJour] = useState<string>('');
  const [generatedAt, setGeneratedAt] = useState<Date | null>(null);

  const productsAtRisk = useMemo(() => {
    return riskProducts.slice(0, 12);
  }, [riskProducts]);

  const generateAi = useCallback(async () => {
    setAiLoading(true);
    setAiError('');
    try {
      const body = {
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        system:
          'Tu es un chef consultant expert en gestion des stocks de restaurant français.\n' +
          'Tu reçois la liste des produits en stock faible ou proches de péremption,\n' +
          'ainsi que les fiches techniques disponibles du restaurant.\n' +
          'Tu dois suggérer les 3 meilleurs plats à mettre en avant aujourd\'hui pour\n' +
          'écouler ces produits avant qu\'ils ne soient perdus, en maximisant la marge.\n' +
          'Réponds UNIQUEMENT en JSON valide, sans texte avant ou après, sans markdown.\n' +
          'Format exact :\n' +
          '{\n' +
          '  "suggestions": [\n' +
          '    {\n' +
          '      "nom": "Nom du plat",\n' +
          '      "raison": "Pourquoi ce plat aujourd\'hui (2-3 phrases, ton chef complice)",\n' +
          '      "ingredients_a_utiliser": [\n' +
          '        {\n' +
          '          "nom": "Nom ingrédient",\n' +
          '          "quantite_suggeree": "200g par portion",\n' +
          '          "urgence": "critique|bientot|normal",\n' +
          '          "conseil": "Astuce de préparation courte"\n' +
          '        }\n' +
          '      ],\n' +
          '      "estimation_cout_matiere": "3.50€/portion",\n' +
          '      "marge_estimee": "67% si vendu 10€",\n' +
          '      "conseil_chef": "Conseil pro du chef pour mettre en valeur ce plat",\n' +
          '      "urgence_globale": "haute|moyenne|faible"\n' +
          '    }\n' +
          '  ],\n' +
          '  "message_du_jour": "Message motivant du chef pour l\'équipe (1 phrase)"\n' +
          '}',
        messages: [
          {
            role: 'user',
            content:
              `Stocks à écouler en priorité aujourd'hui :\n` +
              `${productsAtRisk
                .map(
                  (p) =>
                    `- ${p.name} : ${p.quantity} ${p.unit}` +
                    (p.days_remaining !== null ? `, ~${p.days_remaining} jour(s) restant(s)` : '') +
                    ` (statut: ${p.stock_status})`
                )
                .join('\n')}\n\n` +
              `Fiches techniques disponibles dans ce restaurant :\n` +
              `${
                recipes.length > 0
                  ? recipes
                      .map(
                        (r) =>
                          `- ${r.name}${r.category ? ` [${r.category}]` : ''} → utilise : ${r.ingredients
                            .map((i) => `${i.ingredient_name} (${i.quantity}${i.unit})`)
                            .join(', ')}`
                      )
                      .join('\n')
                  : 'Aucune fiche technique enregistrée. Propose des plats classiques de brasserie française adaptés aux ingrédients disponibles.'
              }\n\n` +
              `Génère les 3 meilleures suggestions pour écouler ces stocks aujourd'hui.`,
          },
        ],
      };

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = (await res.json().catch(() => ({}))) as {
        content?: Array<{ text?: string }>;
        error?: { message?: string };
      };

      if (!res.ok) {
        throw new Error(data?.error?.message ?? 'Erreur lors de la génération IA.');
      }

      const text = data.content?.[0]?.text ?? '';
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch?.[0]) throw new Error('Réponse IA illisible (JSON manquant).');

      const parsed = safeJson<AiResponsePayload>(JSON.parse(jsonMatch[0]));
      if (!parsed?.suggestions || !Array.isArray(parsed.suggestions)) {
        throw new Error('Réponse IA invalide (format inattendu).');
      }

      setSuggestions(parsed.suggestions.slice(0, 3));
      setMessageDuJour(String(parsed.message_du_jour ?? ''));
      setGeneratedAt(new Date());
      toast.success('Suggestions IA générées.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur inattendue.';
      setAiError(msg);
      toast.error(msg);
    } finally {
      setAiLoading(false);
    }
  }, [productsAtRisk, recipes]);

  const impactNote = useMemo(() => {
    if (!impactData) return '';
    const price = impactData.avgPurchasePriceKg;
    return `Estimations basées sur vos pertes déclarées · Prix moyen d’achat estimé à ${eur(price, 2)}/kg (fallback 4,80€/kg).`;
  }, [impactData]);

  return (
    <div className="min-h-full bg-cream font-body" role="region" aria-label="IA & Durabilité" aria-live="polite">
      <div className="mx-auto max-w-6xl space-y-6 p-6 pb-24 md:pb-6">
        <PageHeader
          title="IA & Durabilité"
          subtitle="Ce mois · basé sur vos pertes déclarées"
          actions={
            <div className="flex gap-2">
              {activeTab === 'economies' && (
                <button
                  type="button"
                  onClick={loadImpact}
                  disabled={impactLoading}
                  className="inline-flex items-center gap-2 rounded-xl bg-green-deep px-4 py-2.5 font-display text-sm font-bold text-cream hover:bg-forest-green transition-colors disabled:opacity-60"
                >
                  <RefreshCw className={`h-4 w-4 ${impactLoading ? 'animate-spin' : ''}`} />
                  Recalculer
                </button>
              )}
              {activeTab === 'plat' && (
                <button
                  type="button"
                  onClick={loadPdjData}
                  disabled={pdjLoading}
                  className="inline-flex items-center gap-2 rounded-xl border border-charcoal/15 bg-white px-4 py-2.5 font-display text-sm font-bold text-charcoal hover:bg-cream transition-colors disabled:opacity-60"
                >
                  <RefreshCw className={`h-4 w-4 ${pdjLoading ? 'animate-spin' : ''}`} />
                  Actualiser données
                </button>
              )}
            </div>
          }
        />

        <div className="flex gap-2 border-b border-charcoal/10 mb-2">
          <button
            type="button"
            onClick={() => setActiveTab('economies')}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === 'economies'
                ? 'border-green-deep text-green-deep'
                : 'border-transparent text-charcoal/60 hover:text-charcoal'
            }`}
          >
            Économies & Impact
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('plat')}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === 'plat'
                ? 'border-green-deep text-green-deep'
                : 'border-transparent text-charcoal/60 hover:text-charcoal'
            }`}
          >
            Plat du jour IA
          </button>
        </div>

        {activeTab === 'economies' && (
          <section className="space-y-4" aria-label="Économies & Impact environnemental">
            <div className="flex items-center gap-2 text-sm text-charcoal/60">
              <Leaf className="h-4 w-4 text-green-deep" aria-hidden />
              <span className="font-display font-bold text-green-deep">Économies & Impact environnemental</span>
              {impactComputedAt && (
                <span className="ml-auto text-xs text-charcoal/50">
                  Mis à jour à {impactComputedAt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>

            {impactError && !impactLoading && (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-terracotta/20 bg-terracotta/10 p-4">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 shrink-0 text-terracotta" />
                  <p className="text-sm text-terracotta">{impactError}</p>
                </div>
                <button
                  type="button"
                  onClick={loadImpact}
                  className="rounded-xl bg-terracotta px-4 py-2 font-display text-sm font-bold text-cream hover:opacity-90 transition-colors"
                >
                  Réessayer
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {/* Bloc A */}
              <div className="rounded-xl border border-charcoal/8 bg-white p-5 shadow-sm">
                {impactLoading || !impactData ? (
                  <Skeleton className="h-24 w-full rounded-xl animate-pulse" />
                ) : (
                  <>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-green-deep" />
                        <span className="text-sm font-medium text-charcoal/60">Pertes évitées</span>
                      </div>
                      {impactData.trendPct != null && (
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-semibold ${
                            impactData.trendPct >= 0 ? 'bg-green-bright/15 text-green-bright' : 'bg-terracotta/15 text-terracotta'
                          }`}
                          title="Tendance vs mois précédent"
                        >
                          {impactData.trendPct >= 0 ? '+' : ''}
                          {impactData.trendPct.toFixed(0)}%
                        </span>
                      )}
                    </div>
                    <p className="mt-2 font-display text-3xl font-extrabold text-charcoal">
                      {eur(impactData.savingsEur, 0)}
                    </p>
                    <p className="text-sm text-charcoal/60">économisés ce mois</p>
                    <p className="mt-2 text-xs text-charcoal/50">
                      {impactData.lossPrevKg.toFixed(1)} kg (mois précédent) → {impactData.lossCurrentKg.toFixed(1)} kg (30j)
                    </p>
                  </>
                )}
              </div>

              {/* Bloc B */}
              <div className="rounded-xl border border-charcoal/8 bg-white p-5 shadow-sm">
                {impactLoading || !impactData ? (
                  <Skeleton className="h-24 w-full rounded-xl animate-pulse" />
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <Package className="h-5 w-5 text-green-deep" />
                      <span className="text-sm font-medium text-charcoal/60">Valeur stock optimisé</span>
                    </div>
                    <p className="mt-2 font-display text-3xl font-extrabold text-charcoal">
                      {eur(impactData.stockValueEur, 0)}
                    </p>
                    <p className="text-sm text-charcoal/60">Valeur stock suivi</p>
                    <p className="mt-2 text-xs text-charcoal/50">
                      {impactData.alertCount} produit{impactData.alertCount > 1 ? 's' : ''} sous seuil d’alerte détecté{impactData.alertCount > 1 ? 's' : ''}
                    </p>
                  </>
                )}
              </div>

              {/* Bloc C */}
              <div className="rounded-xl border border-charcoal/8 bg-white p-5 shadow-sm">
                {impactLoading || !impactData ? (
                  <Skeleton className="h-24 w-full rounded-xl animate-pulse" />
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-5 w-5 text-green-deep" />
                      <span className="text-sm font-medium text-charcoal/60">ROI abonnement</span>
                    </div>
                    {impactData.savingsEur > 89 ? (
                      <>
                        <p className="mt-2 font-display text-3xl font-extrabold text-charcoal">
                          {(impactData.savingsEur / 89).toFixed(1)}×
                        </p>
                        <p className="text-sm text-charcoal/60">Votre abonnement s’est remboursé ce mois</p>
                      </>
                    ) : (
                      <>
                        <p className="mt-2 font-display text-3xl font-extrabold text-charcoal">—</p>
                        <p className="text-sm text-charcoal/60">Continuez à déclarer vos pertes pour mesurer votre ROI</p>
                      </>
                    )}
                    <p className="mt-2 text-xs text-charcoal/50">Abonnement Growth : {eur(89, 0)}/mois</p>
                  </>
                )}
              </div>

              {/* Bloc D */}
              <div className="rounded-xl border border-green-deep/20 bg-green-deep/5 p-5 shadow-sm">
                {impactLoading || !impactData ? (
                  <Skeleton className="h-24 w-full rounded-xl animate-pulse" />
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <Leaf className="h-5 w-5 text-green-deep" />
                      <span className="text-sm font-medium text-charcoal/60">Impact environnemental</span>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-3">
                      <div className="rounded-xl border border-green-deep/15 bg-white/60 p-3">
                        <div className="flex items-center gap-2">
                          <Cloud className="h-4 w-4 text-green-deep" aria-hidden />
                          <span className="text-xs font-semibold text-charcoal/60">CO₂ évité</span>
                        </div>
                        <p className="mt-1 font-display text-lg font-extrabold text-charcoal">
                          {impactData.co2Kg.toFixed(0)} kg
                        </p>
                      </div>
                      <div className="rounded-xl border border-green-deep/15 bg-white/60 p-3">
                        <div className="flex items-center gap-2">
                          <Droplet className="h-4 w-4 text-green-deep" aria-hidden />
                          <span className="text-xs font-semibold text-charcoal/60">Eau</span>
                        </div>
                        <p className="mt-1 font-display text-lg font-extrabold text-charcoal">
                          {impactData.waterLiters.toFixed(0)} L
                        </p>
                      </div>
                      <div className="rounded-xl border border-green-deep/15 bg-white/60 p-3">
                        <div className="flex items-center gap-2">
                          <UtensilsCrossed className="h-4 w-4 text-green-deep" aria-hidden />
                          <span className="text-xs font-semibold text-charcoal/60">Repas</span>
                        </div>
                        <p className="mt-1 font-display text-lg font-extrabold text-charcoal">
                          {impactData.mealsEq.toFixed(0)}
                        </p>
                      </div>
                    </div>
                    <p className="mt-3 text-xs text-charcoal/60">
                      Calculs basés sur vos pertes déclarées · Facteur CO₂ ADEME · Conformité AGEC 2030
                    </p>
                  </>
                )}
              </div>
            </div>

            <p className="text-xs text-charcoal/50" role="note">
              {impactNote || 'Estimations basées sur vos pertes déclarées (indicateurs non contractuels).'}
            </p>
          </section>
        )}

        {activeTab === 'plat' && (
          <section className="space-y-4" aria-label="Plat du jour IA">
            {pdjLoading && (
              <div className="space-y-2">
                <Skeleton className="h-5 w-2/3 rounded-lg" />
                <Skeleton className="h-5 w-1/2 rounded-lg" />
                <Skeleton className="h-5 w-3/4 rounded-lg" />
              </div>
            )}

            {pdjError && !pdjLoading && (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-terracotta/20 bg-terracotta/10 p-4">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 shrink-0 text-terracotta" />
                  <p className="text-sm text-terracotta">{pdjError}</p>
                </div>
                <button
                  type="button"
                  onClick={loadPdjData}
                  className="rounded-xl bg-terracotta px-4 py-2 font-display text-sm font-bold text-cream hover:opacity-90 transition-colors"
                >
                  Réessayer
                </button>
              </div>
            )}

            {!pdjLoading && !pdjError && (
              <>
                <div className="rounded-xl border border-charcoal/8 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Package className="h-5 w-5 text-green-deep" />
                      <h2 className="font-display text-sm font-bold text-charcoal">Produits à écouler en priorité</h2>
                    </div>
                    <span className="text-xs text-charcoal/50">{productsAtRisk.length} produit(s)</span>
                  </div>

                  {productsAtRisk.length === 0 ? (
                    <p className="mt-3 text-sm text-charcoal/60">
                      Aucun produit en alerte pour le moment. Ajoutez des seuils d’alerte et/ou continuez à suivre vos stocks.
                    </p>
                  ) : (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {productsAtRisk.map((p) => (
                        <span
                          key={p.id}
                          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${riskChipClass(p.days_remaining)}`}
                          title={
                            p.days_remaining != null
                              ? `${p.days_remaining} jour(s) restant(s) estimé(s)`
                              : 'Jours restants non disponibles'
                          }
                        >
                          <span className="truncate max-w-[210px]">{p.name}</span>
                          <span className="text-[11px] opacity-80">
                            ({p.days_remaining != null ? `${p.days_remaining}j` : '—'}
                            {p.days_remaining != null && p.days_remaining <= 1 ? ' URGENT' : ''})
                          </span>
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={generateAi}
                      disabled={aiLoading || productsAtRisk.length === 0}
                      className="inline-flex items-center gap-2 rounded-xl bg-green-deep px-4 py-2.5 font-display text-sm font-bold text-cream hover:bg-forest-green transition-colors disabled:opacity-60"
                    >
                      <Sparkles className="h-4 w-4" aria-hidden />
                      Générer les suggestions IA
                    </button>
                    {(suggestions.length > 0 || aiError) && (
                      <button
                        type="button"
                        onClick={generateAi}
                        disabled={aiLoading || productsAtRisk.length === 0}
                        className="inline-flex items-center gap-2 rounded-xl border border-charcoal/15 bg-white px-4 py-2.5 font-display text-sm font-bold text-charcoal hover:bg-cream transition-colors disabled:opacity-60"
                      >
                        <RefreshCw className={`h-4 w-4 ${aiLoading ? 'animate-spin' : ''}`} aria-hidden />
                        Regénérer
                      </button>
                    )}
                  </div>

                  {aiLoading && (
                    <p className="mt-3 text-sm text-charcoal/60 animate-pulse">
                      L’IA analyse vos stocks et vos fiches techniques…
                    </p>
                  )}

                  {aiError && !aiLoading && (
                    <div className="mt-4 rounded-xl border border-terracotta/20 bg-terracotta/10 p-4 text-sm text-terracotta">
                      {aiError}{' '}
                      <button type="button" onClick={generateAi} className="underline hover:no-underline">
                        Réessayer
                      </button>
                    </div>
                  )}
                </div>

                {aiLoading && (
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-64 rounded-xl animate-pulse" />
                    ))}
                  </div>
                )}

                {!aiLoading && suggestions.length > 0 && (
                  <>
                    {messageDuJour && (
                      <div className="flex items-start gap-3 rounded-xl bg-green-deep p-4 text-cream">
                        <Sparkles className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
                        <p className="text-sm">
                          <span className="font-display font-bold">Message du chef :</span> {messageDuJour}
                        </p>
                        {generatedAt && (
                          <span className="ml-auto text-xs text-cream/80">
                            Générées à {generatedAt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                    )}

                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                      {suggestions.slice(0, 3).map((s, idx) => {
                        const badge = urgenceBadge(s.urgence_globale);
                        return (
                          <div key={`${s.nom}-${idx}`} className="rounded-xl border border-charcoal/8 bg-white p-5 shadow-sm">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-start gap-3 min-w-0">
                                <span
                                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-extrabold ${suggestionRankPill(
                                    idx
                                  )}`}
                                  aria-label={`Suggestion ${idx + 1}`}
                                >
                                  {idx + 1}
                                </span>
                                <div className="min-w-0">
                                  <p className="font-display text-lg font-bold text-charcoal truncate">{s.nom}</p>
                                  <span className={`mt-1 inline-flex rounded-full px-2 py-1 text-xs font-semibold ${badge.className}`}>
                                    {badge.label}
                                  </span>
                                </div>
                              </div>
                              <div className="shrink-0 text-right text-xs text-charcoal/60">
                                <div>{s.estimation_cout_matiere}</div>
                                <div>{s.marge_estimee}</div>
                              </div>
                            </div>

                            <p className="mt-3 text-sm italic text-charcoal/70">{s.raison}</p>

                            <div className="mt-4">
                              <div className="flex items-center gap-2">
                                <Package className="h-4 w-4 text-green-deep" aria-hidden />
                                <p className="text-xs font-semibold uppercase tracking-wider text-charcoal/50">
                                  Ingrédients à utiliser en priorité
                                </p>
                              </div>
                              <div className="mt-2 flex flex-wrap gap-2">
                                {s.ingredients_a_utiliser?.map((ing, i) => (
                                  <span
                                    key={`${ing.nom}-${i}`}
                                    className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${ingredientChipClass(
                                      ing.urgence
                                    )}`}
                                    title={ing.conseil}
                                  >
                                    <span className="truncate max-w-[190px]">
                                      {ing.urgence === 'critique' ? '🔴' : ing.urgence === 'bientot' ? '🟡' : '📦'} {ing.nom}
                                    </span>
                                    <span className="text-[11px] opacity-80">{ing.quantite_suggeree}</span>
                                  </span>
                                ))}
                              </div>
                              <p className="mt-2 text-xs text-charcoal/50">Astuce : survolez une chip pour voir le conseil.</p>
                            </div>

                            <div className="mt-4 rounded-lg border border-green-deep/15 bg-green-deep/5 p-3">
                              <div className="flex items-start gap-2">
                                <ChefHat className="mt-0.5 h-4 w-4 shrink-0 text-green-deep" aria-hidden />
                                <p className="text-xs italic text-charcoal">{s.conseil_chef}</p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </>
            )}
          </section>
        )}
      </div>
    </div>
  );
}

