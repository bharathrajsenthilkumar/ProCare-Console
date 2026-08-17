'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { 
  Users, 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  X, 
  Clock, 
  ExternalLink, 
  MessageSquare, 
  AlertCircle,
  Phone,
  Download,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent } from '@/components/ui/Card';
import { DataTable, Column } from '@/components/ui/DataTable';
import Link from 'next/link';

interface User {
  id: string;
  user_name: string | null;
  mobile_number: string | null;
  whatsapp_verified: boolean | null;
  created_at: string;
  updated_at: string;
}

interface Session {
  session_id: string;
  channel: string;
  latest_message_timestamp: string;
}

export default function UsersPage() {
  const { session } = useAuth();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || (typeof window !== 'undefined' ? '/api/v1' : 'http://localhost:8001/api/v1');
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Search & Pagination States
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;

  // Detail Modal States
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [userDetail, setUserDetail] = useState<User | null>(null);
  const [userSessions, setUserSessions] = useState<Session[]>([]);

  // Selection, Delete & Export States
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
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

  // Fetch Users function (made accessible to other actions)
  const fetchUsers = async () => {
    if (!session) return;
    setLoading(true);
    setError(null);
    setSelectedUserIds([]); // Reset selection on page refresh/fetch
    
    let url = `${apiUrl}/users?page=${page}&limit=${limit}`;
    if (debouncedSearch) {
      url += `&search=${encodeURIComponent(debouncedSearch)}`;
    }

    try {
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users);
        setTotal(data.total);
      } else {
        setError('Failed to retrieve patient registry.');
      }
    } catch (err) {
      setError('Network error: Unable to reach backend server.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch Users on parameters change
  useEffect(() => {
    fetchUsers();
  }, [session, page, debouncedSearch]);

  // Fetch User details (including related sessions)
  useEffect(() => {
    const accessToken = session?.access_token;
    if (!selectedUserId || !accessToken) {
      setUserDetail(null);
      setUserSessions([]);
      return;
    }
    
    async function fetchUserDetail() {
      setDetailLoading(true);
      
      try {
        const response = await fetch(`${apiUrl}/users/${selectedUserId}`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setUserDetail(data.user);
          setUserSessions(data.sessions);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setDetailLoading(false);
      }
    }

    fetchUserDetail();
  }, [selectedUserId, session]);

  const handleSelectUser = (id: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedUserIds.length === users.length) {
      setSelectedUserIds([]);
    } else {
      setSelectedUserIds(users.map((u) => u.id));
    }
  };

  const handleExportCSV = async () => {
    if (!session) return;
    setExportLoading(true);
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
        alert('Failed to export users data.');
      }
    } catch (err) {
      alert('Network error while exporting users.');
    } finally {
      setExportLoading(false);
    }
  };

  const handleDeleteSelected = async () => {
    if (!session || selectedUserIds.length === 0) return;
    setDeleteLoading(true);
    try {
      const response = await fetch(`${apiUrl}/users`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ ids: selectedUserIds }),
      });
      if (response.ok) {
        setSelectedUserIds([]);
        setIsDeleteConfirmOpen(false);
        fetchUsers();
      } else {
        alert('Failed to delete selected users.');
      }
    } catch (err) {
      alert('Network error while deleting users.');
    } finally {
      setDeleteLoading(false);
    }
  };

  // Columns configuration for Users table
  const columns: Column<User>[] = [
    {
      header: (
        <input
          type="checkbox"
          checked={users.length > 0 && selectedUserIds.length === users.length}
          onChange={handleSelectAll}
          className="rounded border-slate-300 text-slate-800 focus:ring-slate-500 w-4 h-4 cursor-pointer"
        />
      ),
      accessor: (row) => (
        <input
          type="checkbox"
          checked={selectedUserIds.includes(row.id)}
          onChange={() => handleSelectUser(row.id)}
          className="rounded border-slate-300 text-slate-800 focus:ring-slate-500 w-4 h-4 cursor-pointer"
          onClick={(e) => e.stopPropagation()}
        />
      ),
      className: 'w-12 text-center',
    },
    {
      header: 'Patient Name',
      accessor: (row) => (
        <div className="font-semibold text-slate-800 dark:text-slate-100">
          {row.user_name || 'Anonymous Patient'}
        </div>
      ),
    },
    {
      header: 'Mobile Number',
      accessor: (row) => row.mobile_number || 'Not provided',
      className: 'text-slate-600 dark:text-slate-400',
    },
    {
      header: 'WhatsApp Status',
      accessor: (row) => (
        <Badge variant={row.whatsapp_verified ? 'success' : 'default'}>
          {row.whatsapp_verified ? 'Verified' : 'Unverified'}
        </Badge>
      ),
    },
    {
      header: 'Created At',
      accessor: (row) => new Date(row.created_at).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      }),
      className: 'text-slate-500 dark:text-slate-400 text-xs font-medium',
    },
    {
      header: 'Action',
      accessor: (row) => (
        <Button variant="outline" size="sm" onClick={() => setSelectedUserId(row.id)}>
          <span>View Profile</span>
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
        title="User Profiles & Portal Directory" 
        description="Oversee registered patient logins, diagnostic permissions, and physician administrator portal access."
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              disabled={exportLoading || users.length === 0}
              className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 shadow-xs"
            >
              <Download className="w-4 h-4 mr-1.5" />
              {exportLoading ? 'Exporting...' : 'Export CSV'}
            </Button>
            {selectedUserIds.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsDeleteConfirmOpen(true)}
                className="bg-rose-50 border-rose-200 hover:bg-rose-100 text-rose-700 shadow-xs"
              >
                <Trash2 className="w-4 h-4 mr-1.5" />
                Delete Selected ({selectedUserIds.length})
              </Button>
            )}
            <div className="text-xs text-slate-500 dark:text-slate-400 font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-lg shadow-xs flex items-center">
              Total Patients: <span className="text-slate-800 dark:text-slate-200 ml-1">{total}</span>
            </div>
          </div>
        }
      />

      {/* Search Filter Panel */}
      <Card>
        <CardContent className="!p-6 flex flex-col sm:flex-row gap-4 items-center">
          <div className="relative w-full sm:max-w-xs">
            <Input
              id="search"
              placeholder="Search by name or mobile..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              icon={<Search className="h-4 w-4" />}
            />
          </div>
        </CardContent>
      </Card>

      {/* Main Content Area */}
      {loading ? (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-12 flex flex-col items-center justify-center gap-3">
          <svg className="animate-spin h-6 w-6 text-slate-800 dark:text-slate-200" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-xs text-slate-400 dark:text-slate-500 font-semibold tracking-wider uppercase">Fetching user accounts...</span>
        </div>
      ) : error ? (
        <div className="bg-red-50 dark:bg-red-950/10 border border-red-200 dark:border-red-800 rounded-xl p-6 flex items-start gap-3 max-w-md mx-auto">
          <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400 shrink-0" />
          <div>
            <h4 className="font-bold text-red-800 dark:text-red-200 text-sm">System Database Error</h4>
            <p className="text-xs text-red-700 dark:text-red-400 mt-1 leading-relaxed">{error}</p>
          </div>
        </div>
      ) : users.length === 0 ? (
        <EmptyState 
          icon={Users}
          title="No users match your criteria"
          description="We couldn't find any registered patients matching your search keywords. Double-check your spelling or verify OTP setups."
        />
      ) : (
        <div className="space-y-4">
          <DataTable 
            columns={columns} 
            data={users} 
            keyExtractor={(row) => row.id} 
          />

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm rounded-xl px-5 py-4">
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Showing page <span className="font-semibold text-slate-700 dark:text-slate-350">{page}</span> of <span className="font-semibold text-slate-700 dark:text-slate-350">{totalPages}</span>
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
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl rounded-2xl w-full max-w-md flex flex-col relative z-10 p-6 animate-scale-in">
            <div className="flex items-center gap-3 text-rose-600 mb-4">
              <AlertTriangle className="h-6 w-6" />
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">Delete Selected Users?</h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-6">
              You are about to permanently delete <strong className="text-slate-800 dark:text-slate-200">{selectedUserIds.length}</strong> selected user records. This action cannot be undone and will remove all their portal configurations.
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

      {/* Patient Profile Detail Modal */}
      {selectedUserId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div className="fixed inset-0 bg-slate-950/20 backdrop-blur-xs" onClick={() => setSelectedUserId(null)} />
          
          {/* Modal Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl rounded-2xl w-full max-w-xl max-h-[85vh] flex flex-col relative z-10 animate-scale-in overflow-hidden">
            
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/20">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 tracking-tight">Patient Registry Profile</h3>
              </div>
              <button 
                type="button" 
                onClick={() => setSelectedUserId(null)}
                className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-350 focus:outline-none transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {detailLoading ? (
                <div className="flex flex-col items-center justify-center py-12 gap-2 text-slate-400">
                  <svg className="animate-spin h-5 w-5 text-slate-600" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span className="text-xs font-semibold uppercase tracking-wider">Syncing credentials...</span>
                </div>
              ) : userDetail ? (
                <div className="space-y-6">
                  {/* Primary Info Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100/85 dark:border-slate-700">
                      <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">Full Name</span>
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-100 mt-1">{userDetail.user_name || 'Anonymous'}</p>
                    </div>
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100/85 dark:border-slate-700">
                      <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">Mobile Number</span>
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-100 mt-1 flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                        {userDetail.mobile_number || 'N/A'}
                      </p>
                    </div>
                  </div>

                  {/* Metadata Fields */}
                  <div className="space-y-3.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-400 dark:text-slate-550 font-semibold">User Unique ID:</span>
                      <span className="font-mono text-[11px] text-slate-600 dark:text-slate-350 bg-slate-50 dark:bg-slate-950 px-2 py-0.5 rounded border border-slate-100 dark:border-slate-800">{userDetail.id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 dark:text-slate-550 font-semibold">WhatsApp Verification:</span>
                      <Badge variant={userDetail.whatsapp_verified ? 'success' : 'default'}>
                        {userDetail.whatsapp_verified ? 'SMS Verified' : 'Unverified Account'}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 dark:text-slate-550 font-semibold">Profile Created:</span>
                      <span className="text-slate-700 dark:text-slate-300 font-medium">{new Date(userDetail.created_at).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 dark:text-slate-550 font-semibold">Last Profile Update:</span>
                      <span className="text-slate-700 dark:text-slate-300 font-medium">{new Date(userDetail.updated_at).toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Connected Chat Sessions list */}
                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-3">Related Chat Sessions</h4>
                    {userSessions.length === 0 ? (
                      <div className="flex items-center gap-2 p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-xs text-slate-400 dark:text-slate-500 border border-slate-100 dark:border-slate-700">
                        <MessageSquare className="h-4 w-4 shrink-0" />
                        <span>No historical chat sessions matched for this user.</span>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {userSessions.map((session) => (
                          <div 
                            key={session.session_id}
                            className="flex items-center justify-between p-3.5 bg-slate-50/50 dark:bg-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/70 border border-slate-150 dark:border-slate-700 rounded-xl text-xs transition-colors"
                          >
                            <div className="space-y-1">
                              <span className="font-mono text-slate-700 dark:text-slate-300 font-semibold">{session.session_id.substring(0, 16)}...</span>
                              <div className="flex items-center gap-2 text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                                <Clock className="h-3 w-3" />
                                <span>{new Date(session.latest_message_timestamp).toLocaleDateString()}</span>
                                <Badge variant="default" className="text-[9px] px-1 py-0">{session.channel.toUpperCase()}</Badge>
                              </div>
                            </div>
                            <Link 
                              href="/chat-logs" 
                              onClick={() => setSelectedUserId(null)}
                              className="text-sky-600 hover:text-sky-850 dark:text-sky-400 dark:hover:text-sky-300 font-bold flex items-center gap-1 cursor-pointer"
                            >
                              <span>Inspect Session</span>
                              <ExternalLink className="h-3.5 w-3.5" />
                            </Link>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-400 dark:text-slate-500 text-center">Unable to load details.</p>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 flex justify-end">
              <Button variant="secondary" size="sm" onClick={() => setSelectedUserId(null)}>
                <span>Dismiss</span>
              </Button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
