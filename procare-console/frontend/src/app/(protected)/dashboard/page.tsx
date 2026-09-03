'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { 
  Users, 
  MessageSquare, 
  Image as ImageIcon, 
  UserCheck, 
  Server, 
  ExternalLink,
  Info,
  RefreshCw,
  AlertCircle,
  HardDrive,
  Database,
  ArrowRight,
  Sparkles,
  Zap
} from 'lucide-react';
import Link from 'next/link';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { DataTable, Column } from '@/components/ui/DataTable';
import { supabase } from '@/lib/supabase';

interface Stats {
  total_users: number;
  total_chats: number;
  gallery_images: number;
  team_members: number;
}

interface ChatSession {
  session_id: string;
  user_name: string | null;
  user_mobile_number: string | null;
  channel: string;
  message_count: number;
  latest_message_timestamp: string;
  average_response_time: number;
}

interface StorageBucketMetrics {
  name: string;
  file_count: number;
  total_bytes: number;
  total_formatted: string;
}

interface StorageMetrics {
  total_bytes: number;
  total_formatted: string;
  total_files_stored: number;
  buckets: StorageBucketMetrics[];
  database_size_available: boolean;
  database_size_bytes: number;
  database_size_formatted: string;
  database_capacity_bytes: number;
  database_capacity_formatted: string;
  database_remaining_bytes: number;
  database_remaining_formatted: string;
  database_usage_percentage: number;
  storage_capacity_bytes: number;
  storage_capacity_formatted: string;
  storage_used_bytes: number;
  storage_used_formatted: string;
  storage_remaining_bytes: number;
  storage_remaining_formatted: string;
  storage_usage_percentage: number;
}

const CircularProgress = ({ percentage, strokeColor }: { percentage: number; strokeColor: string }) => {
  const radius = 32;
  const strokeWidth = 6;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (Math.min(Math.max(percentage, 0), 100) / 100) * circumference;

  return (
    <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 80 80">
      {/* Background circle */}
      <circle
        cx="40"
        cy="40"
        r={radius}
        className="stroke-slate-100"
        strokeWidth={strokeWidth}
        fill="transparent"
      />
      {/* Progress circle */}
      <circle
        cx="40"
        cy="40"
        r={radius}
        className={strokeColor}
        strokeWidth={strokeWidth}
        fill="transparent"
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
        strokeLinecap="round"
      />
    </svg>
  );
};

