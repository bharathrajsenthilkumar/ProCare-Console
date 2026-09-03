import React, { useState } from 'react';
import { GripVertical } from 'lucide-react';

export interface Column<T> {
  header: React.ReactNode;
  accessor: keyof T | ((row: T) => React.ReactNode);
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T) => string | number;
  emptyState?: React.ReactNode;
  onReorder?: (newData: T[]) => void;
  isDraggable?: boolean;
}

export function DataTable<T>({ 
  columns, 
  data, 
  keyExtractor, 
  emptyState,
  onReorder,
  isDraggable = false
}: DataTableProps<T>) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  if (data.length === 0) {
    return <>{emptyState}</>;
  }

  const handleDragStart = (e: React.DragEvent<HTMLTableRowElement>, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e: React.DragEvent<HTMLTableRowElement>, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLTableRowElement>, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const updatedData = [...data];
    const [movedItem] = updatedData.splice(draggedIndex, 1);
    updatedData.splice(targetIndex, 0, movedItem);

    setDraggedIndex(null);
    setDragOverIndex(null);

    if (onReorder) {
      onReorder(updatedData);
    }
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  return (
    <div className="w-full overflow-x-auto rounded-xl border border-slate-200/80 shadow-sm bg-white dark:bg-slate-900 dark:border-slate-800 animate-fade-in">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-slate-50/70 border-b border-slate-200/80 dark:bg-slate-950/40 dark:border-slate-800 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider select-none">
            {isDraggable && (
              <th className="w-10 px-3 py-3.5 text-center text-slate-400 dark:text-slate-600">
                <span className="sr-only">Reorder</span>
              </th>
            )}
            {columns.map((col, index) => (
              <th key={index} className={`px-5 py-3.5 dark:text-slate-350 dark:border-slate-800 ${col.className || ''}`}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm text-slate-700 dark:text-slate-150">
          {data.map((row, index) => {
            const isDragging = draggedIndex === index;
            const isDragOver = dragOverIndex === index;

            return (
              <tr 
                key={keyExtractor(row)} 
                draggable={isDraggable}
                onDragStart={(e) => isDraggable && handleDragStart(e, index)}
                onDragOver={(e) => isDraggable && handleDragOver(e, index)}
                onDrop={(e) => isDraggable && handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                className={`transition-all duration-150 ${
                  isDraggable ? 'cursor-grab active:cursor-grabbing select-none' : ''
                } ${
                  isDragging 
                    ? 'opacity-30 bg-sky-50 dark:bg-sky-950/50 scale-[0.99]' 
                    : isDragOver 
                    ? 'bg-sky-50/50 dark:bg-sky-950/30 border-t-2 border-sky-500' 
                    : 'hover:bg-slate-50/40 dark:hover:bg-slate-800/40'
                }`}
              >
                {isDraggable && (
                  <td className="px-3 py-4 text-center align-middle text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300">
                    <div className="flex items-center justify-center p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                      <GripVertical className="h-4 w-4" />
                    </div>
                  </td>
                )}
                {columns.map((col, colIdx) => {
                  const content =
                    typeof col.accessor === 'function'
                      ? col.accessor(row)
                      : (row[col.accessor] as React.ReactNode);
                  return (
                    <td key={colIdx} className={`px-5 py-4 align-middle dark:text-slate-200 dark:border-slate-800 ${col.className || ''}`}>
                      {content}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
