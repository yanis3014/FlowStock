'use client';

import { ChevronUp, ChevronDown } from 'lucide-react';

export interface DataTableColumn<T> {
  key: string;
  label: string;
  sortKey?: keyof T | string;
  render?: (item: T) => React.ReactNode;
  className?: string;
}

export interface PaginationState {
  page: number;
  limit: number;
  total: number;
  total_pages?: number;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  getRowId: (item: T) => string;
  sortKey?: string | null;
  sortOrder?: 'asc' | 'desc';
  onSort?: (key: string) => void;
  pagination?: PaginationState;
  onPageChange?: (page: number) => void;
  emptyMessage?: string;
  renderActions?: (item: T) => React.ReactNode;
}

export function DataTable<T extends object>({
  columns,
  data,
  getRowId,
  sortKey = null,
  sortOrder = 'asc',
  onSort,
  pagination,
  onPageChange,
  emptyMessage = 'Aucune donnée',
  renderActions,
}: DataTableProps<T>) {
  const getCellValue = (item: T, col: DataTableColumn<T>): React.ReactNode => {
    if (col.render) return col.render(item);
    const key = col.key as keyof T;
    const val = item[key];
    if (val == null) return '—';
    if (typeof val === 'string' || typeof val === 'number') return String(val);
    return '—';
  };

  return (
    <div className="overflow-hidden rounded-xl border border-charcoal/8 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-charcoal/5">
          <thead className="bg-cream/50">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-charcoal/50 ${col.className ?? ''}`}
                >
                  {col.sortKey != null && onSort ? (
                    <button
                      type="button"
                      onClick={() => onSort(String(col.sortKey))}
                      className="flex items-center gap-1 hover:text-charcoal transition-colors"
                    >
                      {col.label}
                      {sortKey === col.sortKey ? (
                        sortOrder === 'asc' ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )
                      ) : (
                        <span className="inline-block h-4 w-4" />
                      )}
                    </button>
                  ) : (
                    col.label
                  )}
                </th>
              ))}
              {renderActions && (
                <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wide text-charcoal/50">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-charcoal/5 bg-white">
            {data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (renderActions ? 1 : 0)}
                  className="px-5 py-8 text-center text-sm text-charcoal/40"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((item) => (
                <tr
                  key={getRowId(item)}
                  className="transition-colors hover:bg-cream/30"
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`whitespace-nowrap px-5 py-4 text-sm text-charcoal ${col.className ?? ''}`}
                    >
                      {getCellValue(item, col)}
                    </td>
                  ))}
                  {renderActions && (
                    <td className="whitespace-nowrap px-5 py-4 text-right text-sm">
                      {renderActions(item)}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {pagination && onPageChange && pagination.total_pages != null && pagination.total_pages > 1 && (
        <div className="flex items-center justify-between border-t border-charcoal/8 bg-cream/30 px-5 py-3">
          <p className="text-sm text-charcoal/50">
            Page {pagination.page} / {pagination.total_pages} ({pagination.total} au total)
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onPageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="rounded-lg border border-charcoal/15 bg-white px-3 py-1.5 text-sm text-charcoal disabled:opacity-50 hover:bg-cream/50 transition-colors"
            >
              Précédent
            </button>
            <button
              type="button"
              onClick={() => onPageChange(pagination.page + 1)}
              disabled={pagination.page >= (pagination.total_pages ?? 1)}
              className="rounded-lg border border-charcoal/15 bg-white px-3 py-1.5 text-sm text-charcoal disabled:opacity-50 hover:bg-cream/50 transition-colors"
            >
              Suivant
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
