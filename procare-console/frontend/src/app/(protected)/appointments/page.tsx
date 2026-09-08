'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { 
  Calendar, 
  Clock,
  Search, 
  ChevronLeft, 
  ChevronRight, 
  X, 
  AlertCircle,
  AlertTriangle,
  RefreshCw,
  Phone,
  MessageCircle,
  ExternalLink,
  CheckCircle2,
  Check,
  ShieldCheck,
  Filter,
  Lock,
  List,
  CalendarDays
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent } from '@/components/ui/Card';
import { DataTable, Column } from '@/components/ui/DataTable';
import dynamic from 'next/dynamic';

const AppointmentCalendar = dynamic(() => import('@/components/AppointmentCalendar'), {
  ssr: false,
  loading: () => (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-16 flex flex-col items-center justify-center gap-3">
      <RefreshCw className="animate-spin h-7 w-7 text-sky-500" />
      <span className="text-xs text-slate-400 dark:text-slate-500 font-semibold tracking-wider uppercase">Loading Calendar View...</span>
    </div>
  ),
});

export type AppointmentStatus = 'pending' | 'confirmed' | 'visited' | 'canceled' | 'no_show';

export interface Appointment {
  id: string;
  patient_name: string | null;
  phone_number: string | null;
  whatsapp_number: string | null;
  appointment_date: string | null;
  start_time: string | null;
  end_time: string | null;
  status: AppointmentStatus;
  created_at: string;
}

export interface StatusConfigItem {
  key: AppointmentStatus;
  label: string;
  sublabel: string;
  dotColor: string;
  activeBg: string;
  activeBorder: string;
  activeText: string;
  activeRing: string;
  badgeClass: string;
}

export const STATUS_LIST: StatusConfigItem[] = [
  {
    key: 'pending',
    label: 'Pending',
    sublabel: 'Default state on booking',
    dotColor: 'bg-amber-500',
    activeBg: 'bg-amber-50/90 dark:bg-amber-950/50',
    activeBorder: 'border-amber-400 dark:border-amber-600',
    activeText: 'text-amber-900 dark:text-amber-200',
    activeRing: 'ring-2 ring-amber-400/40',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800/70',
  },
  {
    key: 'confirmed',
    label: 'Confirmed / Called',
    sublabel: 'Admin verified & confirmed',
    dotColor: 'bg-sky-500',
    activeBg: 'bg-sky-50/90 dark:bg-sky-950/50',
    activeBorder: 'border-sky-400 dark:border-sky-600',
    activeText: 'text-sky-900 dark:text-sky-200',
    activeRing: 'ring-2 ring-sky-400/40',
    badgeClass: 'bg-sky-50 text-sky-800 border-sky-300 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800/70',
  },
  {
    key: 'visited',
    label: 'Visited',
    sublabel: 'Patient arrived & attended',
    dotColor: 'bg-emerald-500',
    activeBg: 'bg-emerald-50/90 dark:bg-emerald-950/50',
    activeBorder: 'border-emerald-400 dark:border-emerald-600',
    activeText: 'text-emerald-900 dark:text-emerald-200',
    activeRing: 'ring-2 ring-emerald-400/40',
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800/70',
  },
  {
    key: 'canceled',
    label: 'Canceled',
    sublabel: 'Patient or clinic canceled',
    dotColor: 'bg-rose-500',
    activeBg: 'bg-rose-50/90 dark:bg-rose-950/50',
    activeBorder: 'border-rose-400 dark:border-rose-600',
    activeText: 'text-rose-900 dark:text-rose-200',
    activeRing: 'ring-2 ring-rose-400/40',
    badgeClass: 'bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800/70',
  },
  {
    key: 'no_show',
    label: 'No-Show',
    sublabel: 'Patient missed scheduled time',
    dotColor: 'bg-slate-400',
    activeBg: 'bg-slate-100 dark:bg-slate-800/80',
    activeBorder: 'border-slate-400 dark:border-slate-600',
    activeText: 'text-slate-900 dark:text-slate-100',
    activeRing: 'ring-2 ring-slate-400/40',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800/80 dark:text-slate-300 dark:border-slate-700',
  },
];

