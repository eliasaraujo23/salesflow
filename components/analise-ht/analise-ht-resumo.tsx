'use client';

import { useAnaliseHtCalculadora, type UploadAlvo } from '@/lib/hooks/use-analise-ht-calculadora';
import { ResumoTable } from '@/components/analise-ht/resumo-table';

interface Props {
  uploads: UploadAlvo[];
}

export function AnaliseHtResumo({ uploads }: Props) {
  const { resumo, bonificacaoPorChave, premiacaoPorChave, bonusPrimeiroPrecoPorChave, metaLojaPorChave, gratificacaoPorChave } =
    useAnaliseHtCalculadora(uploads);

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h2 className="text-sm font-bold text-zinc-800 dark:text-zinc-100">Resumo por avaliadora</h2>
        <p className="text-[11px] text-zinc-400">Considera apenas linhas onde a avaliadora aparece sozinha, sem bijuteria. Calcule na aba &quot;Bonificação e Premiação&quot;</p>
      </div>

      <ResumoTable
        resumo={resumo}
        bonificacaoPorChave={bonificacaoPorChave}
        premiacaoPorChave={premiacaoPorChave}
        bonusPrimeiroPrecoPorChave={bonusPrimeiroPrecoPorChave}
        metaLojaPorChave={metaLojaPorChave}
        gratificacaoPorChave={gratificacaoPorChave}
        mostrarColunaLoja={uploads.length > 1}
      />
    </div>
  );
}
