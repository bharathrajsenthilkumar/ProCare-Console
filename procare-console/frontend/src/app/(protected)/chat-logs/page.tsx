'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { 
  MessageSquare, 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  X, 
  Calendar, 
  AlertCircle,
  Download,
  Trash2,
  AlertTriangle,
  User,
  Bot
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingState } from '@/components/ui/LoadingState';
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
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || (typeof window !== 'undefined' ? '/api/v1' : 'http://localhost:8001/api/v1');
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

  // Selection, Delete & Export States
  const [selectedSessionIds, setSelectedSessionIds] = useState<string[]>([]);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isCleanupOpen, setIsCleanupOpen] = useState(false);
  const [cleanupDays, setCleanupDays] = useState<number>(30);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

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
  const fetchSessions = async () => {
    if (!session) return;
    setLoading(true);
    setError(null);
    setSelectedSessionIds([]); // Reset checkbox selection on reload

    let url = `${apiUrl}/chat-logs?page=${page}&limit=${limit}`;
    
    if (debouncedSearch) {
      url += `&search=${encodeURIComponent(debouncedSearch)}`;
    }
    if (channel) {
      url += `&channel=${encodeURIComponent(channel)}`;
    }
    if (startDate) {
      url += `&start_date=${encodeURIComponent(new Date(startDate).toISOString())}`;
    }
    if (endDate) {
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
  };

  useEffect(() => {
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

  const handleSelectSession = (id: string) => {
    setSelectedSessionIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedSessionIds.length === sessions.length) {
      setSelectedSessionIds([]);
    } else {
      setSelectedSessionIds(sessions.map((s) => s.session_id));
    }
  };

  const handleExportCSV = async () => {
    if (!session) return;
    setExportLoading(true);
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
      setExportLoading(false);
    }
  };

  const handleDeleteSelected = async () => {
    if (!session || selectedSessionIds.length === 0) return;
    setDeleteLoading(true);
    try {
      const response = await fetch(`${apiUrl}/chat-logs`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ session_ids: selectedSessionIds }),
      });
      if (response.ok) {
        setSelectedSessionIds([]);
        setIsDeleteConfirmOpen(false);
        fetchSessions();
      } else {
        alert('Failed to delete selected chatbot sessions.');
      }
    } catch (err) {
      alert('Network error while deleting chatbot logs.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleCleanupOldLogs = async () => {
    if (!session) return;
    setDeleteLoading(true);
    try {
      const response = await fetch(`${apiUrl}/chat-logs/cleanup?days=${cleanupDays}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });
      if (response.ok) {
        const resData = await response.json();
        alert(resData.message || 'Cleanup completed successfully.');
        setIsCleanupOpen(false);
        fetchSessions();
      } else {
        alert('Failed to clean up old chatbot logs.');
      }
    } catch (err) {
      alert('Network error while cleaning up old chatbot logs.');
    } finally {
      setDeleteLoading(false);
    }
  };

  // Columns configuration for conversations table
  const columns: Column<ChatSession>[] = [
    {
      header: (
        <input
          type="checkbox"
          checked={sessions.length > 0 && selectedSessionIds.length === sessions.length}
          onChange={handleSelectAll}
          className="rounded border-slate-300 text-slate-800 focus:ring-slate-500 w-4 h-4 cursor-pointer"
        />
      ),
      accessor: (row) => (
        <input
          type="checkbox"
          checked={selectedSessionIds.includes(row.session_id)}
          onChange={() => handleSelectSession(row.session_id)}
          className="rounded border-slate-300 text-slate-800 focus:ring-slate-500 w-4 h-4 cursor-pointer"
          onClick={(e) => e.stopPropagation()}
        />
      ),
      className: 'w-12 text-center whitespace-nowrap',
    },
    {
      header: 'Patient Identity',
      accessor: (row) => (
        <div className="space-y-0.5">
          <div className="font-semibold text-slate-800 dark:text-slate-100">{row.user_name}</div>
          {row.user_mobile_number !== 'N/A' && (
            <div className="text-[10px] text-slate-400 dark:text-slate-400 font-medium">{row.user_mobile_number}</div>
          )}
        </div>
      ),
      className: 'whitespace-nowrap',
    },
    {
      header: 'Channel',
      accessor: (row) => (
        <Badge variant={row.channel === 'whatsapp' ? 'success' : 'default'}>
          {row.channel.toUpperCase()}
        </Badge>
      ),
      className: 'whitespace-nowrap',
    },
    {
      header: 'Messages',
      accessor: (row) => `${row.message_count} dialogs`,
      className: 'text-slate-500 dark:text-slate-400 whitespace-nowrap',
    },
    {
      header: 'Latency (Avg)',
      accessor: (row) => (
        <span className="font-medium text-slate-600 dark:text-slate-300">
          {row.average_response_time}ms
        </span>
      ),
      className: 'whitespace-nowrap',
    },
    {
      header: 'Latest Active',
      accessor: (row) => new Date(row.latest_message_timestamp).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }),
      className: 'text-slate-400 dark:text-slate-500 text-xs font-medium whitespace-nowrap',
    },
    {
      header: 'Action',
      accessor: (row) => (
        <Button variant="outline" size="sm" onClick={() => setSelectedSessionId(row.session_id)}>
          <span>View Log</span>
        </Button>
      ),
      className: 'text-right whitespace-nowrap',
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
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              disabled={exportLoading || sessions.length === 0}
              className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 shadow-xs"
            >
              <Download className="w-4 h-4 mr-1.5" />
              {exportLoading ? 'Exporting...' : 'Export CSV'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCleanupOpen(true)}
              className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 shadow-xs"
            >
              <Trash2 className="w-4 h-4 mr-1.5" />
              Manual Cleanup
            </Button>
            {selectedSessionIds.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsDeleteConfirmOpen(true)}
                className="bg-rose-50 border-rose-200 hover:bg-rose-100 text-rose-700 shadow-xs"
              >
                <Trash2 className="w-4 h-4 mr-1.5" />
                Delete Selected ({selectedSessionIds.length})
              </Button>
            )}
            <div className="text-xs text-slate-500 dark:text-slate-400 font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-lg shadow-xs flex items-center">
              Conversations: <span className="text-slate-800 dark:text-slate-200 ml-1">{total}</span>
            </div>
          </div>
        }
      />

      {/* Filter Toolbar */}
      <Card>
        <CardContent className="!p-6 flex flex-col md:flex-row gap-4 items-center justify-between">
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
            <div className="w-full sm:w-48 sm:min-w-[180px] relative">
              <select
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
                className="block w-full border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2.5 pr-8 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-100 focus:border-transparent select-none cursor-pointer"
              >
                <option value="">All Channels</option>
                <option value="website">Website</option>
                <option value="whatsapp">WhatsApp</option>
              </select>
            </div>
          </div>

          {/* Date range filters */}
          <div className="flex flex-wrap sm:flex-nowrap gap-3 items-center w-full md:w-auto pt-2 md:pt-0 border-t border-slate-100 dark:border-slate-800 md:border-t-0">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Calendar className="h-4 w-4 text-slate-400 shrink-0" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-250 text-xs focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-100 cursor-pointer"
                title="Start Date"
              />
            </div>
            <span className="text-slate-400 text-xs hidden sm:inline">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-250 text-xs focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-100 w-full sm:w-auto cursor-pointer"
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
        <LoadingState message="Loading conversational logs..." />
      ) : error ? (
        <div className="bg-red-50 dark:bg-rose-950/20 border border-red-200 dark:border-rose-800/80 rounded-xl p-6 flex items-start gap-3 max-w-md mx-auto">
          <AlertCircle className="h-6 w-6 text-red-600 dark:text-rose-400 shrink-0" />
          <div>
            <h4 className="font-bold text-red-800 dark:text-rose-200 text-sm">System Database Error</h4>
            <p className="text-xs text-red-700 dark:text-rose-300 mt-1 leading-relaxed">{error}</p>
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
            tableClassName="min-w-[700px]"
          />

          {/* Pagination */}
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

      {/* Manual Delete Confirmation Dialog */}
      {isDeleteConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-950/20 backdrop-blur-xs" onClick={() => setIsDeleteConfirmOpen(false)} />
          <div className="bg-white border border-slate-200 shadow-xl rounded-2xl w-full max-w-md flex flex-col relative z-10 p-6 animate-scale-in">
            <div className="flex items-center gap-3 text-rose-600 mb-4">
              <AlertTriangle className="h-6 w-6" />
              <h3 className="text-base font-bold">Delete Selected Chatbot Logs?</h3>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed mb-6">
              This action permanently deletes all messages belonging to the <strong className="text-slate-800">{selectedSessionIds.length}</strong> selected chatbot dialogue sessions. This action cannot be undone.
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

      {/* Date-Based Manual Cleanup Modal */}
      {isCleanupOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-950/20 backdrop-blur-xs" onClick={() => setIsCleanupOpen(false)} />
          <div className="bg-white border border-slate-200 shadow-xl rounded-2xl w-full max-w-md flex flex-col relative z-10 p-6 animate-scale-in">
            <div className="flex items-center gap-3 text-rose-600 mb-4">
              <AlertTriangle className="h-6 w-6" />
              <h3 className="text-base font-bold">Manual Cleanup Chatbot Logs</h3>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed mb-4">
              Specify the minimum age of chat log records to target for cleanup. This operation deletes all historical messages older than your select window permanently.
            </p>
            
            <div className="space-y-1.5 mb-6">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Logs Age</label>
              <select
                value={cleanupDays}
                onChange={(e) => setCleanupDays(parseInt(e.target.value) || 30)}
                className="block w-full border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-850 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 cursor-pointer"
              >
                <option value={7}>Older than 7 days</option>
                <option value={30}>Older than 30 days</option>
                <option value={90}>Older than 90 days</option>
                <option value={180}>Older than 180 days</option>
              </select>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="secondary" size="sm" onClick={() => setIsCleanupOpen(false)} disabled={deleteLoading}>
                Cancel
              </Button>
              <Button 
                onClick={handleCleanupOldLogs} 
                disabled={deleteLoading}
                className="bg-rose-600 hover:bg-rose-700 text-white font-semibold border-rose-600 focus:ring-rose-500"
              >
                {deleteLoading ? 'Clearing...' : 'Clean Logs'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Full Transcript Viewer Overlay Modal */}
      {selectedSessionId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div className="fixed inset-0 bg-slate-950/20 backdrop-blur-xs animate-fade-in" onClick={() => setSelectedSessionId(null)} />
          
          {/* Modal Panel */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl rounded-2xl w-full max-w-3xl h-[85vh] flex flex-col relative z-10 animate-scale-in overflow-hidden">
            
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/20">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 tracking-tight">Chatbot Dialogue Transcript</h3>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 font-mono">Session ID: {selectedSessionId}</p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setSelectedSessionId(null)}
                className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-350 focus:outline-none transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Message Stream */}
            <div className="flex-1 p-6 overflow-y-auto bg-slate-50/45 dark:bg-slate-950/40 space-y-6">
              {transcriptLoading ? (
                <div className="flex flex-col items-center justify-center h-full gap-2 text-slate-400">
                  <svg className="animate-spin h-5 w-5 text-slate-600" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span className="text-xs font-semibold uppercase tracking-wider">Syncing transcript logs...</span>
                </div>
              ) : messages.length === 0 ? (
                <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-12">No messages logged in this session.</p>
              ) : (
                <div className="space-y-6 max-w-2xl mx-auto">
                  {messages.map((msg, index) => (
                    <div key={msg.serial_number || index} className="space-y-3">
                      
                      {/* 1. Patient query (right-aligned, slate backdrop) */}
                      <div className="flex items-start justify-end gap-3">
                        <div className="flex flex-col items-end max-w-[80%]">
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                            <span>{msg.user_name || 'Anonymous Patient'}</span>
                            <User className="h-3 w-3" />
                          </span>
                          <div className="bg-slate-900 dark:bg-slate-850 text-white dark:text-slate-55 p-4 rounded-2xl rounded-tr-xs text-sm shadow-sm border border-slate-950 dark:border-slate-800 font-medium leading-relaxed">
                            {msg.user_input}
                          </div>
                          <span className="text-[9px] text-slate-400 dark:text-slate-500 mt-1 font-medium">
                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>

                      {/* 2. AI grounding response (left-aligned, light gray/blue backdrop) */}
                      <div className="flex items-start gap-3">
                        <div className="flex flex-col items-start max-w-[80%]">
                          <span className="text-[10px] text-slate-400 dark:text-slate-550 font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                            <Bot className="h-3 w-3 text-sky-600" />
                            <span className="text-slate-700 dark:text-slate-300">Procare Assistant</span>
                          </span>
                          <div className="bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 text-slate-700 dark:text-slate-200 p-4 rounded-2xl rounded-tl-xs text-sm shadow-xs leading-relaxed">
                            {msg.ai_response}
                          </div>
                          
                          {/* Grounding and Response Telemetry */}
                          <div className="flex flex-wrap items-center gap-2 mt-2">
                            <span className="text-[9px] text-slate-400 dark:text-slate-500 font-medium">
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
                                <span className="text-[9px] text-slate-400 dark:text-slate-450 font-semibold bg-slate-100 dark:bg-slate-950 px-1 py-0.2 rounded border border-slate-200/50 dark:border-slate-800">
                                  Tokens: {msg.total_tokens}
                                </span>
                              </>
                            )}

                            {msg.max_similarity_score !== null && (
                              <>
                                <span className="text-[9px] text-slate-300">|</span>
                                <span className="text-[9px] text-slate-400 dark:text-slate-450 font-semibold bg-slate-100 dark:bg-slate-950 px-1 py-0.2 rounded border border-slate-200/50 dark:border-slate-800">
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
            <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 flex justify-end">
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
