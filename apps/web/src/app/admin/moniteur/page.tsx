'use client';

import { AlertTriangle, Cpu, Link2, Mail } from 'lucide-react';

const MOCK_POS_STATUS = [
  { name: 'Lightspeed', status: 'ok' as const, latenceMs: 120, tauxErreur: 0.1 },
  { name: 'Saisie manuelle', status: 'ok' as const, latenceMs: 0, tauxErreur: 0 },
];

const MOCK_CLIENTS_IMPACTES = [
  { id: '1', nom: 'Le Bistrot', erreur: 'Timeout API Lightspeed', depuis: 'Il y a 15 min' },
];

const MOCK_LOGS = [
  { id: '1', ts: '25 fév. 14:32', level: 'error', msg: 'Lightspeed API timeout — client Le Bistrot (id: 4)' },
  { id: '2', ts: '25 fév. 14:28', level: 'warn', msg: 'Rate limit approché — Lightspeed (180/200 req/min)' },
  { id: '3', ts: '25 fév. 14:15', level: 'info', msg: 'Sync complète — client La Terrasse' },
];

const MOCK_LLM = { status: 'ok' as const, latenceMs: 450, model: 'gpt-4o-mini' };
const MOCK_ALERT_EMAIL = 'Alerte technique envoyée à tech@flowstock.fr — 1 client impacté (Lightspeed).';

export default function AdminMoniteurPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold text-green-deep">Moniteur technique</h2>
        <p className="text-sm text-gray-warm">Statut des intégrations, LLM et alertes · Données mock</p>
      </div>

      {/* Statut intégrations POS */}
      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="flex items-center gap-2 font-display text-lg font-bold text-green-deep">
          <Link2 className="h-5 w-5" />
          Intégrations POS
        </h3>
        <div className="mt-4 space-y-3">
          {MOCK_POS_STATUS.map((pos) => (
            <div
              key={pos.name}
              className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-gray-100 bg-gray-50 p-4"
            >
              <div className="flex items-center gap-3">
                <span
                  className={`h-3 w-3 rounded-full ${
                    pos.status === 'ok' ? 'bg-green-mid' : 'bg-red-alert'
                  }`}
                />
                <span className="font-medium text-charcoal">{pos.name}</span>
              </div>
              <div className="flex gap-6 text-sm">
                <span className="text-gray-warm">
                  Latence : <strong className="text-charcoal">{pos.latenceMs} ms</strong>
                </span>
                <span className="text-gray-warm">
                  Taux d&apos;erreur : <strong className="text-charcoal">{pos.tauxErreur} %</strong>
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Clients impactés */}
      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="flex items-center gap-2 font-display text-lg font-bold text-green-deep">
          <AlertTriangle className="h-5 w-5" />
          Clients impactés
        </h3>
        {MOCK_CLIENTS_IMPACTES.length === 0 ? (
          <p className="mt-4 text-sm text-gray-warm">Aucun client impacté actuellement.</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {MOCK_CLIENTS_IMPACTES.map((c) => (
              <li
                key={c.id}
                className="flex items-center justify-between rounded-lg border border-orange-warn/30 bg-orange-warn/5 px-4 py-3"
              >
                <span className="font-medium text-charcoal">{c.nom}</span>
                <div className="text-right text-sm">
                  <p className="text-orange-warn">{c.erreur}</p>
                  <p className="text-gray-warm">{c.depuis}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Logs erreurs */}
      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="font-display text-lg font-bold text-green-deep">Logs récents</h3>
        <ul className="mt-4 space-y-2">
          {MOCK_LOGS.map((log) => (
            <li
              key={log.id}
              className={`rounded-lg border px-4 py-2 font-mono text-xs ${
                log.level === 'error'
                  ? 'border-red-alert/30 bg-red-alert/5 text-red-alert'
                  : log.level === 'warn'
                    ? 'border-orange-warn/30 bg-orange-warn/5 text-orange-warn'
                    : 'border-gray-100 bg-gray-50 text-gray-warm'
              }`}
            >
              <span className="text-charcoal/70">{log.ts}</span> [{log.level}] {log.msg}
            </li>
          ))}
        </ul>
      </section>

      {/* Statut LLM */}
      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="flex items-center gap-2 font-display text-lg font-bold text-green-deep">
          <Cpu className="h-5 w-5" />
          Service IA / LLM
        </h3>
        <div className="mt-4 flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-2">
            <span
              className={`h-3 w-3 rounded-full ${
                MOCK_LLM.status === 'ok' ? 'bg-green-mid' : 'bg-red-alert'
              }`}
            />
            <span className="font-medium text-charcoal">
              {MOCK_LLM.status === 'ok' ? 'Opérationnel' : 'Indisponible'}
            </span>
          </div>
          <span className="text-sm text-gray-warm">Latence moyenne : {MOCK_LLM.latenceMs} ms</span>
          <span className="text-sm text-gray-warm">Modèle : {MOCK_LLM.model}</span>
        </div>
      </section>

      {/* Alerte email (texte UI) */}
      <section className="rounded-xl border border-orange-warn/30 bg-orange-warn/10 p-6">
        <h3 className="flex items-center gap-2 font-display text-lg font-bold text-green-deep">
          <Mail className="h-5 w-5" />
          Alertes email
        </h3>
        <p className="mt-4 text-sm text-charcoal">{MOCK_ALERT_EMAIL}</p>
        <p className="mt-2 text-xs text-gray-warm">
          Dernière alerte envoyée : aujourd&apos;hui 14:32 (mock).
        </p>
      </section>
    </div>
  );
}
