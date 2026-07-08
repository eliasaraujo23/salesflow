'use client';

import { useState, useMemo } from 'react';
import { RefreshCw } from 'lucide-react';
import { useEvolucaoParceiros } from '@/hooks/use-evolucao-parceiros';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
  LineChart, Line, Legend,
} from 'recharts';

function fmtBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
}

function fmtK(v: number) {
  if (v >= 1_000_000) return `R$${(v / 1_000_000).toFixed(2)} Mi`;
  if (v >= 1_000) return `R$${(v / 1_000).toFixed(2)} Mil`;
  return fmtBRL(v);
}

const LEILAO_DESTINOS = new Set(['LEILÃO ETERNNO', 'LEILÃO BRUNO', 'LEILÃO 24K']);

const MESES_PT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

const YEAR_COLORS = ['#6366f1', '#10b981', '#f97316', '#a855f7', '#3b82f6'];

export default function PainelEvolutivoPage() {
  const [selectedYears, setSelectedYears] = useState<Set<string>>(new Set());

  const { data: rawData, isLoading, isError, error, refetch, isFetching } = useEvolucaoParceiros({
    meses: 60,
    tipo: 'todos',
  });

  // Build monthly aggregates for leilões and parceiros
  const { years, leilaoByMonth, parceirosByMonth, annualData, destinosDisponiveis, allMonthlyByDestino } = useMemo(() => {
    if (!rawData) return {
      years: [] as string[],
      leilaoByMonth: [] as { mes: string; label: string; faturamento: number }[],
      parceirosByMonth: [] as { mes: string; label: string; faturamento: number }[],
      annualData: [] as { ano: string; faturamento: number }[],
      destinosDisponiveis: [] as string[],
      allMonthlyByDestino: new Map<string, Map<string, number>>(),
    };

    const leilaoMap = new Map<string, number>();
    const parceirosMap = new Map<string, number>();
    const annualMap = new Map<string, number>();
    const yearSet = new Set<string>();
    const destinoSet = new Set<string>();
    const monthlyByDestino = new Map<string, Map<string, number>>();

    for (const r of rawData) {
      const ano = r.mes.substring(0, 4);
      yearSet.add(ano);
      annualMap.set(ano, (annualMap.get(ano) ?? 0) + r.faturamento);

      if (LEILAO_DESTINOS.has(r.destino.toUpperCase())) {
        leilaoMap.set(r.mes, (leilaoMap.get(r.mes) ?? 0) + r.faturamento);
      } else {
        parceirosMap.set(r.mes, (parceirosMap.get(r.mes) ?? 0) + r.faturamento);
      }

      destinoSet.add(r.destino);
      if (!monthlyByDestino.has(r.destino)) monthlyByDestino.set(r.destino, new Map());
      const dm = monthlyByDestino.get(r.destino)!;
      dm.set(r.mes, (dm.get(r.mes) ?? 0) + r.faturamento);
    }

    const allMeses = [...new Set(rawData.map(r => r.mes))].sort();

    function toMonthRows(map: Map<string, number>) {
      return allMeses.map(mes => {
        const [, m] = mes.split('-');
        return {
          mes,
          label: `${MESES_PT[parseInt(m) - 1]} ${mes.substring(0, 4)}`,
          faturamento: map.get(mes) ?? 0,
        };
      }).filter(r => r.faturamento > 0);
    }

    const years = [...yearSet].sort();
    const annualData = [...annualMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([ano, faturamento]) => ({ ano, faturamento }));

    return {
      years,
      leilaoByMonth: toMonthRows(leilaoMap),
      parceirosByMonth: toMonthRows(parceirosMap),
      annualData,
      destinosDisponiveis: [...destinoSet].sort(),
      allMonthlyByDestino: monthlyByDestino,
    };
  }, [rawData]);

  // Year filter
  const activeYears = useMemo(
    () => selectedYears.size === 0 ? new Set(years) : selectedYears,
    [selectedYears, years],
  );

  function filterByYear<T extends { mes: string }>(arr: T[]): T[] {
    return arr.filter(r => activeYears.has(r.mes.substring(0, 4)));
  }

  // Build year-by-year monthly comparison (for comparativo evolutivo parceiras)
  const yearlyMonthlyData = useMemo(() => {
    if (!rawData) return [];
    const mesMap = new Map<string, Record<string, number>>();
    for (const r of rawData) {
      const ano = r.mes.substring(0, 4);
      if (!activeYears.has(ano)) continue;
      const [, m] = r.mes.split('-');
      const mesLabel = MESES_PT[parseInt(m) - 1];
      const e = mesMap.get(mesLabel) ?? {};
      e[ano] = (e[ano] ?? 0) + r.faturamento;
      mesMap.set(mesLabel, e);
    }
    const orderedMonths = MESES_PT;
    return orderedMonths
      .filter(m => mesMap.has(m))
      .map(mes => ({ mes, ...mesMap.get(mes) }));
  }, [rawData, activeYears]);

  function toggleYear(y: string) {
    setSelectedYears(prev => {
      const next = new Set(prev);
      if (next.has(y)) next.delete(y);
      else next.add(y);
      return next;
    });
  }

  const chartMargin = { top: 20, right: 16, left: 4, bottom: 4 };

  return (
    <div className="h-full overflow-auto p-4 flex flex-col gap-3">
      {/* Control bar */}
      <div className="flex flex-wrap items-center gap-3 border border-zinc-200 dark:border-white/[0.08] rounded-xl bg-white dark:bg-zinc-900 px-4 py-3">
        <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 shrink-0">Ano</span>
        <div className="flex flex-wrap gap-1">
          {years.map((y, i) => (
            <button
              key={y}
              onClick={() => toggleYear(y)}
              className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors ${
                activeYears.has(y)
                  ? 'text-white'
                  : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-white/[0.06]'
              }`}
              style={activeYears.has(y) ? { background: YEAR_COLORS[i % YEAR_COLORS.length] } : {}}
            >
              {y}
            </button>
          ))}
        </div>
        <button onClick={() => refetch()} disabled={isFetching} className="ml-auto text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 disabled:opacity-40 transition-colors">
          <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
        </button>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-24 text-zinc-400 text-sm gap-2">
          <RefreshCw size={15} className="animate-spin" /> Carregando dados históricos (últimos 5 anos)...
        </div>
      )}
      {isError && !isLoading && (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <p className="text-sm text-red-500">{(error as Error)?.message || 'Erro ao carregar dados.'}</p>
          <button onClick={() => refetch()} className="text-sm text-indigo-500 hover:underline">Tentar novamente</button>
        </div>
      )}

      {rawData && !isLoading && (
        <>
          {/* Comparativo evolutivo lado a lado */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.08] rounded-xl p-4 flex flex-col">
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-3">Comparativo Evolutivo Leilão</p>
              <div style={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={filterByYear(leilaoByMonth)} margin={chartMargin} layout="vertical">
                    <XAxis type="number" tickFormatter={v => `${(v/1000).toFixed(0)}k`} tick={{ fontSize: 10, fill: '#a1a1aa' }} tickLine={false} axisLine={false} />
                    <YAxis type="category" dataKey="label" width={100} tick={{ fontSize: 10, fill: '#71717a' }} tickLine={false} axisLine={false} />
                    <Tooltip formatter={(v) => [fmtBRL(Number(v)), '']} contentStyle={{ background: '#ffffff', border: '1px solid #e4e4e7', borderRadius: 8, fontSize: 12, color: '#18181b', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                    <Bar dataKey="faturamento" fill="#a855f7" radius={[0, 4, 4, 0]} maxBarSize={18} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.08] rounded-xl p-4 flex flex-col">
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-3">Comparativo Evolutivo Parceiros</p>
              <div style={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={filterByYear(parceirosByMonth)} margin={chartMargin} layout="vertical">
                    <XAxis type="number" tickFormatter={v => {
                      if (v >= 1_000_000) return `${(v/1_000_000).toFixed(1)}M`;
                      if (v >= 1_000) return `${(v/1_000).toFixed(0)}k`;
                      return String(v);
                    }} tick={{ fontSize: 10, fill: '#a1a1aa' }} tickLine={false} axisLine={false} />
                    <YAxis type="category" dataKey="label" width={100} tick={{ fontSize: 10, fill: '#71717a' }} tickLine={false} axisLine={false} />
                    <Tooltip formatter={(v) => [fmtBRL(Number(v)), '']} contentStyle={{ background: '#ffffff', border: '1px solid #e4e4e7', borderRadius: 8, fontSize: 12, color: '#18181b', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                    <Bar dataKey="faturamento" fill="#6366f1" radius={[0, 4, 4, 0]} maxBarSize={18} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Comparativo mensal por ano (linha) */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.08] rounded-xl p-4 flex flex-col">
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-3">Comparativo Mensal por Ano</p>
            <div style={{ height: 240 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={yearlyMonthlyData} margin={chartMargin}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
                  <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#a1a1aa' }} tickLine={false} axisLine={false} />
                  <YAxis
                    tickFormatter={v => {
                      if (v >= 1_000_000) return `${(v/1_000_000).toFixed(1)}M`;
                      if (v >= 1_000) return `${(v/1_000).toFixed(0)}k`;
                      return String(v);
                    }}
                    tick={{ fontSize: 10, fill: '#a1a1aa' }}
                    tickLine={false}
                    axisLine={false}
                    width={52}
                  />
                  <Tooltip
                    formatter={(v) => [fmtBRL(Number(v)), '']}
                    contentStyle={{ background: '#ffffff', border: '1px solid #e4e4e7', borderRadius: 8, fontSize: 12, color: '#18181b', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11, color: '#a1a1aa' }} />
                  {[...activeYears].sort().map((ano, i) => (
                    <Line
                      key={ano}
                      type="monotone"
                      dataKey={ano}
                      stroke={YEAR_COLORS[i % YEAR_COLORS.length]}
                      strokeWidth={2}
                      dot={{ r: 3, fill: YEAR_COLORS[i % YEAR_COLORS.length], stroke: '#fff', strokeWidth: 1 }}
                      activeDot={{ r: 5 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Faturamento anual acumulado */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.08] rounded-xl p-4 flex flex-col">
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-3">Faturamento Acumulado por Ano</p>
            <div style={{ height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={annualData} margin={chartMargin}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
                  <XAxis dataKey="ano" tick={{ fontSize: 12, fill: '#a1a1aa' }} tickLine={false} axisLine={false} />
                  <YAxis
                    tickFormatter={v => {
                      if (v >= 1_000_000) return `${(v/1_000_000).toFixed(1)}M`;
                      if (v >= 1_000) return `${(v/1_000).toFixed(0)}k`;
                      return String(v);
                    }}
                    tick={{ fontSize: 10, fill: '#a1a1aa' }}
                    tickLine={false}
                    axisLine={false}
                    width={56}
                  />
                  <Tooltip
                    formatter={(v) => [fmtBRL(Number(v)), 'Faturamento']}
                    contentStyle={{ background: '#ffffff', border: '1px solid #e4e4e7', borderRadius: 8, fontSize: 12, color: '#18181b', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                  <Bar dataKey="faturamento" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={60}>
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
