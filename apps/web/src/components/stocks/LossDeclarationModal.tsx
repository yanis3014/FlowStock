'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Loader2, AlertTriangle } from 'lucide-react';
import { useApi } from '@/hooks/useApi';
import type { Product, LossReason } from '@bmad/shared';

interface LossDeclarationModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  /** Pre-select a product (e.g. when opened from a product row). */
  preselectedProduct?: Pick<Product, 'id' | 'name' | 'sku' | 'unit' | 'quantity'> | null;
}

const LOSS_REASONS: { value: LossReason; label: string }[] = [
  { value: 'expired', label: 'Périmé' },
  { value: 'broken', label: 'Cassé' },
  { value: 'theft', label: 'Vol' },
  { value: 'prep_error', label: 'Erreur de préparation' },
  { value: 'other', label: 'Autre' },
];

interface ProductOption {
  id: string;
  name: string;
  sku: string;
  unit: string;
  quantity: number;
}

export function LossDeclarationModal({
  open,
  onClose,
  onSuccess,
  preselectedProduct,
}: LossDeclarationModalProps) {
  const { fetchApi } = useApi();

  const [search, setSearch] = useState('');
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<ProductOption | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState<LossReason>('expired');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);

  const firstInputRef = useRef<HTMLInputElement>(null);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dropdownOpen]);

  const loadProducts = useCallback(
    (q: string) => {
      setLoadingProducts(true);
      const params = new URLSearchParams({ limit: '20' });
      if (q.trim()) params.set('search', q.trim());
      fetchApi(`/products?${params.toString()}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((json) => {
          if (json?.success && Array.isArray(json.data)) {
            setProducts(
              json.data.map((p: Product) => ({
                id: p.id,
                name: p.name,
                sku: p.sku,
                unit: p.unit,
                quantity: p.quantity,
              }))
            );
          }
        })
        .catch(() => {})
        .finally(() => setLoadingProducts(false));
    },
    [fetchApi]
  );

  useEffect(() => {
    if (!open) return;
    if (preselectedProduct) {
      setSelectedProduct({
        id: preselectedProduct.id,
        name: preselectedProduct.name,
        sku: preselectedProduct.sku,
        unit: preselectedProduct.unit,
        quantity: preselectedProduct.quantity,
      });
      setSearch(`${preselectedProduct.name} (${preselectedProduct.sku})`);
    } else {
      setSearch('');
      setSelectedProduct(null);
      loadProducts('');
    }
    setQuantity('');
    setReason('expired');
    setNotes('');
    setError('');
    setSuccess(false);
  }, [open, preselectedProduct, loadProducts]);

  useEffect(() => {
    if (open && firstInputRef.current) {
      setTimeout(() => firstInputRef.current?.focus(), 50);
    }
  }, [open]);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setSelectedProduct(null);
    setDropdownOpen(true);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => loadProducts(value), 250);
  };

  const handleSelectProduct = (p: ProductOption) => {
    setSelectedProduct(p);
    setSearch(`${p.name} (${p.sku})`);
    setDropdownOpen(false);
  };

  const handleSubmit = async () => {
    setError('');
    if (!selectedProduct) {
      setError('Veuillez sélectionner un produit.');
      return;
    }
    const qty = parseFloat(quantity);
    if (!quantity || isNaN(qty) || qty <= 0) {
      setError('La quantité doit être supérieure à 0.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetchApi('/losses', {
        method: 'POST',
        body: JSON.stringify({
          product_id: selectedProduct.id,
          quantity: qty,
          reason,
          notes: notes.trim() || null,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json?.error ?? 'Erreur lors de la déclaration.');
        return;
      }
      setSuccess(true);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1200);
    } catch {
      setError('Erreur réseau. Veuillez réessayer.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="loss-modal-title"
    >
      <div
        className="w-full max-w-md rounded-2xl border border-green-deep/20 bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-cream-dark px-6 py-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-terracotta" />
            <h2 id="loss-modal-title" className="font-display text-lg font-bold text-green-deep">
              Déclarer une perte
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-gray-warm hover:bg-cream-dark"
            aria-label="Fermer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 p-6">
          {/* Produit */}
          <div className="relative" ref={dropdownRef}>
            <label className="block text-xs font-semibold text-gray-warm" htmlFor="loss-product">
              Produit *
            </label>
            <input
              id="loss-product"
              ref={firstInputRef}
              type="text"
              placeholder="Rechercher par nom ou SKU…"
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              onFocus={() => !selectedProduct && setDropdownOpen(true)}
              autoComplete="off"
              className="mt-1 w-full rounded-xl border border-green-deep/20 bg-white px-3 py-2.5 text-sm text-charcoal placeholder-gray-warm focus:border-terracotta focus:outline-none"
            />
            {dropdownOpen && !selectedProduct && (
              <div className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-green-deep/20 bg-white shadow-lg">
                {loadingProducts ? (
                  <div className="flex items-center justify-center py-3">
                    <Loader2 className="h-4 w-4 animate-spin text-green-mid" />
                  </div>
                ) : products.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-gray-warm">Aucun produit trouvé.</div>
                ) : (
                  products.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleSelectProduct(p)}
                      className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-cream"
                    >
                      <span className="font-medium text-charcoal">{p.name}</span>
                      <span className="text-xs text-gray-warm">
                        {p.sku} · {p.quantity} {p.unit}
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Stock actuel */}
          {selectedProduct && (
            <div className="rounded-lg bg-cream px-3 py-2 text-xs text-gray-warm">
              Stock actuel :{' '}
              <span className="font-semibold text-charcoal">
                {selectedProduct.quantity} {selectedProduct.unit}
              </span>
            </div>
          )}

          {/* Quantité */}
          <div>
            <label className="block text-xs font-semibold text-gray-warm" htmlFor="loss-quantity">
              Quantité perdue *{selectedProduct ? ` (${selectedProduct.unit})` : ''}
            </label>
            <input
              id="loss-quantity"
              type="number"
              min={0.01}
              step={0.01}
              placeholder="0"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="mt-1 w-full rounded-xl border border-green-deep/20 px-3 py-2.5 text-sm focus:border-terracotta focus:outline-none"
            />
          </div>

          {/* Motif */}
          <div>
            <label className="block text-xs font-semibold text-gray-warm" htmlFor="loss-reason">
              Motif *
            </label>
            <select
              id="loss-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value as LossReason)}
              className="mt-1 w-full rounded-xl border border-green-deep/20 bg-white px-3 py-2.5 text-sm text-charcoal focus:border-terracotta focus:outline-none"
            >
              {LOSS_REASONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          {/* Notes (optionnel) */}
          <div>
            <label className="block text-xs font-semibold text-gray-warm" htmlFor="loss-notes">
              Notes (optionnel)
            </label>
            <textarea
              id="loss-notes"
              rows={2}
              maxLength={500}
              placeholder="Détails supplémentaires…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1 w-full resize-none rounded-xl border border-green-deep/20 px-3 py-2 text-sm focus:border-terracotta focus:outline-none"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-lg border border-red-alert/30 bg-red-alert/10 px-3 py-2 text-sm text-red-alert">
              {error}
            </div>
          )}

          {/* Success */}
          {success && (
            <div className="rounded-lg border border-green-bright/30 bg-green-bright/10 px-3 py-2 text-sm font-medium text-green-deep">
              Perte déclarée avec succès. Stock mis à jour.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-cream-dark px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-xl border border-green-deep/30 px-4 py-2 font-display text-sm font-bold text-green-deep disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || success}
            className="inline-flex items-center gap-2 rounded-xl bg-terracotta px-4 py-2 font-display text-sm font-bold text-white disabled:opacity-60"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Confirmer la perte
          </button>
        </div>
      </div>
    </div>
  );
}
