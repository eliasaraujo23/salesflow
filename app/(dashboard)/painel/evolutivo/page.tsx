'use client';

import { useState, useMemo } from 'react';
import { RefreshCw } from 'lucide-react';
import { useEvolucaoParceiros } from '@/hooks/use-evolucao-parceiros';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
} from 'recharts';

function fmtBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
}

function fmtY(v: number) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}k`;
  return String(v);
}

const LEILAO_DESTINOS = new Set(['LEILÃO ETERNNO', 'LEILÃO BRUNO', 'LEILÃO 24K']);
const ETERNNO_DESTINOS = new Set(['ETERNNO']);
const ML_DESTINOS = new Set(['MERCADO LIVRE']);
const PARCEIROS_EXCLUDE = new Set(['ETERNNO', 'LEILÃO ETERNNO', 'LEILÃO BRUNO', 'LEILÃO 24K', 'MERCADO LIVRE']);

const MESES_PT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const YEAR_COLORS = ['#6366f1', '#10b981', '#f97316', '#a855f7', '#3b82f6'];

const CANAIS = [
  { key: 'parceiros',    label: 'Parceiros',     color: '#6366f1', fill: 'rgba(99,102,241,0.12)' },
  { key: 'eternno',      label: 'Eternno',        color: '#18181b', fill: 'rgba(24,24,27,0.10)' },
  { key: 'leiloes',      label: 'Leilões',        color: '#a855f7', fill: 'rgba(168,85,247,0.12)' },
  { key: 'mercadolivre', label: 'Mercado Livre',  color: '#F5A623', fill: 'rgba(245,166,35,0.12)' },
];

export default function PainelEvolutivoPage() {
  const [selectedYears, setSelectedYears] = useState<Set<string>>(new Set());

  const { data: rawData, isLoading, isError, error, refetch, isFetching } = useEvolucaoParceiros({
    meses: 60,
    tipo: 'todos',
  });

  const { years, canalData } = useMemo(() => {
    if (!rawData) return { years: [] as string[], canalData: new Map<string, { mes: string; label: string; faturamento: number }[]>() };

    const maps = {
      parceiros: new Map<string, number>(),
      eternno: new Map<string, number>(),
      leiloes: new Map<string, number>(),
      mercadolivre: new Map<string, number>(),
    };
    const yearSet = new Set<string>();

    for (const r of rawData) {
      const dest = r.destino.toUpperCase().trim();
      yearSet.add(r.mes.substring(0, 4));
      if (LEILAO_DESTINOS.has(dest)) maps.leiloes.set(r.mes, (maps.leiloes.get(r.mes) ?? 0) + r.faturamento);
      if (ETERNNO_DESTINOS.has(dest)) maps.eternno.set(r.mes, (maps.eternno.get(r.mes) ?? 0) + r.faturamento);
      if (ML_DESTINOS.has(dest)) maps.mercadolivre.set(r.mes, (maps.mercadolivre.get(r.mes) ?? 0) + r.faturamento);
      if (!PARCEIROS_EXCLUDE.has(dest)) maps.parceiros.set(r.mes, (maps.parceiros.get(r.mes) ?? 0) + r.faturamento);
    }

    const allMeses = [...new Set(rawData.map(r => r.mes))].sort();

    function toRows(map: Map<string, number>) {
      return allMeses.map(mes => {
        const [, m] = mes.split('-');
        return { mes, label: `${MESES_PT[parseInt(m) - 1]}/${mes.substring(2, 4)}`, faturamento: map.get(mes) ?? 0 };
      });
    }

    const result = new Map<string, { mes: string; label: string; faturamento: number }[]>();
    result.set('parceiros', toRows(maps.parceiros));
    result.set('eternno', toRows(maps.eternno));
    result.set('leiloes', toRows(maps.leiloes));
    result.set('mercadolivre', toRows(maps.mercadolivre));

    return { years: [...yearSet].sort(), canalData: result };
  }, [rawData]);

  const activeYears = useMemo(
    () => selectedYears.size === 0 ? new Set(years) : selectedYears,
    [selectedYears, years],
  );

  function filterByYear<T extends { mes: string }>(arr: T[]): T[] {
    return arr.filter(r => activeYears.has(r.mes.substring(0, 4)));
  }

  function toggleYear(y: string) {
    setSelectedYears(prev => {
      const next = new Set(prev);
      if (next.has(y)) next.delete(y); else next.add(y);
      return next;
    });
  }

  const tooltipStyle = { background: '#ffffff', border: '1px solid #e4e4e7', borderRadius: 8, fontSize: 12, color: '#18181b', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' };

  return (
    <div className="h-full overflow-auto p-4 flex flex-col gap-3">

      {/* Control bar */}
      <div className="flex flex-wrap items-center gap-3 border border-zinc-200 dark:border-white/[0.08] rounded-xl bg-white dark:bg-zinc-900 px-4 py-3">
        <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 shrink-0">Ano</span>
        <div className="flex flex-wrap gap-1">
          {years.map((y, i) => (
            <button key={y} onClick={() => toggleYear(y)}
              className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors ${activeYears.has(y) ? 'text-white' : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-white/[0.06]'}`}
              style={activeYears.has(y) ? { background: YEAR_COLORS[i % YEAR_COLORS.length] } : {}}
            >{y}</button>
          ))}
        </div>
        <button onClick={() => refetch()} disabled={isFetching} className="ml-auto text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 disabled:opacity-40 transition-colors">
          <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
        </button>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-24 text-zinc-400 text-sm gap-2">
          <RefreshCw size={15} className="animate-spin" /> Carregando dados históricos...
        </div>
      )}
      {isError && !isLoading && (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <p className="text-sm text-red-500">{(error as Error)?.message || 'Erro ao carregar dados.'}</p>
          <button onClick={() => refetch()} className="text-sm text-indigo-500 hover:underline">Tentar novamente</button>
        </div>
      )}

      {rawData && !isLoading && (
        <div className="grid grid-cols-2 gap-3">
          {CANAIS.map(canal => {
            const rows = filterByYear(canalData.get(canal.key) ?? []);
            const total = rows.reduce((s, r) => s + r.faturamento, 0);
            const peak = Math.max(...rows.map(r => r.faturamento), 0);
            const peakRow = rows.find(r => r.faturamento === peak);
            return (
              <div key={canal.key} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.08] rounded-xl overflow-hidden flex flex-col">
                {/* Header */}
                <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-zinc-100 dark:border-white/[0.06]">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: canal.color }} />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">{canal.label}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-400">Total</p>
                      <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">{fmtBRL(total)}</p>
                    </div>
                    {peakRow && (
                      <div className="text-right">
                        <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-400">Pico</p>
                        <p className="text-sm font-bold tabular-nums" style={{ color: canal.color }}>{fmtBRL(peak)} <span className="text-[10px] font-normal text-zinc-400">({peakRow.label})</span></p>
                      </div>
                    )}
                  </div>
                </div>
                {/* Chart */}
                <div className="flex-1 p-3" style={{ minHeight: 200 }}>
                  {rows.every(r => r.faturamento === 0) ? (
                    <div className="flex items-center justify-center h-full text-zinc-400 text-sm">Sem dados no período</div>
                  ) : (
                    <ResponsiveContainer width="100%" height={200}>
                      <AreaChart data={rows} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id={`grad-${canal.key}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={canal.color} stopOpacity={0.3} />
                            <stop offset="100%" stopColor={canal.color} stopOpacity={0.02} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" vertical={false} />
                        <XAxis dataKey="label" tick={{ fontSize: 9, fill: '#a1a1aa' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                        <YAxis tickFormatter={fmtY} tick={{ fontSize: 9, fill: '#a1a1aa' }} tickLine={false} axisLine={false} width={46} />
                        <Tooltip formatter={(v) => [fmtBRL(Number(v)), canal.label]} contentStyle={tooltipStyle} />
                        <Area
                          type="monotone"
                          dataKey="faturamento"
                          stroke={canal.color}
                          strokeWidth={2}
                          fill={`url(#grad-${canal.key})`}
                          dot={false}
                          activeDot={{ r: 4, fill: canal.color, stroke: '#fff', strokeWidth: 2 }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
