'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useAnaliseHtCalculadora, type UploadAlvo } from '@/lib/hooks/use-analise-ht-calculadora';
import { AnaliseHtParametros } from '@/components/analise-ht/analise-ht-parametros';
import { BonificacaoTable } from '@/components/analise-ht/bonificacao-table';
import { ORDEM_LOJAS } from '@/lib/analise-ht/cores-lojas';

export type { UploadAlvo };

interface Props {
  uploads: UploadAlvo[];
}

const FILTRO_TODAS = 'Todas';

export function AnaliseHtRelatorios({ uploads }: Props) {
  const [lojaFiltro, setLojaFiltro] = useState(FILTRO_TODAS);

  const lojasDisponiveis = useMemo(() => {
    const lojas = [...new Set(uploads.map(u => u.loja))];
    const indice = (loja: string) => { const i = ORDEM_LOJAS.indexOf(loja); return i === -1 ? ORDEM_LOJAS.length : i; };
    return lojas.sort((a, b) => indice(a) - indice(b) || a.localeCompare(b));
  }, [uploads]);

  const uploadsFiltrados = useMemo(
    () => (lojaFiltro === FILTRO_TODAS ? uploads : uploads.filter(u => u.loja === lojaFiltro)),
    [uploads, lojaFiltro]
  );

  const { params, bonificacao, resumo, premiacaoPorChave, bonusPrimeiroPrecoPorChave, metaLojaPorChave, gratificacaoPorChave, lojasSemGrupo, isCalculating, handleCalcular } =
    useAnaliseHtCalculadora(uploadsFiltrados);

  // O cache de resultado (React Query) é global, não por upload — trocar o
  // filtro de loja não invalida sozinho o que já foi calculado com o
  // conjunto anterior de uploads. Recalcula sempre que o filtro mudar, para
  // a tabela nunca mostrar dados da seleção anterior. Efeito colateral
  // aceito por ora: como o cache é compartilhado, a página /analise-ht/resumo
  // também passa a refletir o filtro até alguém recalcular por lá.
  const primeiraRenderRef = useRef(true);
  useEffect(() => {
    if (primeiraRenderRef.current) { primeiraRenderRef.current = false; return; }
    if (uploadsFiltrados.length > 0) handleCalcular();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lojaFiltro]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-sm font-bold text-zinc-800 dark:text-zinc-100">Bonificação e Premiação</h2>

        <div className="flex items-end gap-3">
          {lojasDisponiveis.length > 1 && (
            <div className="flex flex-col gap-1">
              <label className="text-[11px] text-zinc-500 dark:text-zinc-400">Loja</label>
              <select
                value={lojaFiltro}
                onChange={e => setLojaFiltro(e.target.value)}
                className="px-3 py-1.5 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.13] rounded-lg text-zinc-800 dark:text-zinc-100 focus:outline-none focus:border-indigo-500"
              >
                <option value={FILTRO_TODAS}>Todas</option>
                {lojasDisponiveis.map(loja => (
                  <option key={loja} value={loja}>{loja}</option>
                ))}
              </select>
            </div>
          )}
          <AnaliseHtParametros {...params} lojasSemGrupo={lojasSemGrupo} isCalculating={isCalculating} onCalcular={handleCalcular} />
        </div>
      </div>

      <div className="flex-1 min-w-0 min-h-0 flex flex-col">
        <BonificacaoTable
          resultado={bonificacao}
          resumo={resumo}
          premiacaoPorChave={premiacaoPorChave}
          bonusPrimeiroPrecoPorChave={bonusPrimeiroPrecoPorChave}
          metaLojaPorChave={metaLojaPorChave}
          gratificacaoPorChave={gratificacaoPorChave}
          mostrarColunaLoja={uploadsFiltrados.length > 1}
        />
      </div>
    </div>
  );
}
