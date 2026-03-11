'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard,
  Users,
  Store,
  CreditCard,
  Activity,
  LogOut,
  Shield,
  ChevronRight,
  Menu,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

const ADMIN_NAV = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/admin/users', label: 'Utilisateurs', icon: Users, exact: false },
  { href: '/admin/restaurants', label: 'Restaurants', icon: Store, exact: false },
  { href: '/admin/subscriptions', label: 'Abonnements', icon: CreditCard, exact: false },
  { href: '/admin/system', label: 'Système', icon: Activity, exact: false },
];

export default function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const accessDeniedShownRef = useRef(false);

  useEffect(() => {
    if (pathname === '/admin/login' || isLoading) return;

    if (!user) {
      router.replace('/admin/login');
      return;
    }

    if (user.role !== 'admin') {
      if (!accessDeniedShownRef.current) {
        toast.error('Accès refusé');
        accessDeniedShownRef.current = true;
      }
      router.replace('/dashboard');
    }
  }, [user, isLoading, router, pathname]);

  if (pathname === '/admin/login') return <>{children}</>;

  if (isLoading || !user || user.role !== 'admin') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-charcoal">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-green-deep border-t-transparent" />
      </div>
    );
  }

  const isActive = (item: (typeof ADMIN_NAV)[number]) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href);

  const displayName = user.email.split('@')[0];

  return (
    <div className="flex min-h-screen bg-[#111816]">
      <aside className="hidden w-60 flex-shrink-0 flex-col border-r border-cream/5 bg-charcoal md:flex">
        <div className="flex items-center gap-2.5 border-b border-cream/5 px-5 py-5">
          <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-green-deep">
            <Shield className="h-4 w-4 text-cream" />
          </div>
          <div>
            <p className="font-display text-sm font-bold leading-none text-cream">FlowStock</p>
            <p className="mt-0.5 text-xs text-cream/40">Administration</p>
          </div>
        </div>

        <nav className="flex-1 space-y-0.5 p-3">
          {ADMIN_NAV.map((item) => {
            const active = isActive(item);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                  active
                    ? 'bg-green-deep font-medium text-cream'
                    : 'text-cream/50 hover:bg-cream/5 hover:text-cream'
                }`}
              >
                <item.icon className="h-4 w-4 flex-shrink-0" />
                {item.label}
                {active && <ChevronRight className="ml-auto h-3.5 w-3.5 opacity-60" />}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-cream/5 p-3">
          <div className="mb-1 flex items-center gap-2.5 px-3 py-2">
            <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-green-deep/20">
              <span className="text-xs font-bold text-green-deep">
                {displayName.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-cream">{displayName}</p>
              <p className="truncate text-xs text-cream/40">{user.email}</p>
            </div>
          </div>
          <button
            onClick={() => {
              logout();
              router.push('/admin/login');
            }}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-cream/40 transition-colors hover:bg-terracotta/5 hover:text-terracotta"
          >
            <LogOut className="h-4 w-4" />
            Déconnexion
          </button>
        </div>
      </aside>

      <div className="fixed left-0 right-0 top-0 z-50 flex items-center justify-between border-b border-cream/5 bg-charcoal px-4 py-3 md:hidden">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-green-deep" />
          <span className="font-display text-sm font-bold text-cream">Admin</span>
        </div>
        <button
          onClick={() => setSidebarOpen((v) => !v)}
          className="text-cream/60 transition-colors hover:text-cream"
          aria-label={sidebarOpen ? 'Fermer le menu admin' : 'Ouvrir le menu admin'}
        >
          {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          onClick={() => setSidebarOpen(false)}
        >
          <aside
            className="h-full w-60 space-y-1 bg-charcoal p-4"
            onClick={(e) => e.stopPropagation()}
          >
            {ADMIN_NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                  isActive(item)
                    ? 'bg-green-deep font-medium text-cream'
                    : 'text-cream/50 hover:bg-cream/5 hover:text-cream'
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
          </aside>
        </div>
      )}

      <main className="min-w-0 flex-1 md:overflow-auto">
        <div className="min-h-screen pt-14 md:pt-0">{children}</div>
      </main>
    </div>
  );
}
