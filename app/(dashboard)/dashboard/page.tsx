'use client';

import { PagePlaceholder } from '@/components/page-placeholder';
import { BarChart3 } from 'lucide-react';

export default function DashboardPage() {
  return (
    <PagePlaceholder
      title="Dashboard"
      description="Visão geral de negócio e métricas"
      icon={BarChart3}
    />
  );
}
