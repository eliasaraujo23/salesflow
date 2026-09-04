'use client';

import { LojaBaseBoard } from '@/components/analise-ht/loja-base-board';
import { useSomenteResumoGuard } from '@/components/analise-ht/somente-resumo-guard';

export default function AnaliseHtLojaBasePage() {
  const bloqueado = useSomenteResumoGuard();
  if (bloqueado) return null;

  return (
    <div className="p-3 sm:p-6 space-y-6">
      <div>
        <h2 className="text-sm font-bold text-zinc-800 dark:text-zinc-100">Loja Base das Avaliadoras</h2>
        <p className="text-[11px] text-zinc-400">Arraste cada avaliadora para sua loja base — define quem recebe os bônus de meta batida</p>
      </div>

      <LojaBaseBoard />
    </div>
  );
}
