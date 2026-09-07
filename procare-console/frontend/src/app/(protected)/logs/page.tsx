'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { 
  FileText, 
  ChevronLeft, 
  ChevronRight, 
  AlertCircle,
  X,
  Filter,
  Activity,
  Download,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingState } from '@/components/ui/LoadingState';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { DataTable, Column } from '@/components/ui/DataTable';

interface SystemLog {
  id: string;
  created_at: string;
  level: string;
  action: string;
  admin_email: string;
  details: any;
}

export default function LogsPage() {
  const { session } = useAuth();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || (typeof window !== 'undefined' ? '/api/v1' : 'http://localhost:8001/api/v1');
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination & Filter States
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [levelFilter, setLevelFilter] = useState('');
  const limit = 10;

  // Selection & Action States
  const [selectedLogIds, setSelectedLogIds] = useState<string[]>([]);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  // Selected Log for details modal
  const [selectedLog, setSelectedLog] = useState<SystemLog | null>(null);

  // Fetch System Logs
  const fetchLogs = async () => {
    if (!session) return;
    setLoading(true);
    setError(null);
    setSelectedLogIds([]); // Reset selection on fetch

    let url = `${apiUrl}/system-logs?page=${page}&limit=${limit}`;
    if (levelFilter) {
      url += `&level=${encodeURIComponent(levelFilter)}`;
    }

    try {
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setLogs(data.logs);
        setTotal(data.total);
      } else {
        setError('Failed to retrieve system diagnostics logs.');
      }
    } catch (err) {
      setError('Network error: Unable to reach backend server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [session, page, levelFilter]);

  // Reset pagination when level filter changes
  useEffect(() => {
    setPage(1);
  }, [levelFilter]);

  const handleSelectLog = (id: string) => {
    setSelectedLogIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedLogIds.length === logs.length) {
      setSelectedLogIds([]);
    } else {
      setSelectedLogIds(logs.map((l) => l.id));
    }
  };

  const handleExportCSV = async () => {
    if (!session) return;
    setExportLoading(true);
    try {
      const response = await fetch(`${apiUrl}/system-logs/export`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `system-logs-export-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } else {
        alert('Failed to export system logs.');
      }
    } catch (err) {
      alert('Network error while exporting system logs.');
    } finally {
      setExportLoading(false);
    }
  };

  const handleDeleteSelected = async () => {
    if (!session || selectedLogIds.length === 0) return;
    setDeleteLoading(true);
    try {
      const response = await fetch(`${apiUrl}/system-logs`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ ids: selectedLogIds }),
      });
      if (response.ok) {
        setSelectedLogIds([]);
        setIsDeleteConfirmOpen(false);
        fetchLogs();
      } else {
        alert('Failed to delete selected system logs.');
      }
    } catch (err) {
      alert('Network error while deleting system logs.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const columns: Column<SystemLog>[] = [
    {
      header: (
        <input
          type="checkbox"
          checked={logs.length > 0 && selectedLogIds.length === logs.length}
          onChange={handleSelectAll}
          className="rounded border-slate-300 text-slate-800 focus:ring-slate-500 w-4 h-4 cursor-pointer"
        />
      ),
      accessor: (row) => (
        <input
          type="checkbox"
          checked={selectedLogIds.includes(row.id)}
          onChange={() => handleSelectLog(row.id)}
          className="rounded border-slate-300 text-slate-800 focus:ring-slate-500 w-4 h-4 cursor-pointer"
          onClick={(e) => e.stopPropagation()}
        />
      ),
      className: 'w-12 text-center',
    },
    {
      header: 'Timestamp',
      accessor: (row) => {
        try {
          return new Date(row.created_at).toLocaleString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
          });
        } catch {
          return row.created_at;
        }
      },
      className: 'text-slate-500 dark:text-slate-400 font-medium text-xs',
    },
    {
      header: 'Level',
      accessor: (row) => {
        const lvl = (row.level || '').toUpperCase();
        let variant: 'default' | 'success' | 'warning' | 'danger' | 'info' = 'default';
        if (lvl === 'ERROR') variant = 'danger';
        else if (lvl === 'WARNING' || lvl === 'WARN') variant = 'warning';
        else if (lvl === 'INFO') variant = 'info';
        
        return (
          <Badge variant={variant}>
            {lvl}
          </Badge>
        );
      },
    },
    {
      header: 'Action',
      accessor: (row) => (
        <span className="font-semibold text-slate-800 dark:text-slate-100">
          {row.action}
        </span>
      ),
      className: 'max-w-xs truncate',
    },
    {
      header: 'Admin',
      accessor: (row) => row.admin_email || 'System',
      className: 'text-slate-600 dark:text-slate-350 font-medium text-xs',
    },
    {
      header: 'Details / Payload',
      accessor: (row) => {
        const detailsObj = row.details;
        const detailsStr = detailsObj ? JSON.stringify(detailsObj) : 'N/A';
        const displayStr = detailsStr.length > 40 ? `${detailsStr.substring(0, 40)}...` : detailsStr;
        return (
          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] text-slate-400 dark:text-slate-450 max-w-xs truncate">
              {displayStr}
            </span>
            {detailsObj && (
              <Button 
                variant="outline" 
                size="sm" 
                className="px-2 py-0.5 h-6 text-[10px] bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:bg-slate-100/50 dark:hover:bg-slate-850/50 text-slate-700 dark:text-slate-300"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedLog(row);
                }}
              >
                Inspect
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader 
        title="Diagnostics & Activity Logs" 
        description="Inspect administrative activity histories, security login audits, and server error diagnostics logs."
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              disabled={exportLoading || logs.length === 0}
              className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 shadow-xs"
            >
              <Download className="w-4 h-4 mr-1.5" />
              {exportLoading ? 'Exporting...' : 'Export CSV'}
            </Button>
            {selectedLogIds.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsDeleteConfirmOpen(true)}
                className="bg-rose-50 border-rose-200 hover:bg-rose-100 text-rose-700 shadow-xs"
              >
                <Trash2 className="w-4 h-4 mr-1.5" />
                Delete Selected ({selectedLogIds.length})
              </Button>
            )}
            <div className="text-xs text-slate-500 dark:text-slate-400 font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-lg shadow-xs flex items-center">
              Total Logs: <span className="text-slate-800 dark:text-slate-200 ml-1">{total}</span>
            </div>
          </div>
        }
      />

      {/* Filter Toolbar */}
      <Card>
        <CardContent className="!p-6 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-400" />
            <span className="text-xs text-slate-400 font-semibold uppercase">Filter Level:</span>
          </div>
          <div className="w-full sm:w-48 relative">
            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
              className="block w-full border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-100 cursor-pointer"
            >
              <option value="">All Log Levels</option>
              <option value="INFO">INFO</option>
              <option value="WARNING">WARNING</option>
              <option value="ERROR">ERROR</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Area */}
      {loading ? (
        <LoadingState message="Loading diagnostics logs..." />
      ) : error ? (
        <div className="bg-red-50 dark:bg-rose-950/20 border border-red-200 dark:border-rose-800/80 rounded-xl p-6 flex items-start gap-3 max-w-md mx-auto">
          <AlertCircle className="h-6 w-6 text-red-600 dark:text-rose-400 shrink-0" />
          <div>
            <h4 className="font-bold text-red-800 dark:text-rose-200 text-sm">System Database Error</h4>
            <p className="text-xs text-red-700 dark:text-rose-300 mt-1 leading-relaxed">{error}</p>
          </div>
        </div>
      ) : logs.length === 0 ? (
        <EmptyState 
          icon={FileText}
          title="No diagnostics logs matched"
          description="We couldn't find any log records matching your level filters."
        />
      ) : (
        <div className="space-y-4">
          <DataTable 
            columns={columns} 
            data={logs} 
            keyExtractor={(row) => row.id} 
          />

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm rounded-xl px-5 py-4">
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Showing page <span className="font-semibold text-slate-700 dark:text-slate-200">{page}</span> of <span className="font-semibold text-slate-700 dark:text-slate-200">{totalPages}</span>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  disabled={page <= 1} 
                  onClick={() => setPage(page - 1)}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  <span>Previous</span>
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  disabled={page >= totalPages} 
                  onClick={() => setPage(page + 1)}
                >
                  <span>Next</span>
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {isDeleteConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-950/20 backdrop-blur-xs" onClick={() => setIsDeleteConfirmOpen(false)} />
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl rounded-2xl w-full max-w-md flex flex-col relative z-10 p-6 animate-scale-in">
            <div className="flex items-center gap-3 text-rose-600 mb-4">
              <AlertTriangle className="h-6 w-6" />
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Delete Selected System Logs?</h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-6">
              This action permanently deletes the <strong className="text-slate-800 dark:text-slate-200">{selectedLogIds.length}</strong> selected system diagnostic logs. This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" size="sm" onClick={() => setIsDeleteConfirmOpen(false)} disabled={deleteLoading}>
                Cancel
              </Button>
              <Button 
                onClick={handleDeleteSelected} 
                disabled={deleteLoading}
                className="bg-rose-600 hover:bg-rose-700 text-white font-semibold border-rose-600 focus:ring-rose-500"
              >
                {deleteLoading ? 'Deleting...' : 'Delete Permanently'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Log Details Modal Inspector */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-950/20 backdrop-blur-xs" onClick={() => setSelectedLog(null)} />
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl rounded-2xl w-full max-w-xl max-h-[80vh] flex flex-col relative z-10 animate-scale-in overflow-hidden">
            
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/20">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 tracking-tight">Inspect System Log</h3>
              </div>
              <button 
                type="button" 
                onClick={() => setSelectedLog(null)}
                className="text-slate-400 hover:text-slate-650 dark:text-slate-500 dark:hover:text-slate-350 focus:outline-none transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-4">
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 rounded-xl">
                  <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">Action</span>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-100 mt-1">{selectedLog.action}</p>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 rounded-xl">
                  <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">Admin</span>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-100 mt-1">{selectedLog.admin_email || 'System'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 rounded-xl">
                  <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">Timestamp</span>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-100 mt-1">
                    {new Date(selectedLog.created_at).toLocaleString()}
                  </p>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 rounded-xl">
                  <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">Log level</span>
                  <div className="mt-1">
                    <Badge variant={selectedLog.level.toUpperCase() === 'ERROR' ? 'danger' : selectedLog.level.toUpperCase() === 'WARNING' ? 'warning' : 'info'}>
                      {selectedLog.level.toUpperCase()}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* JSON Code block details */}
              <div className="pt-2">
                <span className="block text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider mb-2">Details Payload (JSON)</span>
                <div className="bg-slate-900 dark:bg-slate-950 border border-slate-950 dark:border-slate-800 p-4 rounded-xl overflow-x-auto text-[11px] font-mono text-emerald-400 dark:text-emerald-300 leading-relaxed max-h-[30vh]">
                  <pre>{JSON.stringify(selectedLog.details, null, 2)}</pre>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 flex justify-end">
              <Button variant="secondary" size="sm" onClick={() => setSelectedLog(null)}>
                Dismiss
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
