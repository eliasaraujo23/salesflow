'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { CANAL_COLORS as CANAL_HEX } from '@/lib/colors';
import { RefreshCw } from 'lucide-react';
import { useEvolucaoParceiros } from '@/hooks/use-evolucao-parceiros';
import {
  AreaChart, Area, LineChart, Line,
  XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Legend,
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
  { key: 'parceiros',    label: 'Parceiros',     color: CANAL_HEX['Parceiros'] },
  { key: 'eternno',      label: 'Eternno',        color: CANAL_HEX['Eternno'] },
  { key: 'leiloes',      label: 'Leilões',        color: CANAL_HEX['Leilão'] },
  { key: 'mercadolivre', label: 'Mercado Livre',  color: CANAL_HEX['Mercado Livre'] },
];

const CANAL_COLORS: Record<string, string> = {
  parceiros:    CANAL_HEX['Parceiros'],
  eternno:      CANAL_HEX['Eternno'],
  leiloes:      CANAL_HEX['Leilão'],
  mercadolivre: CANAL_HEX['Mercado Livre'],
};
const CANAL_LABELS: Record<string, string> = {
  parceiros:    'Parceiros',
  eternno:      'Eternno',
  leiloes:      'Leilões',
  mercadolivre: 'Mercado Livre',
};

const tooltipStyle = {
  background: '#ffffff',
  border: '1px solid #e4e4e7',
  borderRadius: 8,
  fontSize: 12,
  color: '#18181b',
  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
};

function getCanal(dest: string): string {
  if (LEILAO_DESTINOS.has(dest)) return 'Leilões';
  if (ETERNNO_DESTINOS.has(dest)) return 'Eternno';
  if (ML_DESTINOS.has(dest)) return 'Mercado Livre';
  return 'Parceiros';
}

