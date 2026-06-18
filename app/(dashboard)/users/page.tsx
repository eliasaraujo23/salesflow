'use client';

import { PagePlaceholder } from '@/components/page-placeholder';
import { ShieldCheck } from 'lucide-react';

export default function UsersPage() {
  return (
    <PagePlaceholder
      title="Usuários & Acesso"
      description="Gerencie usuários e suas permissões"
      icon={ShieldCheck}
    />
  );
}
