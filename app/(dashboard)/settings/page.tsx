'use client';

import { PagePlaceholder } from '@/components/page-placeholder';
import { Settings } from 'lucide-react';

export default function SettingsPage() {
  return (
    <PagePlaceholder
      title="Configurações"
      description="Configure opções do projeto"
      icon={Settings}
    />
  );
}
