'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

const ALLOWED_ADMIN_ROLES = ['admin', 'owner'];

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const { token, user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    if (!token) {
      router.replace('/login?returnUrl=/admin');
      return;
    }

    const isAdmin = user?.role && ALLOWED_ADMIN_ROLES.includes(user.role.toLowerCase());
    if (!isAdmin) {
      router.replace('/dashboard');
    }
  }, [token, user, isLoading, router]);

  if (isLoading) return null;
  if (!token) return null;
  if (!user?.role || !ALLOWED_ADMIN_ROLES.includes(user.role.toLowerCase())) return null;

  return <>{children}</>;
}
