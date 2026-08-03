'use client';

import React from 'react';
import { Image as ImageIcon } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { Badge } from '@/components/ui/Badge';

export default function GalleryPage() {
  return (
    <div className="space-y-6">
      <PageHeader 
        title="Homepage Gallery Assets" 
        description="Configure media files, clinic photography folders, and captions showing on the public website."
        actions={<Badge variant="default">Phase 2 Pipeline</Badge>}
      />

      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-6 md:p-12">
        <EmptyState 
          icon={ImageIcon}
          title="Gallery Assets Offline"
          description="Drag-and-drop file uploads, image resizers, and ordering controls will be introduced in Phase 2."
        />
      </div>
    </div>
  );
}
