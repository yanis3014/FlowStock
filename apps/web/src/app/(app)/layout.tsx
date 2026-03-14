'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useApi } from '@/hooks/useApi';
import { AppShell } from '@/components/layout/AppShell';

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const base64 = token.split('.')[1];
    if (!base64) return null;
    const json = atob(base64.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function ImpersonationBanner({
  tenantName,
  onReturn,
}: {
  tenantName: string;
  onReturn: () => void;
}) {
  return (
    <div className="fixed left-0 right-0 top-0 z-[100] flex items-center justify-between gap-3 bg-terracotta px-4 py-2 text-sm text-white">
      <span className="truncate">
        Vous consultez le compte de <strong>{tenantName}</strong>
      </span>
      <button
        onClick={onReturn}
        className="flex-shrink-0 rounded-md bg-white/20 px-3 py-1 font-medium transition-colors hover:bg-white/30"
      >
        Retour admin →
      </button>
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, token, setToken } = useAuth();
  const { fetchApi } = useApi();
  const router = useRouter();
  const pathname = usePathname();
  const checkedRef = useRef(false);
  const [impersonatedTenantName, setImpersonatedTenantName] = useState<string | null>(null);

  // Détecter le mode impersonnification depuis le JWT
  useEffect(() => {
    if (!token) {
      setImpersonatedTenantName(null);
      return;
    }
    const payload = decodeJwtPayload(token);
    if (payload?.isImpersonating === true) {
      const stored = typeof window !== 'undefined'
        ? sessionStorage.getItem('impersonated_tenant_name')
        : null;
      setImpersonatedTenantName(stored ?? 'ce restaurant');
    } else {
      setImpersonatedTenantName(null);
    }
  }, [token]);

  const handleReturnToAdmin = () => {
    const adminToken = typeof window !== 'undefined'
      ? sessionStorage.getItem('admin_token_backup')
      : null;
    if (adminToken) {
      sessionStorage.removeItem('admin_token_backup');
      sessionStorage.removeItem('impersonated_tenant_name');
      setToken(adminToken);
    }
    router.push('/admin');
  };

  useEffect(() => {
    if (!isLoading && !user) {
      router.push(pathname ? `/login?returnUrl=${encodeURIComponent(pathname)}` : '/login');
    }
  }, [user, isLoading, router, pathname]);

  // Vérifier onboarding UNIQUEMENT hors des routes /onboarding (évite boucle infinie)
  useEffect(() => {
    if (isLoading || !user || pathname.startsWith('/onboarding') || checkedRef.current) return;
    // Ne pas vérifier l'onboarding en mode impersonnification
    if (token && decodeJwtPayload(token)?.isImpersonating) return;
    checkedRef.current = true;
    fetchApi('/onboarding/progress')
      .then((r) => r.json())
      .then((data: { success: boolean; data?: { onboarding_completed: boolean } }) => {
        if (data?.data?.onboarding_completed === false) {
          router.push('/onboarding');
        }
      })
      .catch(() => { /* silencieux : ne pas bloquer l'app si la route est indisponible */ });
  }, [user, isLoading, pathname, fetchApi, router, token]);

  const isOnboarding = pathname.startsWith('/onboarding');

  if (isLoading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-green-deep border-t-transparent" />
      </div>
    );
  }
  if (!user) return null;

  if (isOnboarding) return <>{children}</>;

  return (
    <>
      {impersonatedTenantName && (
        <ImpersonationBanner
          tenantName={impersonatedTenantName}
          onReturn={handleReturnToAdmin}
        />
      )}
      <div className={impersonatedTenantName ? 'pt-10' : ''}>
        <AppShell>{children}</AppShell>
      </div>
    </>
  );
}
