'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Package, Sparkles, User } from 'lucide-react';

/** Navigation bas mobile — Accueil / Stocks / IA / Profil (plan MVP restaurant). */
const ITEMS = [
  { href: '/dashboard', label: 'Accueil', icon: Home },
  { href: '/stocks', label: 'Stocks', icon: Package },
  { href: '/suggestions', label: 'IA', icon: Sparkles },
  { href: '/parametres', label: 'Profil', icon: User },
];

interface MobileBottomNavProps {
  visible: boolean;
}

export function MobileBottomNav({ visible }: MobileBottomNavProps) {
  const pathname = usePathname();

  if (!visible) return null;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-30 flex items-center justify-around border-t border-cream-dark bg-white py-2 safe-area-pb lg:hidden"
      aria-label="Navigation principale"
    >
      {ITEMS.map(({ href, label, icon: Icon }) => {
        const isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
        return (
          <Link
            key={href}
            href={href}
            className={`flex flex-col items-center gap-1 rounded-lg px-4 py-1.5 text-xs font-medium transition-colors ${
              isActive ? 'text-green-deep' : 'text-gray-warm hover:text-green-deep'
            }`}
          >
            <Icon className="h-5 w-5" strokeWidth={2} />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
