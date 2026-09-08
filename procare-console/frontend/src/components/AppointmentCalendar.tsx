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

const STATUS_COLORS: Record<AppointmentStatus, { bg: string; border: string; text: string; dot: string; darkBg: string; darkText: string }> = {
  pending: { 
    bg: '#fef3c7', 
    border: '#f59e0b', 
    text: '#92400e', 
    dot: '#d97706',
    darkBg: '#78350f40',
    darkText: '#fde68a'
  },
  confirmed: { 
    bg: '#e0f2fe', 
    border: '#0284c7', 
    text: '#0369a1', 
    dot: '#0284c7',
    darkBg: '#0c4a6e50',
    darkText: '#bae6fd'
  },
  visited: { 
    bg: '#d1fae5', 
    border: '#10b981', 
    text: '#065f46', 
    dot: '#10b981',
    darkBg: '#064e3b50',
    darkText: '#a7f3d0'
  },
  canceled: { 
    bg: '#ffe4e6', 
    border: '#f43f5e', 
    text: '#9f1239', 
    dot: '#e11d48',
    darkBg: '#88133740',
    darkText: '#fecdd3'
  },
  no_show: { 
    bg: '#f1f5f9', 
    border: '#64748b', 
    text: '#334155', 
    dot: '#64748b',
    darkBg: '#1e293b60',
    darkText: '#cbd5e1'
  },
};

export default function AppointmentCalendar({
  data,
  onSelectAppointment,
}: AppointmentCalendarProps) {

  // Map appointments to FullCalendar event format
  const events = useMemo(() => {
    return data.map((appt) => {
      let dateStr = appt.appointment_date || '';
      if (dateStr.includes('T')) {
        dateStr = dateStr.split('T')[0];
      }

      const startTime = appt.start_time ? appt.start_time.substring(0, 5) : '09:00';
      const endTime = appt.end_time ? appt.end_time.substring(0, 5) : '10:00';

      const start = dateStr ? `${dateStr}T${startTime}:00` : new Date().toISOString();
      const end = dateStr ? `${dateStr}T${endTime}:00` : new Date().toISOString();

      const statusKey = (appt.status || 'pending').toLowerCase() as AppointmentStatus;
      const colorScheme = STATUS_COLORS[statusKey] || STATUS_COLORS.pending;

      return {
        id: appt.id,
        title: appt.patient_name || 'Anonymous Patient',
        start,
        end,
        backgroundColor: colorScheme.bg,
        borderColor: colorScheme.border,
        textColor: colorScheme.text,
        extendedProps: {
          appointment: appt,
          status: statusKey,
          dotColor: colorScheme.dot,
        },
      };
    });
  }, [data]);

  const handleEventClick = (clickInfo: any) => {
    const appt = clickInfo.event.extendedProps?.appointment;
    if (appt) {
      onSelectAppointment(appt);
    }
  };

  const renderEventContent = (eventInfo: any) => {
    const { dotColor } = eventInfo.event.extendedProps;
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
