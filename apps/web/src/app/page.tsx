'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function HomePage() {
  const { token, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && token) {
      router.replace('/dashboard');
    }
  }, [token, isLoading, router]);

  if (isLoading || token) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <p className="text-gray-600">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <h1 className="mb-4 text-2xl font-bold text-gray-800">FlowStock</h1>
      <p className="mb-6 text-gray-600">Gestion de stocks pour PME</p>
      <div className="flex gap-4">
        <Link
          href="/login"
          className="rounded-md bg-primary px-4 py-2 font-medium text-white hover:bg-primary/90"
        >
          Connexion
        </Link>
        <Link
          href="/register"
          className="rounded-md border border-gray-300 px-4 py-2 font-medium text-gray-700 hover:bg-gray-50"
        >
          Créer un compte
        </Link>
      </div>
    </div>
  );
}
