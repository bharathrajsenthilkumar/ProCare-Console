'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { 
  Calendar, 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  X, 
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent } from '@/components/ui/Card';
import { DataTable, Column } from '@/components/ui/DataTable';

interface Appointment {
  id: string;
  patient_name: string | null;
  phone_number: string | null;
  whatsapp_number: string | null;
  appointment_date: string | null;
  start_time: string | null;
  end_time: string | null;
  created_at: string;
}

export default function AppointmentsPage() {
  const { session } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Search, Filter, & Pagination States
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [date, setDate] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;

  // Debounce search input (400ms delay)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // Reset page on search
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  // Reset page when date filter changes
  useEffect(() => {
    setPage(1);
  }, [date]);

  const fetchAppointments = async () => {
    if (!session) return;
    setLoading(true);
    setError(null);
    
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001/api/v1';
    let url = `${apiUrl}/appointments?page=${page}&limit=${limit}`;
    
    if (debouncedSearch) {
      url += `&search=${encodeURIComponent(debouncedSearch)}`;
    }
    if (date) {
      url += `&date=${encodeURIComponent(date)}`;
    }

    try {
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setAppointments(data.appointments);
        setTotal(data.total);
      } else {
        setError('Failed to retrieve appointments registry.');
      }
    } catch (err) {
      setError('Network error: Unable to reach backend server.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch Appointments on mount and parameter changes
  useEffect(() => {
    fetchAppointments();
  }, [session, page, debouncedSearch, date]);

  // Columns configuration for Appointments table
  const columns: Column<Appointment>[] = [
    {
      header: 'Patient Name',
      accessor: (row) => (
        <div className="font-semibold text-slate-800 dark:text-slate-100">
          {row.patient_name || 'Anonymous Patient'}
        </div>
      ),
    },
    {
      header: 'Phone Number',
      accessor: (row) => row.phone_number || 'N/A',
      className: 'text-slate-600 dark:text-slate-400',
    },
    {
      header: 'WhatsApp Number',
      accessor: (row) => row.whatsapp_number || 'N/A',
      className: 'text-slate-600 dark:text-slate-400',
    },
    {
      header: 'Appointment Date',
      accessor: (row) => {
        if (!row.appointment_date) return 'N/A';
        try {
          const d = new Date(row.appointment_date);
          return d.toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          });
        } catch {
          return row.appointment_date;
        }
      },
      className: 'text-slate-700 dark:text-slate-300 font-semibold',
    },
    {
      header: 'Schedule (Time)',
      accessor: (row) => {
        const start = row.start_time ? row.start_time.substring(0, 5) : 'N/A';
        const end = row.end_time ? row.end_time.substring(0, 5) : 'N/A';
        return (
          <Badge variant="info">
            {start} - {end}
          </Badge>
        );
      },
    },
    {
      header: 'Created At',
      accessor: (row) => {
        try {
          return new Date(row.created_at).toLocaleString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });
        } catch {
          return 'N/A';
        }
      },
      className: 'text-slate-400 dark:text-slate-500 text-xs font-medium',
    },
  ];

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader 
        title="Appointments Management" 
        description="Inspect booking requests, review practitioner schedules, and manage patient appointments."
        actions={
          <div className="flex gap-2">
            <div className="text-xs text-slate-500 dark:text-slate-400 font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-lg shadow-xs flex items-center">
              Total Appointments: <span className="text-slate-800 dark:text-slate-200 ml-1">{total}</span>
            </div>
            <Button 
              onClick={fetchAppointments} 
              variant="outline" 
              size="sm"
              disabled={loading}
              className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-xs"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        }
      />

      {/* Search Filter Panel */}
      <Card>
        <CardContent className="!p-6 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative w-full sm:max-w-xs">
            <Input
              id="search"
              placeholder="Search by patient or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              icon={<Search className="h-4 w-4" />}
            />
          </div>
          <div className="relative w-full sm:max-w-xs flex items-center gap-2">
            <span className="text-xs text-slate-400 font-semibold uppercase shrink-0">Filter Date:</span>
            <div className="relative w-full">
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                icon={<Calendar className="h-4 w-4 text-slate-400" />}
              />
            </div>
            {date && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setDate('')} 
                className="p-1 hover:bg-slate-50 text-slate-400 hover:text-slate-650"
                title="Clear date filter"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
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
          <span className="text-xs text-slate-400 dark:text-slate-500 font-semibold tracking-wider uppercase">Fetching appointments...</span>
        </div>
      ) : error ? (
        <div className="bg-red-50 dark:bg-red-950/10 border border-red-200 dark:border-red-800 rounded-xl p-6 flex items-start gap-3 max-w-md mx-auto">
          <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400 shrink-0" />
          <div>
            <h4 className="font-bold text-red-800 dark:text-red-200 text-sm">System Database Error</h4>
            <p className="text-xs text-red-700 dark:text-red-400 mt-1 leading-relaxed">{error}</p>
          </div>
        </div>
      ) : appointments.length === 0 ? (
        <EmptyState 
          icon={Calendar}
          title="No booking records found"
          description="We couldn't find any registered patient appointments matching your search query or selected date. Adjust your filters or verify the patient database."
        />
      ) : (
        <div className="space-y-4">
          <DataTable 
            columns={columns} 
            data={appointments} 
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
    </div>
  );
}
