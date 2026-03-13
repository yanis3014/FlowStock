'use client';

import { AlertTriangle, AlertCircle, Info, X, Check } from 'lucide-react';
import { useState, useCallback } from 'react';

export interface AlertItem {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high';
  product?: { id: string; name: string };
  message: string;
  created_at?: string;
}

interface AlertBannerProps {
  alerts: AlertItem[];
  onMarkRead?: (alertIds: string[]) => void;
  showAll?: boolean;
  maxVisible?: number;
}

const SEVERITY_STYLES: Record<string, { border: string; bg: string; text: string; icon: string }> = {
  high: {
    border: 'border-l-terracotta',
    bg: 'bg-terracotta/5',
    text: 'text-terracotta',
    icon: 'terracotta',
  },
  medium: {
    border: 'border-l-gold',
    bg: 'bg-gold/5',
    text: 'text-gold',
    icon: 'gold',
  },
  low: {
    border: 'border-l-charcoal/20',
    bg: 'bg-cream/50',
    text: 'text-charcoal/60',
    icon: 'charcoal/40',
  },
};

function AlertIcon({ severity }: { severity: string }) {
  if (severity === 'high') return <AlertTriangle className="h-4 w-4 shrink-0 text-terracotta" aria-hidden />;
  if (severity === 'medium') return <AlertCircle className="h-4 w-4 shrink-0 text-gold" aria-hidden />;
  return <Info className="h-4 w-4 shrink-0 text-charcoal/40" aria-hidden />;
}

export function AlertBanner({ alerts, onMarkRead, showAll = false, maxVisible = 5 }: AlertBannerProps) {
  const [readLocally, setReadLocally] = useState<Set<string>>(new Set());
  const [markingId, setMarkingId] = useState<string | null>(null);

  const visibleAlerts = alerts
    .filter((a) => !readLocally.has(a.id))
    .slice(0, showAll ? undefined : maxVisible);

  const handleMarkRead = useCallback(
    async (alertId: string) => {
      setMarkingId(alertId);
      try {
        if (onMarkRead) await onMarkRead([alertId]);
        setReadLocally((prev) => {
          const next = new Set(Array.from(prev));
          next.add(alertId);
          return next;
        });
      } finally {
        setMarkingId(null);
      }
    },
    [onMarkRead]
  );

  const handleMarkAllRead = useCallback(async () => {
    const ids = visibleAlerts.map((a) => a.id);
    if (ids.length === 0) return;
    if (onMarkRead) await onMarkRead(ids);
    setReadLocally((prev) => {
      const next = new Set(Array.from(prev));
      ids.forEach((id) => next.add(id));
      return next;
    });
  }, [visibleAlerts, onMarkRead]);

  if (visibleAlerts.length === 0) {
    return (
      <div className="rounded-xl border border-charcoal/8 bg-white p-4 shadow-sm">
        <p className="text-sm text-charcoal/50">Aucune alerte active.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-charcoal/8 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-display text-sm font-bold text-charcoal">
          <AlertTriangle className="h-4 w-4 text-gold" aria-hidden />
          Alertes urgentes
          <span
            className="ml-1 rounded-full bg-terracotta/15 px-2 py-0.5 text-xs font-bold text-terracotta"
            aria-label={`${visibleAlerts.length} alerte${visibleAlerts.length > 1 ? 's' : ''}`}
          >
            {visibleAlerts.length}
          </span>
        </h2>
        {onMarkRead && visibleAlerts.length > 1 && (
          <button
            type="button"
            onClick={handleMarkAllRead}
            className="text-xs font-medium text-charcoal/50 hover:text-charcoal transition-colors"
          >
            Tout marquer comme lu
          </button>
        )}
      </div>
      <ul className="space-y-2" role="list" aria-label="Liste des alertes">
        {visibleAlerts.map((alert) => {
          const styles = SEVERITY_STYLES[alert.severity] ?? SEVERITY_STYLES.low;
          const isMarking = markingId === alert.id;
          return (
            <li
              key={alert.id}
              className={`flex items-center justify-between gap-2 rounded-lg border-l-4 p-3 text-sm ${styles.border} ${styles.bg}`}
              role="listitem"
            >
              <div className="flex min-w-0 items-center gap-2">
                <AlertIcon severity={alert.severity} />
                <span className="font-medium text-charcoal truncate">
                  {alert.product?.name ? `${alert.product.name} — ` : ''}
                  {alert.message}
                </span>
              </div>
              {onMarkRead && (
                <button
                  type="button"
                  onClick={() => handleMarkRead(alert.id)}
                  disabled={isMarking}
                  className="shrink-0 rounded-lg border border-charcoal/15 bg-white px-2 py-1 text-xs font-medium text-charcoal/60 transition-colors hover:bg-cream hover:text-charcoal disabled:opacity-50"
                  aria-label={`Marquer "${alert.product?.name ?? alert.message}" comme lu`}
                >
                  {isMarking ? (
                    <span className="flex items-center gap-1">
                      <span className="h-3 w-3 animate-spin rounded-full border border-charcoal/30 border-t-charcoal" />
                    </span>
                  ) : (
                    <Check className="h-3 w-3" aria-hidden />
                  )}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
