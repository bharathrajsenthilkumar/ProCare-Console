import React from 'react';

export interface Column<T> {
  header: string;
  accessor: keyof T | ((row: T) => React.ReactNode);
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T) => string | number;
  emptyState?: React.ReactNode;
}

export function DataTable<T>({ columns, data, keyExtractor, emptyState }: DataTableProps<T>) {
  if (data.length === 0) {
    return <>{emptyState}</>;
  }

  return (
    <div className="w-full overflow-x-auto rounded-xl border border-slate-200/80 shadow-sm bg-white animate-fade-in">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-slate-50/70 border-b border-slate-200/80 text-xs font-bold text-slate-500 uppercase tracking-wider select-none">
            {columns.map((col, index) => (
              <th key={index} className={`px-5 py-3.5 ${col.className || ''}`}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
          {data.map((row) => (
            <tr key={keyExtractor(row)} className="hover:bg-slate-50/30 transition-colors">
              {columns.map((col, index) => {
                const content =
                  typeof col.accessor === 'function'
                    ? col.accessor(row)
                    : (row[col.accessor] as React.ReactNode);
                return (
                  <td key={index} className={`px-5 py-4 align-middle ${col.className || ''}`}>
                    {content}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
