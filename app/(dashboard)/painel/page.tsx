'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { format } from 'date-fns';
import { type DateRange } from 'react-day-picker';
import { RefreshCw, ChevronDown, Check } from 'lucide-react';
import { CalendarDateRangePicker } from '@/components/ui/date-range-picker';
import { usePainelVendas } from '@/hooks/use-painel-vendas';
import { HBarChart } from '@/components/painel/h-bar-chart';
import { TipoDonut } from '@/components/painel/tipo-donut';

function fmtBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
}

function fmtPct(v: number) {
  return `${v.toFixed(2)}%`;
}

function defaultRange(): DateRange {
  const now = new Date();
  const m = now.getMonth();
  const y = m === 0 ? now.getFullYear() - 1 : now.getFullYear();
  const pm = m === 0 ? 11 : m - 1;
  return { from: new Date(y, pm, 1), to: new Date(y, pm + 1, 0) };
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.08] rounded-xl px-5 py-4 flex flex-col gap-0.5 flex-1 min-w-[140px]">
      <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-400">{label}</span>
      <span className="text-xl font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">{value}</span>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-3">{children}</p>;
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.08] rounded-xl p-4 ${className}`}>
      {children}
    </div>
  );
}

// Multi-select dropdown — opções sempre em ordem alfabética
function DestinoSelect({ value, onChange, options }: {
  value: string[];
  onChange: (v: string[]) => void;
  options: string[]; // já deve vir ordenado
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  function toggle(d: string) {
    if (value.includes(d)) onChange(value.filter(x => x !== d));
    else onChange([...value, d]);
  }

  function clearAll() { onChange([]); }

  const label =
    value.length === 0 ? 'Todos os destinos'
    : value.length === 1 ? value[0]
    : `${value.length} destinos`;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 text-sm font-semibold text-zinc-800 dark:text-zinc-100 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
      >
        <span className={`max-w-[180px] truncate ${value.length > 0 ? 'text-indigo-600 dark:text-indigo-400' : ''}`}>
          {label}
        </span>
        <ChevronDown size={13} className="text-zinc-400 shrink-0" />
      </button>

      {open && (
        <div className="absolute top-full left-0 z-50 mt-1.5 min-w-[220px] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.10] rounded-xl shadow-xl flex flex-col">
          {/* Cabeçalho */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-100 dark:border-white/[0.06]">
            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Destino</span>
            {value.length > 0 && (
              <button
                onClick={clearAll}
                className="text-[10px] text-indigo-500 hover:text-indigo-700 font-semibold"
              >
                Limpar tudo
              </button>
            )}
          </div>

          {/* Lista scrollável */}
          <div className="overflow-y-auto max-h-72">
            {options.map(d => {
              const checked = value.includes(d);
              return (
                <button
                  key={d}
                  onClick={() => toggle(d)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors ${
                    checked
                      ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300'
                      : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-white/[0.04]'
                  }`}
                >
                  <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                    checked
                      ? 'bg-indigo-500 border-indigo-500'
                      : 'border-zinc-300 dark:border-zinc-600'
                  }`}>
                    {checked && <Check size={10} className="text-white" strokeWidth={3} />}
                  </span>
                  {d}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function PainelPage() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>(defaultRange);
  const [destinoFilter, setDestinoFilter] = useState<string[]>([]);

  const from = dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : undefined;
  const to = dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : undefined;

  const { data, isLoading, isError, error, refetch, isFetching } = usePainelVendas(
    from,
    to,
    destinoFilter.length > 0 ? destinoFilter : null,
  );

  const tipoData = useMemo(() => data?.byTipo ?? [], [data]);
  const destinoData = useMemo(
    () => (data?.byDestino ?? []).map(d => ({ name: d.name, value: d.faturamento })),
    [data],
  );

  return (
    <div className="h-full overflow-auto p-4 flex flex-col gap-4">

      {/* Barra de filtro */}
      <div className="flex flex-wrap items-center gap-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.08] rounded-xl px-4 py-3">
        <div className="flex flex-col gap-0.5 shrink-0">
          <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-400">Período</span>
          <CalendarDateRangePicker
            dateRange={dateRange}
            setDateRange={setDateRange}
            buttonClassName="border-0 px-0 text-sm font-semibold rounded-none hover:border-0 h-auto"
          />
        </div>

        <div className="w-px h-8 bg-zinc-200 dark:bg-white/[0.08] shrink-0" />

        <div className="flex flex-col gap-0.5 shrink-0">
          <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-400">Destino</span>
          <DestinoSelect
            value={destinoFilter}
            onChange={setDestinoFilter}
            options={data?.destinosSorted ?? []}
          />
        </div>

        <div className="ml-auto flex items-center gap-2">
          {isFetching && <span className="text-[11px] text-zinc-400">Atualizando...</span>}
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-white/[0.06] disabled:opacity-40 transition-colors"
          >
            <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* KPIs totais */}
      <div className="flex gap-3">
        <KpiCard label="Faturamento Total" value={isLoading ? '—' : fmtBRL(data?.total.faturamento ?? 0)} />
        <KpiCard label="Ticket Médio"       value={isLoading ? '—' : fmtBRL(data?.total.tm ?? 0)} />
        <KpiCard label="Quantidade"         value={isLoading ? '—' : String(data?.total.qtd ?? 0)} />
        <KpiCard label="Lucratividade"      value={isLoading ? '—' : fmtPct(data?.total.lucrat ?? 0)} />
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
          {/* B2C × B2B */}
          <div className="grid grid-cols-2 gap-3">
            <Card>
              <SectionTitle>Vendas B2C</SectionTitle>
              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: 'Faturamento',   value: fmtBRL(data.b2c.faturamento) },
                  { label: 'Ticket Médio',  value: fmtBRL(data.b2c.tm) },
                  { label: 'Quantidade',    value: String(data.b2c.qtd) },
                  { label: 'Lucratividade', value: fmtPct(data.b2c.lucrat) },
                ].map(k => (
                  <div key={k.label}>
                    <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 mb-0.5">{k.label}</p>
                    <p className="text-base font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">{k.value}</p>
                  </div>
                ))}
              </div>
            </Card>
            <Card>
              <SectionTitle>Vendas B2B</SectionTitle>
              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: 'Faturamento',   value: fmtBRL(data.b2b.faturamento) },
                  { label: 'Ticket Médio',  value: fmtBRL(data.b2b.tm) },
                  { label: 'Quantidade',    value: String(data.b2b.qtd) },
                  { label: 'Lucratividade', value: fmtPct(data.b2b.lucrat) },
                ].map(k => (
                  <div key={k.label}>
                    <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 mb-0.5">{k.label}</p>
                    <p className="text-base font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">{k.value}</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Destinos + coluna direita */}
          <div className="grid grid-cols-2 gap-3 items-start">
            <Card className="flex flex-col">
              <SectionTitle>Faturamento Total por Destino</SectionTitle>
              <HBarChart
                data={destinoData}
                color="#6366f1"
                formatter={fmtBRL}
              />
            </Card>

            <div className="flex flex-col gap-3">
              <Card className="flex flex-col">
                <SectionTitle>Revenda × Fabricado</SectionTitle>
                <div style={{ height: 260 }}>
                  {tipoData.length > 0
                    ? <TipoDonut data={tipoData} formatter={fmtBRL} />
                    : <div className="flex items-center justify-center h-full text-zinc-400 text-sm">Sem dados</div>}
                </div>
              </Card>

              {data.monthly.length > 0 && (
                <Card className="flex flex-col">
                  <SectionTitle>Ticket Médio por Mês</SectionTitle>
                  <HBarChart
                    data={data.monthly.map(m => ({ name: m.mesLabel, value: m.ticketMedio }))}
                    color="#a855f7"
                    formatter={fmtBRL}
                  />
                </Card>
              )}
            </div>
          </div>

          {/* B2C por Canal + B2B por Parceiro */}
          <div className="grid grid-cols-2 gap-3 items-start">
            <Card className="flex flex-col">
              <SectionTitle>Vendas B2C por Canal</SectionTitle>
              <HBarChart
                data={data.b2cByDestino.map(d => ({ name: d.name, value: d.faturamento }))}
                color="#10b981"
                formatter={fmtBRL}
              />
            </Card>
            <Card className="flex flex-col">
              <SectionTitle>Vendas B2B por Parceiro</SectionTitle>
              <HBarChart
                data={data.b2bByDestino.map(d => ({ name: d.name, value: d.faturamento }))}
                color="#f97316"
                formatter={fmtBRL}
              />
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
