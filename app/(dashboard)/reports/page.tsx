'use client';

import { PagePlaceholder } from '@/components/page-placeholder';
import { FileText } from 'lucide-react';

export default function ReportsPage() {
  return (
    <PagePlaceholder
      title="Relatórios"
      description="Extraia e analise dados do sistema"
      icon={FileText}
    />
  );
}
