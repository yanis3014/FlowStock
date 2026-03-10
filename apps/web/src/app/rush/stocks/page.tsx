'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { ArrowLeft, RefreshCw } from 'lucide-react';

type Level = 'red' | 'orange' | 'green';
type Category = 'all' | 'Viandes' | 'Poissons' | 'Légumes' | 'Desserts';

interface StockItem {
  id: string;
  name: string;
  quantity: string;
  unit: string;
  level: Level;
  levelPct: number;
  category: Category;
}

const MOCK_STOCKS: StockItem[] = [
  { id: '1', name: 'Saumon atlantique', quantity: '2', unit: 'portions', level: 'red', levelPct: 12, category: 'Poissons' },
  { id: '2', name: 'Filet de bœuf', quantity: '5', unit: 'portions', level: 'orange', levelPct: 28, category: 'Viandes' },
  { id: '3', name: 'Magret de canard', quantity: '3.4', unit: 'kg', level: 'green', levelPct: 65, category: 'Viandes' },
  { id: '4', name: 'Crème brûlée', quantity: '4', unit: 'portions', level: 'orange', levelPct: 25, category: 'Desserts' },
  { id: '5', name: 'Salade niçoise', quantity: '18', unit: 'portions', level: 'green', levelPct: 90, category: 'Légumes' },
  { id: '6', name: 'Burrata', quantity: '8', unit: 'pcs', level: 'green', levelPct: 80, category: 'Légumes' },
  { id: '7', name: 'Risotto', quantity: '6', unit: 'portions', level: 'green', levelPct: 55, category: 'Légumes' },
];

const CATEGORIES: Category[] = ['all', 'Viandes', 'Poissons', 'Légumes', 'Desserts'];

function levelColor(level: Level) {
  return level === 'red' ? 'bg-red-alert' : level === 'orange' ? 'bg-orange-warn' : 'bg-green-bright';
}

export default function RushStocksPage() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<Category>('all');
  const [cacheMin, setCacheMin] = useState(2);

  const filtered = useMemo(() => {
    let list = MOCK_STOCKS;
    if (category !== 'all') list = list.filter((i) => i.category === category);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((i) => i.name.toLowerCase().includes(q));
    }
    return list;
  }, [search, category]);

  return (
    <main
      className="flex min-h-screen min-h-dvh flex-col bg-[#0F1B19] px-4 pt-3 pb-6 font-body"
      style={{
        paddingTop: 'max(12px, env(safe-area-inset-top))',
        paddingLeft: 'max(16px, env(safe-area-inset-left))',
        paddingRight: 'max(16px, env(safe-area-inset-right))',
        paddingBottom: 'max(24px, env(safe-area-inset-bottom))',
      }}
      role="main"
    >
      <div className="mb-4 flex items-center justify-between">
        <Link
          href="/rush"
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-warm hover:text-cream"
        >
          <ArrowLeft className="h-4 w-4" />
          Alertes
        </Link>
        <p className="text-[11px] text-gray-warm">
          Données en cache — il y a {cacheMin} min
        </p>
      </div>

      <h1 className="font-display text-xl font-bold text-cream">Détail stock</h1>
      <p className="mb-4 text-xs text-gray-warm">Niveaux en temps réel</p>

      <input
        type="search"
        placeholder="Rechercher un ingrédient…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-3 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-cream placeholder-gray-warm focus:border-green-bright focus:outline-none"
      />

      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCategory(c)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${
              category === c
                ? 'bg-green-bright text-charcoal'
                : 'border border-white/20 text-gray-warm hover:border-green-bright/50'
            }`}
          >
            {c === 'all' ? 'Tous' : c}
          </button>
        ))}
      </div>

      <section className="flex-1 space-y-3 overflow-y-auto">
        {filtered.map((item) => (
          <article
            key={item.id}
            className="rounded-xl border border-white/10 bg-white/5 p-4"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="font-display font-bold text-cream">{item.name}</p>
                <p className="mt-1 text-2xl font-display font-extrabold text-cream">
                  {item.quantity} <span className="text-sm font-normal text-gray-warm">{item.unit}</span>
                </p>
              </div>
              <button
                type="button"
                className="shrink-0 rounded-lg border border-white/20 px-2 py-1 text-[10px] font-semibold text-gray-warm hover:bg-white/10"
              >
                Ajustement manuel
              </button>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
                <div
                  className={`h-full rounded-full ${levelColor(item.level)}`}
                  style={{ width: `${item.levelPct}%` }}
                />
              </div>
              <span className="text-[10px] text-gray-warm">{item.levelPct}%</span>
            </div>
          </article>
        ))}
      </section>

      <button
        type="button"
        onClick={() => setCacheMin((m) => (m === 0 ? 2 : 0))}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 py-2.5 text-sm text-gray-warm"
      >
        <RefreshCw className="h-4 w-4" />
        Rafraîchir
      </button>
    </main>
  );
}
