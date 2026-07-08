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
  if (v >= 1_000) return `R$${(v / 1_000).toFixed(1)} Mil`;
  return fmtBRL(v);
}

function defaultRange(): DateRange {
  const now = new Date();
  return { from: new Date(now.getFullYear(), 0, 1), to: new Date(now.getFullYear(), 11, 31) };
}

function KpiCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.08] rounded-xl px-5 py-4 flex flex-col gap-0.5 flex-1 min-w-[140px]">
      <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-400">{label}</span>
      <span className="text-xl font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">{value}</span>
      {sub && <span className="text-[10px] text-zinc-400">{sub}</span>}
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
    <div className="h-full overflow-auto p-4 flex flex-col gap-4">

      {/* ── Barra de filtro ─────────────────────────────── */}
      <div className="flex items-center gap-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.08] rounded-xl px-4 py-3">
        <div className="flex flex-col gap-0.5">
          <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-400">Período</span>
          <CalendarDateRangePicker
            dateRange={dateRange}
            setDateRange={setDateRange}
            buttonClassName="border-0 px-0 text-sm font-semibold rounded-none hover:border-0 h-auto"
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

      {/* ── KPIs totais ─────────────────────────────────── */}
      <div className="flex gap-3">
        <KpiCard label="Faturamento Total" value={isLoading ? '—' : fmtK(data?.total.faturamento ?? 0)} />
        <KpiCard label="Ticket Médio" value={isLoading ? '—' : fmtBRL(data?.total.tm ?? 0)} />
        <KpiCard label="Quantidade" value={isLoading ? '—' : String(data?.total.qtd ?? 0)} />
        <KpiCard label="Lucratividade" value={isLoading ? '—' : `${data?.total.lucrat ?? 0}%`} />
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
          {/* ── B2C × B2B ──────────────────────────────── */}
          <div className="grid grid-cols-2 gap-3">
            <Card>
              <SectionTitle>Vendas B2C</SectionTitle>
              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: 'Faturamento', value: fmtK(data.b2c.faturamento) },
                  { label: 'Ticket Médio', value: fmtBRL(data.b2c.tm) },
                  { label: 'Quantidade', value: String(data.b2c.qtd) },
                  { label: 'Lucratividade', value: `${data.b2c.lucrat}%` },
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
                  { label: 'Faturamento', value: fmtK(data.b2b.faturamento) },
                  { label: 'Ticket Médio', value: fmtBRL(data.b2b.tm) },
                  { label: 'Quantidade', value: String(data.b2b.qtd) },
                  { label: 'Lucratividade', value: `${data.b2b.lucrat}%` },
                ].map(k => (
                  <div key={k.label}>
                    <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 mb-0.5">{k.label}</p>
                    <p className="text-base font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">{k.value}</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* ── Destinos + Donut + Tipo ─────────────────── */}
          <div className="grid grid-cols-3 gap-3">
            <Card className="col-span-2 flex flex-col">
              <SectionTitle>Faturamento Total por Destino</SectionTitle>
              <HBarChart data={destinoData} color="#6366f1" formatter={fmtBRL} maxItems={25} height={Math.max(300, destinoData.length * 30 + 40)} />
            </Card>
            <div className="flex flex-col gap-3">
              <Card className="flex flex-col flex-1">
                <SectionTitle>Revenda × Fabricado</SectionTitle>
                <div style={{ height: 240 }}>
                  {tipoData.length > 0
                    ? <TipoDonut data={tipoData} formatter={fmtBRL} />
                    : <div className="flex items-center justify-center h-full text-zinc-400 text-sm">Sem dados</div>}
                </div>
              </Card>
              <Card className="flex flex-col flex-1">
                <SectionTitle>Faturamento por Tipo</SectionTitle>
                <div style={{ height: 180 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={tipoBarData} margin={{ top: 16, right: 8, left: 0, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#a1a1aa' }} tickLine={false} axisLine={false} />
                      <YAxis
                        tickFormatter={v => v >= 1_000_000 ? `${(v/1_000_000).toFixed(1)}M` : v >= 1_000 ? `${(v/1_000).toFixed(0)}k` : String(v)}
                        tick={{ fontSize: 10, fill: '#a1a1aa' }} tickLine={false} axisLine={false} width={44}
                      />
                      <Tooltip
                        formatter={(v) => [fmtBRL(Number(v)), 'Faturamento']}
                        contentStyle={{ background: '#18181b', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontSize: 12 }}
                      />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={44}>
                        {tipoBarData.map((e, i) => <Cell key={i} fill={e.color} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>
          </div>

          {/* ── Ticket médio mensal ─────────────────────── */}
          {data.monthly.length > 0 && (
            <Card className="flex flex-col">
              <SectionTitle>Ticket Médio por Mês</SectionTitle>
              <div style={{ height: 180 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.monthly} margin={{ top: 16, right: 16, left: 0, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
                    <XAxis dataKey="mesLabel" tick={{ fontSize: 11, fill: '#a1a1aa' }} tickLine={false} axisLine={false} />
                    <YAxis
                      tickFormatter={v => v >= 1_000 ? `${(v/1_000).toFixed(0)}k` : String(v)}
                      tick={{ fontSize: 10, fill: '#a1a1aa' }} tickLine={false} axisLine={false} width={44}
                    />
                    <Tooltip
                      formatter={(v) => [fmtBRL(Number(v)), 'Ticket Médio']}
                      contentStyle={{ background: '#18181b', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontSize: 12 }}
                    />
                    <Bar dataKey="ticketMedio" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}

          {/* ── B2C por Canal + B2B por Parceiro ───────── */}
          <div className="grid grid-cols-2 gap-3">
            <Card className="flex flex-col">
              <SectionTitle>Vendas B2C por Canal</SectionTitle>
              <HBarChart
                data={data.b2cByDestino.map(d => ({ name: d.name, value: d.faturamento }))}
                color="#10b981" formatter={fmtBRL} maxItems={10}
              />
            </Card>
            <Card className="flex flex-col">
              <SectionTitle>Vendas B2B por Parceiro</SectionTitle>
              <HBarChart
                data={data.b2bByDestino.map(d => ({ name: d.name, value: d.faturamento }))}
                color="#f97316" formatter={fmtBRL} maxItems={10}
              />
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
