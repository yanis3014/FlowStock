'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

function RushLayoutClientInner({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const searchParams = useSearchParams();
  const isTokenMode = Boolean(searchParams.get('token'));

  return (
    <>
      {!isTokenMode && (
        <div className="fixed left-4 top-4 z-10">
          <Link
            href="/dashboard"
            className="text-sm font-medium text-gray-warm hover:text-charcoal transition-colors"
          >
            ← Retour
          </Link>
        </div>
      )}
      {children}
    </>
  );
}

export default function RushLayoutClient({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // `useSearchParams()` doit être enveloppé dans un `Suspense` pour éviter les erreurs de pré-rendu.
  return (
    <Suspense fallback={null}>
      <RushLayoutClientInner>{children}</RushLayoutClientInner>
    </Suspense>
  );
}

