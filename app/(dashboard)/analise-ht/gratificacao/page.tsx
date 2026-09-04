'use client';

import { GratificacaoManager } from '@/components/analise-ht/gratificacao-manager';
import { useSomenteResumoGuard } from '@/components/analise-ht/somente-resumo-guard';

export default function AnaliseHtGratificacaoPage() {
  const bloqueado = useSomenteResumoGuard();
  if (bloqueado) return null;

  return (
    <div className="p-3 sm:p-6 space-y-6">
      <GratificacaoManager />
    </div>
  );
}
