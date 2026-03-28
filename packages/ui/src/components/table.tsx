'use client';

import type { ReactNode } from 'react';

export interface TableColumn<T> {
  key: string;
  header: ReactNode;
  render?: (row: T, rowIndex: number) => ReactNode;
}

export interface DataTableProps<T> {
  columns: TableColumn<T>[];
  data: T[];
  emptyMessage?: string;
  onRowClick?: (row: T, rowIndex: number) => void;
  className?: string;
  tableClassName?: string;
}

function cellValue<T>(row: T, key: string): ReactNode {
  if (row != null && typeof row === 'object' && key in row) {
    const v = (row as Record<string, unknown>)[key];
    if (v == null) return '—';
    if (
      typeof v === 'string' ||
      typeof v === 'number' ||
      typeof v === 'boolean'
    ) {
      return String(v);
    }
  }
  return '—';
}

export function DataTable<T>({
  columns,
  data,
  emptyMessage = 'No data to display.',
  onRowClick,
  className = '',
  tableClassName = '',
}: DataTableProps<T>) {
  const clickable = onRowClick != null;

  return (
    <div
      className={`overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm ${className}`}
    >
      <div className="overflow-x-auto">
        <table className={`w-full min-w-[32rem] border-collapse text-left text-sm ${tableClassName}`}>
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/90">
              {columns.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500"
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-12 text-center text-sm text-slate-500"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row, rowIndex) => (
                <tr
                  key={rowIndex}
                  onClick={
                    clickable
                      ? () => {
                          onRowClick?.(row, rowIndex);
                        }
                      : undefined
                  }
                  className={`border-b border-slate-100 last:border-b-0 ${
                    clickable
                      ? 'cursor-pointer transition-colors hover:bg-slate-50'
                      : 'hover:bg-slate-50/60'
                  }`}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className="whitespace-nowrap px-4 py-3 text-slate-700"
                    >
                      {col.render != null
                        ? col.render(row, rowIndex)
                        : cellValue(row, col.key)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
