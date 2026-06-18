'use client';

import { PagePlaceholder } from '@/components/page-placeholder';
import { ShoppingBag } from 'lucide-react';

export default function ResalePage() {
  return (
    <PagePlaceholder
      title="Revenda"
      description="Acompanhe dados de revenda e revendedores"
      icon={ShoppingBag}
    />
  );
}
