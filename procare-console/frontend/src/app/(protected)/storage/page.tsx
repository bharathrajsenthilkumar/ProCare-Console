'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { 
  Database, 
  RefreshCw, 
  AlertTriangle, 
  Image as ImageIcon, 
  UserCheck, 
  HardDrive, 
  Info,
  Table
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import Link from 'next/link';

interface StorageBucketMetrics {
  name: string;
  file_count: number;
  total_bytes: number;
  total_formatted: string;
}

interface DatabaseTableMetrics {
  table_name: string;
  row_count: number;
  data_size_bytes: number;
  index_size_bytes: number;
  total_size_bytes: number;
  data_size_formatted: string;
  index_size_formatted: string;
  total_size_formatted: string;
}

interface StorageMetrics {
  total_bytes: number;
  total_formatted: string;
  total_files_stored: number;
  buckets: StorageBucketMetrics[];
  
  database_table_available: boolean;
  database_tables: DatabaseTableMetrics[];
  database_table_storage_total_bytes: number;
  database_table_storage_total_formatted: string;

  database_size_available: boolean;
  database_size_bytes: number;
  database_size_formatted: string;
  database_capacity_bytes: number;
  database_capacity_formatted: string;
  database_remaining_bytes: number;
  database_remaining_formatted: string;
  database_usage_percentage: number;
  database_usage_status?: string;

  storage_capacity_bytes: number;
  storage_capacity_formatted: string;
  storage_used_bytes: number;
  storage_used_formatted: string;
  storage_remaining_bytes: number;
  storage_remaining_formatted: string;
  storage_usage_percentage: number;
}

