'use client';

import { PremiacaoConfigTable } from '@/components/analise-ht/premiacao-config-table';
import { useSomenteResumoGuard } from '@/components/analise-ht/somente-resumo-guard';

export default function AnaliseHtConfigPage() {
  const bloqueado = useSomenteResumoGuard();
  if (bloqueado) return null;

  return (
    <div className="h-full flex flex-col p-3 sm:p-6 overflow-hidden">
      <PremiacaoConfigTable />
    </div>
  );
}
