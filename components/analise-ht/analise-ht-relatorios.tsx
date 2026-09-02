'use client';

import { useAnaliseHtCalculadora, type UploadAlvo } from '@/lib/hooks/use-analise-ht-calculadora';
import { AnaliseHtParametros } from '@/components/analise-ht/analise-ht-parametros';
import { BonificacaoTable } from '@/components/analise-ht/bonificacao-table';

export type { UploadAlvo };

interface Props {
  uploads: UploadAlvo[];
}

export function AnaliseHtRelatorios({ uploads }: Props) {
  const { params, bonificacao, premiacaoPorChave, bonusPrimeiroPrecoPorChave, metaLojaPorChave, gratificacaoPorChave, lojasSemGrupo, isCalculating, handleCalcular } =
    useAnaliseHtCalculadora(uploads);

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h2 className="text-sm font-bold text-zinc-800 dark:text-zinc-100">Bonificação e Premiação</h2>
        <p className="text-[11px] text-zinc-400">Bonificação: compras com pago/grama até o limite. Premiação: 3 melhores compras (peso e valor mínimos) da loja</p>
      </div>

      <section className="flex flex-col lg:flex-row-reverse gap-4 lg:items-stretch">
        <AnaliseHtParametros {...params} lojasSemGrupo={lojasSemGrupo} isCalculating={isCalculating} onCalcular={handleCalcular} />

        <div className="flex-1 min-w-0 min-h-0 flex flex-col">
          <BonificacaoTable
            resultado={bonificacao}
            premiacaoPorChave={premiacaoPorChave}
            bonusPrimeiroPrecoPorChave={bonusPrimeiroPrecoPorChave}
            metaLojaPorChave={metaLojaPorChave}
            gratificacaoPorChave={gratificacaoPorChave}
            mostrarColunaLoja={uploads.length > 1}
          />
        </div>
      </section>
    </div>
  );
}
