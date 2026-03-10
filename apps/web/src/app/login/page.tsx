'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, setToken } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionExpired = searchParams.get('session_expired') === '1';
  const returnUrl = searchParams.get('returnUrl') || '/dashboard';

  const handleDemo = () => {
    setToken('demo');
    router.push(returnUrl);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(email.trim(), password);

    if (result.success) {
      router.push(returnUrl);
      return;
    }

    setError(result.error || 'Connexion impossible.');
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-cream overflow-y-auto">
      <div className="w-full max-w-md p-6 bg-white rounded-xl shadow-md border border-green-deep/10 my-4">
        <h1 className="font-display text-xl font-bold text-green-deep mb-2">Connexion</h1>
        <p className="text-sm text-gray-warm mb-4">Accédez à votre espace FlowStock</p>

        {sessionExpired && (
          <div className="mb-4 p-3 rounded-md bg-warning/20 text-warning text-sm">
            Session expirée. Veuillez vous reconnecter.
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 rounded-md bg-red-alert/10 text-red-alert text-sm">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="vous@exemple.com"
              className="w-full px-3 py-2 border border-green-deep/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-mid focus:border-green-mid"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Mot de passe
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              placeholder="••••••••"
              className="w-full px-3 py-2 border border-green-deep/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-mid focus:border-green-mid"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl bg-green-mid font-display font-bold text-white hover:bg-green-deep hover:opacity-95 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>

        <div className="mt-4 flex justify-center">
          <button
            type="button"
            className="text-sm text-gray-warm hover:text-green-deep flex items-center gap-2"
            aria-label="Connexion avec Google (bientôt disponible)"
          >
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-gray-300 text-xs">G</span>
            Connexion avec Google
          </button>
        </div>

        <p className="mt-4 text-center text-sm text-gray-600">
          <Link href="#" className="text-gray-warm hover:text-green-deep hover:underline">
            Mot de passe oublié ?
          </Link>
        </p>
        <p className="mt-2 text-center text-sm text-gray-600">
          Pas encore de compte ?{' '}
          <Link href="/register" className="font-semibold text-green-mid hover:underline">
            Essai gratuit 30 jours — Créer un compte
          </Link>
        </p>
        <p className="mt-4 pt-4 border-t border-gray-200 text-center">
          <button
            type="button"
            onClick={handleDemo}
            className="text-sm font-medium text-gray-warm hover:text-green-deep"
          >
            Accéder en démo (sans connexion)
          </button>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-600">Chargement...</p>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
