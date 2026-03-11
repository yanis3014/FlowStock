'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useApi } from '@/hooks/useApi';
import { Download, Link2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const STORAGE_KEY = 'flowstock_parametres';

interface LocalPrefs {
  nom?: string;
  adresse?: string;
  typeEtablissement?: string;
  horaires?: string;
  seuilCritique?: number;
  seuilAttention?: number;
  push?: boolean;
  sms?: boolean;
  email?: boolean;
  langue?: string;
  fuseau?: string;
}

const defaultPrefs: LocalPrefs = {
  nom: '',
  adresse: '',
  typeEtablissement: 'Restaurant',
  horaires: '',
  seuilCritique: 10,
  seuilAttention: 120,
  push: true,
  sms: false,
  email: true,
  langue: 'fr',
  fuseau: 'Europe/Paris',
};

function loadLocalPrefs(): LocalPrefs {
  if (typeof window === 'undefined') return defaultPrefs;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultPrefs;
    const parsed = JSON.parse(raw) as Partial<LocalPrefs>;
    return { ...defaultPrefs, ...parsed };
  } catch {
    return defaultPrefs;
  }
}

function saveLocalPrefs(prefs: LocalPrefs): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {}
}

export default function ParametresPage() {
  const { token } = useAuth();
  const { fetchApi } = useApi();
  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  const [thresholdLoading, setThresholdLoading] = useState(false);
  const [posStatus, setPosStatus] = useState<{ connecte: boolean; type: string; lastSync: string } | null>(null);
  const [thresholdPercent, setThresholdPercent] = useState<number | null>(null);
  const [form, setForm] = useState<LocalPrefs>(defaultPrefs);

  const loadData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    const prefs = loadLocalPrefs();
    setForm(prefs);

    try {
      const [thresholdRes, posRes] = await Promise.all([
        fetchApi('/dashboard/alert-threshold'),
        fetchApi('/dashboard/pos-sync-status'),
      ]);

      if (thresholdRes.ok) {
        const j = await thresholdRes.json();
        if (j?.success && typeof j?.data?.thresholdPercent === 'number') {
          setThresholdPercent(j.data.thresholdPercent);
          setForm((f) => ({ ...f, seuilAttention: j.data.thresholdPercent }));
        }
      }

      if (posRes.ok) {
        const j = await posRes.json();
        if (j?.success && j?.data) {
          const d = j.data;
          setPosStatus({
            connecte: !d.is_degraded,
            type: 'Lightspeed',
            lastSync: d.last_event_at ? 'Il y a quelques min' : 'Jamais',
          });
        }
      }
    } catch {
      toast.error('Erreur lors du chargement.');
    } finally {
      setLoading(false);
    }
  }, [token, fetchApi]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSaveInfos = async () => {
    setSaveLoading(true);
    try {
      const prefs: LocalPrefs = {
        ...form,
        nom: form.nom ?? defaultPrefs.nom,
        adresse: form.adresse ?? defaultPrefs.adresse,
        typeEtablissement: form.typeEtablissement ?? defaultPrefs.typeEtablissement,
        horaires: form.horaires ?? defaultPrefs.horaires,
      };
      saveLocalPrefs(prefs);
      setForm(prefs);
      toast.success('Informations sauvegardées.');
    } catch {
      toast.error('Erreur lors de la sauvegarde.');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleSaveSeuils = async () => {
    const pct = form.seuilAttention ?? 120;
    if (pct < 50 || pct > 500) {
      toast.error('Le seuil doit être entre 50 et 500 %.');
      return;
    }
    setThresholdLoading(true);
    try {
      const res = await fetchApi('/dashboard/alert-threshold', {
        method: 'PUT',
        body: JSON.stringify({ thresholdPercent: pct }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.error ?? 'Erreur');
      setThresholdPercent(pct);
      saveLocalPrefs({ ...form, seuilAttention: pct, seuilCritique: form.seuilCritique ?? 10 });
      toast.success('Seuils sauvegardés.');
    } catch {
      toast.error('Erreur lors de la sauvegarde des seuils.');
    } finally {
      setThresholdLoading(false);
    }
  };

  const handleSaveNotif = () => {
    const prefs = { ...form, push: form.push ?? true, sms: form.sms ?? false, email: form.email ?? true };
    saveLocalPrefs(prefs);
    setForm(prefs);
    toast.success('Préférences notifications sauvegardées.');
  };

  const handleSaveLangue = () => {
    const prefs = { ...form, langue: form.langue ?? 'fr', fuseau: form.fuseau ?? 'Europe/Paris' };
    saveLocalPrefs(prefs);
    setForm(prefs);
    toast.success('Langue et fuseau sauvegardés.');
  };

  if (loading) {
    return (
      <div className="flex min-h-full items-center justify-center bg-cream">
        <Loader2 className="h-8 w-8 animate-spin text-green-mid" />
      </div>
    );
  }

  return (
    <div className="min-h-full bg-cream font-body">
      <div className="mx-auto max-w-2xl space-y-8 p-4 pb-24 md:pb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-green-deep">Paramètres du restaurant</h1>
          <p className="text-sm text-gray-warm">Informations, intégrations et préférences</p>
        </div>

        {/* Infos générales */}
        <section className="rounded-xl border border-green-deep/10 bg-white p-6 shadow-sm">
          <h2 className="font-display text-lg font-bold text-green-deep">Informations générales</h2>
          <p className="mt-1 text-xs text-gray-warm">Sauvegardées localement (TODO API tenant)</p>
          <div className="mt-4 space-y-4">
            <div>
              <label htmlFor="param-nom" className="block text-sm font-medium text-charcoal">
                Nom du restaurant
              </label>
              <input
                id="param-nom"
                type="text"
                value={form.nom ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, nom: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-green-deep/20 bg-white px-4 py-2 text-sm focus:border-green-mid focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="param-adresse" className="block text-sm font-medium text-charcoal">
                Adresse
              </label>
              <input
                id="param-adresse"
                type="text"
                value={form.adresse ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, adresse: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-green-deep/20 bg-white px-4 py-2 text-sm focus:border-green-mid focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="param-type" className="block text-sm font-medium text-charcoal">
                Type d&apos;établissement
              </label>
              <select
                id="param-type"
                value={form.typeEtablissement ?? 'Restaurant'}
                onChange={(e) => setForm((f) => ({ ...f, typeEtablissement: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-green-deep/20 bg-white px-4 py-2 text-sm focus:border-green-mid focus:outline-none"
              >
                <option value="Restaurant">Restaurant</option>
                <option value="Brasserie">Brasserie</option>
                <option value="Fast-food">Fast-food</option>
                <option value="Traiteur">Traiteur</option>
                <option value="Bar">Bar</option>
              </select>
            </div>
            <div>
              <label htmlFor="param-horaires" className="block text-sm font-medium text-charcoal">
                Horaires d&apos;ouverture
              </label>
              <input
                id="param-horaires"
                type="text"
                value={form.horaires ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, horaires: e.target.value }))}
                placeholder="ex. 11h30-14h30, 19h-22h"
                className="mt-1 w-full rounded-lg border border-green-deep/20 bg-white px-4 py-2 text-sm focus:border-green-mid focus:outline-none"
              />
            </div>
          </div>
          <button
            type="button"
            onClick={handleSaveInfos}
            disabled={saveLoading}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-green-mid px-4 py-2.5 font-display text-sm font-bold text-white disabled:opacity-70"
          >
            {saveLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            Enregistrer
          </button>
        </section>

        {/* Intégrations POS */}
        <section className="rounded-xl border border-green-deep/10 bg-white p-6 shadow-sm">
          <h2 className="font-display text-lg font-bold text-green-deep">Intégrations caisse (POS)</h2>
          <div className="mt-4 flex items-center justify-between rounded-lg border border-green-deep/10 bg-cream/30 p-4">
            <div className="flex items-center gap-3">
              <Link2 className="h-5 w-5 text-green-mid" />
              <div>
                <p className="font-medium text-charcoal">Lightspeed</p>
                <p className="text-sm text-gray-warm">
                  {posStatus?.connecte ? `Connecté · ${posStatus.lastSync}` : "Non connecté"}
                </p>
              </div>
            </div>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                posStatus?.connecte ? 'bg-green-mid/20 text-green-deep' : 'bg-gray-warm/20 text-gray-warm'
              }`}
            >
              {posStatus?.connecte ? 'Actif' : 'Inactif'}
            </span>
          </div>
          <p className="mt-2 text-xs text-gray-warm">Saisie manuelle toujours disponible en secours.</p>
        </section>

        {/* Seuils alertes */}
        <section className="rounded-xl border border-green-deep/10 bg-white p-6 shadow-sm">
          <h2 className="font-display text-lg font-bold text-green-deep">Seuil d&apos;alerte stock</h2>
          <p className="mt-1 text-sm text-gray-warm">
            En % du stock de référence (50–500 %) — déclenchement des alertes Rush
          </p>
          <div className="mt-4 flex gap-6">
            <div>
              <label htmlFor="param-seuil-attention" className="block text-sm font-medium text-charcoal">
                Seuil attention (%)
              </label>
              <input
                id="param-seuil-attention"
                type="number"
                min="50"
                max="500"
                value={form.seuilAttention ?? 120}
                onChange={(e) => setForm((f) => ({ ...f, seuilAttention: parseInt(e.target.value, 10) || 120 }))}
                className="mt-1 w-24 rounded-lg border border-green-deep/20 bg-white px-3 py-2 text-sm focus:border-green-mid focus:outline-none"
              />
            </div>
          </div>
          <button
            type="button"
            onClick={handleSaveSeuils}
            disabled={thresholdLoading}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-green-mid px-4 py-2.5 font-display text-sm font-bold text-white disabled:opacity-70"
          >
            {thresholdLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            Enregistrer
          </button>
        </section>

        {/* Notifications */}
        <section className="rounded-xl border border-green-deep/10 bg-white p-6 shadow-sm">
          <h2 className="font-display text-lg font-bold text-green-deep">Notifications</h2>
          <p className="mt-1 text-xs text-gray-warm">Sauvegardées localement</p>
          <div className="mt-4 space-y-4">
            <label className="flex cursor-pointer items-center justify-between">
              <span className="text-sm font-medium text-charcoal">Push (navigateur)</span>
              <input
                type="checkbox"
                checked={form.push ?? true}
                onChange={(e) => setForm((f) => ({ ...f, push: e.target.checked }))}
                className="h-4 w-4 rounded border-gray-300 text-green-mid focus:ring-green-mid"
              />
            </label>
            <label className="flex cursor-pointer items-center justify-between">
              <span className="text-sm font-medium text-charcoal">SMS</span>
              <input
                type="checkbox"
                checked={form.sms ?? false}
                onChange={(e) => setForm((f) => ({ ...f, sms: e.target.checked }))}
                className="h-4 w-4 rounded border-gray-300 text-green-mid focus:ring-green-mid"
              />
            </label>
            <label className="flex cursor-pointer items-center justify-between">
              <span className="text-sm font-medium text-charcoal">Email</span>
              <input
                type="checkbox"
                checked={form.email ?? true}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.checked }))}
                className="h-4 w-4 rounded border-gray-300 text-green-mid focus:ring-green-mid"
              />
            </label>
          </div>
          <button
            type="button"
            onClick={handleSaveNotif}
            className="mt-4 rounded-xl bg-green-mid px-4 py-2.5 font-display text-sm font-bold text-white"
          >
            Enregistrer
          </button>
        </section>

        {/* Gestion utilisateurs */}
        <section className="rounded-xl border border-green-deep/10 bg-white p-6 shadow-sm">
          <h2 className="font-display text-lg font-bold text-green-deep">Utilisateurs</h2>
          <p className="mt-1 text-sm text-gray-warm">TODO : connecter à l&apos;API utilisateurs du tenant</p>
          <ul className="mt-4 space-y-3">
            <li className="rounded-lg border border-green-deep/10 px-4 py-3 text-sm text-gray-warm">
              Aucun utilisateur invité pour le moment.
            </li>
          </ul>
          <button
            type="button"
            disabled
            className="mt-4 rounded-lg border border-green-deep/20 px-4 py-2 text-sm font-medium text-gray-warm"
          >
            Inviter un utilisateur (bientôt)
          </button>
        </section>

        {/* Langue / Fuseau */}
        <section className="rounded-xl border border-green-deep/10 bg-white p-6 shadow-sm">
          <h2 className="font-display text-lg font-bold text-green-deep">Langue et fuseau</h2>
          <p className="mt-1 text-xs text-gray-warm">Sauvegardés localement</p>
          <div className="mt-4 space-y-4">
            <div>
              <label htmlFor="param-langue" className="block text-sm font-medium text-charcoal">
                Langue
              </label>
              <select
                id="param-langue"
                value={form.langue ?? 'fr'}
                onChange={(e) => setForm((f) => ({ ...f, langue: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-green-deep/20 bg-white px-4 py-2 text-sm focus:border-green-mid focus:outline-none"
              >
                <option value="fr">Français</option>
                <option value="en">English</option>
                <option value="es">Español</option>
              </select>
            </div>
            <div>
              <label htmlFor="param-fuseau" className="block text-sm font-medium text-charcoal">
                Fuseau horaire
              </label>
              <select
                id="param-fuseau"
                value={form.fuseau ?? 'Europe/Paris'}
                onChange={(e) => setForm((f) => ({ ...f, fuseau: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-green-deep/20 bg-white px-4 py-2 text-sm focus:border-green-mid focus:outline-none"
              >
                <option value="Europe/Paris">Europe/Paris</option>
                <option value="Europe/London">Europe/London</option>
                <option value="America/New_York">America/New_York</option>
              </select>
            </div>
          </div>
          <button
            type="button"
            onClick={handleSaveLangue}
            className="mt-4 rounded-xl bg-green-mid px-4 py-2.5 font-display text-sm font-bold text-white"
          >
            Enregistrer
          </button>
        </section>

        {/* Export RGPD */}
        <section className="rounded-xl border border-green-deep/10 bg-white p-6 shadow-sm">
          <h2 className="font-display text-lg font-bold text-green-deep">Données personnelles (RGPD)</h2>
          <p className="mt-1 text-sm text-gray-warm">
            Téléchargez une copie de vos données ou demandez la suppression du compte.
          </p>
          <button
            type="button"
            disabled
            className="mt-4 inline-flex items-center gap-2 rounded-xl border border-green-deep/20 px-4 py-2.5 text-sm font-medium text-gray-warm"
          >
            <Download className="h-4 w-4" />
            Exporter mes données (bientôt)
          </button>
        </section>
      </div>
    </div>
  );
}
