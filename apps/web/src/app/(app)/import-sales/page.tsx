'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Clock } from 'lucide-react';

export default function ImportSalesPage() {
  const { token, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!token && !isLoading) router.push('/login?returnUrl=/import-sales');
  }, [token, isLoading, router]);

  if (!token && isLoading) return null;
  if (!token) return null;

  return (
    <div className="min-h-full bg-cream font-body">
      <div className="mx-auto flex max-w-xl flex-col items-center justify-center px-4 py-16 text-center">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-deep/10">
          <Clock className="h-8 w-8 text-green-deep" />
        </div>
        <h1 className="font-display text-2xl font-bold text-green-deep">Import des ventes</h1>
        <p className="mt-2 font-display text-lg font-semibold text-charcoal">
          Cette fonctionnalité arrive prochainement.
        </p>
        <p className="mt-4 text-sm text-charcoal">
          Vous pourrez bientôt importer vos données de ventes depuis votre caisse (CSV, Lightspeed,
          Zelty...).
        </p>
        <Link
          href="/import-stocks"
          className="mt-8 inline-flex items-center gap-2 rounded-xl border-2 border-green-mid bg-transparent px-4 py-2.5 font-display text-sm font-bold text-green-deep hover:bg-green-deep/5"
        >
          Voir l&apos;import des stocks
        </Link>
      </div>
    </div>
  );
}
