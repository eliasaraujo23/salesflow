'use client';

import { PremiacaoConfigTable } from '@/components/analise-ht/premiacao-config-table';

export default function AnaliseHtConfigPage() {
  return (
    <div className="h-full flex flex-col p-3 sm:p-6 overflow-hidden">
      <PremiacaoConfigTable />
    </div>
  );
}
