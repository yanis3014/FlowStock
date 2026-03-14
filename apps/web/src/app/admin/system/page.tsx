'use client';

import { useEffect, useState, useCallback } from 'react';
import { Activity, Database, Clock, Cpu, RefreshCw } from 'lucide-react';
import { useApi } from '@/hooks/useApi';

interface SystemInfo {
  uptime: number;
  nodeVersion: string;
  memoryUsage: { heapUsed: number; heapTotal: number; rss: number };
  timestamp: string;
  database: {
    status: string;
    totalProducts: number;
    totalUsers: number;
    totalRestaurants: number;
    totalSubscriptions: number;
  };
}

function formatUptime(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

function formatBytes(bytes: number) {
  return `${Math.round(bytes / 1024 / 1024)} Mo`;
}

export default function AdminSystemPage() {
  const { fetchApi } = useApi();
  const [info, setInfo] = useState<SystemInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchSystem = useCallback(() => {
    setLoading(true);
    fetchApi('/api/admin/system')
      .then((r) => (r.ok ? r.json() : null))
      .then((payload: { success?: boolean; data?: SystemInfo } | null) => {
        if (payload?.success && payload.data) {
          setInfo(payload.data);
          setLastRefresh(new Date());
        }
      })
      .finally(() => setLoading(false));
  }, [fetchApi]);

  useEffect(() => {
    fetchSystem();
  }, [fetchSystem]);

  return (
    <div className="space-y-5 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-bold text-charcoal">Système</h1>
          <p className="mt-0.5 text-sm text-charcoal/40">
            Dernière mise à jour : {lastRefresh.toLocaleTimeString('fr-FR')}
          </p>
        </div>
        <button
          onClick={fetchSystem}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg border border-charcoal/8 bg-white px-3 py-2 text-sm text-charcoal/50 transition-colors hover:bg-cream-dark disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Actualiser
        </button>
      </div>

      {info && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {[
            {
              label: 'Base de données',
              icon: Database,
              value: info.database.status === 'connected' ? 'Connectée' : 'Erreur',
              sub: `${info.database.totalProducts} produits`,
              ok: info.database.status === 'connected',
            },
            {
              label: 'Uptime serveur',
              icon: Clock,
              value: formatUptime(info.uptime),
              sub: 'Depuis le dernier redémarrage',
              ok: true,
            },
            {
              label: 'Mémoire heap',
              icon: Cpu,
              value: formatBytes(info.memoryUsage.heapUsed),
              sub: `/ ${formatBytes(info.memoryUsage.heapTotal)} alloués`,
              ok: true,
            },
            {
              label: 'Node.js',
              icon: Activity,
              value: info.nodeVersion,
              sub: 'Version du runtime',
              ok: true,
            },
          ].map(({ label, icon: Icon, value, sub, ok }) => (
            <div key={label} className="rounded-xl border border-charcoal/8 bg-white p-5">
              <div className="mb-3 flex items-center gap-2">
                <Icon className="h-4 w-4 text-charcoal/30" />
                <span className="text-xs text-charcoal/50">{label}</span>
                <span
                  className={`ml-auto h-1.5 w-1.5 rounded-full ${
                    ok ? 'bg-green-deep' : 'bg-terracotta'
                  }`}
                />
              </div>
              <p className="font-display text-lg font-bold text-charcoal">{value}</p>
              <p className="mt-0.5 text-xs text-charcoal/30">{sub}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
