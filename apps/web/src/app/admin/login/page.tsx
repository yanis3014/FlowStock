'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Shield, Eye, EyeOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useApi } from '@/hooks/useApi';
import { useAuth } from '@/contexts/AuthContext';

export default function AdminLoginPage() {
  const router = useRouter();
  const { fetchApiGuest } = useApi();
  const { setToken } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim() || !password) {
      toast.error('Email et mot de passe requis.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetchApiGuest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        data?: { access_token?: string; user?: { role?: string } };
      };

      if (!response.ok) {
        toast.error(payload.error ?? 'Identifiants incorrects.');
        return;
      }

      const role = payload.data?.user?.role;
      const accessToken = payload.data?.access_token;

      if (!accessToken) {
        toast.error('Réponse inattendue du serveur.');
        return;
      }

      if (role !== 'admin') {
        toast.error("Ce compte n'a pas les droits administrateur.");
        return;
      }

      setToken(accessToken);
      router.push('/admin');
    } catch {
      toast.error('Erreur de connexion. Vérifiez votre réseau.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-charcoal p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-green-deep">
            <Shield className="h-6 w-6 text-cream" />
          </div>
          <h1 className="font-display text-xl font-bold text-cream">Administration</h1>
          <p className="mt-1 text-sm text-cream/50">FlowStock — Accès restreint</p>
        </div>

        <div className="space-y-4 rounded-2xl border border-cream/10 bg-charcoal/50 p-6">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-cream/60">
              Email administrateur
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              placeholder="admin@flowstock.io"
              className="w-full rounded-lg border border-cream/10 bg-cream/5 px-3 py-2.5 text-sm text-cream placeholder:text-cream/30 focus:border-green-deep focus:outline-none focus:ring-1 focus:ring-green-deep"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-cream/60">
              Mot de passe
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                placeholder="••••••••"
                className="w-full rounded-lg border border-cream/10 bg-cream/5 px-3 py-2.5 pr-10 text-sm text-cream placeholder:text-cream/30 focus:border-green-deep focus:outline-none focus:ring-1 focus:ring-green-deep"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-cream/30 transition-colors hover:text-cream/60"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-green-deep py-2.5 font-semibold text-cream transition-colors hover:bg-forest-green disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </div>

        <p className="mt-6 text-center text-xs text-cream/30">
          <Link href="/login" className="transition-colors hover:text-cream/60">
            ← Retour au login utilisateur
          </Link>
        </p>
      </div>
    </div>
  );
}
