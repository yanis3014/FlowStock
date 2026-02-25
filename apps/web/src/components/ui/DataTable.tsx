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
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-600 ${col.className ?? ''}`}
                >
                  {col.sortKey != null && onSort ? (
                    <button
                      type="button"
                      onClick={() => onSort(String(col.sortKey))}
                      className="flex items-center gap-1 hover:text-gray-900"
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
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-600">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (renderActions ? 1 : 0)}
                  className="px-4 py-8 text-center text-gray-500"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((item) => (
                <tr
                  key={getRowId(item)}
                  className="transition-colors hover:bg-gray-50"
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`whitespace-nowrap px-4 py-3 text-sm text-gray-800 ${col.className ?? ''}`}
                    >
                      {getCellValue(item, col)}
                    </td>
                  ))}
                  {renderActions && (
                    <td className="whitespace-nowrap px-4 py-3 text-right text-sm">
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
        <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50 px-4 py-2">
          <p className="text-sm text-gray-600">
            Page {pagination.page} / {pagination.total_pages} ({pagination.total} au total)
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onPageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="rounded border border-gray-300 bg-white px-3 py-1 text-sm disabled:opacity-50 hover:bg-gray-100"
            >
              Précédent
            </button>
            <button
              type="button"
              onClick={() => onPageChange(pagination.page + 1)}
              disabled={pagination.page >= (pagination.total_pages ?? 1)}
              className="rounded border border-gray-300 bg-white px-3 py-1 text-sm disabled:opacity-50 hover:bg-gray-100"
            >
              Suivant
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
