'use client';

import React from 'react';
import { FileText } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { Badge } from '@/components/ui/Badge';

export default function LogsPage() {
  return (
    <div className="space-y-6">
      <PageHeader 
        title="Diagnostics & Activity Logs" 
        description="Inspect administrative activity histories, security login audits, and server error diagnostics logs."
        actions={<Badge variant="default">Phase 2 Pipeline</Badge>}
      />

      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-6 md:p-12">
        <EmptyState 
          icon={FileText}
          title="System Logs Offline"
          description="Detailed server activity streams and log filters will be introduced in Phase 2, tracking API error details in real-time."
        />
      </div>
    </div>
  );
}
