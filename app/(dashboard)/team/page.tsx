'use client';

import { PagePlaceholder } from '@/components/page-placeholder';
import { Users } from 'lucide-react';

export default function TeamPage() {
  return (
    <PagePlaceholder
      title="Equipe"
      description="Acompanhe desempenho e produtividade da equipe"
      icon={Users}
    />
  );
}
