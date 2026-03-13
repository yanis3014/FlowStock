'use client';

import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useApi } from '@/hooks/useApi';
import {
  ShoppingCart,
  RefreshCw,
  Check,
  X,
  Loader2,
  AlertTriangle,
  Edit2,
  ChevronDown,
  ChevronUp,
  History,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/ui/PageHeader';

interface RecommendationItem {
  fournisseur: string;
  supplier_id: string | null;
  produit: string;
  product_id: string;
  quantite_suggeree: number;
  justification: string;
  unit: string;
  prix_unitaire: number | null;
  cout_estime: number | null;
}

interface OrderRecommendation {
  id: string;
  tenant_id: string;
  generated_at: string;
  status: 'pending' | 'validated' | 'rejected' | 'auto_executed';
  recommendations: RecommendationItem[];
  validated_at: string | null;
  validated_by: string | null;
  total_estimated_cost: number | null;
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'En attente',
  validated: 'Validée',
  rejected: 'Refusée',
  auto_executed: 'Exécutée auto',
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-gold/15 text-gold',
  validated: 'bg-green-deep/10 text-green-deep',
  rejected: 'bg-charcoal/8 text-charcoal/50',
  auto_executed: 'bg-forest-green/10 text-forest-green',
};

export default function CommandesPage() {
  const { token } = useAuth();
  const { fetchApi } = useApi();
  const [recommendation, setRecommendation] = useState<OrderRecommendation | null>(null);
  const [history, setHistory] = useState<OrderRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [validating, setValidating] = useState(false);
  const [editedItems, setEditedItems] = useState<RecommendationItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const [recRes, histRes] = await Promise.all([
        fetchApi('/recommendations'),
        fetchApi('/recommendations/history'),
      ]);
      if (recRes.ok) {
        const j = await recRes.json();
        setRecommendation(j?.data ?? null);
        if (j?.data?.recommendations) setEditedItems(j.data.recommendations);
      }
      if (histRes.ok) {
        const j = await histRes.json();
        setHistory(j?.data ?? []);
      }
    } catch {
      setError('Erreur lors du chargement des données.');
    } finally {
      setLoading(false);
    }
  }, [token, fetchApi]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleGenerate = async () => {
    setGenerating(true);
    setError('');
    try {
      // First refresh predictions
      await fetchApi('/predictions/compute', { method: 'POST' });
      // Then generate recommendations
      const res = await fetchApi('/recommendations/generate', { method: 'POST' });
      if (!res.ok) throw new Error('Erreur génération');
      const j = await res.json();
      setRecommendation(j?.data ?? null);
      if (j?.data?.recommendations) setEditedItems(j.data.recommendations);
      setShowEdit(false);
      toast.success('Recommandations générées');
      loadData();
    } catch {
      toast.error('Impossible de générer les recommandations.');
    } finally {
      setGenerating(false);
    }
  };

  const handleValidate = async (all = true) => {
    if (!recommendation) return;
    setValidating(true);
    try {
      const body = all
        ? {}
        : { items: editedItems.filter((i) => i.quantite_suggeree > 0) };
      const res = await fetchApi(`/recommendations/${recommendation.id}/validate`, {
        method: 'POST',
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Erreur validation');
      toast.success('Commande validée ! Les mouvements de stock ont été créés.');
      setRecommendation(null);
      loadData();
    } catch {
      toast.error('Impossible de valider la commande.');
    } finally {
      setValidating(false);
    }
  };

  const handleReject = async () => {
    if (!recommendation) return;
    try {
      await fetchApi(`/recommendations/${recommendation.id}/reject`, { method: 'POST' });
      toast.success('Recommandation refusée.');
      setRecommendation(null);
      loadData();
    } catch {
      toast.error('Erreur lors du refus.');
    }
  };

  const updateQty = (productId: string, qty: number) => {
    setEditedItems((prev) =>
      prev.map((item) =>
        item.product_id === productId ? { ...item, quantite_suggeree: Math.max(0, qty) } : item
      )
    );
  };

  const groupBySupplier = (items: RecommendationItem[]) => {
    const groups: Record<string, RecommendationItem[]> = {};
    for (const item of items) {
      const key = item.fournisseur || 'Fournisseur inconnu';
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    }
    return groups;
  };

  if (loading) {
    return (
      <div className="min-h-full bg-cream flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-green-deep" />
      </div>
    );
  }

  const displayItems = showEdit ? editedItems : recommendation?.recommendations ?? [];
  const totalCost = showEdit
    ? editedItems.reduce((s, i) => s + (i.cout_estime ?? 0), 0)
    : recommendation?.total_estimated_cost ?? 0;
  const groups = groupBySupplier(displayItems);

  return (
    <div className="min-h-full space-y-6 bg-cream font-body">
      <PageHeader
        title="Commandes IA"
        subtitle="Recommandations de réapprovisionnement générées par l'IA"
        actions={
          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating}
            className="inline-flex items-center gap-2 rounded-xl bg-green-deep px-4 py-2.5 font-display text-sm font-bold text-cream hover:bg-forest-green transition-colors disabled:opacity-70"
          >
            {generating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Zap className="h-4 w-4" />
            )}
            {generating ? 'Génération…' : 'Générer recommandations'}
          </button>
        }
      />

      {error && (
        <div className="rounded-lg border border-terracotta/20 bg-terracotta/10 p-3 text-sm text-terracotta">
          {error}
        </div>
      )}

      {!recommendation ? (
        <div className="rounded-xl border border-charcoal/8 bg-white p-10 text-center shadow-sm">
          <ShoppingCart className="mx-auto h-10 w-10 text-charcoal/30" />
          <p className="mt-3 font-display font-bold text-charcoal">Aucune recommandation en attente</p>
          <p className="mt-1 text-sm text-charcoal/50">
            Cliquez sur &quot;Générer recommandations&quot; pour analyser vos stocks et créer une liste de commandes.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Header carte recommandation */}
          <div className="rounded-xl border border-charcoal/8 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-display text-lg font-bold text-charcoal">
                    {displayItems.length} produit{displayItems.length > 1 ? 's' : ''} à commander
                  </h2>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[recommendation.status]}`}>
                    {STATUS_LABELS[recommendation.status]}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-charcoal/50">
                  Générée le {new Date(recommendation.generated_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              {totalCost > 0 && (
                <div className="text-right">
                  <p className="text-xs text-charcoal/50">Coût estimé</p>
                  <p className="font-display text-xl font-bold text-charcoal">{totalCost.toFixed(2)} €</p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleValidate(true)}
                disabled={validating}
                className="inline-flex items-center gap-2 rounded-xl bg-green-deep px-4 py-2.5 font-display text-sm font-bold text-cream hover:bg-forest-green transition-colors disabled:opacity-70"
              >
                {validating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Valider tout
              </button>
              {showEdit && (
                <button
                  type="button"
                  onClick={() => handleValidate(false)}
                  disabled={validating}
                  className="inline-flex items-center gap-2 rounded-xl bg-forest-green px-4 py-2.5 font-display text-sm font-bold text-cream hover:bg-green-deep transition-colors disabled:opacity-70"
                >
                  <Check className="h-4 w-4" />
                  Valider ajusté
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowEdit((v) => !v)}
                className="inline-flex items-center gap-2 rounded-xl border border-charcoal/15 px-4 py-2.5 text-sm font-medium text-charcoal hover:bg-charcoal/5 transition-colors"
              >
                <Edit2 className="h-4 w-4" />
                {showEdit ? 'Annuler ajustements' : 'Ajuster quantités'}
              </button>
              <button
                type="button"
                onClick={handleReject}
                className="inline-flex items-center gap-2 rounded-xl border border-terracotta/20 px-4 py-2.5 text-sm font-medium text-terracotta hover:bg-terracotta/5 transition-colors"
              >
                <X className="h-4 w-4" />
                Refuser
              </button>
            </div>
          </div>

          {/* Groupes par fournisseur */}
          {Object.entries(groups).map(([supplier, items]) => (
            <div key={supplier} className="rounded-xl border border-charcoal/8 bg-white p-5 shadow-sm">
              <h3 className="mb-3 font-display text-base font-bold text-charcoal flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-green-deep" />
                {supplier}
              </h3>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-charcoal/8 text-left text-charcoal/60">
                      <th className="pb-2 pr-4 font-medium">Produit</th>
                      <th className="pb-2 pr-4 font-medium">Quantité</th>
                      <th className="pb-2 pr-4 font-medium">Prix unit.</th>
                      <th className="pb-2 pr-4 font-medium">Coût estimé</th>
                      <th className="pb-2 font-medium">Justification</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item.product_id} className="border-b border-charcoal/5">
                        <td className="py-2 pr-4 font-medium text-charcoal">{item.produit}</td>
                        <td className="py-2 pr-4">
                          {showEdit ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                min={0}
                                value={editedItems.find((i) => i.product_id === item.product_id)?.quantite_suggeree ?? item.quantite_suggeree}
                                onChange={(e) => updateQty(item.product_id, parseInt(e.target.value, 10) || 0)}
                                className="w-20 rounded border border-charcoal/15 px-2 py-1 text-sm focus:outline-none focus:border-green-deep"
                              />
                              <span className="text-charcoal/50">{item.unit}</span>
                            </div>
                          ) : (
                            <span>{item.quantite_suggeree} {item.unit}</span>
                          )}
                        </td>
                        <td className="py-2 pr-4 text-charcoal/60">
                          {item.prix_unitaire != null ? `${item.prix_unitaire.toFixed(2)} €` : '—'}
                        </td>
                        <td className="py-2 pr-4 font-medium text-charcoal">
                          {item.cout_estime != null ? `${item.cout_estime.toFixed(2)} €` : '—'}
                        </td>
                        <td className="py-2 text-xs text-charcoal/60 max-w-xs">{item.justification}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}

          {displayItems.length === 0 && (
            <div className="rounded-xl border border-charcoal/8 bg-white p-8 text-center shadow-sm">
              <AlertTriangle className="mx-auto h-8 w-8 text-gold" />
              <p className="mt-2 text-sm text-charcoal/60">Aucun produit urgent à commander pour le moment.</p>
            </div>
          )}
        </div>
      )}

      {/* Historique */}
      <div className="rounded-xl border border-charcoal/8 bg-white shadow-sm">
        <button
          type="button"
          onClick={() => setShowHistory((v) => !v)}
          className="flex w-full items-center justify-between p-5 text-left"
        >
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-charcoal/50" />
            <span className="font-display font-bold text-charcoal">Historique des commandes IA</span>
            <span className="rounded-full bg-charcoal/8 px-2 py-0.5 text-xs font-medium text-charcoal/60">
              {history.length}
            </span>
          </div>
          {showHistory ? (
            <ChevronUp className="h-4 w-4 text-charcoal/50" />
          ) : (
            <ChevronDown className="h-4 w-4 text-charcoal/50" />
          )}
        </button>
        {showHistory && (
          <div className="border-t border-charcoal/8 p-5">
            {history.length === 0 ? (
              <p className="text-sm text-charcoal/50">Aucun historique disponible.</p>
            ) : (
              <div className="space-y-2">
                {history.map((rec) => (
                  <div
                    key={rec.id}
                    className="flex items-center justify-between rounded-lg border border-charcoal/8 bg-cream/30 px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-charcoal">
                        {rec.recommendations.length} produit{rec.recommendations.length > 1 ? 's' : ''}
                        {rec.total_estimated_cost ? ` — ${rec.total_estimated_cost.toFixed(2)} €` : ''}
                      </p>
                      <p className="text-xs text-charcoal/50">
                        {new Date(rec.generated_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[rec.status]}`}>
                      {STATUS_LABELS[rec.status]}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Refresh button */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={loadData}
          className="inline-flex items-center gap-2 text-sm font-medium text-green-deep"
        >
          <RefreshCw className="h-4 w-4" />
          Actualiser
        </button>
      </div>
    </div>
  );
}
