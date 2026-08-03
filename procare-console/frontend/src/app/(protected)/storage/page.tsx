'use client';

import React from 'react';
import { Database } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { Badge } from '@/components/ui/Badge';

export default function StoragePage() {
  return (
    <div className="space-y-6">
      <PageHeader 
        title="Storage & Database Allocations" 
        description="Monitor physical database size, track index quotas, and review Supabase storage bucket file sizes."
        actions={<Badge variant="default">Phase 2 Pipeline</Badge>}
      />

      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-6 md:p-12">
        <EmptyState 
          icon={Database}
          title="Storage Analytics Offline"
          description="Physical disk quota details, table storage charts, and bucket sizes will be introduced in Phase 2."
        />
      </div>
    </div>
  );
}
