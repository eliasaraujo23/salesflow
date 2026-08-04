'use client';

import { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import { useLeilaoBase } from '@/lib/hooks/use-leilao-base';
import { BaseSistemaTable } from '@/components/leilao/base-sistema-table';
import { BaseSistemaUpload } from '@/components/leilao/base-sistema-upload';

type Filtro = 'todos' | 'normal' | 'top' | 'ativo';

export default function BaseSistemaPage() {
  const { data: rows = [], isLoading, error } = useLeilaoBase();
  const [activeRefs,  setActiveRefs]  = useState<Set<string>>(new Set());
  const [globalFilter, setGlobalFilter] = useState('');
  const [filtro,       setFiltro]       = useState<Filtro>('todos');

  const stats = useMemo(() => {
    const total  = rows.length;
    const normal = rows.filter(r => !activeRefs.has(r.referencia.toUpperCase()) && r.recomendacao === 'NORMAL').length;
    const top    = rows.filter(r => !activeRefs.has(r.referencia.toUpperCase()) && r.recomendacao === 'TOP').length;
    const ativo  = activeRefs.size > 0 ? rows.filter(r => activeRefs.has(r.referencia.toUpperCase())).length : 0;
    return { total, normal, top, ativo };
  }, [rows, activeRefs]);

  const FILTROS: { key: Filtro; label: string; count: number; color: string }[] = [
    { key: 'todos',  label: 'Todos',         count: stats.total,  color: 'zinc' },
    { key: 'normal', label: 'Leilão Normal',  count: stats.normal, color: 'indigo' },
    { key: 'top',    label: 'Leilão TOP',     count: stats.top,    color: 'amber' },
    ...(stats.ativo > 0
      ? [{ key: 'ativo' as Filtro, label: 'Já em leilão', count: stats.ativo, color: 'zinc' }]
      : []),
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-zinc-400">
        Carregando base...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-red-500">
        Erro ao carregar a base. Verifique a conexão.
      </div>
    );
  }

  return (
    <div className="h-full overflow-hidden p-3 sm:p-6 flex flex-col gap-4">

      {/* ── Stats ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        {FILTROS.map(f => {
          const active = filtro === f.key;
          return (
            <button
              key={f.key}
              onClick={() => setFiltro(f.key)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${
                active
                  ? f.color === 'indigo'
                    ? 'bg-indigo-600 border-indigo-600 text-white'
                    : f.color === 'amber'
                    ? 'bg-amber-500 border-amber-500 text-white'
                    : 'bg-zinc-800 border-zinc-800 text-white dark:bg-zinc-200 dark:border-zinc-200 dark:text-zinc-900'
                  : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-white/[0.10] text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-white/[0.04]'
              }`}
            >
              <span>{f.label}</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                active ? 'bg-white/20 text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400'
              }`}>
                {f.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Toolbar ───────────────────────────────────────────── */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="relative flex-1 max-w-xs">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
          <input
            value={globalFilter}
            onChange={e => setGlobalFilter(e.target.value)}
            placeholder="Buscar referência, produto, destino..."
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-zinc-200 dark:border-white/[0.10] bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 placeholder:text-zinc-400 focus:outline-none focus:border-indigo-400 dark:focus:border-indigo-500 transition-colors"
          />
        </div>

        <BaseSistemaUpload
          count={stats.ativo}
          onParsed={setActiveRefs}
          onClear={() => { setActiveRefs(new Set()); if (filtro === 'ativo') setFiltro('todos'); }}
        />
      </div>

      {/* ── Table ─────────────────────────────────────────────── */}
      <BaseSistemaTable
        rows={rows}
        activeRefs={activeRefs}
        globalFilter={globalFilter}
        tipoFiltro={filtro}
      />

    </div>
  );
}
