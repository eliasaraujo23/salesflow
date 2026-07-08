'use client';

import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { type DateRange } from 'react-day-picker';
import { RefreshCw } from 'lucide-react';
import { CalendarDateRangePicker } from '@/components/ui/date-range-picker';
import { usePainelVendas } from '@/hooks/use-painel-vendas';
import { HBarChart } from '@/components/painel/h-bar-chart';
import { TipoDonut } from '@/components/painel/tipo-donut';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Cell,
} from 'recharts';

function fmtBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
}

function fmtK(v: number) {
  if (v >= 1_000_000) return `R$${(v / 1_000_000).toFixed(2)} Mi`;
  if (v >= 1_000) return `R$${(v / 1_000).toFixed(2)} Mil`;
  return fmtBRL(v);
}

function defaultRange(): DateRange {
  const now = new Date();
  return {
    from: new Date(now.getFullYear(), 0, 1),
    to: new Date(now.getFullYear(), 11, 31),
  };
}

interface KpiCellProps {
  label: string;
  value: string;
  sub?: string;
  border?: boolean;
}

function KpiCell({ label, value, sub, border = true }: KpiCellProps) {
  return (
    <div className={`flex flex-col justify-center gap-0.5 px-5 py-3 ${border ? 'border-r border-zinc-200 dark:border-white/[0.08]' : ''} flex-1 min-w-0`}>
      <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-400">{label}</span>
      <span className="text-base font-bold text-zinc-900 dark:text-zinc-100 tabular-nums truncate">{value}</span>
      {sub && <span className="text-[10px] text-zinc-400">{sub}</span>}
    </div>
  );
}

