'use client';

import { useEffect, useState, useCallback } from 'react';
import { AlertTriangle, Cpu, Link2, RefreshCw } from 'lucide-react';
import { useApi } from '@/hooks/useApi';

interface Integration {
  name: string;
  status: 'ok' | 'degraded';
  latencyMs: number | null;
  errorRate: number;
}

interface ImpactedTenant {
  tenant_id: string;
  company_name: string;
  error: string;
  since: string | null;
}

interface PosHealth {
  integrations: Integration[];
  impactedTenants: ImpactedTenant[];
  recentLogs: { ts: string; level: string; message: string }[];
}

interface SystemInfo {
  uptime: number;
  nodeVersion: string;
  memoryUsage: { heapUsed: number; heapTotal: number; rss: number };
  timestamp: string;
  database: { status: string };
}

function formatSince(dateStr: string | null): string {
  if (!dateStr) return 'Inconnu';
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 60) return `Il y a ${diffMin} min`;
  return `Il y a ${Math.floor(diffMin / 60)}h`;
}

export default function AdminMoniteurPage() {
  const { fetchApi } = useApi();
  const [posHealth, setPosHealth] = useState<PosHealth | null>(null);
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchData = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetchApi('/api/admin/pos-health').then((r) => (r.ok ? r.json() : null)),
      fetchApi('/api/admin/system').then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([posPayload, sysPayload]) => {
        if (posPayload?.success && posPayload.data) setPosHealth(posPayload.data as PosHealth);
        if (sysPayload?.success && sysPayload.data) setSystemInfo(sysPayload.data as SystemInfo);
        setLastRefresh(new Date());
      })
      .finally(() => setLoading(false));
  }, [fetchApi]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-bold text-charcoal">Moniteur technique</h1>
          <p className="mt-0.5 text-sm text-charcoal/40">
            Dernière mise à jour : {lastRefresh.toLocaleTimeString('fr-FR')}
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg border border-charcoal/8 bg-white px-3 py-2 text-sm text-charcoal/50 transition-colors hover:bg-cream-dark disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Actualiser
        </button>
      </div>

      {loading && !posHealth && (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-xl border border-charcoal/8 bg-white" />
          ))}
        </div>
      )}

      {/* Statut intégrations POS */}
      {posHealth && (
        <section className="rounded-xl border border-charcoal/8 bg-white p-5">
          <h2 className="flex items-center gap-2 font-display text-sm font-bold text-charcoal">
            <Link2 className="h-4 w-4" />
            Intégrations POS
          </h2>
          <div className="mt-4 space-y-3">
            {posHealth.integrations.map((pos) => (
              <div
                key={pos.name}
                className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-charcoal/8 bg-cream p-4"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${
                      pos.status === 'ok' ? 'bg-green-deep' : 'bg-terracotta'
                    }`}
                  />
                  <span className="font-medium text-charcoal">{pos.name}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    pos.status === 'ok'
                      ? 'bg-green-deep/10 text-green-deep'
                      : 'bg-terracotta/10 text-terracotta'
                  }`}>
                    {pos.status === 'ok' ? 'Opérationnel' : 'Dégradé'}
                  </span>
                </div>
                <div className="flex gap-6 text-sm text-charcoal/50">
                  {pos.latencyMs !== null && (
                    <span>
                      Latence : <strong className="text-charcoal">{pos.latencyMs} ms</strong>
                    </span>
                  )}
                  <span>
                    Taux d&apos;erreur : <strong className="text-charcoal">{pos.errorRate}%</strong>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Tenants impactés */}
      {posHealth && (
        <section className="rounded-xl border border-charcoal/8 bg-white p-5">
          <h2 className="flex items-center gap-2 font-display text-sm font-bold text-charcoal">
            <AlertTriangle className="h-4 w-4" />
            Tenants impactés ({posHealth.impactedTenants.length})
          </h2>
          {posHealth.impactedTenants.length === 0 ? (
            <p className="mt-4 text-sm text-charcoal/40">Aucun tenant impacté actuellement.</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {posHealth.impactedTenants.map((t) => (
                <li
                  key={t.tenant_id}
                  className="flex items-center justify-between rounded-lg border border-terracotta/20 bg-terracotta/5 px-4 py-3"
                >
                  <span className="font-medium text-charcoal">{t.company_name}</span>
                  <div className="text-right text-sm">
                    <p className="text-terracotta">{t.error}</p>
                    <p className="text-charcoal/40">{formatSince(t.since)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {/* Logs récents */}
      {posHealth && posHealth.recentLogs.length > 0 && (
        <section className="rounded-xl border border-charcoal/8 bg-white p-5">
          <h2 className="font-display text-sm font-bold text-charcoal">Logs récents</h2>
          <ul className="mt-4 space-y-2">
            {posHealth.recentLogs.map((log, i) => (
              <li
                key={i}
                className={`rounded-lg border px-4 py-2 font-mono text-xs ${
                  log.level === 'error'
                    ? 'border-terracotta/20 bg-terracotta/5 text-terracotta'
                    : log.level === 'warn'
                      ? 'border-gold/20 bg-gold/5 text-gold'
                      : 'border-charcoal/8 bg-cream text-charcoal/60'
                }`}
              >
                <span className="text-charcoal/50">{log.ts}</span> [{log.level}] {log.message}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Statut système */}
      {systemInfo && (
        <section className="rounded-xl border border-charcoal/8 bg-white p-5">
          <h2 className="flex items-center gap-2 font-display text-sm font-bold text-charcoal">
            <Cpu className="h-4 w-4" />
            Statut système
          </h2>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: 'Base de données', value: systemInfo.database.status === 'connected' ? 'Connectée' : 'Erreur', ok: systemInfo.database.status === 'connected' },
              { label: 'Node.js', value: systemInfo.nodeVersion, ok: true },
              { label: 'Heap utilisé', value: `${Math.round(systemInfo.memoryUsage.heapUsed / 1024 / 1024)} Mo`, ok: true },
              { label: 'Uptime', value: `${Math.floor(systemInfo.uptime / 3600)}h ${Math.floor((systemInfo.uptime % 3600) / 60)}m`, ok: true },
            ].map(({ label, value, ok }) => (
              <div key={label} className="rounded-lg border border-charcoal/8 bg-cream p-3">
                <div className="flex items-center gap-1.5">
                  <span className={`h-1.5 w-1.5 rounded-full ${ok ? 'bg-green-deep' : 'bg-terracotta'}`} />
                  <span className="text-xs text-charcoal/40">{label}</span>
                </div>
                <p className="mt-1.5 font-display text-sm font-bold text-charcoal">{value}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
