'use client';

import { useMemo, useState } from 'react';
import { RefreshCw, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { usePainelFilters } from '@/components/painel/painel-filters-context';
import { useEvolucaoJoias } from '@/hooks/use-evolucao-joias';
import { LOJA_COLORS } from '@/lib/colors';

const LOJAS = ['Tijuca', 'Ipanema', 'Méier', 'Eternno', 'Eduardo', 'Thaís'];

const MESES_PT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
function fmtMes(ym: string) {
  const [y, m] = ym.split('-');
  return `${MESES_PT[parseInt(m) - 1]}/${y.slice(2)}`;
}

type SortKey = 'mes' | 'loja' | 'cad';

export default function JoiasMesPage() {
  const { from, to } = usePainelFilters();
  const { data, isLoading, isError, error } = useEvolucaoJoias(from, to);

  const [lojaFiltro, setLojaFiltro] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('mes');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  }

  const lojasPresentes = useMemo(() => {
    if (!data) return [];
    const s = new Set(data.cadastradas.map(r => r.loja));
    return LOJAS.filter(l => s.has(l));
  }, [data]);

  const { chartData, meses, totalCad } = useMemo(() => {
    if (!data) return { chartData: [], meses: [], totalCad: 0 };

    const lojas = lojaFiltro ? [lojaFiltro] : lojasPresentes;
    const cadRows = lojaFiltro ? data.cadastradas.filter(r => r.loja === lojaFiltro) : data.cadastradas;

    const allMeses = Array.from(new Set(cadRows.map(r => r.mes))).sort();

    const chartData = allMeses.map(mes => {
      const row: Record<string, string | number> = { mes: fmtMes(mes) };
      for (const loja of lojas) {
        row[loja] = cadRows.find(r => r.mes === mes && r.loja === loja)?.count ?? 0;
      }
      return row;
    });

    const totalCad = cadRows.reduce((s, r) => s + r.count, 0);

    return { chartData, meses: allMeses, totalCad };
  }, [data, lojaFiltro, lojasPresentes]);

  const tableData = useMemo(() => {
    if (!data) return [];
    const lojas = lojaFiltro ? [lojaFiltro] : lojasPresentes;
    const cadRows = lojaFiltro ? data.cadastradas.filter(r => r.loja === lojaFiltro) : data.cadastradas;

    const rows = meses.flatMap(mes =>
      lojas.map(loja => {
        const cad = cadRows.find(r => r.mes === mes && r.loja === loja)?.count ?? 0;
        if (cad === 0) return null;
        return { mes: fmtMes(mes), mesRaw: mes, loja, cad };
      }).filter(Boolean)
    ) as { mes: string; mesRaw: string; loja: string; cad: number }[];

    return [...rows].sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'mes') cmp = a.mesRaw.localeCompare(b.mesRaw);
      else if (sortKey === 'loja') cmp = a.loja.localeCompare(b.loja, 'pt-BR');
      else cmp = a.cad - b.cad;
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [data, lojaFiltro, lojasPresentes, meses, sortKey, sortDir]);

  const activeLojas = lojaFiltro ? [lojaFiltro] : lojasPresentes;

  return (
    <div className="h-full overflow-hidden p-4 flex flex-col gap-3">

      {/* KPI + filtro loja */}
      <div className="shrink-0 border border-zinc-200 dark:border-white/[0.08] rounded-xl overflow-hidden bg-white dark:bg-zinc-900">
        <div className="px-4 py-2 bg-indigo-600 text-white">
          <span className="text-xs font-bold uppercase tracking-widest">Joias por Mês</span>
        </div>
        <div className="flex items-center divide-x divide-zinc-200 dark:divide-white/[0.08]">
          <div className="flex flex-col gap-0.5 px-4 py-2.5">
            <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-400">Cadastradas</span>
            <span className="text-sm font-bold tabular-nums text-zinc-900 dark:text-zinc-100">
              {isLoading ? '—' : String(totalCad)}
            </span>
          </div>

          {/* Loja filter pills */}
          <div className="flex items-center gap-1.5 px-4 py-2 flex-wrap flex-1">
            <button
              onClick={() => setLojaFiltro(null)}
              className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide transition-colors ${
                lojaFiltro === null
                  ? 'bg-zinc-800 dark:bg-zinc-100 text-white dark:text-zinc-900'
                  : 'bg-zinc-100 dark:bg-white/[0.06] text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-white/[0.1]'
              }`}
            >
              Todas
            </button>
            {lojasPresentes.map(loja => (
              <button
                key={loja}
                onClick={() => setLojaFiltro(prev => prev === loja ? null : loja)}
                className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide transition-colors ${
                  lojaFiltro === loja
                    ? 'text-white'
                    : 'bg-zinc-100 dark:bg-white/[0.06] text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-white/[0.1]'
                }`}
                style={lojaFiltro === loja ? { backgroundColor: LOJA_COLORS[loja] } : {}}
              >
                {loja}
              </button>
            ))}
          </div>
        </div>
      </div>

      {isLoading && (
        <div className="flex-1 flex items-center justify-center text-zinc-400 text-sm gap-2">
          <RefreshCw size={15} className="animate-spin" /> Carregando...
        </div>
      )}
      {isError && !isLoading && (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-red-500">{(error as Error)?.message ?? 'Erro ao carregar dados.'}</p>
        </div>
      )}

      {!isLoading && !isError && (
        <>
          {/* Chart: cadastradas por loja empilhado */}
          <div className="flex-1 min-h-0 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.08] rounded-xl p-4 flex flex-col">
            <div className="text-[11px] font-bold uppercase tracking-widest text-zinc-400 mb-3 shrink-0">
              Cadastradas por Mês e Loja
            </div>
            {chartData.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-sm text-zinc-400">Sem dados no período</div>
            ) : (
              <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 4, right: 16, bottom: 4, left: 0 }} barCategoryGap="25%">
                    <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#71717a' }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#71717a' }} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip
                      cursor={{ fill: 'rgba(99,102,241,0.05)' }}
                      content={({ active, payload, label }) => {
                        if (!active || !payload?.length) return null;
                        const total = payload.reduce((s, p) => s + (Number(p.value) || 0), 0);
                        return (
                          <div className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 shadow-sm">
                            <p className="text-[11px] font-bold text-zinc-700 dark:text-zinc-200 mb-1">{label} — total: {total}</p>
                            {payload.filter(p => Number(p.value) > 0).map((p) => (
                              <p key={p.dataKey as string} className="text-[11px]" style={{ color: p.color }}>
                                {p.name}: {p.value}
                              </p>
                            ))}
                          </div>
                        );
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                    {activeLojas.map(loja => (
                      <Bar
                        key={loja}
                        dataKey={loja}
                        stackId="a"
                        fill={LOJA_COLORS[loja] ?? '#71717a'}
                        radius={activeLojas.indexOf(loja) === activeLojas.length - 1 ? [3, 3, 0, 0] : [0, 0, 0, 0]}
                        isAnimationActive={false}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Tabela */}
          <div className="shrink-0 h-56 overflow-auto bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.08] rounded-xl">
            <table className="w-full text-xs border-separate border-spacing-0 data-table">
              <thead>
                <tr>
                  <th colSpan={3} className="sticky top-0 z-20 px-4 py-3 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-white/[0.08]">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                      Por Mês e Loja — {tableData.length} linhas
                    </span>
                  </th>
                </tr>
                <tr>
                  {([
                    { label: 'Mês',         key: 'mes'  as SortKey },
                    { label: 'Loja',        key: 'loja' as SortKey },
                    { label: 'Cadastradas', key: 'cad'  as SortKey },
                  ] as { label: string; key: SortKey }[]).map(col => (
                    <th key={col.key} onClick={() => toggleSort(col.key)}
                      className="sticky top-[41px] z-10 px-3 py-2 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-white/[0.06] text-[10px] font-bold uppercase tracking-widest text-zinc-400 whitespace-nowrap cursor-pointer select-none hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors">
                      <span className="inline-flex items-center gap-1">
                        {col.label}
                        {sortKey === col.key
                          ? sortDir === 'asc' ? <ChevronUp size={10} /> : <ChevronDown size={10} />
                          : <ChevronsUpDown size={10} className="opacity-30" />}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableData.map((r, i) => (
                  <tr key={i} className="border-b border-zinc-100 dark:border-white/[0.04] hover:bg-zinc-50 dark:hover:bg-white/[0.02]">
                    <td className="px-3 py-2 text-zinc-600 dark:text-zinc-400 whitespace-nowrap">{r.mes}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: LOJA_COLORS[r.loja] ?? '#71717a' }} />
                        <span className="text-zinc-700 dark:text-zinc-300 font-medium">{r.loja}</span>
                      </span>
                    </td>
                    <td className="px-3 py-2 tabular-nums text-indigo-600 dark:text-indigo-400 font-semibold">{r.cad}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {tableData.length === 0 && !isLoading && (
              <div className="text-center py-12 text-zinc-400 text-sm">Sem dados no período.</div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