export default function StoragePage() {
  const { session } = useAuth();
  const [metrics, setMetrics] = useState<StorageMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [exportUsersLoading, setExportUsersLoading] = useState(false);
  const [exportChatsLoading, setExportChatsLoading] = useState(false);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001/api/v1';

  const fetchStorageMetrics = async () => {
    if (!session) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${apiUrl}/storage/metrics`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setMetrics(data);
      } else {
        setError('Failed to query Supabase Storage metrics.');
      }
    } catch (err) {
      console.error('Error fetching storage metrics:', err);
      setError('Network error: Unable to reach backend server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStorageMetrics();
  }, [session]);

  const handleExportUsers = async () => {
    if (!session) return;
    setExportUsersLoading(true);
    try {
      const response = await fetch(`${apiUrl}/users/export`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `users-export-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } else {
        alert('Failed to export users.');
      }
    } catch (err) {
      alert('Network error while exporting users.');
    } finally {
      setExportUsersLoading(false);
    }
  };

  const handleExportChats = async () => {
    if (!session) return;
    setExportChatsLoading(true);
    try {
      const response = await fetch(`${apiUrl}/chat-logs/export`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `chat-logs-export-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } else {
        alert('Failed to export chatbot logs.');
      }
    } catch (err) {
      alert('Network error while exporting chatbot logs.');
    } finally {
      setExportChatsLoading(false);
    }
  };

  const gallery = metrics?.buckets.find(b => b.name === 'gallery-images');
  const team = metrics?.buckets.find(b => b.name === 'team-images');
  
  const totalBucketBytes = metrics?.total_bytes || 0;
  const galleryBytes = gallery?.total_bytes || 0;
  const teamBytes = team?.total_bytes || 0;
  
  const galleryPct = totalBucketBytes > 0 ? (galleryBytes / totalBucketBytes) * 100 : 0;
  const teamPct = totalBucketBytes > 0 ? (teamBytes / totalBucketBytes) * 100 : 0;

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Storage & Database Allocations" 
        description="Monitor physical database size, track index quotas, and review Supabase storage bucket file sizes."
        actions={
          <Button 
            onClick={fetchStorageMetrics} 
            variant="outline" 
            size="sm"
            disabled={loading}
            className="bg-white border-slate-200 hover:bg-slate-50 shadow-xs"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh Metrics
          </Button>
        }
      />

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <div className="text-sm font-medium">{error}</div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchStorageMetrics} 
            className="ml-auto bg-white border-rose-200 text-rose-700 hover:bg-rose-100"
          >
            Retry
          </Button>
        </div>
      )}

      {loading ? (
        <div className="space-y-6 animate-pulse">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2].map((i) => (
              <Card key={i} className="border-slate-200 h-32" />
            ))}
          </div>
          <Card className="border-slate-200 h-64 flex items-center justify-center">
            <span className="text-slate-400 font-sans text-sm flex items-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin" /> Querying Supabase resources...
            </span>
          </Card>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Prominent Database Storage Warning Section (>= 90%) */}
          {metrics && metrics.database_usage_percentage >= 90 && (
            <Card className="border-rose-250 bg-rose-50/20 shadow-sm overflow-hidden animate-fade-in">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-start gap-3 text-rose-800">
                  <AlertTriangle className="h-6 w-6 text-rose-600 shrink-0 mt-0.5" />
                  <div className="space-y-1 w-full">
                    <h3 className="font-bold text-rose-900 text-sm">Database Storage Management</h3>
                    <p className="text-xs text-rose-700 leading-relaxed font-bold">
                      {metrics.database_usage_percentage >= 100 
                        ? "⚠ Database storage quota reached. Writes may be restricted by Supabase." 
                        : "⚠ Database storage is approaching its limit."}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-semibold text-rose-800 py-2 border-t border-b border-rose-100/50 my-2">
                      <div>Current Used: {metrics.database_size_formatted} / {metrics.database_capacity_formatted}</div>
                      <div>Usage Percentage: {metrics.database_usage_percentage.toFixed(1)}% Used</div>
                      <div>Remaining Space: {metrics.database_remaining_formatted}</div>
                    </div>
                    <p className="text-[10px] text-rose-600 leading-relaxed">
                      Recommended Actions: Export your records to CSV format, then navigate to the Users and Chatbot Logs managers to delete old or unnecessary records manually. No automatic deletions are initiated by the system.
                    </p>
                    <div className="flex flex-wrap gap-2.5 pt-3">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleExportChats} 
                        disabled={exportChatsLoading}
                        className="bg-white border-rose-200 text-rose-700 hover:bg-rose-50 hover:text-rose-800 font-semibold"
                      >
                        {exportChatsLoading ? 'Exporting...' : 'Export Chatbot Logs'}
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleExportUsers} 
                        disabled={exportUsersLoading}
                        className="bg-white border-rose-200 text-rose-700 hover:bg-rose-50 hover:text-rose-800 font-semibold"
                      >
                        {exportUsersLoading ? 'Exporting...' : 'Export Users'}
                      </Button>
                      <Link href="/chat-logs">
                        <Button 
                          variant="outline"
                          size="sm" 
                          className="bg-white border-rose-200 text-rose-700 hover:bg-rose-50 hover:text-rose-800 font-semibold"
                        >
                          Manage Chatbot Logs
                        </Button>
                      </Link>
                      <Link href="/users">
                        <Button 
                          variant="outline"
                          size="sm" 
                          className="bg-white border-rose-200 text-rose-700 hover:bg-rose-50 hover:text-rose-800 font-semibold"
                        >
                          Manage Users
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* SUPABASE RESOURCE USAGE (SUMMARY SECTION) */}
          <div className="space-y-4">
            <div className="border-b border-slate-100 pb-2">
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Supabase Resource Usage</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Storage Usage Card */}
              <Card className="border-slate-200 shadow-sm overflow-hidden">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-sky-50 rounded-xl border border-sky-100 text-sky-600">
                        <HardDrive className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-800">Supabase Storage</h3>
                        <p className="text-[10px] text-slate-400 mt-0.5">Asset storage metrics in the project</p>
                      </div>
                    </div>
                    <Badge variant="info">Free Plan</Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-400 font-semibold block uppercase tracking-wider">Used</span>
                      <span className="text-lg font-extrabold text-slate-700 block">{metrics?.storage_used_formatted}</span>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-400 font-semibold block uppercase tracking-wider">Capacity</span>
                      <span className="text-lg font-extrabold text-slate-700 block">{metrics?.storage_capacity_formatted}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-semibold text-slate-500">
                      <span>Usage Progress</span>
                      <span>{metrics?.storage_usage_percentage.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                      <div 
                        className="bg-sky-500 h-full rounded-full transition-all duration-500" 
                        style={{ width: `${metrics?.storage_usage_percentage}%` }}
                      />
                    </div>
                    <div className="text-[10px] text-slate-400 flex justify-between">
                      <span>Remaining: {metrics?.storage_remaining_formatted}</span>
                      <span>1 GB Limit</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Database Usage Card */}
              <Card className={`shadow-sm overflow-hidden border ${
                metrics && metrics.database_usage_percentage >= 90 ? 'border-rose-200 bg-rose-50/5' : 'border-slate-200'
              }`}>
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2.5 rounded-xl border ${
                        metrics && metrics.database_usage_percentage >= 90 
                          ? 'bg-rose-50 border-rose-100 text-rose-600' 
                          : 'bg-violet-50 border-violet-100 text-violet-600'
                      }`}>
                        <Database className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-800">Supabase Database</h3>
                        <p className="text-[10px] text-slate-400 mt-0.5">PostgreSQL database metrics in the project</p>
                      </div>
                    </div>
                    <Badge variant={metrics && metrics.database_usage_percentage >= 90 ? 'danger' : 'info'}>
                      {metrics?.database_usage_status || 'Free Plan'}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-400 font-semibold block uppercase tracking-wider">Used</span>
                      <span className="text-lg font-extrabold text-slate-700 block">
                        {metrics?.database_size_available ? metrics.database_size_formatted : 'Unavailable'}
                      </span>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-400 font-semibold block uppercase tracking-wider">Capacity</span>
                      <span className="text-lg font-extrabold text-slate-700 block">{metrics?.database_capacity_formatted}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-semibold text-slate-500">
                      <span>Usage Progress</span>
                      <span>{metrics?.database_size_available ? `${metrics.database_usage_percentage.toFixed(1)}%` : '0%'}</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          metrics && metrics.database_usage_percentage >= 90 ? 'bg-rose-500' : 'bg-violet-500'
                        }`}
                        style={{ width: `${metrics?.database_size_available ? metrics.database_usage_percentage : 0}%` }}
                      />
                    </div>
                    <div className="text-[10px] text-slate-400 flex justify-between">
                      <span>Remaining: {metrics?.database_remaining_formatted}</span>
                      <span>500 MB Limit</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* SECTION 1 — SUPABASE STORAGE BUCKETS */}
          <div className="space-y-4">
            <div className="border-b border-slate-100 pb-2">
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Section 1 — Supabase Storage Buckets</h2>
            </div>

            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-bold text-slate-800">Storage Size Distribution</CardTitle>
                <div className="text-xs text-slate-500 font-medium">
                  {metrics?.total_files_stored} files total across monitored buckets
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="w-full bg-slate-100 rounded-full h-4 overflow-hidden flex">
                  <div 
                    className="bg-sky-500 h-full transition-all duration-500" 
                    style={{ width: `${galleryPct}%` }}
                    title={`Gallery Assets: ${galleryPct.toFixed(1)}%`}
                  />
                  <div 
                    className="bg-emerald-500 h-full transition-all duration-500" 
                    style={{ width: `${teamPct}%` }}
                    title={`Staff Profiles: ${teamPct.toFixed(1)}%`}
                  />
                </div>
                <div className="flex items-center gap-6 text-xs justify-center pt-2">
                  <div className="flex items-center gap-2 font-medium text-slate-600">
                    <div className="h-3 w-3 bg-sky-500 rounded" />
                    <span>Gallery Images ({galleryPct.toFixed(1)}%)</span>
                  </div>
                  <div className="flex items-center gap-2 font-medium text-slate-600">
                    <div className="h-3 w-3 bg-emerald-500 rounded" />
                    <span>Team Images ({teamPct.toFixed(1)}%)</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Gallery Bucket */}
              <Card className="border-slate-200 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-bold text-slate-800">Gallery Bucket Allocation</CardTitle>
                  <Badge variant="info">PUBLIC READ</Badge>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-100 rounded-xl">
                    <ImageIcon className="h-5 w-5 text-sky-500" />
                    <div className="text-xs">
                      <span className="font-bold text-slate-500 block">BUCKET DIRECTORY</span>
                      <span className="font-mono text-slate-700 font-semibold">{gallery?.name}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-center">
                      <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wide">File Count</span>
                      <span className="text-lg font-bold text-slate-700 mt-1 block">{gallery?.file_count}</span>
                    </div>
                    <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-center">
                      <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wide">Total Weight</span>
                      <span className="text-lg font-bold text-slate-700 mt-1 block">{gallery?.total_formatted}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Team Bucket */}
              <Card className="border-slate-200 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-bold text-slate-800">Team Bucket Allocation</CardTitle>
                  <Badge variant="info">PUBLIC READ</Badge>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-100 rounded-xl">
                    <UserCheck className="h-5 w-5 text-emerald-500" />
                    <div className="text-xs">
                      <span className="font-bold text-slate-500 block">BUCKET DIRECTORY</span>
                      <span className="font-mono text-slate-700 font-semibold">{team?.name}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-center">
                      <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wide">File Count</span>
                      <span className="text-lg font-bold text-slate-700 mt-1 block">{team?.file_count}</span>
                    </div>
                    <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-center">
                      <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wide">Total Weight</span>
                      <span className="text-lg font-bold text-slate-700 mt-1 block">{team?.total_formatted}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* SECTION 2 — DATABASE TABLE STORAGE */}
          <div className="space-y-4">
            <div className="border-b border-slate-100 pb-2">
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Section 2 — Database Table Storage</h2>
            </div>

            {metrics?.database_table_available ? (
              <div className="space-y-6">
                <Card className="border-slate-200 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-sm font-bold text-slate-800">Database Table Sizing Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                        <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Total Database Table Storage</span>
                        <span className="text-lg font-extrabold text-slate-700 mt-1 block">{metrics.database_table_storage_total_formatted}</span>
                      </div>
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                        <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Tracked Tables Count</span>
                        <span className="text-lg font-extrabold text-slate-700 mt-1 block">{metrics.database_tables.length} tables</span>
                      </div>
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                        <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Primary Audit Logs Table</span>
                        <span className="text-lg font-extrabold text-slate-700 mt-1 block">chatbot_logs</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Individual Tables Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {metrics.database_tables.map((table) => {
                    const isChatbotLogs = table.table_name === 'chatbot_logs';
                    const isSystemLogs = table.table_name === 'system_logs';
                    const isHighlighted = isChatbotLogs || isSystemLogs;
                    
                    const getTableLink = (tableName: string) => {
                      switch (tableName) {
                        case 'users':
                          return '/users';
                        case 'chatbot_logs':
                          return '/chat-logs';
                        case 'system_logs':
                          return '/logs';
                        case 'appointments':
                          return '/appointments';
                        case 'gallery_images':
                          return '/gallery';
                        case 'team_members':
                          return '/team';
                        default:
                          return null;
                      }
                    };

                    const link = getTableLink(table.table_name);

                    const cardContent = (
                      <Card 
                        className={`border-slate-200 shadow-sm transition-all duration-300 ${
                          isHighlighted ? 'ring-2 ring-violet-500/30' : ''
                        } ${link ? 'hover:ring-2 hover:ring-sky-500/50 hover:cursor-pointer' : ''}`}
                      >
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                          <CardTitle className="text-xs font-bold text-slate-800 flex items-center gap-2">
                            <Table className="h-4 w-4 text-slate-400" />
                            <span className="font-mono text-slate-700">{table.table_name}</span>
                          </CardTitle>
                          {isChatbotLogs && <Badge variant="success">AUDIT LOGS</Badge>}
                          {isSystemLogs && <Badge variant="info">SYSTEM LOGS</Badge>}
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="p-2 bg-slate-50 border border-slate-100 rounded-lg">
                              <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">Row Count</span>
                              <span className="font-bold text-slate-700 mt-0.5 block">{table.row_count} rows</span>
                            </div>
                            <div className="p-2 bg-slate-50 border border-slate-100 rounded-lg">
                              <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">Total Size</span>
                              <span className="font-mono font-bold text-slate-700 mt-0.5 block">{table.total_size_formatted}</span>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="p-2 bg-slate-50/50 border border-slate-100/50 rounded-lg">
                              <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">Data Size</span>
                              <span className="font-mono text-slate-600 block mt-0.5">{table.data_size_formatted}</span>
                            </div>
                            <div className="p-2 bg-slate-50/50 border border-slate-100/50 rounded-lg">
                              <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">Index Size</span>
                              <span className="font-mono text-slate-600 block mt-0.5">{table.index_size_formatted}</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );

                    if (link) {
                      return (
                        <Link key={table.table_name} href={link} className="block no-underline">
                          {cardContent}
                        </Link>
                      );
                    }

                    return <div key={table.table_name}>{cardContent}</div>;
                  })}
                </div>
              </div>
            ) : (
              <Card className="border-slate-200 shadow-sm">
                <CardContent className="p-6 space-y-4">
                  <div className="p-4 bg-sky-50 border border-sky-100 text-sky-800 text-xs rounded-xl flex gap-3 leading-relaxed">
                    <Info className="h-5 w-5 text-sky-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">PostgREST Schema Catalog Restriction</p>
                      <p className="mt-0.5 text-sky-700/90 font-normal">
                        Database table size statistics could not be loaded. Please ensure the PostgreSQL helper RPC `get_table_metrics` has been created and granted execute permission to the `service_role` database role.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* SECTION 3 — SUPABASE DATABASE QUOTA USAGE */}
          <div className="space-y-4">
            <div className="border-b border-slate-100 pb-2">
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Section 3 — Supabase Database Quota Usage</h2>
            </div>
            
            <Card className="border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-sm font-bold text-slate-800">Supabase Database Quota Usage</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider font-semibold">Database Capacity</span>
                    <span className="text-lg font-extrabold text-slate-700 mt-1 block">{metrics?.database_capacity_formatted}</span>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider font-semibold">Database Used</span>
                    <span className="text-lg font-extrabold text-slate-700 mt-1 block">
                      {metrics?.database_size_available ? metrics.database_size_formatted : 'Unavailable'}
                    </span>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider font-semibold">Database Remaining</span>
                    <span className="text-lg font-extrabold text-slate-700 mt-1 block">
                      {metrics?.database_size_available ? metrics.database_remaining_formatted : 'Unavailable'}
                    </span>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider font-semibold">Database Usage Percentage</span>
                    <span className="text-lg font-extrabold text-slate-700 mt-1 block">
                      {metrics?.database_size_available ? `${metrics.database_usage_percentage.toFixed(1)}%` : '0%'}
                    </span>
                  </div>
                </div>

                {/* Explanatory Notice */}
                <div className="p-4 bg-sky-50 border border-sky-100 text-sky-800 text-xs rounded-xl flex gap-3 leading-relaxed">
                  <Info className="h-5 w-5 text-sky-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">System Quota Notice</p>
                    <p className="mt-0.5 text-sky-700/90 font-normal">
                      Database Used represents the total PostgreSQL database size reported by the existing get_database_size() RPC. This is different from the sum of the tracked application table sizes. Database Table Storage represents only user-created tables in the public schema, while the full Database Size includes internal catalogs, database metadata, and auth schemas.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
