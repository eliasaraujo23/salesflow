'use client';

import { PagePlaceholder } from '@/components/page-placeholder';
import { Calendar } from 'lucide-react';

export default function CalendarPage() {
  return (
    <PagePlaceholder
      title="Calendário"
      description="Visualize tarefas agendadas em calendário"
      icon={Calendar}
    />
  );
}
