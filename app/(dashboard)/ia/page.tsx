'use client';

import { PagePlaceholder } from '@/components/page-placeholder';
import { Brain } from 'lucide-react';

export default function IAPage() {
  return (
    <PagePlaceholder
      title="IA de Reuniões"
      description="Analise reuniões e extraia tarefas com IA"
      icon={Brain}
    />
  );
}
