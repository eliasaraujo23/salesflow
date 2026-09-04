'use client';

import { GratificacaoManager } from '@/components/analise-ht/gratificacao-manager';
import { SomenteResumoGuard } from '@/components/analise-ht/somente-resumo-guard';

export default function AnaliseHtGratificacaoPage() {
  return (
    <div className="p-3 sm:p-6 space-y-6">
      <SomenteResumoGuard />
      <GratificacaoManager />
    </div>
  );
}
