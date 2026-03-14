'use client';

import { useState, useEffect, useCallback } from 'react';
import { useApi } from '@/hooks/useApi';
import { Brain, AlertTriangle, TrendingUp, TrendingDown, Minus, RefreshCw, Loader2 } from 'lucide-react';

interface TenantAccuracy {
  tenant_id: string;
  company_name: string;
  avg_accuracy: number;
  sample_count: number;
  low_accuracy_products: number;
}

interface GlobalStats {
  avg_accuracy: number;
  sample_count: number;
  low_accuracy_alerts: number;
  total_predictions: number;
  active_tenants: number;
}

export default function AdminMlPredictionsPage() {
  const { fetchApi } = useApi();
  const [global, setGlobal] = useState<GlobalStats | null>(null);
  const [byTenant, setByTenant] = useState<TenantAccuracy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetchApi('/api/admin/ml-monitoring');
      if (!res.ok) throw new Error('Erreur chargement');
      const j = await res.json();
      setGlobal(j?.data?.global ?? null);
      setByTenant(j?.data?.by_tenant ?? []);
    } catch {
      setError('Impossible de charger les données de monitoring ML.');
    } finally {
      setLoading(false);
    }
  }, [fetchApi]);

  useEffect(() => {
    load();
  }, [load]);

  const accuracyColor = (score: number) => {
    if (score >= 0.8) return 'text-green-deep';
    if (score >= 0.7) return 'text-gold';
    return 'text-terracotta';
  };

  const accuracyBg = (score: number) => {
    if (score >= 0.8) return 'bg-green-deep/10 border-green-deep/20';
    if (score >= 0.7) return 'bg-gold/10 border-gold/20';
    return 'bg-terracotta/10 border-terracotta/20';
  };

  const TrendIcon = ({ score }: { score: number }) => {
    if (score >= 0.8) return <TrendingUp className="h-4 w-4 text-green-deep" />;
    if (score >= 0.7) return <Minus className="h-4 w-4 text-gold" />;
    return <TrendingDown className="h-4 w-4 text-terracotta" />;
  };

  return (
    <div className="min-h-screen bg-cream p-6">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 font-display text-xl font-bold text-charcoal">
            <Brain className="h-6 w-6 text-green-deep" />
            Monitoring Prédictions IA
          </h1>
          <p className="mt-1 text-sm text-charcoal/40">
            Précision des prédictions ML par tenant et par produit (30 derniers jours)
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border border-charcoal/8 bg-white px-3 py-2 text-sm text-charcoal/50 transition-colors hover:bg-cream-dark disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Actualiser
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-terracotta/20 bg-terracotta/10 p-3 text-sm text-terracotta">
          {error}
        </div>
      )}

      {loading && !global ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-green-deep" />
        </div>
      ) : (
        <>
          {/* Global stats */}
          {global && (
            <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              <div className="rounded-xl border border-charcoal/8 bg-white p-4">
                <p className="text-xs text-charcoal/40">Précision globale</p>
                <p className={`mt-1 font-display text-2xl font-bold ${accuracyColor(global.avg_accuracy)}`}>
                  {(global.avg_accuracy * 100).toFixed(1)}%
                </p>
              </div>
              <div className="rounded-xl border border-charcoal/8 bg-white p-4">
                <p className="text-xs text-charcoal/40">Prédictions actives</p>
                <p className="mt-1 font-display text-2xl font-bold text-charcoal">
                  {global.total_predictions.toLocaleString()}
                </p>
              </div>
              <div className="rounded-xl border border-charcoal/8 bg-white p-4">
                <p className="text-xs text-charcoal/40">Évaluations (30j)</p>
                <p className="mt-1 font-display text-2xl font-bold text-charcoal">
                  {global.sample_count.toLocaleString()}
                </p>
              </div>
              <div className="rounded-xl border border-terracotta/20 bg-terracotta/5 p-4">
                <p className="text-xs text-terracotta/70">Alertes précision &lt;70%</p>
                <p className="mt-1 font-display text-2xl font-bold text-terracotta">
                  {global.low_accuracy_alerts}
                </p>
              </div>
              <div className="rounded-xl border border-charcoal/8 bg-white p-4">
                <p className="text-xs text-charcoal/40">Tenants actifs</p>
                <p className="mt-1 font-display text-2xl font-bold text-charcoal">
                  {global.active_tenants}
                </p>
              </div>
            </div>
          )}

          {/* Per-tenant breakdown */}
          <div className="rounded-xl border border-charcoal/8 bg-white">
            <div className="border-b border-charcoal/8 p-4">
              <h2 className="font-display font-bold text-charcoal">Précision par tenant</h2>
            </div>
            {byTenant.length === 0 ? (
              <div className="p-8 text-center">
                <Brain className="mx-auto h-10 w-10 text-charcoal/20" />
                <p className="mt-3 text-sm text-charcoal/40">
                  Aucune donnée d&apos;évaluation disponible. Les scores s&apos;accumuleront au fil des jours.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-charcoal/5">
                {byTenant.map((tenant) => (
                  <div
                    key={tenant.tenant_id}
                    className={`flex flex-wrap items-center justify-between gap-4 px-4 py-3 ${
                      tenant.low_accuracy_products > 0 ? 'bg-terracotta/5' : 'hover:bg-cream'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <TrendIcon score={tenant.avg_accuracy} />
                      <div>
                        <p className="font-medium text-charcoal">{tenant.company_name}</p>
                        <p className="text-xs text-charcoal/40">
                          {tenant.sample_count} éval. — {tenant.low_accuracy_products} produit(s) &lt;70%
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {tenant.low_accuracy_products > 0 && (
                        <span className="flex items-center gap-1 rounded-full bg-terracotta/10 px-2.5 py-0.5 text-xs font-medium text-terracotta">
                          <AlertTriangle className="h-3 w-3" />
                          Révision nécessaire
                        </span>
                      )}
                      <div className={`rounded-lg border px-3 py-1.5 ${accuracyBg(tenant.avg_accuracy)}`}>
                        <span className={`font-display text-lg font-bold ${accuracyColor(tenant.avg_accuracy)}`}>
                          {(tenant.avg_accuracy * 100).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Legend */}
          <div className="mt-4 flex flex-wrap gap-4 text-xs text-charcoal/40">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-green-deep" />
              ≥80% — Bonne précision
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-gold" />
              70–79% — Précision acceptable
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-terracotta" />
              &lt;70% — Révision manuelle recommandée
            </span>
          </div>
        </>
      )}
    </div>
  );
}
