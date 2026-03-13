'use client';

import { useState, useEffect, useCallback } from 'react';
import { useApi } from './useApi';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Hook to get the current unread alert count for the badge in navigation.
 * Polls the dashboard summary endpoint every 2 minutes.
 */
export function useAlertCount() {
  const { token } = useAuth();
  const { fetchApi } = useApi();
  const [count, setCount] = useState(0);

  const refresh = useCallback(() => {
    if (!token) return;
    fetchApi('/dashboard/summary')
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (json?.success && json?.data) {
          const unread = json.data.unread_alert_count ?? json.data.alerts?.length ?? 0;
          setCount(unread);
        }
      })
      .catch(() => {});
  }, [token, fetchApi]);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, [refresh]);

  return { count };
}