export default function PainelEvolutivoPage() {
  const [selectedYears, setSelectedYears] = useState<Set<string>>(new Set());
  const [activeCanais, setActiveCanais] = useState<Set<string>>(
    new Set(['parceiros', 'eternno', 'leiloes', 'mercadolivre'])
  );
  const yearsInitialized = useRef(false);

  const { data: rawData, isLoading, isError, error, refetch, isFetching } = useEvolucaoParceiros({
    meses: 60,
    tipo: 'todos',
  });

  const { years, canalData, monthlyRows } = useMemo((): {
    years: string[];
    canalData: Map<string, { mes: string; label: string; faturamento: number }[]>;
    monthlyRows: Record<string, number | string>[];
  } => {
    if (!rawData) return {
      years: [],
      canalData: new Map(),
      monthlyRows: [],
    };

    const maps = {
      parceiros: new Map<string, number>(),
      eternno: new Map<string, number>(),
      leiloes: new Map<string, number>(),
      mercadolivre: new Map<string, number>(),
    };
    const mesMap = new Map<string, Record<string, number>>();
    const yearSet = new Set<string>();

    for (const r of rawData) {
      const dest = r.destino.toUpperCase().trim();
      yearSet.add(r.mes.substring(0, 4));

      if (LEILAO_DESTINOS.has(dest)) {
        maps.leiloes.set(r.mes, (maps.leiloes.get(r.mes) ?? 0) + r.faturamento);
      }
      if (ETERNNO_DESTINOS.has(dest)) {
        maps.eternno.set(r.mes, (maps.eternno.get(r.mes) ?? 0) + r.faturamento);
      }
      if (ML_DESTINOS.has(dest)) {
        maps.mercadolivre.set(r.mes, (maps.mercadolivre.get(r.mes) ?? 0) + r.faturamento);
      }
      if (!PARCEIROS_EXCLUDE.has(dest)) {
        maps.parceiros.set(r.mes, (maps.parceiros.get(r.mes) ?? 0) + r.faturamento);
      }

      const e = mesMap.get(r.mes) ?? { parceiros: 0, eternno: 0, leiloes: 0, mercadolivre: 0 };
      if (LEILAO_DESTINOS.has(dest)) e.leiloes += r.faturamento;
      if (ETERNNO_DESTINOS.has(dest)) e.eternno += r.faturamento;
      if (ML_DESTINOS.has(dest)) e.mercadolivre += r.faturamento;
      if (!PARCEIROS_EXCLUDE.has(dest)) e.parceiros += r.faturamento;
      mesMap.set(r.mes, e);
    }

    const currentMes = new Date().toISOString().substring(0, 7);
    const allMeses = [...new Set(rawData.map(r => r.mes))].sort().filter(m => m <= currentMes);

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

    const mRows = [...mesMap.keys()].sort().filter(m => m <= currentMes).map(mes => {
      const [, m] = mes.split('-');
      return {
        mes,
        label: `${MESES_PT[parseInt(m) - 1]}/${mes.substring(2, 4)}`,
        ...mesMap.get(mes)!,
      };
    });

    return { years: [...yearSet].sort(), canalData: result, monthlyRows: mRows };
  }, [rawData]);

  useEffect(() => {
    if (!yearsInitialized.current && years.length > 0) {
      setSelectedYears(new Set(years));
      yearsInitialized.current = true;
    }
  }, [years]);

  function filterByYear<T extends { mes: string }>(arr: T[]): T[] {
    return arr.filter(r => selectedYears.has(r.mes.substring(0, 4)));
  }

  const filteredRows = useMemo(
    () => monthlyRows.filter(r => selectedYears.has((r.mes as string).substring(0, 4))),
    [monthlyRows, selectedYears],
  );

  function toggleYear(y: string) {
    setSelectedYears(prev => {
      const next = new Set(prev);
      if (next.has(y)) { if (next.size > 1) next.delete(y); }
      else next.add(y);
      return next;
    });
  }

  function toggleCanal(c: string) {
    setActiveCanais(prev => {
      const next = new Set(prev);
      if (next.has(c)) { if (next.size > 1) next.delete(c); }
      else next.add(c);
      return next;
    });
  }

  return (
    <div className="h-full overflow-hidden p-4 flex flex-col gap-3">

      {/* Control bar */}
      <div className="shrink-0 flex flex-wrap items-center gap-4 border border-zinc-200 dark:border-white/[0.08] rounded-xl bg-white dark:bg-zinc-900 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 shrink-0">Ano</span>
          <div className="flex flex-wrap gap-1">
            {years.map((y, i) => (
              <button key={y} onClick={() => toggleYear(y)}
                className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors ${selectedYears.has(y) ? 'text-white' : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-white/[0.06]'}`}
                style={selectedYears.has(y) ? { background: YEAR_COLORS[i % YEAR_COLORS.length] } : {}}
              >{y}</button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 shrink-0">Canal</span>
          <div className="flex flex-wrap gap-1">
            {Object.entries(CANAL_LABELS).map(([key, label]) => (
              <button key={key} onClick={() => toggleCanal(key)}
                className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors ${activeCanais.has(key) ? 'text-white' : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-white/[0.06]'}`}
                style={activeCanais.has(key) ? { background: CANAL_COLORS[key] } : {}}
              >{label}</button>
            ))}
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button onClick={() => refetch()} disabled={isFetching} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 disabled:opacity-40 transition-colors">
            <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
          </button>
        </div>
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
        <>
          {/* 4 area charts individuais — flex-1 para preencher ~55% da altura disponível */}
          <div className="flex-[55] min-h-0 grid grid-cols-2 gap-3">
            {CANAIS.filter(c => activeCanais.has(c.key)).map(canal => {
              const rows = filterByYear(canalData.get(canal.key) ?? []);
              const total = rows.reduce((s, r) => s + r.faturamento, 0);
              const peak = Math.max(...rows.map(r => r.faturamento), 0);
              const peakRow = rows.find(r => r.faturamento === peak);
              const media = rows.length > 0 ? total / rows.length : 0;
              const sorted = [...rows].map(r => r.faturamento).sort((a, b) => a - b);
              const mid = Math.floor(sorted.length / 2);
              const mediana = sorted.length === 0 ? 0 : sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
              return (
                <div key={canal.key} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.08] rounded-xl overflow-hidden flex flex-col min-h-0">
                  <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-zinc-100 dark:border-white/[0.06]">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: canal.color }} />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">{canal.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {[
                        { label: 'Total',   value: fmtBRL(total),   color: undefined },
                        { label: 'Média',   value: fmtBRL(media),   color: undefined },
                        { label: 'Mediana', value: fmtBRL(mediana), color: undefined },
                        ...(peakRow ? [{ label: `Pico (${peakRow.label})`, value: fmtBRL(peak), color: canal.color }] : []),
                      ].map(({ label, value, color }) => (
                        <div key={label} className="bg-zinc-50 dark:bg-zinc-800 rounded-lg px-3 py-1.5 flex flex-col gap-0.5 text-right">
                          <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-400">{label}</span>
                          <span className="text-xs font-bold tabular-nums text-zinc-900 dark:text-zinc-100" style={color ? { color } : undefined}>{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex-1 min-h-0 p-3">
                    {rows.every(r => r.faturamento === 0) ? (
                      <div className="flex items-center justify-center h-full text-zinc-400 text-sm">Sem dados no período</div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
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

          {/* Gráfico comparativo multi-linha — flex-[45] para ~45% da altura disponível */}
          {(() => {
            const totaisMensais = filteredRows.map(r =>
              Object.keys(CANAL_LABELS).filter(k => activeCanais.has(k)).reduce((s, k) => s + (Number(r[k]) || 0), 0)
            );
            const totalGeral = totaisMensais.reduce((s, v) => s + v, 0);
            const mediaGeral = totaisMensais.length > 0 ? totalGeral / totaisMensais.length : 0;
            const sortedT = [...totaisMensais].sort((a, b) => a - b);
            const midT = Math.floor(sortedT.length / 2);
            const medianaGeral = sortedT.length === 0 ? 0 : sortedT.length % 2 === 0 ? (sortedT[midT - 1] + sortedT[midT]) / 2 : sortedT[midT];
            const picoValor = Math.max(...totaisMensais, 0);
            const picoRow = filteredRows[totaisMensais.indexOf(picoValor)];
            return (
          <div className="flex-[45] min-h-0 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.08] rounded-xl p-4 flex flex-col gap-2">
            <div className="shrink-0 flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Evolução Comparativa por Canal</p>
              <div className="flex items-center gap-2">
                {[
                  { label: 'Total',   value: fmtBRL(totalGeral),   color: undefined },
                  { label: 'Média',   value: fmtBRL(mediaGeral),   color: undefined },
                  { label: 'Mediana', value: fmtBRL(medianaGeral), color: undefined },
                  ...(picoRow ? [{ label: `Pico (${picoRow.label})`, value: fmtBRL(picoValor), color: '#f59e0b' }] : []),
                ].map(({ label, value, color }) => (
                  <div key={label} className="bg-zinc-50 dark:bg-zinc-800 rounded-lg px-3 py-1.5 flex flex-col gap-0.5 text-right">
                    <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-400">{label}</span>
                    <span className="text-xs font-bold tabular-nums text-zinc-900 dark:text-zinc-100" style={color ? { color } : undefined}>{value}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={filteredRows} margin={{ top: 12, right: 24, left: 0, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#a1a1aa' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                  <YAxis tickFormatter={fmtY} tick={{ fontSize: 10, fill: '#a1a1aa' }} tickLine={false} axisLine={false} width={52} />
                  <Tooltip
                    formatter={(v, name) => [fmtBRL(Number(v)), CANAL_LABELS[name as string] ?? name]}
                    contentStyle={tooltipStyle}
                  />
                  <Legend
                    formatter={name => CANAL_LABELS[name] ?? name}
                    wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                  />
                  {Object.keys(CANAL_LABELS).filter(k => activeCanais.has(k)).map(key => (
                    <Line
                      key={key}
                      type="monotone"
                      dataKey={key}
                      name={key}
                      stroke={CANAL_COLORS[key]}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4, fill: CANAL_COLORS[key], stroke: '#fff', strokeWidth: 2 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
            );
          })()}
        </>
      )}
    </div>
  );
}
