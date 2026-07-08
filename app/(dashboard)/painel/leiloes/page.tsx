'use client';

import { RefreshCw } from 'lucide-react';
import { usePainelFilters } from '@/components/painel/painel-filters-context';
import { usePainelVendas } from '@/hooks/use-painel-vendas';
import { HBarChart } from '@/components/painel/h-bar-chart';

function fmtBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
}

function fmtPct(v: number) {
  return `${v.toFixed(2)}%`;
}

interface KpiCellProps { label: string; value: string; border?: boolean; }
function KpiCell({ label, value, border = true }: KpiCellProps) {
  return (
    <div className={`flex flex-col justify-center gap-0.5 px-4 py-3 ${border ? 'border-r border-zinc-200 dark:border-white/[0.08]' : ''} flex-1 min-w-0`}>
      <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-400">{label}</span>
      <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100 tabular-nums truncate">{value}</span>
    </div>
  );
}

export default function PainelLeloesPage() {
  const { from, to, destinoFilter } = usePainelFilters();

  const { data, isLoading, isError, error } = usePainelVendas(
    from,
    to,
    destinoFilter.length > 0 ? destinoFilter : null,
  );

  return (
    <div className="h-full overflow-auto p-4 flex flex-col gap-3">
      {isLoading && (
        <div className="flex items-center justify-center py-24 text-zinc-400 text-sm gap-2">
          <RefreshCw size={15} className="animate-spin" /> Carregando dados...
        </div>
      )}
      {isError && !isLoading && (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <p className="text-sm text-red-500">{(error as Error)?.message || 'Erro ao carregar dados.'}</p>
        </div>
      )}

      {data && !isLoading && (
        <>
          {data.leiloes.length === 0 ? (
            <div className="flex items-center justify-center py-24 text-zinc-400 text-sm">
              Nenhuma venda em leilão no período selecionado.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 items-start">
              {data.leiloes.map(leilao => {
                const nonScrap = leilao.byProduto.filter(p => p.name !== 'SCRAP');
                const scrap = leilao.byProduto.find(p => p.name === 'SCRAP');

                return (
                  <div key={leilao.nome} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.08] rounded-xl overflow-hidden">
                    {/* KPI header */}
                    <div className="flex items-stretch divide-x divide-zinc-200 dark:divide-white/[0.08] border-b border-zinc-200 dark:border-white/[0.08]">
                      <div className="flex flex-col justify-center px-4 py-3 min-w-[120px] shrink-0">
                        <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-400">Leilão</span>
                        <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">
                          {leilao.nome.replace('LEILÃO ', '')}
                        </span>
                      </div>
                      <KpiCell label="Faturamento"    value={fmtBRL(leilao.faturamento)} />
                      <KpiCell label="Qtd"            value={String(leilao.qtd)} />
                      <KpiCell label="Lucratividade"  value={fmtPct(leilao.lucrat)} />
                      <KpiCell label="TM Fabricado"   value={leilao.tmJF > 0 ? fmtBRL(leilao.tmJF) : '—'} />
                      <KpiCell label="TM Revenda"     value={leilao.tmRevenda > 0 ? fmtBRL(leilao.tmRevenda) : '—'} border={false} />
                    </div>

                    {/* Scrap destaque */}
                    {scrap && (
                      <div className="px-4 py-2 bg-amber-50 dark:bg-amber-500/[0.06] border-b border-amber-200 dark:border-amber-500/20 flex items-center gap-3">
                        <span className="text-[9px] font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400">Scrap</span>
                        <span className="text-sm font-bold text-amber-700 dark:text-amber-300 tabular-nums">{fmtBRL(scrap.faturamento)}</span>
                        <span className="text-xs text-amber-500 dark:text-amber-400">· {scrap.qtd} un</span>
                      </div>
                    )}

                    {/* Gráfico de produtos (sem SCRAP — já destacado acima) */}
                    <div className="p-4">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-3">
                        Por Produto
                      </p>
                      <HBarChart
                        data={nonScrap.map(p => ({ name: p.name, value: p.faturamento, qty: p.qtd }))}
                        color="#a855f7"
                        formatter={fmtBRL}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
