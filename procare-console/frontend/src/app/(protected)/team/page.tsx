'use client';

import React from 'react';
import { UserCheck } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { Badge } from '@/components/ui/Badge';

export default function TeamPage() {
  return (
    <div className="space-y-6">
      <PageHeader 
        title="Physician & Clinic Staff Directory" 
        description="Organize public doctor profiles, specialties, biographies, and homepage display sequences."
        actions={<Badge variant="default">Phase 2 Pipeline</Badge>}
      />

      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-6 md:p-12">
        <EmptyState 
          icon={UserCheck}
          title="Staff Directory Offline"
          description="Doctor profiles, bio update forms, and listing priority ordering will be introduced in Phase 2."
        />
      </div>
    </div>
  );
}
