'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { 
  Users, 
  MessageSquare, 
  Image as ImageIcon, 
  UserCheck, 
  Activity, 
  Server, 
  CheckCircle2, 
  XCircle,
  Database,
  Calendar,
  ArrowRight,
  Clock,
  ExternalLink,
  MessageCircle,
  CheckCircle,
  Info
} from 'lucide-react';
import Link from 'next/link';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { DataTable, Column } from '@/components/ui/DataTable';

interface Stats {
  total_users: number;
  total_chats: number;
  gallery_images: number;
  team_members: number;
}

interface MockConversation {
  id: string;
  user_email: string;
  time: string;
  status: 'active' | 'completed' | 'triage';
  messages: number;
}

interface MockActivity {
  id: string;
  event: string;
  category: 'system' | 'staff' | 'gallery' | 'security';
  time: string;
}

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

  useEffect(() => {
    async function verifyBackendAndFetchStats() {
      if (!session) return;
      
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001/api/v1';
      
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
        console.error('Error connecting to backend API:', error);
        setBackendStatus('error');
      } finally {
        setLoading(false);
      }
    }

    verifyBackendAndFetchStats();
  }, [session]);

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

  // Mock Conversations (Phase 1A design requirement)
  const mockConversations: MockConversation[] = [
    { id: '1', user_email: 'j.miller@patient.com', time: '10 mins ago', status: 'triage', messages: 6 },
    { id: '2', user_email: 's.adams@patient.com', time: '42 mins ago', status: 'active', messages: 4 },
    { id: '3', user_email: 'anonymous_user_44', time: '2 hours ago', status: 'completed', messages: 12 },
    { id: '4', user_email: 'k.taylor@patient.com', time: '4 hours ago', status: 'completed', messages: 8 },
  ];

  const conversationColumns: Column<MockConversation>[] = [
    {
      header: 'Patient Identity',
      accessor: (row) => (
        <div className="font-semibold text-slate-800 flex items-center gap-2">
          <div className="h-2 w-2 bg-slate-300 rounded-full" />
          <span>{row.user_email}</span>
        </div>
      ),
    },
    {
      header: 'Session Status',
      accessor: (row) => {
        const variants = {
          active: 'info' as const,
          completed: 'default' as const,
          triage: 'warning' as const,
        };
        const labels = {
          active: 'In Progress',
          completed: 'Resolved',
          triage: 'Awaiting Doctor',
        };
        return <Badge variant={variants[row.status]}>{labels[row.status]}</Badge>;
      },
    },
    {
      header: 'Exchange count',
      accessor: (row) => `${row.messages} messages`,
      className: 'text-slate-500',
    },
    {
      header: 'Recorded time',
      accessor: 'time',
      className: 'text-slate-400 font-medium',
    },
    {
      header: 'Audit link',
      accessor: () => (
        <Link href="/chat-logs" className="text-sky-600 hover:text-sky-800 inline-flex items-center gap-1 text-xs font-semibold">
          <span>Transcript</span>
          <ExternalLink className="h-3 w-3" />
        </Link>
      ),
      className: 'text-right',
    },
  ];

  // Mock System Activity (Phase 1A design requirement)
  const mockActivities: MockActivity[] = [
    { id: '1', event: 'Dr. Sarah Adams profile updated', category: 'staff', time: '35 mins ago' },
    { id: '2', event: 'New clinic entry uploaded: lobby_view.jpg', category: 'gallery', time: '1 hour ago' },
    { id: '3', event: 'Database automated replication successful', category: 'system', time: '3 hours ago' },
    { id: '4', event: 'Admin credentials login verified (admin@procare.com)', category: 'security', time: '4 hours ago' },
  ];

  const activityColumns: Column<MockActivity>[] = [
    {
      header: 'System Event',
      accessor: (row) => <span className="font-medium text-slate-700">{row.event}</span>,
    },
    {
      header: 'Category',
      accessor: (row) => {
        const variants = {
          system: 'default' as const,
          staff: 'info' as const,
          gallery: 'success' as const,
          security: 'warning' as const,
        };
        return <Badge variant={variants[row.category]}>{row.category.toUpperCase()}</Badge>;
      },
    },
    {
      header: 'Timestamp',
      accessor: 'time',
      className: 'text-slate-400 text-xs font-medium',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader 
        title="Administrative Overview" 
        description="Console diagnostics status, resource summaries, and active chatbots exchanges."
        actions={
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-500 font-semibold shadow-xs">
            <Server className={`h-4 w-4 ${backendStatus === 'connected' ? 'text-emerald-500' : 'text-slate-400'}`} />
            <span>API Status:</span>
            {backendStatus === 'checking' && <span className="text-slate-400 animate-pulse">Scanning...</span>}
            {backendStatus === 'connected' && <span className="text-emerald-600 font-bold">Online</span>}
            {backendStatus === 'error' && <span className="text-red-500 font-bold">Offline</span>}
          </div>
        }
      />

      {/* Info notice about Mock data */}
      <div className="bg-sky-50 border border-sky-100 rounded-xl p-4 flex gap-3 text-xs text-sky-800 leading-relaxed font-medium">
        <Info className="h-5 w-5 text-sky-600 shrink-0 mt-0.5" />
        <div>
          <p className="font-bold">Phase 1A Design System Blueprint</p>
          <p className="mt-0.5 text-sky-700/90 font-normal">
            The data metrics and records displayed below are mock indicators designed to simulate real operations. Database bindings will be integrated in Phase 2.
          </p>
        </div>
      </div>

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
                <div className="text-2xl font-bold text-slate-900 tracking-tight">{card.value}</div>
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
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-800 tracking-tight">Recent Chatbot Sessions</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Live monitoring of patient interactions and automated support transcripts.</p>
              </div>
              <Link href="/chat-logs">
                <Button variant="secondary" size="sm">View All</Button>
              </Link>
            </div>
            <div className="p-5">
              <DataTable 
                columns={conversationColumns} 
                data={mockConversations} 
                keyExtractor={(row) => row.id} 
              />
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div>
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden h-full flex flex-col justify-between">
            <div>
              <div className="p-5 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-800 tracking-tight">Console Activity Log</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Audit history of changes made by administrative operators.</p>
              </div>
              <div className="p-5">
                <DataTable 
                  columns={activityColumns} 
                  data={mockActivities} 
                  keyExtractor={(row) => row.id} 
                />
              </div>
            </div>
            <div className="p-5 bg-slate-50/50 border-t border-slate-100">
              <Link href="/logs">
                <Button variant="outline" size="sm" className="w-full justify-center">
                  <Clock className="h-3.5 w-3.5 mr-2" />
                  <span>Full Diagnostics Log</span>
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
