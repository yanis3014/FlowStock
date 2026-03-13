'use client';

import { useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ChevronLeft,
  ChevronRight,
  X,
  Zap,
  LayoutDashboard,
  Package,
  ShoppingCart,
  BarChart2,
  TrendingUp,
  ArrowLeftRight,
  Truck,
  MapPin,
  FileText,
  Upload,
  Lightbulb,
  MessageSquare,
  Calculator,
  Settings,
  CreditCard,
  PlayCircle,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react';
import { NAV_GROUPS, type NavItem } from '@/lib/nav-config';
import { useAuth } from '@/contexts/AuthContext';
import { useOnboardingStatus } from '@/hooks/useOnboardingStatus';
import { useAlertCount } from '@/hooks/useAlertCount';

const ICON_MAP: Record<string, LucideIcon> = {
  Zap,
  LayoutDashboard,
  Package,
  ShoppingCart,
  BarChart2,
  TrendingUp,
  ArrowLeftRight,
  Truck,
  MapPin,
  FileText,
  Upload,
  Lightbulb,
  MessageSquare,
  Calculator,
  Settings,
  CreditCard,
  PlayCircle,
  ShieldCheck,
};

const ALLOWED_ADMIN_ROLES = ['admin', 'owner'];

interface AppSidebarProps {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
  isMobile: boolean;
}

function SidebarItem({
  item,
  isActive,
  collapsed,
  showIndicator,
  alertCount,
  onClick,
}: {
  item: NavItem;
  isActive: boolean;
  collapsed: boolean;
  showIndicator?: boolean;
  alertCount?: number;
  onClick?: () => void;
}) {
  const Icon = item.icon ? ICON_MAP[item.icon] : null;

  const linkClass = `flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
    isActive ? 'bg-green-deep text-cream' : 'text-charcoal hover:bg-cream-dark hover:text-charcoal'
  }`;

  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={linkClass}
      title={collapsed ? item.label : undefined}
    >
      {Icon && (
        <span className="relative shrink-0">
          <Icon className="h-5 w-5" strokeWidth={2} />
          {alertCount != null && alertCount > 0 && (
            <span
              className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-terracotta text-[9px] font-bold text-cream"
              aria-label={`${alertCount} alerte${alertCount > 1 ? 's' : ''}`}
            >
              {alertCount > 9 ? '9+' : alertCount}
            </span>
          )}
        </span>
      )}
      {(!collapsed || !Icon) && <span className="truncate">{item.label}</span>}
      {showIndicator && <span className="ml-auto h-2 w-2 flex-shrink-0 rounded-full bg-terracotta" aria-hidden="true" />}
    </Link>
  );
}

export function AppSidebar({
  collapsed,
  onToggleCollapsed,
  mobileOpen,
  onMobileClose,
  isMobile,
}: AppSidebarProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const { completed: onboardingCompleted, loading: onboardingLoading } = useOnboardingStatus();
  const { count: alertCount } = useAlertCount();

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

  const isAdmin = user?.role && ALLOWED_ADMIN_ROLES.includes(user.role.toLowerCase());

  const filteredGroups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => {
      if (item.hidden) return false;
      if (item.hideWhenOnboarded && !onboardingLoading && onboardingCompleted) return false;
      if (item.adminOnly && !isAdmin) return false;
      return true;
    }),
  })).filter((group) => group.items.length > 0);

  const showNav = isMobile || !collapsed;

  const content = (
    <>
      <div className="flex h-12 items-center justify-between border-b border-cream-dark px-3">
        {showNav && (
          <span className="text-sm font-display font-bold text-charcoal truncate">
            {collapsed ? 'FS' : 'FlowStock'}
          </span>
        )}
        {!isMobile && (
          <button
            type="button"
            onClick={onToggleCollapsed}
            className="rounded p-1.5 text-charcoal/60 hover:bg-cream-dark hover:text-charcoal"
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
            className="rounded p-1.5 text-charcoal/60 hover:bg-cream-dark"
            aria-label="Fermer le menu"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>
      {showNav && (
        <nav className="flex flex-col gap-1 px-2 py-4 overflow-y-auto">
          {filteredGroups.map((group, groupIdx) => (
            <div key={group.label} className={groupIdx > 0 ? 'mt-5' : ''}>
              {!collapsed && (
                <p className="px-3 mb-1 text-xs font-semibold uppercase tracking-wider text-charcoal/50">
                  {group.label}
                </p>
              )}
              <div className="flex flex-col gap-0.5">
                {group.items.map((item) => (
                  <SidebarItem
                    key={item.href}
                    item={item}
                    isActive={pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))}
                    collapsed={collapsed}
                    showIndicator={item.href === '/onboarding' && !onboardingLoading && !onboardingCompleted}
                    alertCount={item.href === '/dashboard' ? alertCount : undefined}
                    onClick={isMobile ? onMobileClose : undefined}
                  />
                ))}
              </div>
            </div>
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
      className={`flex shrink-0 flex-col border-r border-cream-dark bg-white transition-[width] duration-200 ${
        collapsed ? 'w-14' : 'w-56'
      }`}
    >
      <div className="flex h-full flex-col overflow-hidden">{content}</div>
    </aside>
  );
}
