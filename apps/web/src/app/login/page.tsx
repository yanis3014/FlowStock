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
      <div className="w-full max-w-md p-8 bg-white rounded-2xl shadow-sm border border-charcoal/8 my-4">
        <h1 className="font-display text-2xl font-bold text-charcoal mb-1">Connexion</h1>
        <p className="text-sm text-charcoal/50 mb-6">Accédez à votre espace FlowStock</p>

        {sessionExpired && (
          <div className="mb-4 p-3 rounded-lg bg-gold/10 border border-gold/30 text-charcoal text-sm">
            Session expirée. Veuillez vous reconnecter.
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-terracotta/10 border border-terracotta/20 text-terracotta text-sm">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-xs font-medium text-charcoal/60 mb-1.5">
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
              className="w-full bg-white border border-charcoal/15 rounded-lg px-3 py-2.5 text-sm text-charcoal placeholder:text-charcoal/35 focus:outline-none focus:border-green-deep focus:ring-1 focus:ring-green-deep/20 transition-colors"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-xs font-medium text-charcoal/60 mb-1.5">
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
              className="w-full bg-white border border-charcoal/15 rounded-lg px-3 py-2.5 text-sm text-charcoal placeholder:text-charcoal/35 focus:outline-none focus:border-green-deep focus:ring-1 focus:ring-green-deep/20 transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-lg bg-green-deep font-display font-bold text-cream hover:bg-forest-green disabled:opacity-50 transition-colors"
          >
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>

        <div className="mt-4 flex justify-center">
          <button
            type="button"
            className="text-sm text-charcoal/50 hover:text-green-deep flex items-center gap-2 transition-colors"
            aria-label="Connexion avec Google (bientôt disponible)"
          >
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-charcoal/15 text-xs">G</span>
            Connexion avec Google
          </button>
        </div>

        <p className="mt-4 text-center text-sm">
          <Link href="#" className="text-charcoal/50 hover:text-green-deep transition-colors">
            Mot de passe oublié ?
          </Link>
        </p>
        <p className="mt-2 text-center text-sm text-charcoal/50">
          Pas encore de compte ?{' '}
          <Link href="/register" className="font-medium text-green-deep hover:text-forest-green transition-colors">
            Essai gratuit 30 jours — Créer un compte
          </Link>
        </p>
        <p className="mt-4 pt-4 border-t border-charcoal/8 text-center">
          <button
            type="button"
            onClick={handleDemo}
            className="text-sm font-medium text-charcoal/50 hover:text-green-deep transition-colors"
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
      <div className="min-h-screen flex items-center justify-center bg-cream">
        <p className="text-charcoal/50">Chargement...</p>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
