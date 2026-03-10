'use client';

import type { ComponentType } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const Rc = {
  AreaChart: AreaChart as unknown as ComponentType<any>,
  Area: Area as unknown as ComponentType<any>,
  XAxis: XAxis as unknown as ComponentType<any>,
  YAxis: YAxis as unknown as ComponentType<any>,
  Tooltip: Tooltip as unknown as ComponentType<any>,
  ResponsiveContainer: ResponsiveContainer as unknown as ComponentType<any>,
};

const MOCK_MRR_DATA = Array.from({ length: 13 }, (_, i) => ({
  month: `${i + 1}/12`,
  mrr: 12000 + i * 800 + Math.random() * 500,
}));

const MOCK_KPIS = {
  mrr: 28400,
  arr: 340800,
  clientsActifs: 42,
  churnMois: 2,
};

const MOCK_NOUVEAUX = { jour: 1, semaine: 5, starter: 3, pro: 2 };
const MOCK_CONVERSION = 32;
const MOCK_ALERTES = [
  { type: 'churn', msg: '3 clients sans activité depuis 7j' },
  { type: 'pos', msg: 'Erreur API POS — Client Le Bistrot' },
  { type: 'paiement', msg: 'Échec paiement — Restaurant La Table' },
];
const MOCK_TOP5 = [
  { name: 'Le Comptoir', couverts: 420 },
  { name: 'La Terrasse', couverts: 380 },
  { name: 'Chez Marie', couverts: 310 },
  { name: 'Le Bistrot', couverts: 290 },
  { name: 'La Table', couverts: 265 },
];

export default function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold text-green-deep">Dashboard Admin — Vue générale</h2>
        <p className="text-sm text-gray-warm">Données mock · Back-office fondateur</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-warm">MRR total</p>
          <p className="mt-1 font-display text-2xl font-extrabold text-green-deep">
            {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(MOCK_KPIS.mrr)}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-warm">ARR</p>
          <p className="mt-1 font-display text-2xl font-extrabold text-green-deep">
            {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(MOCK_KPIS.arr)}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-warm">Clients actifs</p>
          <p className="mt-1 font-display text-2xl font-extrabold text-green-deep">{MOCK_KPIS.clientsActifs}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-warm">Churn ce mois</p>
          <p className="mt-1 font-display text-2xl font-extrabold text-red-alert">{MOCK_KPIS.churnMois}</p>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h3 className="mb-4 font-display text-sm font-bold text-green-deep">MRR sur 90 jours</h3>
        <div className="h-64">
          <Rc.ResponsiveContainer width="100%" height="100%">
            <Rc.AreaChart data={MOCK_MRR_DATA}>
              <defs>
                <linearGradient id="mrrGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2D6A4F" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#2D6A4F" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Rc.XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <Rc.YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `${v / 1000}k€`} />
              <Rc.Tooltip formatter={(v: number) => [`${(v / 1000).toFixed(1)} k€`, 'MRR']} />
              <Rc.Area type="monotone" dataKey="mrr" stroke="#2D6A4F" strokeWidth={2} fill="url(#mrrGrad)" />
            </Rc.AreaChart>
          </Rc.ResponsiveContainer>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h3 className="mb-3 font-display text-sm font-bold text-green-deep">Nouveaux inscrits</h3>
          <p className="text-2xl font-display font-bold text-charcoal">Aujourd&apos;hui : {MOCK_NOUVEAUX.jour} · Cette semaine : {MOCK_NOUVEAUX.semaine}</p>
          <p className="mt-2 text-sm text-gray-warm">Starter : {MOCK_NOUVEAUX.starter} · Pro : {MOCK_NOUVEAUX.pro}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h3 className="mb-3 font-display text-sm font-bold text-green-deep">Conversion essai → payant</h3>
          <p className="text-2xl font-display font-bold text-charcoal">{MOCK_CONVERSION}%</p>
          <p className="mt-1 text-sm text-gray-warm">Objectif &gt; 30%</p>
        </div>
      </div>

      <div className="rounded-xl border border-orange-warn/30 bg-orange-warn/5 p-5">
        <h3 className="mb-3 font-display text-sm font-bold text-green-deep">Alertes internes</h3>
        <ul className="space-y-2">
          {MOCK_ALERTES.map((a, i) => (
            <li key={i} className="flex items-center gap-2 text-sm">
              <span className="h-2 w-2 rounded-full bg-orange-warn" />
              {a.msg}
            </li>
          ))}
        </ul>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h3 className="mb-3 font-display text-sm font-bold text-green-deep">Top 5 restaurants les plus actifs</h3>
          <ul className="space-y-2">
            {MOCK_TOP5.map((r, i) => (
              <li key={r.name} className="flex justify-between rounded-lg bg-cream/50 px-3 py-2 text-sm">
                <span className="font-medium text-charcoal">{i + 1}. {r.name}</span>
                <span className="text-gray-warm">{r.couverts} couverts</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h3 className="mb-3 font-display text-sm font-bold text-green-deep">Récap hebdomadaire</h3>
          <ul className="space-y-1 text-sm text-charcoal">
            <li>Croissance MRR : +4,2%</li>
            <li>Churn : 2 résiliations</li>
            <li>Tickets support : 3 ouverts</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
