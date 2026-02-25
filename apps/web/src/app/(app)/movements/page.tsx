'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function MovementsPage() {
  const { token, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!token && !isLoading) router.push('/login?returnUrl=/movements');
  }, [token, isLoading, router]);

  if (!token && isLoading) return null;
  if (!token) return null;

  return (
    <div>
      <p className="text-gray-600">Contenu à venir (Mouvements).</p>
    </div>
  );
}
