'use client';

import React from 'react';
import { Settings as SettingsIcon } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { Badge } from '@/components/ui/Badge';

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader 
        title="Console Configurations" 
        description="Review administrator accounts settings, modify chatbot LLM system settings, and verify API keys."
        actions={<Badge variant="default">Phase 2 Pipeline</Badge>}
      />

      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-6 md:p-12">
        <EmptyState 
          icon={SettingsIcon}
          title="Console Settings Offline"
          description="Password change panels, SMTP notification settings, and chatbot system prompt updates will be introduced in Phase 2."
        />
      </div>
    </div>
  );
}
