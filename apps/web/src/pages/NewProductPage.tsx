import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { apiFetch, ApiError } from '@/lib/api';
import { ArrowLeft } from 'lucide-react';

export default function NewProductPage() {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    sku: '',
    name: '',
    description: '',
    unit: 'piece',
    quantity: '0',
    min_quantity: '',
    purchase_price: '',
    selling_price: '',
    lead_time_days: '7',
  });

  const update = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await apiFetch('/products', {
        method: 'POST',
        body: {
          sku: form.sku,
          name: form.name,
          description: form.description || null,
          unit: form.unit,
          quantity: Number(form.quantity) || 0,
          min_quantity: form.min_quantity ? Number(form.min_quantity) : null,
          purchase_price: form.purchase_price ? Number(form.purchase_price) : null,
          selling_price: form.selling_price ? Number(form.selling_price) : null,
          lead_time_days: Number(form.lead_time_days) || 7,
        },
      });
      navigate('/products');
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Erreur lors de la création');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <Link
          to="/products"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-3"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour aux produits
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Nouveau produit</h1>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-xl border border-gray-200 bg-white p-6 space-y-5"
      >
        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">SKU *</label>
            <input
              required
              value={form.sku}
              onChange={update('sku')}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
              placeholder="EX: PRD-001"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nom *</label>
            <input
              required
              value={form.name}
              onChange={update('name')}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            value={form.description}
            onChange={update('description') as React.ChangeEventHandler<HTMLTextAreaElement>}
            rows={2}
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none resize-none"
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Unité</label>
            <select
              value={form.unit}
              onChange={update('unit')}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
            >
              <option value="piece">Pièce</option>
              <option value="kg">Kg</option>
              <option value="liter">Litre</option>
              <option value="box">Boîte</option>
              <option value="pack">Pack</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Quantité initiale</label>
            <input
              type="number"
              min="0"
              value={form.quantity}
              onChange={update('quantity')}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Quantité min.</label>
            <input
              type="number"
              min="0"
              value={form.min_quantity}
              onChange={update('min_quantity')}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
              placeholder="Optionnel"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Prix d'achat (€)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.purchase_price}
              onChange={update('purchase_price')}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
              placeholder="0.00"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Prix de vente (€)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.selling_price}
              onChange={update('selling_price')}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
              placeholder="0.00"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Délai (jours)</label>
            <input
              type="number"
              min="0"
              value={form.lead_time_days}
              onChange={update('lead_time_days')}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Link
            to="/products"
            className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Annuler
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Création...' : 'Créer le produit'}
          </button>
        </div>
      </form>
    </div>
  );
}
