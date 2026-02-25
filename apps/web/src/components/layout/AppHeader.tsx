'use client';

import { useRouter, usePathname } from 'next/navigation';
import { Menu } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getPageTitle } from '@/lib/nav-config';

interface AppHeaderProps {
  onMenuClick: () => void;
  isMobile: boolean;
  mobileMenuOpen?: boolean;
}

export function AppHeader({ onMenuClick, isMobile, mobileMenuOpen = false }: AppHeaderProps) {
  const pathname = usePathname();
  const { logout } = useAuth();
  const router = useRouter();
  const title = getPageTitle(pathname);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4">
      <div className="flex items-center gap-3">
        {isMobile && (
          <button
            type="button"
            onClick={onMenuClick}
            className="rounded p-2 text-gray-600 hover:bg-gray-100"
            aria-label={mobileMenuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-sidebar"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}
        <h1 className="text-lg font-semibold text-gray-800">{title}</h1>
      </div>
      <button
        type="button"
        onClick={handleLogout}
        className="rounded px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary/10"
      >
        Déconnexion
      </button>
    </header>
  );
}
