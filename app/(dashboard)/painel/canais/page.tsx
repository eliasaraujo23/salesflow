'use client';

import { useMemo } from 'react';
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
      color: 'text-emerald-600 dark:text-emerald-400',
      kpis: [
        { label: 'Faturamento',   value: isLoading ? '—' : fmtBRL(data?.b2c.faturamento ?? 0) },
        { label: 'Ticket Médio',  value: isLoading ? '—' : fmtBRL(data?.b2c.tm ?? 0) },
        { label: 'Quantidade',    value: isLoading ? '—' : String(data?.b2c.qtd ?? 0) },
        { label: 'Lucratividade', value: isLoading ? '—' : fmtPct(data?.b2c.lucrat ?? 0) },
      ],
    },
    {
      label: 'B2B — Parceiros',
      color: 'text-orange-500 dark:text-orange-400',
      kpis: [
        { label: 'Faturamento',   value: isLoading ? '—' : fmtBRL(data?.b2b.faturamento ?? 0) },
        { label: 'Ticket Médio',  value: isLoading ? '—' : fmtBRL(data?.b2b.tm ?? 0) },
        { label: 'Quantidade',    value: isLoading ? '—' : String(data?.b2b.qtd ?? 0) },
        { label: 'Lucratividade', value: isLoading ? '—' : fmtPct(data?.b2b.lucrat ?? 0) },
      ],
    },
  ];

  return (
    <div className="h-full overflow-auto p-4 flex flex-col gap-3">
      {/* KPI bar */}
      <div className="grid grid-cols-2 border border-zinc-200 dark:border-white/[0.08] rounded-xl overflow-hidden bg-white dark:bg-zinc-900 divide-x divide-zinc-200 dark:divide-white/[0.08]">
        {sections.map(s => (
          <div key={s.label}>
            <div className="px-4 pt-2 pb-0 flex items-center gap-2">
              <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-400">{s.label}</span>
            </div>
            <div className="grid grid-cols-4 divide-x divide-zinc-200 dark:divide-white/[0.08]">
              {s.kpis.map(k => (
                <div key={k.label} className="flex flex-col gap-0.5 px-4 py-2.5">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-400">{k.label}</span>
                  <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">{k.value}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

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
        <div className="grid grid-cols-2 gap-3 items-start">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.08] rounded-xl p-4 flex flex-col">
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-3">
              Vendas B2C por Canal
            </p>
            {b2cData.length > 0 ? (
              <HBarChart data={b2cData} color="#10b981" formatter={fmtBRL} />
            ) : (
              <div className="flex items-center justify-center py-12 text-zinc-400 text-sm">Sem vendas B2C no período</div>
            )}
          </div>

          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.08] rounded-xl p-4 flex flex-col">
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-3">
              Vendas B2B por Parceiro
            </p>
            {b2bData.length > 0 ? (
              <HBarChart data={b2bData} color="#f97316" formatter={fmtBRL} />
            ) : (
              <div className="flex items-center justify-center py-12 text-zinc-400 text-sm">Sem vendas B2B no período</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
