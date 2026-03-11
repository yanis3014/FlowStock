'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useApi } from '@/hooks/useApi';
import { useAuth } from '@/contexts/AuthContext';

export default function RegisterPage() {
  const { fetchApiGuest } = useApi();
  const { setToken } = useAuth();
  const [form, setForm] = useState({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    company_name: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const redirectToDashboard = () => {
    if (typeof window !== 'undefined') {
      window.location.assign('/dashboard');
      return;
    }
    router.push('/dashboard');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const res = await fetchApiGuest('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: form.email.trim(),
          password: form.password,
          first_name: form.first_name.trim(),
          last_name: form.last_name.trim(),
          company_name: form.company_name.trim(),
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data?.error || 'Inscription impossible.');
        setLoading(false);
        return;
      }

      const accessToken = data?.data?.access_token;
      if (typeof accessToken === 'string' && accessToken.length > 0) {
        setToken(accessToken);
      }

      if (typeof window !== 'undefined') {
        localStorage.setItem('flowstock_onboarding_completed', 'false');
        sessionStorage.removeItem('flowstock_banner_dismissed');
        sessionStorage.removeItem('flowstock_onboarding_progress');
      }

      const verifyToken = data?.data?.email_verification_token;
      if (verifyToken) {
        try {
          const verifyRes = await fetchApiGuest(
            `/auth/verify-email?token=${encodeURIComponent(verifyToken)}`
          );
          if (verifyRes.ok) {
            setSuccess('Compte créé et email vérifié. Redirection vers le dashboard…');
            setTimeout(redirectToDashboard, 1000);
            return;
          }
        } catch {}
      }

      setSuccess('Compte créé. Redirection vers le dashboard…');
      setTimeout(redirectToDashboard, 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur réseau.');
    }
    setLoading(false);
  };

  const inputClass = "w-full bg-white border border-charcoal/15 rounded-lg px-3 py-2.5 text-sm text-charcoal placeholder:text-charcoal/35 focus:outline-none focus:border-green-deep focus:ring-1 focus:ring-green-deep/20 transition-colors";
  const labelClass = "block text-xs font-medium text-charcoal/60 mb-1.5";

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-cream">
      <div className="w-full max-w-md p-8 bg-white rounded-2xl shadow-sm border border-charcoal/8">
        <div className="mb-4 inline-block rounded-full border border-green-deep/20 bg-green-deep/8 px-3 py-1 font-display text-xs font-bold uppercase tracking-wider text-green-deep">
          Essai gratuit 30 jours — sans carte bancaire
        </div>
        <h1 className="font-display text-2xl font-bold text-charcoal mb-1">Créer un compte</h1>
        <p className="text-sm text-charcoal/50 mb-6">Nom du restaurant, ville, email</p>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-terracotta/10 border border-terracotta/20 text-terracotta text-sm">{error}</div>
        )}
        {success && (
          <div className="mb-4 p-3 rounded-lg bg-green-deep/8 border border-green-deep/20 text-green-deep text-sm">{success}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className={labelClass}>Email</label>
            <input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              required
              autoComplete="email"
              placeholder="vous@exemple.com"
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="password" className={labelClass}>Mot de passe</label>
            <input
              id="password"
              type="password"
              value={form.password}
              onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
              required
              minLength={8}
              autoComplete="new-password"
              placeholder="••••••••"
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="first_name" className={labelClass}>Prénom</label>
            <input
              id="first_name"
              type="text"
              value={form.first_name}
              onChange={(e) => setForm((p) => ({ ...p, first_name: e.target.value }))}
              required
              autoComplete="given-name"
              placeholder="Jean"
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="last_name" className={labelClass}>Nom</label>
            <input
              id="last_name"
              type="text"
              value={form.last_name}
              onChange={(e) => setForm((p) => ({ ...p, last_name: e.target.value }))}
              required
              autoComplete="family-name"
              placeholder="Dupont"
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="company_name" className={labelClass}>Nom de l&apos;entreprise</label>
            <input
              id="company_name"
              type="text"
              value={form.company_name}
              onChange={(e) => setForm((p) => ({ ...p, company_name: e.target.value }))}
              required
              placeholder="Ma Société"
              className={inputClass}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-lg bg-green-deep font-display font-bold text-cream hover:bg-forest-green disabled:opacity-50 transition-colors"
          >
            {loading ? 'Création...' : 'Créer le compte'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-charcoal/50">
          Déjà un compte ?{' '}
          <Link href="/login" className="font-medium text-green-deep hover:text-forest-green transition-colors">
            Se connecter
          </Link>
        </p>
        <p className="mt-2 text-center text-xs text-charcoal/40">
          <Link href="/onboarding" className="hover:text-green-deep transition-colors">Commencer l&apos;onboarding sans compte (démo)</Link>
        </p>
      </div>
    </div>
  );
}