export const STATUS_MAP = STATUS_LIST.reduce<Record<AppointmentStatus, StatusConfigItem>>(
  (acc, item) => {
    acc[item.key] = item;
    return acc;
  },
  {} as Record<AppointmentStatus, StatusConfigItem>
);

/**
 * Accurately parses an appointment date and time into a JavaScript Date object.
 * Supports: YYYY-MM-DD, DD-MM-YYYY, DD/MM/YYYY, YYYY/MM/DD, and ISO timestamps.
 */
export function parseAppointmentDateTime(dateStr: string | null, timeStr: string | null): Date | null {
  if (!dateStr) return null;

  try {
    let year: number = 0;
    let month: number = 0; // 0-indexed
    let day: number = 0;

    const cleanDate = dateStr.trim().split('T')[0];

    if (cleanDate.includes('-')) {
      const parts = cleanDate.split('-').map((p) => parseInt(p, 10));
      if (parts[0] > 1000) {
        // YYYY-MM-DD
        [year, month, day] = [parts[0], parts[1] - 1, parts[2]];
      } else {
        // DD-MM-YYYY
        [day, month, year] = [parts[0], parts[1] - 1, parts[2]];
      }
    } else if (cleanDate.includes('/')) {
      const parts = cleanDate.split('/').map((p) => parseInt(p, 10));
      if (parts[0] > 1000) {
        // YYYY/MM/DD
        [year, month, day] = [parts[0], parts[1] - 1, parts[2]];
      } else {
        // DD/MM/YYYY
        [day, month, year] = [parts[0], parts[1] - 1, parts[2]];
      }
    } else {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return null;
      return d;
    }

    if (isNaN(year) || isNaN(month) || isNaN(day)) {
      return null;
    }

    let hours = 23;
    let minutes = 59;
    let seconds = 59;

    if (timeStr && timeStr.trim()) {
      const cleanTime = timeStr.trim();
      const timeParts = cleanTime.split(':').map((p) => parseInt(p, 10));
      if (!isNaN(timeParts[0])) hours = timeParts[0];
      if (!isNaN(timeParts[1])) minutes = timeParts[1];
      if (timeParts.length > 2 && !isNaN(timeParts[2])) seconds = timeParts[2];
    }

    return new Date(year, month, day, hours, minutes, seconds);
  } catch {
    return null;
  }
}

/**
 * Calculates the exact end Date for an appointment based on its appointment_date and end_time.
 */
export function getAppointmentEndDateTime(appointment: Appointment): Date | null {
  const timeToUse = appointment.end_time || appointment.start_time;
  return parseAppointmentDateTime(appointment.appointment_date, timeToUse);
}

/**
 * Evaluates whether an appointment's scheduled end time has strictly passed.
 */
export function isAppointmentExpired(appointment: Appointment): boolean {
  const endDateTime = getAppointmentEndDateTime(appointment);
  if (!endDateTime) return false;
  return Date.now() > endDateTime.getTime();
}

