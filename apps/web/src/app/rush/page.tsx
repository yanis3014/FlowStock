'use client';

import Link from 'next/link';
import { useState } from 'react';

/**
 * Mode Rush — Priorité absolue (A.2)
 * Mobile-First, lisible en 2 secondes.
 * Esthétique "Mobile Rush Screen" du moodboard Warm Tech.
 */
export default function RushPage() {
  const now = new Date();
  const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  const [cacheMinutes] = useState(2);

  const alerts = [
    {
      id: '1',
      level: 'red' as const,
      icon: '🐟',
      name: 'Saumon atlantique',
      detail: '2 portions restantes',
      badge: 'CRITIQUE',
    },
    {
      id: '2',
      level: 'orange' as const,
      icon: '🥩',
      name: 'Filet de bœuf',
      detail: '5 portions · 6 tables en cours',
      badge: 'FAIBLE',
    },
    {
      id: '3',
      level: 'orange' as const,
      icon: '🍮',
      name: 'Crème brûlée',
      detail: '4 portions restantes',
      badge: 'FAIBLE',
    },
    {
      id: '4',
      level: 'green' as const,
      icon: '🥗',
      name: 'Salade niçoise',
      detail: 'Stock suffisant · 18 portions',
      badge: 'OK',
    },
  ];

  return (
    <main
      className="flex min-h-screen min-h-dvh flex-col bg-[#0F1B19] px-4 pt-3 pb-6 safe-area-padding font-body"
      style={{
        paddingTop: 'max(12px, env(safe-area-inset-top))',
        paddingLeft: 'max(16px, env(safe-area-inset-left))',
        paddingRight: 'max(16px, env(safe-area-inset-right))',
        paddingBottom: 'max(24px, env(safe-area-inset-bottom))',
      }}
      role="main"
    >
      {/* Notch */}
      <div
        className="mx-auto mb-4 h-1.5 w-20 rounded-full bg-white/15"
        aria-hidden
      />

      {/* Bandeau RUSH EN COURS + heure */}
      <header className="mb-3 flex items-center justify-between">
        <div
          className="inline-flex items-center gap-1.5 rounded-full border border-green-bright bg-green-bright/20 px-3 py-1.5 font-display text-[11px] font-semibold tracking-wide text-green-bright"
          aria-live="polite"
        >
          <span
            className="h-1.5 w-1.5 shrink-0 rounded-full bg-green-bright animate-rush-pulse"
            aria-hidden
          />
          RUSH EN COURS
        </div>
        <time className="font-display text-xs text-gray-warm" dateTime={timeStr}>
          {timeStr}
        </time>
      </header>

      <h1 className="font-display text-xl font-bold text-cream">Alertes Stock</h1>
      <p className="mb-2 text-xs text-gray-warm">14 tables · Service midi</p>
      <p className="mb-4 rounded-lg bg-white/5 px-3 py-2 text-[11px] text-gray-warm border border-white/10">
        Données en cache — dernière synchro il y a {cacheMinutes} min
      </p>

      {/* Alertes triées par criticité Rouge → Orange → Vert */}
      <section className="flex flex-1 flex-col gap-2.5 overflow-y-auto" aria-label="Alertes triées par criticité">
        {alerts.map((a) => (
          <article
            key={a.id}
            role={a.level === 'red' ? 'alert' : undefined}
            className={`flex items-center gap-3 rounded-xl px-4 py-3.5 ${
              a.level === 'red'
                ? 'border border-red-alert/40 bg-red-alert/10'
                : a.level === 'orange'
                  ? 'border border-orange-warn/40 bg-orange-warn/10'
                  : 'border border-green-bright/30 bg-green-bright/10'
            }`}
          >
            <span className="text-lg leading-none" aria-hidden>
              {a.icon}
            </span>
            <div className="min-w-0 flex-1">
              <span className="block font-display text-sm font-bold text-cream">
                {a.name}
              </span>
              <span className="mt-0.5 block text-[11px] text-gray-warm">
                {a.detail}
              </span>
            </div>
            <span
              className={`shrink-0 rounded-md px-2 py-1 font-display text-[11px] font-bold ${
                a.level === 'red'
                  ? 'bg-red-alert/30 text-red-200'
                  : a.level === 'orange'
                    ? 'bg-orange-warn/30 text-amber-200'
                    : 'bg-green-bright/30 text-green-light'
              }`}
            >
              {a.badge}
            </span>
          </article>
        ))}
      </section>

      <div className="mt-5 flex flex-col gap-2">
        <button
          type="button"
          className="w-full rounded-xl bg-green-mid py-3.5 font-display text-sm font-bold tracking-wide text-white transition-opacity hover:opacity-95"
        >
          ✓ Tout acquitter
        </button>
        <Link
          href="/rush/stocks"
          className="w-full rounded-xl border border-white/10 bg-transparent py-3 font-body text-[13px] font-medium text-gray-warm transition-colors hover:text-cream text-center"
        >
          Voir tous les stocks →
        </Link>
      </div>
    </main>
  );
}
