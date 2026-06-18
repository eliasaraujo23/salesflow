'use client';

import { PagePlaceholder } from '@/components/page-placeholder';
import { Hammer } from 'lucide-react';

export default function MaintenancePage() {
  return (
    <PagePlaceholder
      title="Manutenções"
      description="Registre e acompanhe manutenções de equipamentos"
      icon={Hammer}
    />
  );
}
