'use client';

import { useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { NAV_ITEMS } from '@/lib/nav-config';

interface AppSidebarProps {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
  isMobile: boolean;
}

export function AppSidebar({
  collapsed,
  onToggleCollapsed,
  mobileOpen,
  onMobileClose,
  isMobile,
}: AppSidebarProps) {
  const pathname = usePathname();

  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onMobileClose();
    },
    [onMobileClose]
  );

  useEffect(() => {
    if (!isMobile || !mobileOpen) return;
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isMobile, mobileOpen, handleEscape]);

  const linkClass = (href: string) =>
    `block px-3 py-2 rounded-md text-sm font-medium transition-colors ${
      pathname === href
        ? 'bg-primary text-white'
        : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
    }`;

  const showNav = isMobile || !collapsed;

  const content = (
    <>
      <div className="flex h-12 items-center justify-between border-b border-gray-200 px-3">
        {showNav && (
          <span className="text-sm font-semibold text-gray-800">FlowStock</span>
        )}
        {!isMobile && (
          <button
            type="button"
            onClick={onToggleCollapsed}
            className="rounded p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
            aria-label={collapsed ? 'Étendre la sidebar' : 'Rétracter la sidebar'}
          >
            {collapsed ? (
              <ChevronRight className="h-5 w-5" />
            ) : (
              <ChevronLeft className="h-5 w-5" />
            )}
          </button>
        )}
        {isMobile && (
          <button
            type="button"
            onClick={onMobileClose}
            className="rounded p-1.5 text-gray-500 hover:bg-gray-100"
            aria-label="Fermer le menu"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>
      {showNav && (
        <nav className="flex flex-col gap-0.5 p-2">
          {NAV_ITEMS.filter((item) => !item.hidden).map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              onClick={isMobile ? onMobileClose : undefined}
              className={linkClass(href)}
            >
              {label}
            </Link>
          ))}
        </nav>
      )}
    </>
  );

  if (isMobile) {
    return (
      <>
        {mobileOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={onMobileClose}
            aria-hidden="true"
          />
        )}
        <aside
          id="mobile-sidebar"
          role="dialog"
          aria-modal="true"
          aria-label="Menu de navigation"
          className={`fixed left-0 top-0 z-50 h-full w-64 transform bg-white shadow-lg transition-transform duration-200 ease-out lg:hidden ${
            mobileOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="flex h-full flex-col">{content}</div>
        </aside>
      </>
    );
  }

  return (
    <aside
      className={`flex shrink-0 flex-col border-r border-gray-200 bg-white transition-[width] duration-200 ${
        collapsed ? 'w-14' : 'w-56'
      }`}
    >
      <div className="flex h-full flex-col overflow-hidden">{content}</div>
    </aside>
  );
}
