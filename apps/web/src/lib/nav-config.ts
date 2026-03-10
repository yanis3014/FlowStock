/**
 * Configuration des liens de navigation et titres de page (Shell 9.2).
 */
export const NAV_ITEMS: { href: string; label: string; hidden?: boolean }[] = [
  { href: '/rush', label: 'Mode Rush' },
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/stocks', label: 'Stocks' },
  { href: '/fiches-techniques', label: 'Fiches techniques' },
  { href: '/suggestions', label: 'Suggestions IA' },
  { href: '/parametres', label: 'Paramètres' },
  { href: '/abonnement', label: 'Abonnement' },
  { href: '/onboarding', label: 'Onboarding' },
  { href: '/stats', label: 'Stats' },
  { href: '/forecast', label: 'Prévisions' },
  { href: '/chat', label: 'Chat' },
  { href: '/formulas', label: 'Formules' },
  { href: '/custom-formulas', label: 'Formules personnalisées' },
  { href: '/sales', label: 'Ventes' },
  { href: '/import-stocks', label: 'Import stocks' },
  { href: '/import-sales', label: 'Import ventes', hidden: true }, // TODO Sprint 2 : Import ventes
  { href: '/movements', label: 'Mouvements' },
  { href: '/locations', label: 'Emplacements' },
  { href: '/suppliers', label: 'Fournisseurs' },
  { href: '/admin', label: 'Admin' },
];

const PATH_TITLES: Record<string, string> = Object.fromEntries(
  NAV_ITEMS.map((item) => [item.href, item.label])
);

export function getPageTitle(pathname: string): string {
  return PATH_TITLES[pathname] ?? 'FlowStock';
}
