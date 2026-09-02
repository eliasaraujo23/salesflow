'use client';

import React, { useMemo, useState } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { type MensalRow } from '@/lib/actions/dashboard-metal';
import { getLojaConfig } from '@/lib/controle-config';
import { CONVERSAO_OTIMA, CONVERSAO_BOA } from '@/lib/dashboard-metal-sql';

interface Props {
  rows: MensalRow[];
}

function fmtN(v: number, d = 3): string {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });
}

function fmtBRL(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function fmtPct(v: number): string {
  return (v * 100).toFixed(1).replace('.', ',') + '%';
}

function convColor(conv: number): string {
  if (conv >= CONVERSAO_OTIMA) return 'text-emerald-600 dark:text-emerald-400';
  if (conv >= CONVERSAO_BOA) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-500 dark:text-red-400';
}

type SortKey = 'ano_mes' | 'loja' | 'aval_s4' | 'compras' | 'conv' | 'metal' | 'valor' | 'ticket_medio';

const COLS: { key: SortKey; label: string }[] = [
  { key: 'ano_mes', label: 'Mês' },
  { key: 'loja', label: 'Loja' },
  { key: 'aval_s4', label: 'Aval s/4' },
  { key: 'compras', label: 'Compras' },
  { key: 'conv', label: 'Conversão' },
  { key: 'metal', label: 'Metal (g)' },
  { key: 'valor', label: 'Valor (R$)' },
  { key: 'ticket_medio', label: 'Ticket Médio' },
];

const LIMITES = [
  { label: '6m', value: 6 },
  { label: '13m', value: 13 },
  { label: 'Todos', value: Infinity },
];

export function DashboardMetalTabelaMensal({ rows }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('ano_mes');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [limite, setLimite] = useState(13);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  }

  const limitado = useMemo(() => {
    const mesesDistintos = [...new Set(rows.map(r => r.ano_mes))].sort().reverse().slice(0, limite);
    const mesesSet = new Set(mesesDistintos);
    return rows.filter(r => mesesSet.has(r.ano_mes));
  }, [rows, limite]);

  const sorted = useMemo(() => {
    return [...limitado].sort((a, b) => {
      const av = a[sortKey], bv = b[sortKey];
      const cmp = typeof av === 'string' ? av.localeCompare(bv as string) : (av as number) - (bv as number);
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [limitado, sortKey, sortDir]);

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.08] rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100 dark:border-white/[0.04]">
        <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-200 flex items-center gap-1.5">
          <span className="w-1 h-3.5 rounded-full bg-indigo-400" />
          Resumo Mensal Detalhado
        </h3>
        <div className="flex items-center gap-1">
          {LIMITES.map(l => (
            <button
              key={l.label}
              onClick={() => setLimite(l.value)}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors duration-150 ${
                limite === l.value
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>

      <div className="shrink-0 overflow-auto" style={{ maxHeight: 'calc(2.25rem + 8 * 2rem)' }}>
        <table className="w-full text-xs border-separate border-spacing-0 data-table">
          <thead>
            <tr>
              {COLS.map(col => (
                <th
                  key={col.key}
                  onClick={() => toggleSort(col.key)}
                  className="sticky top-0 z-10 px-3 py-2 bg-white dark:bg-zinc-900 border-b border-zinc-100 dark:border-white/[0.04] cursor-pointer select-none text-[10px] font-bold uppercase tracking-wider text-zinc-400"
                >
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
            {sorted.length === 0 ? (
              <tr><td colSpan={COLS.length} className="py-8 text-center text-zinc-400">Nenhum dado no período</td></tr>
            ) : (
              sorted.map((r, i) => {
                const loja = getLojaConfig(r.loja);
                return (
                  <tr key={`${r.loja}-${r.ano_mes}-${i}`} className="h-8 border-b border-zinc-50 dark:border-white/[0.02] last:border-0 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-white/[0.03] transition-colors duration-100">
                    <td className="px-3">{r.ano_mes}</td>
                    <td className="px-3 font-semibold" style={{ color: loja?.cor }}>{loja?.sigla ?? r.loja}</td>
                    <td className="px-3 font-mono">{r.aval_s4}</td>
                    <td className="px-3 font-mono">{r.compras}</td>
                    <td className={`px-3 font-mono font-semibold ${convColor(r.conv)}`}>{fmtPct(r.conv)}</td>
                    <td className="px-3 font-mono">{fmtN(r.metal, 2)}</td>
                    <td className="px-3 font-mono">{fmtBRL(r.valor)}</td>
                    <td className="px-3 font-mono">{fmtBRL(r.ticket_medio)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
