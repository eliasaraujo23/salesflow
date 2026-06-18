'use client';

import { PagePlaceholder } from '@/components/page-placeholder';
import { Layout } from 'lucide-react';

export default function KanbanPage() {
  return (
    <PagePlaceholder
      title="Kanban"
      description="Visualize tarefas por status em quadro kanban"
      icon={Layout}
    />
  );
}
