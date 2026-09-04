'use client';

import { PremiacaoConfigTable } from '@/components/analise-ht/premiacao-config-table';
import { SomenteResumoGuard } from '@/components/analise-ht/somente-resumo-guard';

export default function AnaliseHtConfigPage() {
  return (
    <div className="h-full flex flex-col p-3 sm:p-6 overflow-hidden">
      <SomenteResumoGuard />
      <PremiacaoConfigTable />
    </div>
  );
}