export default function PainelPage() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>(defaultRange);

  const from = dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : undefined;
  const to = dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : undefined;

  const { data, isLoading, isError, error, refetch, isFetching } = usePainelVendas(from, to);

  const tipoData = useMemo(() => data?.byTipo ?? [], [data]);
  const destinoData = useMemo(() => (data?.byDestino ?? []).map(d => ({ name: d.name, value: d.faturamento })), [data]);

  const tipoBarData = useMemo(() => {
    const COLORS: Record<string, string> = { JF: '#6366f1', JMF: '#f97316', JR: '#10b981', JM: '#a855f7' };
    return (data?.byTipo ?? []).map(t => ({ name: t.name, value: t.value, color: COLORS[t.name] ?? '#71717a' }));
  }, [data]);

  return (
    <div className="h-full overflow-auto p-4 flex flex-col gap-3">
      {/* Filter bar */}
      <div className="flex flex-wrap items-stretch gap-0 border border-zinc-200 dark:border-white/[0.08] rounded-xl overflow-hidden bg-white dark:bg-zinc-900 text-sm">
        <div className="flex flex-col justify-center gap-1 px-4 py-3 border-r border-zinc-200 dark:border-white/[0.08]">
          <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-400">Período</span>
          <CalendarDateRangePicker
            dateRange={dateRange}
            setDateRange={setDateRange}
            buttonClassName="border-0 px-0 text-xs font-semibold rounded-none hover:border-0"
          />
        </div>
        <KpiCell label="Faturamento" value={isLoading ? '—' : fmtBRL(data?.total.faturamento ?? 0)} />
        <KpiCell label="Ticket Médio" value={isLoading ? '—' : fmtBRL(data?.total.tm ?? 0)} />
        <KpiCell label="Quantidade" value={isLoading ? '—' : String(data?.total.qtd ?? 0)} />
        <KpiCell label="Lucratividade" value={isLoading ? '—' : `${data?.total.lucrat ?? 0}%`} border={false} />
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="px-4 border-l border-zinc-200 dark:border-white/[0.08] text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 disabled:opacity-40 transition-colors"
        >
          <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
        </button>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-24 text-zinc-400 text-sm gap-2">
          <RefreshCw size={15} className="animate-spin" /> Carregando dados...
        </div>
      )}

      {isError && !isLoading && (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <p className="text-sm text-red-500">{(error as Error)?.message || 'Erro ao carregar dados.'}</p>
          <button onClick={() => refetch()} className="text-sm text-indigo-500 hover:underline">Tentar novamente</button>
        </div>
      )}

      {data && !isLoading && (
        <>
          {/* B2B x B2C strip */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.08] rounded-xl overflow-hidden">
              <div className="px-4 py-2 border-b border-zinc-200 dark:border-white/[0.08]">
                <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-400">Vendas B2C</span>
              </div>
              <div className="flex divide-x divide-zinc-200 dark:divide-white/[0.08]">
                <KpiCell label="Faturamento" value={fmtBRL(data.b2c.faturamento)} />
                <KpiCell label="Ticket Médio" value={fmtBRL(data.b2c.tm)} />
                <KpiCell label="Quantidade" value={String(data.b2c.qtd)} />
                <KpiCell label="Lucratividade" value={`${data.b2c.lucrat}%`} border={false} />
              </div>
            </div>
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.08] rounded-xl overflow-hidden">
              <div className="px-4 py-2 border-b border-zinc-200 dark:border-white/[0.08]">
                <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-400">Vendas B2B</span>
              </div>
              <div className="flex divide-x divide-zinc-200 dark:divide-white/[0.08]">
                <KpiCell label="Faturamento" value={fmtBRL(data.b2b.faturamento)} />
                <KpiCell label="Ticket Médio" value={fmtBRL(data.b2b.tm)} />
                <KpiCell label="Quantidade" value={String(data.b2b.qtd)} />
                <KpiCell label="Lucratividade" value={`${data.b2b.lucrat}%`} border={false} />
              </div>
            </div>
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-3 gap-3 flex-1 min-h-0" style={{ minHeight: 480 }}>
            {/* Faturamento por Destino */}
            <div className="col-span-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.08] rounded-xl p-4 flex flex-col">
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-3 shrink-0">Faturamento Total por Destino</p>
              <div className="flex-1 overflow-auto">
                <HBarChart
                  data={destinoData}
                  color="#6366f1"
                  formatter={fmtBRL}
                  maxItems={25}
                />
              </div>
            </div>

            {/* Right column */}
            <div className="flex flex-col gap-3">
              {/* Revenda x Fabricado donut */}
              <div className="flex-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.08] rounded-xl p-4 flex flex-col">
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-2 shrink-0">Revenda × Fabricado</p>
                <div className="flex-1 min-h-0" style={{ minHeight: 180 }}>
                  {tipoData.length > 0 ? (
                    <TipoDonut data={tipoData} formatter={fmtBRL} />
                  ) : (
                    <div className="flex items-center justify-center h-full text-zinc-400 text-sm">Sem dados</div>
                  )}
                </div>
              </div>

              {/* Faturamento por Tipo — vertical bars */}
              <div className="flex-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.08] rounded-xl p-4 flex flex-col">
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-2 shrink-0">Faturamento por Tipo</p>
                <div className="flex-1 min-h-0" style={{ minHeight: 160 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={tipoBarData} margin={{ top: 20, right: 10, left: 4, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#a1a1aa' }} tickLine={false} axisLine={false} />
                      <YAxis
                        tickFormatter={v => {
                          if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
                          if (v >= 1_000) return `${(v / 1_000).toFixed(0)}k`;
                          return String(v);
                        }}
                        tick={{ fontSize: 10, fill: '#a1a1aa' }}
                        tickLine={false}
                        axisLine={false}
                        width={48}
                      />
                      <Tooltip
                        formatter={(v: number) => [fmtBRL(v), 'Faturamento']}
                        contentStyle={{ background: '#18181b', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontSize: 12 }}
                        labelStyle={{ color: '#a1a1aa', fontSize: 11 }}
                      />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={40}>
                        {tipoBarData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>

          {/* Ticket médio mensal */}
          {data.monthly.length > 0 && (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.08] rounded-xl p-4 flex flex-col" style={{ minHeight: 200 }}>
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-2 shrink-0">Ticket Médio por Mês</p>
              <div className="flex-1" style={{ height: 180 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.monthly} margin={{ top: 20, right: 20, left: 4, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
                    <XAxis dataKey="mesLabel" tick={{ fontSize: 11, fill: '#a1a1aa' }} tickLine={false} axisLine={false} />
                    <YAxis
                      tickFormatter={v => {
                        if (v >= 1_000) return `${(v / 1_000).toFixed(0)}k`;
                        return String(v);
                      }}
                      tick={{ fontSize: 10, fill: '#a1a1aa' }}
                      tickLine={false}
                      axisLine={false}
                      width={48}
                    />
                    <Tooltip
                      formatter={(v: number) => [fmtBRL(v), 'Ticket Médio']}
                      contentStyle={{ background: '#18181b', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontSize: 12 }}
                      labelStyle={{ color: '#a1a1aa', fontSize: 11 }}
                    />
                    <Bar dataKey="ticketMedio" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={40}>
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* B2C Breakdown */}
          {data.b2cByDestino.length > 0 && (
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.08] rounded-xl p-4 flex flex-col">
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-2 shrink-0">Vendas B2C por Canal</p>
                <HBarChart data={data.b2cByDestino.map(d => ({ name: d.name, value: d.faturamento }))} color="#10b981" maxItems={10} />
              </div>
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.08] rounded-xl p-4 flex flex-col">
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-2 shrink-0">Vendas B2B por Parceiro</p>
                <HBarChart data={data.b2bByDestino.map(d => ({ name: d.name, value: d.faturamento }))} color="#f97316" maxItems={10} />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
