import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '@/lib/api';
import { Plus, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Product } from '@bmad/shared';

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    loadProducts();
  }, [page]);

  async function loadProducts() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (search) params.set('search', search);
      const res = await apiFetch<{
        success: boolean;
        data: Product[];
        pagination: { page: number; limit: number; total: number; total_pages: number };
      }>(`/products?${params}`);
      setProducts(res.data);
      setTotalPages(res.pagination.total_pages);
      setTotal(res.pagination.total);
    } catch {
      // keep current
    } finally {
      setLoading(false);
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadProducts();
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Produits</h1>
          <p className="text-sm text-gray-500">{total} produit(s) au total</p>
        </div>
        <Link
          to="/products/new"
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Ajouter
        </Link>
      </div>

      <form onSubmit={handleSearch} className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par nom ou SKU..."
            className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-4 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
          />
        </div>
      </form>

      <div className="rounded-xl border border-gray-200 bg-white">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
          </div>
        ) : products.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <p className="text-sm text-gray-500 mb-3">Aucun produit trouvé</p>
            <Link
              to="/products/new"
              className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
            >
              Ajouter votre premier produit
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-6 py-3 text-left font-medium text-gray-500">SKU</th>
                  <th className="px-6 py-3 text-left font-medium text-gray-500">Nom</th>
                  <th className="px-6 py-3 text-left font-medium text-gray-500">Unité</th>
                  <th className="px-6 py-3 text-right font-medium text-gray-500">Quantité</th>
                  <th className="px-6 py-3 text-right font-medium text-gray-500">Prix achat</th>
                  <th className="px-6 py-3 text-right font-medium text-gray-500">Prix vente</th>
                  <th className="px-6 py-3 text-left font-medium text-gray-500">Statut</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-3.5 font-mono text-xs text-gray-600">{p.sku}</td>
                    <td className="px-6 py-3.5">
                      <div>
                        <p className="font-medium text-gray-900">{p.name}</p>
                        {p.description && (
                          <p className="text-xs text-gray-400 truncate max-w-xs">
                            {p.description}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-3.5 text-gray-600">{p.unit}</td>
                    <td className="px-6 py-3.5 text-right font-medium">{p.quantity}</td>
                    <td className="px-6 py-3.5 text-right text-gray-600">
                      {p.purchase_price != null ? `${p.purchase_price.toFixed(2)} €` : '—'}
                    </td>
                    <td className="px-6 py-3.5 text-right text-gray-600">
                      {p.selling_price != null ? `${p.selling_price.toFixed(2)} €` : '—'}
                    </td>
                    <td className="px-6 py-3.5">
                      <StatusBadge status={p.stock_status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-200 px-6 py-3">
            <p className="text-sm text-gray-500">
              Page {page} sur {totalPages}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-lg border border-gray-300 p-2 text-gray-600 hover:bg-gray-50 disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="rounded-lg border border-gray-300 p-2 text-gray-600 hover:bg-gray-50 disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
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
