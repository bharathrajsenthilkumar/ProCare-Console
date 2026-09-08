'use client';

import React, { useMemo } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { Appointment, AppointmentStatus } from '@/app/(protected)/appointments/page';

interface AppointmentCalendarProps {
  data: Appointment[];
  onSelectAppointment: (appointment: Appointment) => void;
}

const STATUS_COLORS: Record<AppointmentStatus, { bg: string; border: string; text: string; dot: string }> = {
  pending: { 
    bg: '#fef3c7', 
    border: '#f59e0b', 
    text: '#92400e', 
    dot: '#d97706',
  },
  confirmed: { 
    bg: '#e0f2fe', 
    border: '#0284c7', 
    text: '#0369a1', 
    dot: '#0284c7',
  },
  visited: { 
    bg: '#d1fae5', 
    border: '#10b981', 
    text: '#065f46', 
    dot: '#10b981',
  },
  canceled: { 
    bg: '#ffe4e6', 
    border: '#f43f5e', 
    text: '#9f1239', 
    dot: '#e11d48',
  },
  no_show: { 
    bg: '#f1f5f9', 
    border: '#64748b', 
    text: '#334155', 
    dot: '#64748b',
  },
};

/**
 * Safely constructs a valid ISO 8601 string (YYYY-MM-DDTHH:mm:ss)
 */
function createSafeIsoDateTime(dateStr: string | null | undefined, timeStr: string | null | undefined, fallbackTime: string): string {
  try {
    if (!dateStr) return '';

    let cleanDate = dateStr.trim();
    if (cleanDate.includes('T')) {
      cleanDate = cleanDate.split('T')[0];
    }

    // Ensure valid YYYY-MM-DD format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(cleanDate)) {
      const parsed = new Date(dateStr);
      if (isNaN(parsed.getTime())) return '';
      cleanDate = parsed.toISOString().split('T')[0];
    }

    let cleanTime = (timeStr || fallbackTime).trim();
    if (/^\d{1,2}:\d{2}$/.test(cleanTime)) {
      const parts = cleanTime.split(':');
      const hh = parts[0].padStart(2, '0');
      const mm = parts[1];
      cleanTime = `${hh}:${mm}:00`;
    } else if (/^\d{1,2}:\d{2}:\d{2}$/.test(cleanTime)) {
      const parts = cleanTime.split(':');
      const hh = parts[0].padStart(2, '0');
      cleanTime = `${hh}:${parts[1]}:${parts[2]}`;
    } else {
      cleanTime = `${fallbackTime}:00`;
    }

    const isoString = `${cleanDate}T${cleanTime}`;
    const testDate = new Date(isoString);
    if (isNaN(testDate.getTime())) return '';
    return isoString;
  } catch (err) {
    console.warn('[Calendar Date Parse Warning]', err, { dateStr, timeStr });
    return '';
  }
}

export default function AppointmentCalendar({
  data = [],
  onSelectAppointment,
}: AppointmentCalendarProps) {

  // Map appointments to FullCalendar event format safely
  const events = useMemo(() => {
    if (!Array.isArray(data)) return [];

    const mappedEvents = [];

    for (const appt of data) {
      try {
        if (!appt || !appt.id) continue;

        const start = createSafeIsoDateTime(appt.appointment_date, appt.start_time, '09:00');
        const end = createSafeIsoDateTime(appt.appointment_date, appt.end_time || appt.start_time, '10:00');

        if (!start) continue;

        const statusKey = (appt.status || 'pending').toLowerCase() as AppointmentStatus;
        const colorScheme = STATUS_COLORS[statusKey] || STATUS_COLORS.pending;

        mappedEvents.push({
          id: appt.id,
          title: appt.patient_name || 'Anonymous Patient',
          start,
          end: end || undefined,
          backgroundColor: colorScheme.bg,
          borderColor: colorScheme.border,
          textColor: colorScheme.text,
          extendedProps: {
            appointment: appt,
            status: statusKey,
            dotColor: colorScheme.dot,
          },
        });
      } catch (err) {
        console.error('[Appointment Mapping Error for Item]', appt, err);
      }
    }

    return mappedEvents;
  }, [data]);

  const handleEventClick = (clickInfo: any) => {
    try {
      const appt = clickInfo.event.extendedProps?.appointment;
      if (appt && onSelectAppointment) {
        onSelectAppointment(appt);
      }
    } catch (err) {
      console.error('[Event Click Error]', err);
    }
  };

  const renderEventContent = (eventInfo: any) => {
    const dotColor = eventInfo.event.extendedProps?.dotColor || '#0284c7';
    return (
      <div className="w-full h-full p-1 flex flex-col justify-between overflow-hidden cursor-pointer rounded select-none">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="w-2 h-2 rounded-full shrink-0 shadow-2xs" style={{ backgroundColor: dotColor }} />
          <span className="font-bold truncate text-[11px] sm:text-xs">
            {eventInfo.event.title}
          </span>
        </div>
        {eventInfo.timeText && (
          <div className="text-[10px] font-mono opacity-85 truncate mt-0.5">
            {eventInfo.timeText}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-4 sm:p-6 animate-fade-in appointment-calendar-wrapper">
      {/* Calendar Legend Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-4 border-b border-slate-100 dark:border-slate-800 text-xs">
        <span className="font-semibold text-slate-500 dark:text-slate-400">
          💡 Click any appointment card to view & update its details
        </span>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span className="text-slate-600 dark:text-slate-400">Pending</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
            <span className="text-slate-600 dark:text-slate-400">Confirmed</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="text-slate-600 dark:text-slate-400">Visited</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
            <span className="text-slate-600 dark:text-slate-400">Canceled</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-500" />
            <span className="text-slate-600 dark:text-slate-400">No-Show</span>
          </div>
        </div>
      </div>

      {/* FullCalendar Component */}
      <div className="fc-theme-custom">
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="timeGridWeek"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay',
          }}
          buttonText={{
            today: 'Today',
            month: 'Month',
            week: 'Week',
            day: 'Day',
          }}
          events={events}
          eventClick={handleEventClick}
          eventContent={renderEventContent}
          slotMinTime="08:00:00"
          slotMaxTime="21:00:00"
          allDaySlot={false}
          nowIndicator={true}
          expandRows={true}
          height="auto"
          dayMaxEvents={3}
        />
      </div>
    </div>
  );
}
