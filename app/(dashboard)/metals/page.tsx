'use client';

import { PagePlaceholder } from '@/components/page-placeholder';
import { Weight } from 'lucide-react';

export default function MetalsPage() {
  return (
    <PagePlaceholder
      title="Controle de Metais"
      description="Gerencie inventário de ouro, prata e platina"
      icon={Weight}
    />
  );
}
