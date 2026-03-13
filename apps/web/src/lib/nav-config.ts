/**
 * Configuration des liens de navigation et titres de page (Shell 9.2).
 */

export interface NavItem {
  href: string;
  label: string;
  icon?: string;
  hideWhenOnboarded?: boolean;
  adminOnly?: boolean;
  hidden?: boolean;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Opérations',
    items: [
      { href: '/rush', label: 'Mode Rush', icon: 'Zap' },
      { href: '/dashboard', label: 'Dashboard', icon: 'LayoutDashboard' },
      { href: '/stocks', label: 'Stocks', icon: 'Package' },
      { href: '/sales', label: 'Ventes', icon: 'ShoppingCart' },
    ],
  },
  {
    label: 'Analyses',
    items: [
      { href: '/stats', label: 'Stats', icon: 'BarChart2' },
      { href: '/forecast', label: 'Prévisions', icon: 'TrendingUp' },
      { href: '/movements', label: 'Mouvements', icon: 'ArrowLeftRight' },
    ],
  },
  {
    label: 'Configuration',
    items: [
      { href: '/suppliers', label: 'Fournisseurs', icon: 'Truck' },
      { href: '/locations', label: 'Emplacements', icon: 'MapPin' },
      { href: '/fiches-techniques', label: 'Fiches techniques', icon: 'FileText' },
      { href: '/import-stocks', label: 'Import stocks', icon: 'Upload' },
      { href: '/import-sales', label: 'Import ventes', icon: 'Upload', hidden: true },
    ],
  },
  {
    label: 'Intelligence IA',
    items: [
      { href: '/suggestions', label: 'Suggestions IA', icon: 'Lightbulb' },
      { href: '/commandes', label: 'Commandes IA', icon: 'ShoppingBag' },
      { href: '/chat', label: 'Chat IA', icon: 'MessageSquare' },
      { href: '/formulas', label: 'Formules', icon: 'Calculator' },
    ],
  },
  {
    label: 'Compte',
    items: [
      { href: '/parametres', label: 'Paramètres', icon: 'Settings' },
      { href: '/abonnement', label: 'Abonnement', icon: 'CreditCard' },
      { href: '/onboarding', label: 'Configuration initiale', icon: 'PlayCircle', hideWhenOnboarded: true },
    ],
  },
  {
    label: 'Admin',
    items: [
      { href: '/admin', label: 'Administration', icon: 'ShieldCheck', adminOnly: true },
    ],
  },
];

/** Liste plate pour rétrocompatibilité (getPageTitle, etc.). */
export const NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);

const PATH_TITLES: Record<string, string> = Object.fromEntries(
  NAV_ITEMS.map((item) => [item.href, item.label])
);

export function getPageTitle(pathname: string): string {
  return PATH_TITLES[pathname] ?? 'FlowStock';
}
