'use client';

import { PagePlaceholder } from '@/components/page-placeholder';
import { Camera } from 'lucide-react';

export default function PhotographyPage() {
  return (
    <PagePlaceholder
      title="Fotografia"
      description="Gerencie bolsas de fotos e status de catalogação"
      icon={Camera}
    />
  );
}