export default function DashboardPage() {
  const { session } = useAuth();
  const [stats, setStats] = useState<Stats>({
    total_users: 120,      // Fallback local placeholders
    total_chats: 840,
    gallery_images: 32,
    team_members: 8,
  });
  const [loading, setLoading] = useState(true);
  const [backendStatus, setBackendStatus] = useState<'checking' | 'connected' | 'error'>('checking');
  const [conversations, setConversations] = useState<ChatSession[]>([]);
  const [conversationsLoading, setConversationsLoading] = useState(true);
  const [conversationsError, setConversationsError] = useState<string | null>(null);

  const [storageMetrics, setStorageMetrics] = useState<StorageMetrics | null>(null);
  const [storageLoading, setStorageLoading] = useState(true);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [activeModel, setActiveModel] = useState<'gemini' | 'groq'>('gemini');

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || (typeof window !== 'undefined' ? '/api/v1' : 'http://localhost:8001/api/v1');

  // Fetch active chatbot model from Supabase or localStorage
  useEffect(() => {
    const fetchActiveModel = async () => {
      try {
        const { data, error } = await supabase
          .from('system_settings')
          .select('active_chatbot_model')
          .limit(1)
          .maybeSingle();

        if (!error && data?.active_chatbot_model) {
          const model = data.active_chatbot_model as 'gemini' | 'groq';
          setActiveModel(model);
          try {
            localStorage.setItem('active_chatbot_model', model);
          } catch (_) {}
        } else {
          const local = localStorage.getItem('active_chatbot_model') as 'gemini' | 'groq';
          if (local === 'gemini' || local === 'groq') {
            setActiveModel(local);
          }
        }
      } catch (err) {
        const local = localStorage.getItem('active_chatbot_model') as 'gemini' | 'groq';
        if (local === 'gemini' || local === 'groq') {
          setActiveModel(local);
        }
      }
    };

    fetchActiveModel();
  }, []);

  const fetchStorageMetrics = async () => {
    if (!session) return;
    setStorageLoading(true);
    setStorageError(null);
    try {
      const response = await fetch(`${apiUrl}/storage/metrics`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setStorageMetrics(data);
      } else {
        setStorageError('Unable to load usage metrics');
      }
    } catch (error) {
      console.error('Error fetching storage metrics on dashboard:', error);
      setStorageError('Unable to load usage metrics');
    } finally {
      setStorageLoading(false);
    }
  };

  useEffect(() => {
    async function verifyBackendAndFetchStats() {
      if (!session) return;
      
      try {
        const response = await fetch(`${apiUrl}/stats`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setStats(data);
          setBackendStatus('connected');
        } else {
          setBackendStatus('error');
        }
      } catch (error) {
        console.warn('Backend API temporarily unavailable, using offline fallback state:', error);
        setBackendStatus('error');
      } finally {
        setLoading(false);
      }
    }

    async function fetchRecentConversations() {
      if (!session) return;
      setConversationsLoading(true);
      setConversationsError(null);
      try {
        const response = await fetch(`${apiUrl}/chat-logs?page=1&limit=4`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        });
        if (response.ok) {
          const data = await response.json();
          setConversations(data.sessions || []);
        } else {
          setConversationsError('Failed to fetch recent chatbot sessions.');
        }
      } catch (error) {
        console.error('Error fetching chat logs:', error);
        setConversationsError('Unable to connect to chat logs service.');
      } finally {
        setConversationsLoading(false);
      }
    }

    verifyBackendAndFetchStats();
    fetchRecentConversations();
    fetchStorageMetrics();
  }, [session]);

  const refreshAllDashboardData = () => {
    fetchStorageMetrics();
  };

  const cards = [
    {
      name: 'Total Users',
      value: stats.total_users,
      icon: Users,
      description: 'Active patient and practitioner profiles',
      link: '/users'
    },
    {
      name: 'Chat Conversations',
      value: stats.total_chats,
      icon: MessageSquare,
      description: 'Support dialogues and triage logs',
      link: '/chat-logs'
    },
    {
      name: 'Gallery Images',
      value: stats.gallery_images,
      icon: ImageIcon,
      description: 'Assets published on the public site',
      link: '/gallery'
    },
    {
      name: 'Team Members',
      value: stats.team_members,
      icon: UserCheck,
      description: 'Staff directory listings',
      link: '/team'
    },
  ];

  const conversationColumns: Column<ChatSession>[] = [
    {
      header: 'Patient Identity',
      accessor: (row) => {
        const name = row.user_name && row.user_name !== 'N/A' ? row.user_name : null;
        const mobile = row.user_mobile_number && row.user_mobile_number !== 'N/A' ? row.user_mobile_number : null;
        
        return (
          <div className="space-y-0.5">
            <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <div className="h-2 w-2 bg-slate-300 dark:bg-slate-700 rounded-full" />
              <span>{name || mobile || `Session ${row.session_id.substring(0, 8)}`}</span>
            </div>
            {name && mobile && (
              <div className="text-[10px] text-slate-400 dark:text-slate-400 pl-4">{mobile}</div>
            )}
          </div>
        );
      },
    },
    {
      header: 'Session Channel',
      accessor: (row) => {
        const isWhatsapp = row.channel.toLowerCase() === 'whatsapp';
        return (
          <Badge variant={isWhatsapp ? 'success' : 'info'}>
            {isWhatsapp ? 'WHATSAPP' : 'WEBCHAT'}
          </Badge>
        );
      },
    },
    {
      header: 'Exchange count',
      accessor: (row) => `${row.message_count} messages`,
      className: 'text-slate-500 dark:text-slate-400',
    },
    {
      header: 'Recorded time',
      accessor: (row) => {
        try {
          const date = new Date(row.latest_message_timestamp);
          return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } catch {
          return 'Just now';
        }
      },
      className: 'text-slate-400 dark:text-slate-500 font-medium',
    },
    {
      header: 'Audit link',
      accessor: (row) => (
        <Link 
          href={`/chat-logs?session_id=${row.session_id}`}
          className="text-sky-600 hover:text-sky-800 inline-flex items-center gap-1 text-xs font-semibold"
        >
          <span>Transcript</span>
          <ExternalLink className="h-3 w-3" />
        </Link>
      ),
      className: 'text-right',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader 
        title="Administrative Overview" 
        description="Console diagnostics status, resource summaries, and active chatbots exchanges."
        actions={
          <div className="flex items-center gap-3">
            {/* Active Model Quick Status Badge linking to Settings */}
            <Link 
              href="/settings"
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold shadow-xs hover:border-sky-400 dark:hover:border-sky-500 hover:shadow-sm transition-all group cursor-pointer"
            >
              {activeModel === 'gemini' ? (
                <Sparkles className="h-3.5 w-3.5 text-sky-500 shrink-0" />
              ) : (
                <Zap className="h-3.5 w-3.5 text-amber-500 shrink-0" />
              )}
              <span className="text-slate-500 dark:text-slate-400">Model:</span>
              <span className={`font-bold ${
                activeModel === 'gemini' 
                  ? 'text-sky-600 dark:text-sky-400' 
                  : 'text-amber-600 dark:text-amber-400'
              }`}>
                {activeModel === 'gemini' ? 'Gemini 3.5' : 'GPT-OSS 20B'}
              </span>
              <ExternalLink className="h-3 w-3 text-slate-400 group-hover:text-sky-500 transition-colors" />
            </Link>

            {/* API Status */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 font-semibold shadow-xs">
              <Server className={`h-4 w-4 ${backendStatus === 'connected' ? 'text-emerald-500' : 'text-slate-400'}`} />
              <span>API Status:</span>
              {backendStatus === 'checking' && <span className="text-slate-400 animate-pulse">Scanning...</span>}
              {backendStatus === 'connected' && <span className="text-emerald-600 dark:text-emerald-400 font-bold">Online</span>}
              {backendStatus === 'error' && <span className="text-red-500 font-bold">Offline</span>}
            </div>
          </div>
        }
      />

      {/* Database Quota Warning Banner (>= 90% usage) */}
      {storageMetrics && storageMetrics.database_usage_percentage >= 90 && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex gap-3 text-rose-800 animate-fade-in">
          <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-bold text-rose-900 text-sm">Database Storage Warning</h4>
            <p className="text-xs text-rose-700 leading-relaxed font-semibold">
              Database storage is almost full. Export and manually delete unnecessary data.
            </p>
            <p className="text-[11px] text-rose-600 leading-relaxed">
              Database usage has reached <strong>{storageMetrics.database_usage_percentage.toFixed(1)}%</strong> of the available quota. Used: <strong>{storageMetrics.database_size_formatted}</strong> of <strong>{storageMetrics.database_capacity_formatted}</strong>.
            </p>
            <div className="pt-2 flex gap-2">
              <Link href="/storage">
                <Button size="sm" className="bg-rose-600 hover:bg-rose-700 text-white font-semibold border-rose-600 px-3 py-1.5 h-8 text-xs rounded-lg shadow-xs cursor-pointer">
                  Manage Storage
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}


      {/* Active AI Chatbot Model Status Indicator Card */}
      <Link href="/settings" className="block group cursor-pointer">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl border border-slate-200/90 bg-white shadow-xs hover:border-slate-350 hover:shadow-md transition-all dark:border-slate-800 dark:bg-slate-900/90 dark:hover:border-slate-700">
          <div className="flex items-center gap-3.5">
            <div className={`p-2.5 rounded-xl flex items-center justify-center shrink-0 ${
              activeModel === 'gemini'
                ? 'bg-sky-50 text-sky-600 dark:bg-sky-950/40 dark:text-sky-400'
                : 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400'
            }`}>
              {activeModel === 'gemini' ? (
                <Sparkles className="h-5 w-5" />
              ) : (
                <Zap className="h-5 w-5" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Active Chatbot Engine
                </span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold ${
                  activeModel === 'gemini'
                    ? 'bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300'
                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                }`}>
                  {activeModel === 'gemini' ? 'Google Gemini 3.5 Flash Lite' : 'OpenAI GPT-OSS 20B'}
                </span>
                <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded-md">
                  Active
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {activeModel === 'gemini'
                  ? 'Clinical AI diagnostic chatbot model is active. Click to configure in Settings.'
                  : 'Open-source foundation chatbot model is active. Click to configure in Settings.'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-sky-600 group-hover:text-sky-700 dark:text-sky-400 dark:group-hover:text-sky-300 transition-colors shrink-0">
            <span>Configure in Settings</span>
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </div>
        </div>
      </Link>

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card) => (
          <Card key={card.name} hoverEffect>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                {card.name}
              </CardTitle>
              <div className="p-2 bg-slate-50 border border-slate-100 rounded-lg text-slate-500">
                <card.icon className="h-4.5 w-4.5 stroke-[1.8]" />
              </div>
            </CardHeader>
            <CardContent>
              {loading && backendStatus === 'checking' ? (
                <div className="h-7 w-20 bg-slate-100 animate-pulse rounded" />
              ) : (
                <div className="text-2xl font-bold text-slate-900 dark:text-slate-50 tracking-tight">{card.value}</div>
              )}
              <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">{card.description}</p>
              
              <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end">
                <Link 
                  href={card.link}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-600 hover:text-sky-800 transition-colors"
                >
                  <span>Manage</span>
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Visual panels for logs and charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Conversations */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 tracking-tight">Recent Chatbot Sessions</h3>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">Live monitoring of patient interactions and automated support transcripts.</p>
              </div>
              <Link href="/chat-logs">
                <Button variant="secondary" size="sm">View All</Button>
              </Link>
            </div>
            <div className="p-5">
              {conversationsLoading ? (
                <div className="h-48 flex items-center justify-center text-slate-400 text-xs font-medium gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin" /> Retrieving recent sessions...
                </div>
              ) : conversationsError ? (
                <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl text-rose-700 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                  <span>{conversationsError}</span>
                </div>
              ) : conversations.length === 0 ? (
                <div className="h-48 flex flex-col items-center justify-center text-slate-400 text-center gap-2 p-6">
                  <MessageSquare className="w-8 h-8 text-slate-300 stroke-[1.5]" />
                  <span className="text-xs font-semibold text-slate-500">No Chatbot Sessions Found</span>
                  <span className="text-[10px] max-w-xs text-slate-400">All patient conversations and diagnostics transcripts will be displayed here once sessions are recorded.</span>
                </div>
              ) : (
                <DataTable 
                  columns={conversationColumns} 
                  data={conversations} 
                  keyExtractor={(row) => row.session_id} 
                />
              )}
            </div>
          </div>
        </div>

        {/* Storage & Database Usage */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-5 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 tracking-tight">Storage & Database Usage</h3>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">Real-time resource quota and capacity monitoring.</p>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={refreshAllDashboardData}
                disabled={storageLoading}
                className="h-8 w-8 p-0 hover:bg-slate-50 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <RefreshCw className={`h-4 w-4 ${storageLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>

            {storageLoading ? (
              <div className="h-64 flex flex-col items-center justify-center text-slate-400 text-xs font-medium gap-2">
                <RefreshCw className="w-5 h-5 animate-spin" />
                <span>Loading usage metrics...</span>
              </div>
            ) : storageError ? (
              <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl text-rose-700 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                <span>{storageError}</span>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Circular Charts Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-4">
                  {/* Supabase Storage Card */}
                  <div className="border border-slate-150 dark:border-slate-800 rounded-xl p-4 flex flex-col items-center justify-between bg-slate-50/50 dark:bg-slate-900/50 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-all duration-300">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider text-center block mb-3">Supabase Storage</span>
                    
                    <div className="relative flex items-center justify-center mb-3">
                      <CircularProgress 
                        percentage={storageMetrics?.storage_usage_percentage || 0} 
                        strokeColor="stroke-sky-500" 
                      />
                      <div className="absolute flex flex-col items-center justify-center text-center">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-205">
                          {storageMetrics?.storage_usage_percentage.toFixed(1)}%
                        </span>
                        <span className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Used</span>
                      </div>
                    </div>

                    <div className="text-[10px] text-slate-500 dark:text-slate-400 w-full space-y-1 pt-2 border-t border-slate-150 dark:border-slate-800">
                      <div className="flex justify-between">
                        <span>Used:</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-300">{storageMetrics?.storage_used_formatted}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Remaining:</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-300">{storageMetrics?.storage_remaining_formatted}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Capacity:</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-300">{storageMetrics?.storage_capacity_formatted}</span>
                      </div>
                    </div>
                  </div>

                  {/* Supabase Database Card */}
                  <div className={`border rounded-xl p-4 flex flex-col items-center justify-between transition-all duration-300 ${
                    storageMetrics && storageMetrics.database_usage_percentage >= 90 
                      ? 'border-rose-250 bg-rose-50/20 dark:bg-rose-950/10 hover:bg-rose-50/40' 
                      : 'border-slate-150 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 hover:bg-slate-50/80 dark:hover:bg-slate-800/40'
                  }`}>
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider text-center block mb-3">Supabase Database</span>
                    
                    <div className="relative flex items-center justify-center mb-3">
                      <CircularProgress 
                        percentage={storageMetrics?.database_usage_percentage || 0} 
                        strokeColor={storageMetrics && storageMetrics.database_usage_percentage >= 90 ? "stroke-rose-500" : "stroke-violet-500"} 
                      />
                      <div className="absolute flex flex-col items-center justify-center text-center">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-205">
                          {storageMetrics?.database_usage_percentage.toFixed(1)}%
                        </span>
                        <span className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Used</span>
                      </div>
                    </div>

                    {storageMetrics && storageMetrics.database_usage_percentage >= 90 && (
                      <span className="text-[9px] font-bold text-rose-600 dark:text-rose-400 uppercase mb-2 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" /> Storage Warning
                      </span>
                    )}

                    <div className="text-[10px] text-slate-500 dark:text-slate-400 w-full space-y-1 pt-2 border-t border-slate-150 dark:border-slate-800">
                      <div className="flex justify-between">
                        <span>Used:</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          {storageMetrics?.database_size_available ? storageMetrics.database_size_formatted : 'Unavailable'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Remaining:</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          {storageMetrics?.database_size_available ? storageMetrics.database_remaining_formatted : 'Unavailable'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Capacity:</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-300">{storageMetrics?.database_capacity_formatted}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Storage Bucket summaries */}
                {storageMetrics && storageMetrics.buckets && (
                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
                    <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">Storage Buckets Summary</span>
                    <div className="space-y-1.5">
                      {storageMetrics.buckets.map((bucket) => (
                        <div key={bucket.name} className="flex items-center justify-between text-[11px] p-2 bg-slate-50/50 dark:bg-slate-950/20 rounded-lg border border-slate-100 dark:border-slate-800">
                          <span className="font-mono text-slate-600 dark:text-slate-300 font-semibold">{bucket.name}</span>
                          <span className="text-slate-500 dark:text-slate-400 font-medium">{bucket.file_count} files • {bucket.total_formatted}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Bottom link to storage metrics */}
                <div className="pt-2">
                  <Link href="/storage">
                    <Button variant="outline" size="sm" className="w-full justify-center text-xs font-semibold">
                      <HardDrive className="h-3.5 w-3.5 mr-2 text-slate-400 dark:text-slate-500" />
                      <span>Full Storage Metrics Dashboard</span>
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