export default function AppointmentsPage() {
  const { session } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Search, Status Filter, View Mode & Pagination States
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [date, setDate] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;

  // Slide-out Drawer State
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [drawerStatus, setDrawerStatus] = useState<AppointmentStatus>('pending');
  const [isSaving, setIsSaving] = useState(false);
  const [drawerError, setDrawerError] = useState<string | null>(null);
  const [drawerSuccess, setDrawerSuccess] = useState<string | null>(null);

  // Sync guard to prevent duplicate background patch calls
  const syncedIdsRef = useRef<Set<string>>(new Set());

  // Debounce search input (400ms delay)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  // Reset page when filter changes
  useEffect(() => {
    setPage(1);
  }, [date, statusFilter]);

  // Fetch Appointments with cache-busting and automatic DB update for expired slots
  const fetchAppointments = async () => {
    if (!session) return;
    setLoading(true);
    setError(null);
    
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || (typeof window !== 'undefined' ? '/api/v1' : 'http://localhost:8001/api/v1');
    let url = `${apiUrl}/appointments?page=${page}&limit=${limit}&_t=${Date.now()}`;
    
    if (debouncedSearch) {
      url += `&search=${encodeURIComponent(debouncedSearch)}`;
    }
    if (date) {
      url += `&date=${encodeURIComponent(date)}`;
    }
    if (statusFilter && statusFilter !== 'all') {
      url += `&status=${encodeURIComponent(statusFilter)}`;
    }

    try {
      const response = await fetch(url, {
        cache: 'no-store',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
        },
      });

      if (response.ok) {
        const data = await response.json();
        const rawList: Appointment[] = data.appointments || [];
        const expiredPendingIdsToSync: string[] = [];

        // Normalize and detect appointments whose scheduled end time has strictly passed
        const normalized = rawList.map((appt) => {
          const rawStatus = (appt.status || 'pending').toLowerCase() as AppointmentStatus;
          const isExpired = isAppointmentExpired(appt);
          
          if (isExpired && (rawStatus === 'pending' || rawStatus === 'confirmed')) {
            if (!syncedIdsRef.current.has(appt.id)) {
              expiredPendingIdsToSync.push(appt.id);
              syncedIdsRef.current.add(appt.id);
            }
            return { ...appt, status: 'no_show' as AppointmentStatus };
          }
          return { ...appt, status: rawStatus };
        });

        setAppointments(normalized);
        setTotal(data.total || 0);

        // Background auto-sync of expired slots to DB
        if (expiredPendingIdsToSync.length > 0) {
          Promise.all(
            expiredPendingIdsToSync.map(async (apptId) => {
              await fetch(`${apiUrl}/appointments/${apptId}`, {
                method: 'PATCH',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({ status: 'no_show' }),
              }).catch(() => {});
            })
          ).catch((e) => console.error('[Auto-Sync Error]', e));
        }
      } else {
        setError('Failed to retrieve appointments registry.');
      }
    } catch (err) {
      setError('Network error: Unable to reach backend server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, [session, page, debouncedSearch, date, statusFilter]);

  // Open Drawer when an appointment row is clicked
  const handleRowClick = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setDrawerStatus(appointment.status || 'pending');
    setDrawerError(null);
    setDrawerSuccess(null);
  };

  // Close Drawer
  const handleCloseDrawer = () => {
    setSelectedAppointment(null);
    setDrawerError(null);
    setDrawerSuccess(null);
  };

  // Check if No-Show is allowed for the currently selected appointment (strictly time-dependent)
  const isNoShowAllowedForDrawer = useMemo(() => {
    if (!selectedAppointment) return false;
    const endDateTime = getAppointmentEndDateTime(selectedAppointment);
    if (!endDateTime) return false;
    return Date.now() > endDateTime.getTime();
  }, [selectedAppointment]);

  // 1-Click Status Selection & Save
  const handleSelectStatus = async (newStatus: AppointmentStatus) => {
    // Prevent manual selection of No-Show if appointment end time has not arrived
    if (newStatus === 'no_show' && !isNoShowAllowedForDrawer) {
      setDrawerError('Cannot mark as No-Show before the appointment scheduled end time has elapsed.');
      return;
    }

    setDrawerStatus(newStatus);
    if (!selectedAppointment || !session) return;

    setIsSaving(true);
    setDrawerError(null);
    setDrawerSuccess(null);

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || (typeof window !== 'undefined' ? '/api/v1' : 'http://localhost:8001/api/v1');

    try {
      const response = await fetch(`${apiUrl}/appointments/${selectedAppointment.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          status: newStatus,
        }),
      });

      if (response.ok) {
        setDrawerSuccess(`Status updated to "${STATUS_MAP[newStatus]?.label || newStatus}"`);
        // Update local list state
        setAppointments((prev) => 
          prev.map((item) => (item.id === selectedAppointment.id ? { ...item, status: newStatus } : item))
        );
        setSelectedAppointment((prev) => prev ? { ...prev, status: newStatus } : null);
        setTimeout(() => {
          setDrawerSuccess(null);
        }, 2500);
      } else {
        const err = await response.json();
        setDrawerError(err.detail || 'Failed to update appointment status.');
      }
    } catch (err) {
      setDrawerError('Network error: Unable to reach server.');
    } finally {
      setIsSaving(false);
    }
  };

  // Columns configuration with fixed proportional widths and centered alignment
  const columns: Column<Appointment>[] = [
    {
      header: 'Patient Name',
      accessor: (row) => (
        <div className="flex items-center justify-start gap-3 pl-8">
          <div className="w-8 h-8 rounded-full bg-sky-100 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 text-sky-700 dark:text-sky-300 flex items-center justify-center font-bold text-xs shrink-0">
            {row.patient_name ? row.patient_name.charAt(0).toUpperCase() : 'P'}
          </div>
          <div className="min-w-0">
            <span className="font-semibold text-slate-800 dark:text-slate-100 truncate block text-sm">
              {row.patient_name || 'Anonymous Patient'}
            </span>
          </div>
        </div>
      ),
      className: 'w-[25%] min-w-[200px]',
      headerClassName: 'text-center',
    },
    {
      header: 'Phone Number',
      accessor: (row) => row.phone_number ? (
        <span className="text-slate-700 dark:text-slate-200 font-mono text-xs flex items-center justify-center gap-1">
          <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="truncate">{row.phone_number}</span>
        </span>
      ) : (
        <span className="text-slate-400 text-xs">N/A</span>
      ),
      className: 'w-[15%] min-w-[130px] text-center',
    },
    {
      header: 'WhatsApp',
      accessor: (row) => row.whatsapp_number ? (
        <span className="text-emerald-600 dark:text-emerald-400 font-mono text-xs flex items-center justify-center gap-1">
          <MessageCircle className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">{row.whatsapp_number}</span>
        </span>
      ) : (
        <span className="text-slate-400 text-xs">N/A</span>
      ),
      className: 'w-[15%] min-w-[130px] text-center',
    },
    {
      header: 'Appointment Date',
      accessor: (row) => {
        if (!row.appointment_date) return 'N/A';
        try {
          const parsed = parseAppointmentDateTime(row.appointment_date, null);
          if (parsed) {
            return parsed.toLocaleDateString(undefined, {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            });
          }
          return row.appointment_date;
        } catch {
          return row.appointment_date;
        }
      },
      className: 'w-[15%] min-w-[130px] text-center text-slate-700 dark:text-slate-300 font-medium',
    },
    {
      header: 'Time Slot',
      accessor: (row) => {
        const start = row.start_time ? row.start_time.substring(0, 5) : 'N/A';
        const end = row.end_time ? row.end_time.substring(0, 5) : 'N/A';
        return (
          <span className="inline-flex items-center justify-center gap-1 text-xs font-mono font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/70 px-2.5 py-1 rounded-md whitespace-nowrap">
            <Clock className="w-3 h-3 text-slate-400 shrink-0" />
            <span>{start} - {end}</span>
          </span>
        );
      },
      className: 'w-[15%] min-w-[125px] text-center',
    },
    {
      header: 'Status',
      accessor: (row) => {
        const cfg = STATUS_MAP[row.status] || STATUS_MAP.pending;
        return (
          <span className={`inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border shadow-2xs whitespace-nowrap ${cfg.badgeClass}`}>
            <span className={`w-2 h-2 rounded-full ${cfg.dotColor} animate-pulse shrink-0`} />
            <span>{cfg.label}</span>
          </span>
        );
      },
      className: 'w-[15%] min-w-[160px] text-center',
    },
  ];

  const totalPages = Math.ceil(total / limit) || 1;

  // Helper to format WhatsApp sanitized link
  const cleanPhoneForWhatsApp = (phone: string | null) => {
    if (!phone) return '';
    return phone.replace(/[^0-9]/g, '');
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader 
        title="Appointments Management" 
        description="Review patient bookings, manage scheduling statuses, and inspect detailed patient records."
        actions={
          <div className="flex items-center gap-2">
            <div className="text-xs text-slate-500 dark:text-slate-400 font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3.5 py-2 rounded-xl shadow-xs flex items-center">
              Total Bookings: <span className="text-slate-800 dark:text-slate-100 ml-1.5 font-bold">{total}</span>
            </div>
            <Button 
              onClick={fetchAppointments} 
              variant="outline" 
              size="sm"
              disabled={loading}
              className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-xs h-9"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        }
      />

      {/* Filter & Search Bar */}
      <Card>
        <CardContent className="!p-5 flex flex-col lg:flex-row gap-4 items-center justify-between">
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
            {/* Search Box */}
            <div className="relative w-full sm:w-72">
              <Input
                id="search"
                placeholder="Search patient, phone, or whatsapp..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                icon={<Search className="h-4 w-4 text-slate-400" />}
              />
            </div>

            {/* View Mode Toggle */}
            <div className="inline-flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200/80 dark:border-slate-700/80 shrink-0 w-full sm:w-auto justify-center">
              <button
                type="button"
                onClick={() => setView('list')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  view === 'list'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                <List className="w-3.5 h-3.5" />
                <span>List View</span>
              </button>
              <button
                type="button"
                onClick={() => setView('calendar')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  view === 'calendar'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                <CalendarDays className="w-3.5 h-3.5" />
                <span>Calendar View</span>
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-end">
            {/* Status Filter Dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider shrink-0 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" /> Status:
              </span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-10 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 px-3 focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-colors cursor-pointer"
              >
                <option value="all">All Statuses</option>
                <option value="pending">🟡 Pending</option>
                <option value="confirmed">🔵 Confirmed / Called</option>
                <option value="visited">🟢 Visited</option>
                <option value="canceled">🔴 Canceled</option>
                <option value="no_show">⚪ No-Show</option>
              </select>
            </div>

            {/* Date Filter */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider shrink-0">Date:</span>
              <div className="relative">
                <Input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  icon={<Calendar className="h-4 w-4 text-slate-400" />}
                  className="h-10 text-xs"
                />
              </div>
              {date && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setDate('')} 
                  className="h-10 px-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  title="Clear date filter"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content (Table or Calendar) */}
      {loading ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-16 flex flex-col items-center justify-center gap-3">
          <RefreshCw className="animate-spin h-7 w-7 text-sky-500" />
          <span className="text-xs text-slate-400 dark:text-slate-500 font-semibold tracking-wider uppercase">Loading registry records...</span>
        </div>
      ) : error ? (
        <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/80 rounded-2xl p-6 flex items-start gap-3 max-w-lg mx-auto">
          <AlertCircle className="h-6 w-6 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-rose-900 dark:text-rose-200 text-sm">Database Sync Error</h4>
            <p className="text-xs text-rose-700 dark:text-rose-300 mt-1 leading-relaxed">{error}</p>
          </div>
        </div>
      ) : appointments.length === 0 ? (
        <EmptyState 
          icon={Calendar}
          title="No Appointments Found"
          description="We couldn't find any patient appointments matching your current search terms or date filter."
        />
      ) : view === 'calendar' ? (
        <AppointmentCalendar 
          data={appointments}
          onSelectAppointment={handleRowClick}
        />
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1 text-xs text-slate-400 dark:text-slate-500">
            <span>💡 Click any patient row to open the detailed management modal.</span>
          </div>

          <DataTable 
            columns={columns} 
            data={appointments} 
            keyExtractor={(row) => row.id} 
            onRowClick={handleRowClick}
            tableClassName="min-w-[880px]"
          />

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm rounded-xl px-5 py-3.5">
              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Showing page <span className="font-bold text-slate-800 dark:text-slate-200">{page}</span> of <span className="font-bold text-slate-800 dark:text-slate-200">{totalPages}</span>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  disabled={page <= 1} 
                  onClick={() => setPage(page - 1)}
                  className="h-8 px-3 text-xs"
                >
                  <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                  <span>Previous</span>
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  disabled={page >= totalPages} 
                  onClick={() => setPage(page + 1)}
                  className="h-8 px-3 text-xs"
                >
                  <span>Next</span>
                  <ChevronRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* CENTERED MODAL (DETAILED VIEW & 1-CLICK STATUS PILLS)                       */}
      {/* ========================================================================= */}
      {selectedAppointment && (
        <div 
          onClick={(e) => {
            if (e.target === e.currentTarget) handleCloseDrawer();
          }}
          className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
        >
          {/* Centered Modal Container */}
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl z-50 flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in duration-200">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-950/40 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-2 bg-sky-500/10 text-sky-600 dark:text-sky-400 rounded-xl shrink-0">
                  <Calendar className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-slate-800 dark:text-slate-100 text-base leading-tight truncate">Appointment Details</h3>
                  <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono truncate block">
                    ID: {selectedAppointment.id}
                  </span>
                </div>
              </div>
              <button 
                onClick={handleCloseDrawer}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body (Scrollable) */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              
              {/* Feedback Alerts */}
              {drawerSuccess && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-semibold rounded-xl flex items-center gap-2 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span className="truncate">{drawerSuccess}</span>
                </div>
              )}

              {drawerError && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs font-semibold rounded-xl flex items-center gap-2 animate-in fade-in">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span className="truncate">{drawerError}</span>
                </div>
              )}

              {/* 1. Patient Profile Card */}
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4 bg-slate-50/50 dark:bg-slate-950/20 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-sky-100 dark:bg-sky-900/60 border border-sky-200 dark:border-sky-800 text-sky-700 dark:text-sky-300 flex items-center justify-center font-bold text-sm shrink-0">
                    {selectedAppointment.patient_name ? selectedAppointment.patient_name.charAt(0).toUpperCase() : 'P'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="font-bold text-slate-800 dark:text-slate-100 text-base truncate">
                      {selectedAppointment.patient_name || 'Anonymous Patient'}
                    </h4>
                    <span className="text-xs text-slate-400 dark:text-slate-500">Registered Patient</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2 pt-2 border-t border-slate-200/70 dark:border-slate-800 text-xs">
                  {/* Phone */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5 font-medium shrink-0">
                      <Phone className="w-3.5 h-3.5 text-slate-400" /> Phone:
                    </span>
                    {selectedAppointment.phone_number ? (
                      <a 
                        href={`tel:${selectedAppointment.phone_number}`}
                        className="font-mono font-semibold text-slate-700 dark:text-slate-200 hover:text-sky-600 dark:hover:text-sky-400 transition-colors truncate"
                      >
                        {selectedAppointment.phone_number}
                      </a>
                    ) : (
                      <span className="text-slate-400">N/A</span>
                    )}
                  </div>

                  {/* WhatsApp */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5 font-medium shrink-0">
                      <MessageCircle className="w-3.5 h-3.5 text-emerald-500" /> WhatsApp:
                    </span>
                    {selectedAppointment.whatsapp_number ? (
                      <a 
                        href={`https://wa.me/${cleanPhoneForWhatsApp(selectedAppointment.whatsapp_number)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-mono font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800/60 transition-colors truncate"
                      >
                        <span className="truncate">{selectedAppointment.whatsapp_number}</span>
                        <ExternalLink className="w-3 h-3 shrink-0" />
                      </a>
                    ) : (
                      <span className="text-slate-400">N/A</span>
                    )}
                  </div>
                </div>
              </div>

              {/* 2. Schedule & Timestamp Details */}
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4 bg-white dark:bg-slate-900 space-y-3">
                <h5 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Schedule & Booking Info</h5>
                
                <div className="grid grid-cols-2 gap-2.5 text-xs">
                  <div className="p-3 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-100 dark:border-slate-800">
                    <span className="text-slate-400 dark:text-slate-500 block text-[11px]">Appointment Date</span>
                    <span className="font-bold text-slate-700 dark:text-slate-200 mt-0.5 block truncate">
                      {selectedAppointment.appointment_date ? (
                        parseAppointmentDateTime(selectedAppointment.appointment_date, null)?.toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        }) || selectedAppointment.appointment_date
                      ) : 'N/A'}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-100 dark:border-slate-800">
                    <span className="text-slate-400 dark:text-slate-500 block text-[11px]">Time Slot</span>
                    <span className="font-bold text-slate-700 dark:text-slate-200 mt-0.5 block font-mono truncate">
                      {selectedAppointment.start_time ? selectedAppointment.start_time.substring(0, 5) : 'N/A'} - {selectedAppointment.end_time ? selectedAppointment.end_time.substring(0, 5) : 'N/A'}
                    </span>
                  </div>
                </div>

                {/* Created At Timestamp */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs gap-2">
                  <span className="text-slate-400 dark:text-slate-500 shrink-0">Created At:</span>
                  <span className="font-medium text-slate-600 dark:text-slate-300 font-mono text-[11px] truncate">
                    {selectedAppointment.created_at ? new Date(selectedAppointment.created_at).toLocaleString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    }) : 'N/A'}
                  </span>
                </div>
              </div>

              {/* 3. 1-CLICK STATUS SELECTION LIST */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Change Appointment Status
                  </label>
                  <span className="text-[11px] text-sky-600 dark:text-sky-400 font-semibold flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> 1-Click Update
                  </span>
                </div>

                <div className="space-y-2">
                  {STATUS_LIST.map((statusItem) => {
                    const isSelected = drawerStatus === statusItem.key;
                    const isNoShow = statusItem.key === 'no_show';
                    // "No-Show" is strictly disabled if the appointment end time has not yet passed
                    const isNoShowAllowed = isNoShowAllowedForDrawer;
                    const isNoShowDisabled = isNoShow && !isNoShowAllowed;

                    return (
                      <button
                        key={statusItem.key}
                        type="button"
                        onClick={() => !isNoShowDisabled && handleSelectStatus(statusItem.key)}
                        disabled={isSaving || isNoShowDisabled}
                        title={isNoShowDisabled ? 'Cannot mark as No-Show before the appointment scheduled end time has elapsed' : ''}
                        className={`group w-full p-3.5 rounded-xl border text-left transition-all flex items-center justify-between ${
                          isNoShowDisabled
                            ? 'opacity-40 cursor-not-allowed border-slate-200/60 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/30'
                            : isSelected
                            ? `${statusItem.activeBg} ${statusItem.activeBorder} ${statusItem.activeRing} shadow-xs cursor-pointer`
                            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-700 cursor-pointer'
                        } ${isSaving ? 'opacity-70 cursor-wait' : ''}`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Radio / Dot Indicator */}
                          <div className={`w-4 h-4 rounded-full flex items-center justify-center border transition-colors shrink-0 ${
                            isNoShowDisabled
                              ? 'border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800'
                              : isSelected 
                              ? `${statusItem.dotColor} border-transparent text-white` 
                              : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 group-hover:border-slate-400 dark:group-hover:border-slate-600'
                          }`}>
                            {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className={`text-xs font-bold block leading-tight ${
                                isNoShowDisabled
                                  ? 'text-slate-400 dark:text-slate-500'
                                  : isSelected 
                                  ? statusItem.activeText 
                                  : 'text-slate-800 dark:text-slate-200 group-hover:text-slate-900 dark:group-hover:text-white'
                              }`}>
                                {statusItem.label}
                              </span>
                              {isNoShowDisabled && (
                                <Lock className="w-3 h-3 text-slate-400 dark:text-slate-500 shrink-0" />
                              )}
                            </div>
                            <span className={`text-[11px] block truncate mt-0.5 ${
                              isNoShowDisabled
                                ? 'text-slate-400/80 dark:text-slate-500/80 italic'
                                : isSelected
                                ? 'text-slate-600 dark:text-slate-400'
                                : 'text-slate-400 dark:text-slate-400 group-hover:text-slate-500 dark:group-hover:text-slate-300'
                            }`}>
                              {isNoShowDisabled 
                                ? 'Locked until scheduled slot ends' 
                                : statusItem.sublabel}
                            </span>
                          </div>
                        </div>

                        {isSelected ? (
                          <span className="text-[11px] font-bold text-sky-700 dark:text-sky-300 bg-sky-100/80 dark:bg-sky-950/80 border border-sky-200 dark:border-sky-800 px-2 py-0.5 rounded-md shrink-0 ml-2">
                            Active
                          </span>
                        ) : isNoShowDisabled ? (
                          <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800/80 px-1.5 py-0.5 rounded shrink-0 ml-2">
                            Locked
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>

                <p className="text-[11px] text-slate-400 dark:text-slate-500 pt-1">
                  * "No-Show" cannot be selected before slot ends. It will auto-transition immediately upon scheduled end time.
                </p>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 bg-slate-50/80 dark:bg-slate-950/40 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
              <span className="text-xs text-slate-400">
                {isSaving ? 'Saving changes...' : 'Changes persist automatically.'}
              </span>
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleCloseDrawer}
                className="text-xs h-8.5 px-4"
              >
                Close
              </Button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
