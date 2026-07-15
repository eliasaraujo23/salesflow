'use client';

import { useMemo, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { usePainelFilters } from '@/components/painel/painel-filters-context';
import { useEvolucaoJoias } from '@/hooks/use-evolucao-joias';

const LOJAS = ['Tijuca', 'Ipanema', 'Méier', 'Eternno', 'Eduardo', 'Thaís'];
const LOJA_COLORS: Record<string, string> = {
  Tijuca:  '#6366f1',
  Ipanema: '#10b981',
  Méier:   '#f59e0b',
  Eternno: '#3b82f6',
  Eduardo: '#a855f7',
  'Thaís': '#ec4899',
  Outro:   '#71717a',
};

const MESES_PT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
function fmtMes(ym: string) {
  const [y, m] = ym.split('-');
  return `${MESES_PT[parseInt(m) - 1]}/${y.slice(2)}`;
}

export default function JoiasMesPage() {
  const { from, to } = usePainelFilters();
  const { data, isLoading, isError, error } = useEvolucaoJoias(from, to);

  const [lojaFiltro, setLojaFiltro] = useState<string | null>(null);

  const { chartData, totaisCad, totaisVend, meses } = useMemo(() => {
    if (!data) return { chartData: [], totaisCad: 0, totaisVend: 0, meses: [] };

    const filtro = lojaFiltro;
    const cadRows = filtro ? data.cadastradas.filter(r => r.loja === filtro) : data.cadastradas;
    const vendRows = filtro ? data.vendidas.filter(r => r.loja === filtro) : data.vendidas;

    const allMeses = Array.from(new Set([
      ...cadRows.map(r => r.mes),
      ...vendRows.map(r => r.mes),
    ])).sort();

    const cadByMes = new Map<string, number>();
    const vendByMes = new Map<string, number>();
    for (const r of cadRows)  cadByMes.set(r.mes,  (cadByMes.get(r.mes)  ?? 0) + r.count);
    for (const r of vendRows) vendByMes.set(r.mes, (vendByMes.get(r.mes) ?? 0) + r.count);

    const chartData = allMeses.map(mes => ({
      mes: fmtMes(mes),
      Cadastradas: cadByMes.get(mes)  ?? 0,
      Vendidas:    vendByMes.get(mes) ?? 0,
    }));

    const totaisCad  = Array.from(cadByMes.values()).reduce((s, v) => s + v, 0);
    const totaisVend = Array.from(vendByMes.values()).reduce((s, v) => s + v, 0);

    return { chartData, totaisCad, totaisVend, meses: allMeses };
  }, [data, lojaFiltro]);

  const tableData = useMemo(() => {
    if (!data) return [];
    const filtro = lojaFiltro;
    const cadRows = filtro ? data.cadastradas.filter(r => r.loja === filtro) : data.cadastradas;
    const vendRows = filtro ? data.vendidas.filter(r => r.loja === filtro) : data.vendidas;

    const allLojas = Array.from(new Set([
      ...data.cadastradas.map(r => r.loja),
      ...data.vendidas.map(r => r.loja),
    ])).sort();

    const shownLojas = filtro ? [filtro] : allLojas;

    return meses.flatMap(mes =>
      shownLojas.map(loja => {
        const cad  = cadRows.find(r => r.mes === mes && r.loja === loja)?.count ?? 0;
        const vend = vendRows.find(r => r.mes === mes && r.loja === loja)?.count ?? 0;
        if (cad === 0 && vend === 0) return null;
        return { mes: fmtMes(mes), loja, cad, vend, diff: cad - vend };
      }).filter(Boolean)
    ) as { mes: string; loja: string; cad: number; vend: number; diff: number }[];
  }, [data, lojaFiltro, meses]);

  const pctVendido = totaisCad > 0 ? ((totaisVend / totaisCad) * 100).toFixed(1) : '—';

  return (
    <div className="h-full overflow-hidden p-4 flex flex-col gap-3">

      {/* KPI */}
      <div className="shrink-0 border border-zinc-200 dark:border-white/[0.08] rounded-xl overflow-hidden bg-white dark:bg-zinc-900">
        <div className="px-4 py-2 bg-indigo-600 text-white">
          <span className="text-xs font-bold uppercase tracking-widest">Joias por Mês</span>
        </div>
        <div className="flex items-center divide-x divide-zinc-200 dark:divide-white/[0.08]">
          {[
            { label: 'Cadastradas', value: isLoading ? '—' : String(totaisCad) },
            { label: 'Vendidas',    value: isLoading ? '—' : String(totaisVend) },
            { label: '% Vendido',   value: isLoading ? '—' : `${pctVendido}%`, cls: 'text-emerald-600 dark:text-emerald-400' },
          ].map(k => (
            <div key={k.label} className="flex flex-col gap-0.5 px-4 py-2.5">
              <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-400">{k.label}</span>
              <span className={`text-sm font-bold tabular-nums ${k.cls ?? 'text-zinc-900 dark:text-zinc-100'}`}>{k.value}</span>
            </div>
          ))}

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
            {LOJAS.filter(l => data?.cadastradas.some(r => r.loja === l) || data?.vendidas.some(r => r.loja === l)).map(loja => (
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
          {/* Chart */}
          <div className="flex-1 min-h-0 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.08] rounded-xl p-4 flex flex-col">
            <div className="text-[11px] font-bold uppercase tracking-widest text-zinc-400 mb-3 shrink-0">
              Cadastradas vs Vendidas por Mês
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
                      contentStyle={{ background: '#fff', border: '1px solid #e4e4e7', borderRadius: 8, fontSize: 12 }}
                      cursor={{ fill: 'rgba(99,102,241,0.05)' }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                    <Bar dataKey="Cadastradas" fill="#6366f1" radius={[3, 3, 0, 0]} isAnimationActive={false} />
                    <Bar dataKey="Vendidas"    fill="#10b981" radius={[3, 3, 0, 0]} isAnimationActive={false} />
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
                  <th colSpan={5} className="sticky top-0 z-20 px-4 py-3 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-white/[0.08] text-left">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                      Por Mês e Loja — {tableData.length} linhas
                    </span>
                  </th>
                </tr>
                <tr>
                  {['Mês','Loja','Cadastradas','Vendidas','Diferença'].map(h => (
                    <th key={h} className="sticky top-[41px] z-10 px-3 py-2 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-white/[0.06] text-left text-[10px] font-bold uppercase tracking-widest text-zinc-400 whitespace-nowrap">
                      {h}
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
                    <td className="px-3 py-2 tabular-nums text-emerald-600 dark:text-emerald-400 font-semibold">{r.vend}</td>
                    <td className="px-3 py-2 tabular-nums whitespace-nowrap">
                      <span className={r.diff > 0 ? 'text-amber-600 dark:text-amber-400' : r.diff === 0 ? 'text-zinc-500' : 'text-emerald-600 dark:text-emerald-400'}>
                        {r.diff > 0 ? `+${r.diff}` : r.diff}
                      </span>
                    </td>
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
