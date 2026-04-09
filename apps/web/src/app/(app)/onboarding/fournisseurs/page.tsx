'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApi } from '@/hooks/useApi';
import type { OnboardingProgressData } from '@/types/onboarding';

interface SupplierDraft {
  name: string;
  phone: string;
  email: string;
}

interface SavedSupplier {
  id: string;
  name: string;
  phone?: string;
  email?: string;
}

const EMPTY_DRAFT: SupplierDraft = { name: '', phone: '', email: '' };

export default function FournisseursPage() {
  const { fetchApi } = useApi();
  const router = useRouter();
  const [prevData, setPrevData] = useState<OnboardingProgressData | null>(null);
  const [suppliers, setSuppliers] = useState<SavedSupplier[]>([]);
  const [draft, setDraft] = useState<SupplierDraft>(EMPTY_DRAFT);
  const [showForm, setShowForm] = useState(false);
  const [addError, setAddError] = useState('');
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchApi('/onboarding/progress')
      .then((r) => r.json())
      .then((res: { data?: { onboarding_data: OnboardingProgressData | null } }) => {
        setPrevData(res?.data?.onboarding_data ?? null);
      })
      .catch(() => {});
    // Charger les fournisseurs déjà créés
    fetchApi('/suppliers?limit=50')
      .then((r) => r.json())
      .then((res: { data?: SavedSupplier[] }) => {
        setSuppliers(res?.data ?? []);
      })
      .catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAddSupplier = async () => {
    if (!draft.name.trim()) {
      setAddError('Le nom du fournisseur est requis.');
      return;
    }
    setAddError('');
    setAdding(true);
    try {
      const res = await fetchApi('/suppliers', {
        method: 'POST',
        body: JSON.stringify({
          name: draft.name.trim(),
          phone: draft.phone.trim() || undefined,
          email: draft.email.trim() || undefined,
        }),
      });
      const json = await res.json() as { success: boolean; data?: SavedSupplier; error?: string };
      if (!json.success) {
        setAddError(json.error ?? 'Erreur lors de l\'ajout.');
        return;
      }
      if (json.data) {
        setSuppliers((prev) => [...prev, json.data!]);
      }
      setDraft(EMPTY_DRAFT);
      setShowForm(false);
    } catch {
      setAddError('Erreur réseau. Réessayez.');
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveSupplier = async (id: string) => {
    // Suppression optimiste
    setSuppliers((prev) => prev.filter((s) => s.id !== id));
    await fetchApi(`/suppliers/${id}`, { method: 'DELETE' }).catch(() => {});
  };

  const handleContinue = async () => {
    setSaving(true);
    try {
      const prev = prevData ?? { completed_steps: [], current_step: 'fournisseurs' as const };
      const completed = prev.completed_steps ?? [];
      await fetchApi('/onboarding/progress', {
        method: 'PATCH',
        body: JSON.stringify({
          onboarding: {
            ...prev,
            completed_steps: completed.includes('fournisseurs') ? completed : [...completed, 'fournisseurs'],
            current_step: 'pos',
          },
        }),
      });
      router.push('/onboarding/pos');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-8 flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-charcoal">Vos fournisseurs</h1>
        <p className="text-charcoal/60 mt-1 text-sm">
          Ajoutez vos fournisseurs principaux. Vous pourrez compléter leurs informations plus tard.
        </p>
      </div>

      {/* Liste des fournisseurs déjà ajoutés */}
      {suppliers.length > 0 && (
        <div className="flex flex-col gap-2">
          {suppliers.map((s) => (
            <div
              key={s.id}
              className="bg-white border border-charcoal/10 rounded-xl px-4 py-3 flex items-center justify-between gap-3"
            >
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-charcoal">{s.name}</span>
                {(s.phone || s.email) && (
                  <span className="text-xs text-charcoal/50 mt-0.5">
                    {[s.phone, s.email].filter(Boolean).join(' · ')}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => handleRemoveSupplier(s.id)}
                className="text-charcoal/30 hover:text-red-500 transition-colors p-1"
                aria-label="Supprimer"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Formulaire d'ajout */}
      {showForm ? (
        <div className="bg-white border border-charcoal/15 rounded-xl p-5 flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-charcoal">
              Nom du fournisseur <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={draft.name}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              placeholder="Metro, Transgourmet, Pomona…"
              className="border border-charcoal/20 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-charcoal/50"
              autoFocus
            />
          </div>
          <div className="flex gap-3">
            <div className="flex-1 flex flex-col gap-1">
              <label className="text-sm font-medium text-charcoal">Téléphone</label>
              <input
                type="tel"
                value={draft.phone}
                onChange={(e) => setDraft((d) => ({ ...d, phone: e.target.value }))}
                placeholder="01 23 45 67 89"
                className="border border-charcoal/20 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-charcoal/50"
              />
            </div>
            <div className="flex-1 flex flex-col gap-1">
              <label className="text-sm font-medium text-charcoal">Email</label>
              <input
                type="email"
                value={draft.email}
                onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value }))}
                placeholder="contact@…"
                className="border border-charcoal/20 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-charcoal/50"
              />
            </div>
          </div>
          {addError && (
            <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{addError}</p>
          )}
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => { setShowForm(false); setDraft(EMPTY_DRAFT); setAddError(''); }}
              className="text-sm text-charcoal/60 px-4 py-2 min-h-[40px]"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleAddSupplier}
              disabled={adding}
              className="bg-[#1C2B2A] text-white px-5 py-2 rounded-lg text-sm font-semibold disabled:opacity-50 min-h-[40px]"
            >
              {adding ? 'Ajout…' : 'Ajouter'}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 border-2 border-dashed border-charcoal/20 rounded-xl px-4 py-3.5 text-sm text-charcoal/60 hover:border-charcoal/40 hover:text-charcoal transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Ajouter un fournisseur
        </button>
      )}

      <div className="flex justify-between items-center pt-2">
        <button
          type="button"
          onClick={() => router.push('/onboarding/stocks')}
          className="text-sm text-charcoal/60 hover:text-charcoal min-h-[44px] px-2"
        >
          ← Précédent
        </button>
        <button
          type="button"
          onClick={handleContinue}
          disabled={saving}
          className="bg-[#1C2B2A] text-white px-6 py-3 rounded-xl font-semibold text-sm disabled:opacity-50 min-h-[44px]"
        >
          {saving ? 'Enregistrement…' : suppliers.length > 0 ? 'Continuer →' : 'Passer cette étape →'}
        </button>
      </div>
    </div>
  );
}
