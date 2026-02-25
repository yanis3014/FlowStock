'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useApi } from '@/hooks/useApi';

export default function RegisterPage() {
  const { fetchApiGuest } = useApi();
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

      const verifyToken = data?.data?.email_verification_token;
      if (verifyToken) {
        try {
          const verifyRes = await fetchApiGuest(
            `/auth/verify-email?token=${encodeURIComponent(verifyToken)}`
          );
          if (verifyRes.ok) {
            setSuccess('Compte créé et email vérifié. Redirection…');
            setTimeout(() => router.push('/login'), 1000);
            return;
          }
        } catch {}
      }

      setSuccess('Compte créé. Vous pouvez vous connecter.');
      setTimeout(() => router.push('/login'), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur réseau.');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50">
      <div className="w-full max-w-md p-6 bg-white rounded-lg shadow-md">
        <h1 className="text-xl font-bold text-gray-800 mb-4">Créer un compte</h1>

        {error && (
          <div className="mb-4 p-3 rounded-md bg-error/10 text-error text-sm">{error}</div>
        )}
        {success && (
          <div className="mb-4 p-3 rounded-md bg-success/20 text-success text-sm">{success}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              required
              autoComplete="email"
              placeholder="vous@exemple.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Mot de passe
            </label>
            <input
              id="password"
              type="password"
              value={form.password}
              onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
              required
              minLength={8}
              autoComplete="new-password"
              placeholder="••••••••"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label htmlFor="first_name" className="block text-sm font-medium text-gray-700 mb-1">
              Prénom
            </label>
            <input
              id="first_name"
              type="text"
              value={form.first_name}
              onChange={(e) => setForm((p) => ({ ...p, first_name: e.target.value }))}
              required
              autoComplete="given-name"
              placeholder="Jean"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label htmlFor="last_name" className="block text-sm font-medium text-gray-700 mb-1">
              Nom
            </label>
            <input
              id="last_name"
              type="text"
              value={form.last_name}
              onChange={(e) => setForm((p) => ({ ...p, last_name: e.target.value }))}
              required
              autoComplete="family-name"
              placeholder="Dupont"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label htmlFor="company_name" className="block text-sm font-medium text-gray-700 mb-1">
              Nom de l&apos;entreprise
            </label>
            <input
              id="company_name"
              type="text"
              value={form.company_name}
              onChange={(e) => setForm((p) => ({ ...p, company_name: e.target.value }))}
              required
              placeholder="Ma Société"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 rounded-md bg-primary text-white font-medium hover:bg-primary/90 disabled:opacity-50"
          >
            {loading ? 'Création...' : 'Créer le compte'}
          </button>
        </form>

        <p className="mt-4 text-sm text-gray-600">
          Déjà un compte ?{' '}
          <Link href="/login" className="text-primary hover:underline">
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  );
}
