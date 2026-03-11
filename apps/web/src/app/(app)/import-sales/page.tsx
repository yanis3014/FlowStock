'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Clock } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';

export default function ImportSalesPage() {
  useAuth(); // Auth guard in layout

  return (
    <div className="min-h-full bg-cream font-body">
      <div className="mx-auto flex max-w-xl flex-col items-center justify-center px-4 py-16 text-center">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-deep/10">
          <Clock className="h-8 w-8 text-green-deep" />
        </div>
        <h1 className="font-display text-2xl font-bold text-charcoal">Import des ventes</h1>
        <p className="mt-2 font-display text-lg font-semibold text-charcoal">
          Cette fonctionnalité arrive prochainement.
        </p>
        <p className="mt-4 text-sm text-charcoal">
          Vous pourrez bientôt importer vos données de ventes depuis votre caisse (CSV, Lightspeed,
          Zelty...).
        </p>
        <Link
          href="/import-stocks"
          className="mt-8 inline-flex items-center gap-2 rounded-xl border border-charcoal/20 bg-transparent px-4 py-2.5 font-display text-sm font-bold text-charcoal hover:bg-charcoal/5 transition-colors"
        >
          Voir l&apos;import des stocks
        </Link>
      </div>
    </div>
  );
}
