'use client';

import { useMemo } from 'react';
import { RefreshCw } from 'lucide-react';
import { usePainelFilters } from '@/components/painel/painel-filters-context';
import { usePainelVendas } from '@/hooks/use-painel-vendas';
import { HBarChart } from '@/components/painel/h-bar-chart';
import { TipoDonut } from '@/components/painel/tipo-donut';

function fmtBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
}

function fmtPct(v: number) {
  return `${v.toFixed(2)}%`;
}

export default function PainelPage() {
  const { from, to, destinoFilter } = usePainelFilters();

  const { data, isLoading, isError, error } = usePainelVendas(
    from,
    to,
    destinoFilter.length > 0 ? destinoFilter : null,
  );

  const tipoData = useMemo(() => data?.byTipo ?? [], [data]);
  const destinoData = useMemo(
    () => (data?.byDestino ?? []).map(d => ({ name: d.name, value: d.faturamento, qty: d.qtd })),
    [data],
  );

  return (
    <div className="h-full overflow-hidden p-4 flex flex-col gap-3">

      {/* KPI bar compacto */}
      <div className="shrink-0 grid grid-cols-4 border border-zinc-200 dark:border-white/[0.08] rounded-xl overflow-hidden bg-white dark:bg-zinc-900 divide-x divide-zinc-200 dark:divide-white/[0.08]">
        {[
          { label: 'Faturamento Total', value: isLoading ? '—' : fmtBRL(data?.total.faturamento ?? 0) },
          { label: 'Ticket Médio',      value: isLoading ? '—' : fmtBRL(data?.total.tm ?? 0) },
          { label: 'Quantidade',        value: isLoading ? '—' : String(data?.total.qtd ?? 0) },
          { label: 'Lucratividade',     value: isLoading ? '—' : fmtPct(data?.total.lucrat ?? 0) },
        ].map(k => (
          <div key={k.label} className="flex flex-col gap-0.5 px-5 py-3">
            <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-400">{k.label}</span>
            <span className="text-lg font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">{k.value}</span>
          </div>
        ))}
      </div>

      {isLoading && (
        <div className="flex items-center justify-center flex-1 text-zinc-400 text-sm gap-2">
          <RefreshCw size={15} className="animate-spin" /> Carregando dados...
        </div>
      )}
      {isError && !isLoading && (
        <div className="flex flex-col items-center justify-center flex-1 gap-3">
          <p className="text-sm text-red-500">{(error as Error)?.message || 'Erro ao carregar dados.'}</p>
        </div>
      )}

      {data && !isLoading && (
        <div className="flex-1 min-h-0 grid grid-cols-2 gap-3">

          {/* Faturamento por Destino */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.08] rounded-xl p-4 flex flex-col min-h-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-3 shrink-0">
              Faturamento Total por Destino
            </p>
            <div className="flex-1 overflow-y-auto min-h-0">
              <HBarChart data={destinoData} color="#6366f1" formatter={fmtBRL} />
            </div>
          </div>

          {/* Donut + Ticket Médio */}
          <div className="flex flex-col gap-3 min-h-0">
            <div className="flex-1 min-h-0 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.08] rounded-xl p-4 flex flex-col overflow-hidden">
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-3 shrink-0">
                Revenda × Fabricado
              </p>
              <div className="flex-1 min-h-0">
                {tipoData.length > 0
                  ? <TipoDonut data={tipoData} formatter={fmtBRL} />
                  : <div className="flex items-center justify-center h-full text-zinc-400 text-sm">Sem dados</div>}
              </div>
            </div>

          </div>

        </div>
      )}
    </div>
  );
}
