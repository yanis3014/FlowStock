import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Package, AlertTriangle, CheckCircle, TrendingUp } from 'lucide-react';
import type { Product } from '@bmad/shared';

interface Stats {
  total: number;
  ok: number;
  low: number;
  critical: number;
}

export default function DashboardPage() {
  const { user, tenant } = useAuth();
  const [stats, setStats] = useState<Stats>({ total: 0, ok: 0, low: 0, critical: 0 });
  const [recentProducts, setRecentProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await apiFetch<{
          success: boolean;
          data: Product[];
          pagination: { total: number };
        }>('/products?limit=100');
        const products = res.data;
        setStats({
          total: res.pagination.total,
          ok: products.filter((p) => p.stock_status === 'ok').length,
          low: products.filter((p) => p.stock_status === 'low').length,
          critical: products.filter((p) => p.stock_status === 'critical').length,
        });
        setRecentProducts(products.slice(0, 5));
      } catch {
        // empty state
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const cards = [
    {
      label: 'Total produits',
      value: stats.total,
      icon: Package,
      color: 'bg-indigo-50 text-indigo-600',
    },
    {
      label: 'Stock OK',
      value: stats.ok,
      icon: CheckCircle,
      color: 'bg-green-50 text-green-600',
    },
    {
      label: 'Stock bas',
      value: stats.low,
      icon: TrendingUp,
      color: 'bg-yellow-50 text-yellow-600',
    },
    {
      label: 'Stock critique',
      value: stats.critical,
      icon: AlertTriangle,
      color: 'bg-red-50 text-red-600',
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Bonjour, {user?.first_name} !
        </h1>
        <p className="text-sm text-gray-500">{tenant?.company_name}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        {cards.map(({ label, value, icon: Icon, color }) => (
          <div
            key={label}
            className="rounded-xl border border-gray-200 bg-white p-5"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-500">{label}</span>
              <div className={`rounded-lg p-2 ${color}`}>
                <Icon className="h-5 w-5" />
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900">{value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Produits récents</h2>
        </div>
        {recentProducts.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-gray-500">
            Aucun produit pour l'instant.{' '}
            <a href="/products/new" className="text-indigo-600 hover:text-indigo-500 font-medium">
              Ajouter un produit
            </a>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="px-6 py-3 text-left font-medium text-gray-500">SKU</th>
                  <th className="px-6 py-3 text-left font-medium text-gray-500">Nom</th>
                  <th className="px-6 py-3 text-right font-medium text-gray-500">Quantité</th>
                  <th className="px-6 py-3 text-left font-medium text-gray-500">Statut</th>
                </tr>
              </thead>
              <tbody>
                {recentProducts.map((p) => (
                  <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-6 py-3 font-mono text-xs text-gray-600">{p.sku}</td>
                    <td className="px-6 py-3 font-medium text-gray-900">{p.name}</td>
                    <td className="px-6 py-3 text-right">{p.quantity}</td>
                    <td className="px-6 py-3">
                      <StatusBadge status={p.stock_status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    ok: 'bg-green-100 text-green-700',
    low: 'bg-yellow-100 text-yellow-700',
    critical: 'bg-red-100 text-red-700',
  };
  const labels: Record<string, string> = {
    ok: 'OK',
    low: 'Bas',
    critical: 'Critique',
  };
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status] ?? 'bg-gray-100 text-gray-700'}`}>
      {labels[status] ?? status}
    </span>
  );
}
