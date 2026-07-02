'use client';

import React, { useState, useMemo } from 'react';
import { notFound, useParams } from 'next/navigation';
import { Loader2, ArrowLeftRight, Search, X, RefreshCw } from 'lucide-react';
import { getLojaConfig, type LojaCode } from '@/lib/controle-config';
import { useEntradasPg, type EntradaPg } from '@/hooks/use-entradas-pg';
import { MesNav } from '@/components/controle/mes-nav';

function formatBRL(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR');
}

export default function EntradasPage() {
  const { loja: lojaCode } = useParams<{ loja: string }>();
  const loja = getLojaConfig(lojaCode);
  if (!loja) notFound();

  const [search, setSearch] = useState('');
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().getMonth() + 1);

  const { data: records = [], isLoading, isError, refetch } = useEntradasPg(
    loja.code as LojaCode,
    selectedYear,
    selectedMonth,
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return records;
    return records.filter((r: EntradaPg) =>
      r.tipo_pagamento.toLowerCase().includes(q) ||
      (r.banco ?? '').toLowerCase().includes(q) ||
      (r.cod_compra ?? '').toLowerCase().includes(q) ||
      r.observacao.toLowerCase().includes(q),
    );
  }, [records, search]);

  const total = filtered.reduce((s, r) => s + r.valor, 0);

  const byTipo = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach(r => {
      map[r.tipo_pagamento] = (map[r.tipo_pagamento] || 0) + r.valor;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [filtered]);

  return (
    <div className="p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <ArrowLeftRight size={15} className="text-zinc-400" />
          <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Entradas</h2>
          <span className="text-xs text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full">{filtered.length}</span>
        </div>
        <MesNav year={selectedYear} month={selectedMonth} onChange={(y, m) => { setSelectedYear(y); setSelectedMonth(m); }} />
        <button
          onClick={() => refetch()}
          className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          title="Atualizar"
        >
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Totais */}
      <div className="flex flex-wrap gap-3">
        <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 rounded-xl px-4 py-3 min-w-[160px]">
          <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-500 mb-1">Total Entradas</div>
          <div className="text-lg font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">{formatBRL(total)}</div>
        </div>
        {byTipo.slice(0, 4).map(([tipo, valor]) => (
          <div key={tipo} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.08] rounded-xl px-4 py-3 min-w-[140px]">
            <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1 truncate">{tipo}</div>
            <div className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 tabular-nums">{formatBRL(valor)}</div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-xs">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por tipo, banco, código..."
          className="w-full pl-8 pr-8 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-white/[0.08] rounded-lg text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-indigo-500 transition-colors"
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600">
            <X size={13} />
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12 gap-2 text-zinc-400 text-sm">
          <Loader2 size={15} className="animate-spin" /> Carregando...
        </div>
      ) : isError ? (
        <div className="flex items-center justify-center py-12 text-sm text-red-500">
          Erro ao carregar dados. <button onClick={() => refetch()} className="ml-2 underline">Tentar novamente</button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-white/[0.08]">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-100 dark:border-white/[0.04]">
                <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-zinc-400">Data</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-zinc-400">Tipo Pagto.</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-zinc-400">Banco</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-zinc-400">Cód. Compra</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-zinc-400">Observação</th>
                <th className="px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider text-zinc-400">Valor</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-sm text-zinc-400">
                    Nenhuma entrada encontrada
                  </td>
                </tr>
              ) : (
                filtered.map(r => (
                  <tr
                    key={r.id}
                    className="border-b border-zinc-50 dark:border-white/[0.02] last:border-0 hover:bg-zinc-50 dark:hover:bg-white/[0.02]"
                  >
                    <td className="px-4 py-2.5 text-zinc-600 dark:text-zinc-400 tabular-nums">{formatDate(r.data)}</td>
                    <td className="px-4 py-2.5">
                      <span className="inline-flex px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-500/10 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                        {r.tipo_pagamento}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-zinc-500 dark:text-zinc-400 text-xs">{r.banco || '—'}</td>
                    <td className="px-4 py-2.5 font-mono text-[11px] text-zinc-500 dark:text-zinc-400">{r.cod_compra || '—'}</td>
                    <td className="px-4 py-2.5 text-zinc-400 text-xs max-w-[200px] truncate">{r.observacao || '—'}</td>
                    <td className="px-4 py-2.5 text-right font-mono font-medium text-emerald-700 dark:text-emerald-400 tabular-nums">
                      {formatBRL(r.valor)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
