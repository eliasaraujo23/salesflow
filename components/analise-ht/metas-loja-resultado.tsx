'use client';

import { useMemo } from 'react';
import { Check, X, Save } from 'lucide-react';
import { useAnaliseHtUploads } from '@/lib/hooks/use-analise-ht-uploads';
import { useAnaliseHtMetasLoja } from '@/lib/hooks/use-analise-ht-metas-loja';
import { useAnaliseHtLojaBase } from '@/lib/hooks/use-analise-ht-loja-base';
import { ORDEM_LOJAS } from '@/lib/analise-ht/cores-lojas';

const fmtBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtPct = (v: number) => `${(v * 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
const fmtKg = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

interface ItemMeta {
  label: string;
  valor: string;
  batida: boolean;
}

interface Props {
  onSalvar: (onSaved: () => void) => void;
  isSaving: boolean;
}

export function MetasLojaResultado({ onSalvar, isSaving }: Props) {
  const { uploads } = useAnaliseHtUploads();
  const { resultado, calcular, isCalculating } = useAnaliseHtMetasLoja();
  const { itens: lojaBaseItens } = useAnaliseHtLojaBase();

  const avaliadorasPorLoja = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const item of lojaBaseItens) {
      const atual = map.get(item.loja) ?? new Set<string>();
      atual.add(item.avaliador);
      map.set(item.loja, atual);
    }
    return map;
  }, [lojaBaseItens]);

  const ordenado = [...resultado].sort(
    (a, b) => ORDEM_LOJAS.indexOf(a.loja) - ORDEM_LOJAS.indexOf(b.loja)
  );

  function handleSalvarERecalcular() {
    onSalvar(() => {
      if (uploads.length > 0) calcular(uploads.map(u => u.id));
    });
  }

  const carregando = isSaving || isCalculating;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-sm font-bold text-zinc-800 dark:text-zinc-100">Resultado por loja</h2>
          <p className="text-[11px] text-zinc-400">O que cada loja bateu ou não no mês, com base nas planilhas carregadas</p>
        </div>
        <button
          onClick={handleSalvarERecalcular}
          disabled={carregando}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors disabled:opacity-50"
        >
          <Save size={12} className={carregando ? 'animate-pulse' : ''} />
          {carregando ? 'Salvando...' : 'Salvar e recalcular'}
        </button>
      </div>

      {ordenado.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center border border-dashed border-zinc-200 dark:border-white/[0.13] rounded-xl">
          <p className="text-sm text-zinc-400">Nenhum resultado calculado ainda — clique em Salvar e recalcular.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {ordenado.map(r => {
            const itens: ItemMeta[] = [
              { label: 'Peso', valor: `${fmtKg(r.pesoComprado)}g`, batida: r.metaPesoBatida },
              { label: 'Pago/grama', valor: fmtBRL(r.pagoPorGramaMedio), batida: r.metaPagoGramaBatida },
              { label: 'Abaixo do limite', valor: fmtPct(r.percentualAbaixo250), batida: r.metaAbaixo250Batida },
            ];
            const avaliadorasDaLoja = avaliadorasPorLoja.get(r.loja);
            const conversaoDaLoja = r.conversaoPorAvaliadora.filter(c => avaliadorasDaLoja?.has(c.avaliador));
            const conversoesBatidas = conversaoDaLoja.filter(c => c.metaBatida).length;
            // Conversão bate "para a loja" se ao menos uma avaliadora da
            // loja-base bateu a própria meta — o prêmio da meta em si é
            // pago uma única vez (não por avaliadora), igual às de grupo.
            const metaConversaoBatidaNaLoja = conversoesBatidas > 0;
            const totalBatidas = itens.filter(i => i.batida).length + (metaConversaoBatidaNaLoja ? 1 : 0);
            const premioMetasBatidas = r.premioGrupo + (metaConversaoBatidaNaLoja ? r.premioConversao : 0);

            return (
              <div key={r.loja} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.13] rounded-xl overflow-hidden flex flex-col text-xs">
                <div className="px-3 py-2 border-b border-zinc-200 dark:border-white/[0.13] flex items-center justify-between shrink-0">
                  <span className="font-bold text-sm text-zinc-800 dark:text-zinc-100">{r.loja}</span>
                  <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">{totalBatidas}/4 metas</span>
                </div>
                <div className="px-3 pt-2 flex flex-col gap-1.5">
                  {itens.map(item => (
                    <div
                      key={item.label}
                      className={`flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-md ${
                        item.batida
                          ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                          : 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400'
                      }`}
                    >
                      <span className="flex items-center gap-1.5 font-medium">
                        {item.batida ? <Check size={12} /> : <X size={12} />}
                        {item.label}
                      </span>
                      <span className="tabular-nums font-semibold">{item.valor}</span>
                    </div>
                  ))}
                </div>
                <div className="mx-3 mt-2 flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-md bg-zinc-100 dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-300">
                  <span className="font-medium">Conversão (loja)</span>
                  <span className="tabular-nums font-semibold">{fmtPct(r.conversaoGeral)}</span>
                </div>
                <div className="px-3 pt-2 pb-1.5 flex flex-col gap-1.5">
                  <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide">
                    Conversão individual — {conversoesBatidas}/{conversaoDaLoja.length}
                  </span>
                  {conversaoDaLoja.map(c => (
                    <div
                      key={c.avaliador}
                      className={`flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-md ${
                        c.metaBatida
                          ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                          : 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400'
                      }`}
                    >
                      <span className="flex items-center gap-1.5 font-medium truncate">
                        {c.metaBatida ? <Check size={11} className="shrink-0" /> : <X size={11} className="shrink-0" />}
                        <span className="truncate">{c.avaliador}</span>
                      </span>
                      <span className="tabular-nums font-semibold shrink-0">{fmtPct(c.conversao)}</span>
                    </div>
                  ))}
                </div>
                <div className="px-3 py-2 border-t border-zinc-200 dark:border-white/[0.13] flex items-center justify-between shrink-0 mt-auto">
                  <span className="text-[11px] text-zinc-500 dark:text-zinc-400">Total batido na loja</span>
                  <span className="font-bold text-sm text-indigo-600 dark:text-indigo-400">{fmtBRL(premioMetasBatidas)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
