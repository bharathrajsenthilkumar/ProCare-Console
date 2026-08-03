'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { 
  MessageSquare, 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  X, 
  Filter, 
  Calendar, 
  Clock, 
  Sparkles, 
  AlertCircle,
  Database,
  ArrowRight,
  User,
  Bot,
  Layers,
  HelpCircle,
  TrendingUp
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent } from '@/components/ui/Card';
import { DataTable, Column } from '@/components/ui/DataTable';

interface ChatSession {
  session_id: string;
  user_name: string;
  user_mobile_number: string;
  channel: string;
  message_count: number;
  latest_message_timestamp: string;
  average_response_time: number;
}

interface ChatMessage {
  serial_number: number;
  id: string;
  session_id: string;
  user_name: string | null;
  user_mobile_number: string | null;
  channel: string;
  user_input: string;
  ai_response: string;
  response_time_ms: number;
  input_tokens: number | null;
  output_tokens: number | null;
  total_tokens: number | null;
  retrieval_method: string | null;
  matched_faq_ids: number[] | null;
  max_similarity_score: number | null;
  match_count: number | null;
  created_at: string;
}

export default function ChatLogsPage() {
  const { session } = useAuth();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter & Pagination States
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [channel, setChannel] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;

  // Detail Transcript States
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [transcriptLoading, setTranscriptLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  // Debounce search input (400ms delay)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // Reset page on search
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  // Reset page when other filters change
  useEffect(() => {
    setPage(1);
  }, [channel, startDate, endDate]);

  // Fetch Chat Sessions
  useEffect(() => {
    async function fetchSessions() {
      if (!session) return;
      setLoading(true);
      setError(null);

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001/api/v1';
      let url = `${apiUrl}/chat-logs?page=${page}&limit=${limit}`;
      
      if (debouncedSearch) {
        url += `&search=${encodeURIComponent(debouncedSearch)}`;
      }
      if (channel) {
        url += `&channel=${encodeURIComponent(channel)}`;
      }
      if (startDate) {
        // Convert local date to start-of-day ISO string
        url += `&start_date=${encodeURIComponent(new Date(startDate).toISOString())}`;
      }
      if (endDate) {
        // Convert local date to end-of-day ISO string
        const dateEnd = new Date(endDate);
        dateEnd.setHours(23, 59, 59, 999);
        url += `&end_date=${encodeURIComponent(dateEnd.toISOString())}`;
      }

      try {
        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        });
        if (response.ok) {
          const data = await response.json();
          setSessions(data.sessions);
          setTotal(data.total);
        } else {
          setError('Failed to retrieve chatbot conversations.');
        }
      } catch (err) {
        setError('Network error: Unable to reach backend server.');
      } finally {
        setLoading(false);
      }
    }

    fetchSessions();
  }, [session, page, debouncedSearch, channel, startDate, endDate]);

  // Fetch Transcript Details
  useEffect(() => {
    const accessToken = session?.access_token;
    if (!selectedSessionId || !accessToken) {
      setMessages([]);
      return;
    }

    async function fetchTranscript() {
      setTranscriptLoading(true);
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001/api/v1';

      try {
        const response = await fetch(`${apiUrl}/chat-logs/${selectedSessionId}`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setMessages(data.messages);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setTranscriptLoading(false);
      }
    }

    fetchTranscript();
  }, [selectedSessionId, session]);

  // Columns configuration for conversations table
  const columns: Column<ChatSession>[] = [
    {
      header: 'Session ID',
      accessor: (row) => (
        <span className="font-mono text-xs font-semibold text-slate-500 bg-slate-50 border border-slate-100/80 px-2 py-0.5 rounded">
          {row.session_id.substring(0, 12)}...
        </span>
      ),
    },
    {
      header: 'Patient Identity',
      accessor: (row) => (
        <div className="space-y-0.5">
          <div className="font-semibold text-slate-800">{row.user_name}</div>
          {row.user_mobile_number !== 'N/A' && (
            <div className="text-[10px] text-slate-400 font-medium">{row.user_mobile_number}</div>
          )}
        </div>
      ),
    },
    {
      header: 'Channel',
      accessor: (row) => (
        <Badge variant={row.channel === 'whatsapp' ? 'success' : 'default'}>
          {row.channel.toUpperCase()}
        </Badge>
      ),
    },
    {
      header: 'Messages',
      accessor: (row) => `${row.message_count} dialogs`,
      className: 'text-slate-500',
    },
    {
      header: 'Latency (Avg)',
      accessor: (row) => (
        <span className="font-medium text-slate-600">
          {row.average_response_time}ms
        </span>
      ),
    },
    {
      header: 'Latest Active',
      accessor: (row) => new Date(row.latest_message_timestamp).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }),
      className: 'text-slate-400 text-xs font-medium',
    },
    {
      header: 'Action',
      accessor: (row) => (
        <Button variant="outline" size="sm" onClick={() => setSelectedSessionId(row.session_id)}>
          <span>View Log</span>
        </Button>
      ),
      className: 'text-right',
    },
  ];

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader 
        title="Chatbot Exchange Transcripts" 
        description="Review historical dialogue sessions, triage intents, and patient-chatbot messaging scores."
        actions={
          <div className="text-xs text-slate-500 font-bold bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-xs">
            Conversations: <span className="text-slate-800">{total}</span>
          </div>
        }
      />

      {/* Filter Toolbar */}
      <Card>
        <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-3 items-center w-full md:w-auto">
            {/* Search Input */}
            <div className="relative w-full sm:max-w-xs">
              <Input
                id="search"
                placeholder="Search text or identity..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                icon={<Search className="h-4 w-4" />}
              />
            </div>
            
            {/* Channel Filter */}
            <div className="w-full sm:w-40 relative">
              <select
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
                className="block w-full border border-slate-200 rounded-lg px-3 py-2.5 bg-white text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent select-none cursor-pointer"
              >
                <option value="">All Channels</option>
                <option value="website">Website</option>
                <option value="whatsapp">WhatsApp</option>
              </select>
            </div>
          </div>

          {/* Date range filters */}
          <div className="flex flex-wrap sm:flex-nowrap gap-3 items-center w-full md:w-auto pt-2 md:pt-0 border-t border-slate-100 md:border-t-0">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Calendar className="h-4 w-4 text-slate-400 shrink-0" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 text-xs focus:outline-none focus:ring-2 focus:ring-slate-900 cursor-pointer"
                title="Start Date"
              />
            </div>
            <span className="text-slate-400 text-xs hidden sm:inline">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 text-xs focus:outline-none focus:ring-2 focus:ring-slate-900 w-full sm:w-auto cursor-pointer"
              title="End Date"
            />
            
            {(startDate || endDate || channel || search) && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  setSearch('');
                  setChannel('');
                  setStartDate('');
                  setEndDate('');
                }}
                className="text-slate-400 hover:text-slate-600 px-2.5 text-xs font-bold"
              >
                Clear Filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Main Table Area */}
      {loading ? (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-12 flex flex-col items-center justify-center gap-3">
          <svg className="animate-spin h-6 w-6 text-slate-800" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-xs text-slate-400 font-semibold tracking-wider uppercase">Loading conversational logs...</span>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 flex items-start gap-3 max-w-md mx-auto">
          <AlertCircle className="h-6 w-6 text-red-600 shrink-0" />
          <div>
            <h4 className="font-bold text-red-800 text-sm">System Database Error</h4>
            <p className="text-xs text-red-700 mt-1 leading-relaxed">{error}</p>
          </div>
        </div>
      ) : sessions.length === 0 ? (
        <EmptyState 
          icon={MessageSquare}
          title="No transcripts match your filters"
          description="Try broadening your keyword search or adjusting the date range filters."
        />
      ) : (
        <div className="space-y-4">
          <DataTable 
            columns={columns} 
            data={sessions} 
            keyExtractor={(row) => row.session_id} 
          />

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between bg-white border border-slate-200/80 shadow-sm rounded-xl px-5 py-4">
              <div className="text-xs text-slate-500">
                Showing page <span className="font-semibold text-slate-700">{page}</span> of <span className="font-semibold text-slate-700">{totalPages}</span>
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

      {/* Full Transcript Viewer Overlay Modal */}
      {selectedSessionId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div className="fixed inset-0 bg-slate-950/20 backdrop-blur-xs animate-fade-in" onClick={() => setSelectedSessionId(null)} />
          
          {/* Modal Panel */}
          <div className="bg-white border border-slate-200 shadow-xl rounded-2xl w-full max-w-3xl h-[85vh] flex flex-col relative z-10 animate-scale-in overflow-hidden">
            
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-slate-600" />
                <div>
                  <h3 className="text-sm font-bold text-slate-800 tracking-tight">Chatbot Dialogue Transcript</h3>
                  <p className="text-[10px] text-slate-400 mt-0.5 font-mono">Session ID: {selectedSessionId}</p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setSelectedSessionId(null)}
                className="text-slate-400 hover:text-slate-600 focus:outline-none transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Message Stream */}
            <div className="flex-1 p-6 overflow-y-auto bg-slate-50/45 space-y-6">
              {transcriptLoading ? (
                <div className="flex flex-col items-center justify-center h-full gap-2 text-slate-400">
                  <svg className="animate-spin h-5 w-5 text-slate-600" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span className="text-xs font-semibold uppercase tracking-wider">Syncing transcript logs...</span>
                </div>
              ) : messages.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-12">No messages logged in this session.</p>
              ) : (
                <div className="space-y-6 max-w-2xl mx-auto">
                  {messages.map((msg, index) => (
                    <div key={msg.serial_number || index} className="space-y-3">
                      
                      {/* 1. Patient query (right-aligned, slate backdrop) */}
                      <div className="flex items-start justify-end gap-3">
                        <div className="flex flex-col items-end max-w-[80%]">
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                            <span>{msg.user_name || 'Anonymous Patient'}</span>
                            <User className="h-3 w-3" />
                          </span>
                          <div className="bg-slate-900 text-white p-4 rounded-2xl rounded-tr-xs text-sm shadow-sm border border-slate-950 font-medium leading-relaxed">
                            {msg.user_input}
                          </div>
                          <span className="text-[9px] text-slate-400 mt-1 font-medium">
                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>

                      {/* 2. AI grounding response (left-aligned, light gray/blue backdrop) */}
                      <div className="flex items-start gap-3">
                        <div className="flex flex-col items-start max-w-[80%]">
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                            <Bot className="h-3 w-3 text-sky-600" />
                            <span className="text-slate-700">Procare Assistant</span>
                          </span>
                          <div className="bg-white border border-slate-200/90 text-slate-700 p-4 rounded-2xl rounded-tl-xs text-sm shadow-xs leading-relaxed">
                            {msg.ai_response}
                          </div>
                          
                          {/* Grounding and Response Telemetry */}
                          <div className="flex flex-wrap items-center gap-2 mt-2">
                            <span className="text-[9px] text-slate-400 font-medium">
                              {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <span className="text-[9px] text-slate-300">|</span>
                            <Badge variant="default" className="text-[9px] font-mono px-1 py-0">{msg.response_time_ms}ms</Badge>
                            
                            {msg.retrieval_method && (
                              <>
                                <span className="text-[9px] text-slate-300">|</span>
                                <Badge 
                                  variant={msg.retrieval_method === 'no_match' ? 'danger' : 'info'} 
                                  className="text-[9px] px-1 py-0"
                                >
                                  {msg.retrieval_method.toUpperCase()}
                                </Badge>
                              </>
                            )}

                            {msg.total_tokens && (
                              <>
                                <span className="text-[9px] text-slate-300">|</span>
                                <span className="text-[9px] text-slate-400 font-semibold bg-slate-100 px-1 py-0.2 rounded border border-slate-200/50">
                                  Tokens: {msg.total_tokens}
                                </span>
                              </>
                            )}

                            {msg.max_similarity_score !== null && (
                              <>
                                <span className="text-[9px] text-slate-300">|</span>
                                <span className="text-[9px] text-slate-400 font-semibold bg-slate-100 px-1 py-0.2 rounded border border-slate-200/50">
                                  Similarity: {Number(msg.max_similarity_score).toFixed(2)}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end">
              <Button variant="secondary" size="sm" onClick={() => setSelectedSessionId(null)}>
                <span>Close</span>
              </Button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
