'use client';

import { useMemo } from 'react';
import { RefreshCw } from 'lucide-react';
import { usePainelFilters } from '@/components/painel/painel-filters-context';
import { usePainelVendas } from '@/hooks/use-painel-vendas';
import { HBarChart } from '@/components/painel/h-bar-chart';
import { SEGMENT_HEX, SEGMENT_CLASSES } from '@/lib/colors';
import { chartCardHeight } from '@/lib/chart-height';

function fmtBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
}


export default function PainelCanaisPage() {
  const { from, to, destinoFilter } = usePainelFilters();

  const { data, isLoading, isError, error } = usePainelVendas(
    from,
    to,
    destinoFilter.length > 0 ? destinoFilter : null,
  );

  const b2cData = useMemo(
    () => (data?.b2cByDestino ?? []).map(d => ({ name: d.name, value: d.faturamento, qty: d.qtd })),
    [data],
  );

  const b2bData = useMemo(
    () => (data?.b2bByDestino ?? []).map(d => ({ name: d.name, value: d.faturamento, qty: d.qtd })),
    [data],
  );

  const sections = [
    {
      label: 'B2C — Consumidor Final',
      kpis: [
        { label: 'Faturamento',   value: isLoading ? '—' : fmtBRL(data?.b2c.faturamento ?? 0) },
        { label: 'Ticket Médio',  value: isLoading ? '—' : fmtBRL(data?.b2c.tm ?? 0) },
        { label: 'Quantidade',    value: isLoading ? '—' : String(data?.b2c.qtd ?? 0) },
      ],
    },
    {
      label: 'B2B — Parceiros',
      kpis: [
        { label: 'Faturamento',   value: isLoading ? '—' : fmtBRL(data?.b2b.faturamento ?? 0) },
        { label: 'Ticket Médio',  value: isLoading ? '—' : fmtBRL(data?.b2b.tm ?? 0) },
        { label: 'Quantidade',    value: isLoading ? '—' : String(data?.b2b.qtd ?? 0) },
      ],
    },
  ];

  return (
    <div className="h-full overflow-y-auto md:overflow-hidden p-4 flex flex-col gap-3">

      {/* KPI bar */}
      <div className="shrink-0 grid grid-cols-1 md:grid-cols-2 border border-zinc-200 dark:border-white/[0.08] rounded-xl overflow-hidden bg-white dark:bg-zinc-900 divide-y md:divide-y-0 md:divide-x divide-zinc-200 dark:divide-white/[0.08]">
        {sections.map(s => (
          <div key={s.label}>
            <div className={`px-4 py-1.5 ${s.label.startsWith('B2C') ? SEGMENT_CLASSES.B2C.bg : SEGMENT_CLASSES.B2B.bg}`}>
              <span className={`text-[9px] font-bold uppercase tracking-widest ${s.label.startsWith('B2C') ? SEGMENT_CLASSES.B2C.text : SEGMENT_CLASSES.B2B.text}`}>{s.label}</span>
            </div>
            <div className="grid grid-cols-3 divide-x divide-zinc-200 dark:divide-white/[0.08]">
              {s.kpis.map(k => (
                <div key={k.label} className="flex flex-col gap-0.5 px-2 py-2 md:px-4 md:py-2.5 min-w-0">
                  <span className="text-[8px] md:text-[9px] font-bold uppercase tracking-widest text-zinc-400 truncate">{k.label}</span>
                  <span className="text-xs md:text-sm font-bold text-zinc-900 dark:text-zinc-100 tabular-nums truncate">{k.value}</span>
                </div>
              ))}
            </div>
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
        <div className="shrink-0 md:flex-1 md:min-h-0 grid grid-cols-1 md:grid-cols-2 gap-3">

          <div
            className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.08] rounded-xl p-4 flex flex-col md:!min-h-0"
            style={{ minHeight: chartCardHeight(b2cData.length) }}
          >
            <p className={`text-[10px] font-bold uppercase tracking-widest ${SEGMENT_CLASSES.B2C.text} mb-3 shrink-0`}>
              Vendas B2C por Canal
            </p>
            <div className="flex-1 min-h-0">
              {b2cData.length > 0
                ? <HBarChart data={b2cData} color={SEGMENT_HEX.B2C} formatter={fmtBRL} fill />
                : <div className="flex items-center justify-center h-full text-zinc-400 text-sm">Sem vendas B2C no período</div>}
            </div>
          </div>

          <div
            className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.08] rounded-xl p-4 flex flex-col md:!min-h-0"
            style={{ minHeight: chartCardHeight(b2bData.length) }}
          >
            <p className={`text-[10px] font-bold uppercase tracking-widest ${SEGMENT_CLASSES.B2B.text} mb-3 shrink-0`}>
              Vendas B2B por Parceiro
            </p>
            <div className="flex-1 min-h-0">
              {b2bData.length > 0
                ? <HBarChart data={b2bData} color={SEGMENT_HEX.B2B} formatter={fmtBRL} fill />
                : <div className="flex items-center justify-center h-full text-zinc-400 text-sm">Sem vendas B2B no período</div>}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
