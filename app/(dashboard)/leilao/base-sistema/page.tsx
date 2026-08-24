'use client';

import { useState, useMemo } from 'react';
import { Search, RefreshCw } from 'lucide-react';
import { useLeilaoBase } from '@/lib/hooks/use-leilao-base';
import { useLeiloes } from '@/lib/hooks/use-leiloes';
import { useLeilaoBasesStorage } from '@/lib/hooks/use-leilao-bases-storage';
import { useLeilaoRegras } from '@/lib/hooks/use-leilao-regras';
import { BaseSistemaTable } from '@/components/leilao/base-sistema-table';
import { type ActiveRefsMap, type ActivePieceInfo } from '@/components/leilao/base-sistema-upload';

type Filtro = 'todos' | 'normal' | 'top' | 'ativo';

export default function BaseSistemaPage() {
  const { activeDestinos } = useLeilaoRegras();
  const { data: rows = [], isLoading, error, refetch, isFetching } = useLeilaoBase(activeDestinos);
  const { leiloes } = useLeiloes();
  const { uploadedFiles, refsPerFile, excludedFiles } = useLeilaoBasesStorage(leiloes);

  const [globalFilter, setGlobalFilter] = useState('');
  const [filtro,       setFiltro]       = useState<Filtro>('todos');

  const activeRefs = useMemo<ActiveRefsMap>(() => {
    const map: ActiveRefsMap = new Map();
    for (const f of uploadedFiles) {
      if (excludedFiles.has(f.filename)) continue;
      const refs = refsPerFile.get(f.filename) ?? [];
      const info: ActivePieceInfo = {
        codigoPlatforma: f.codigoPlatforma ?? '',
        label: f.leilao
          ? `N°${f.codigoPlatforma} · ${f.leilao.nome}`
          : f.codigoPlatforma
          ? `N°${f.codigoPlatforma}`
          : f.filename,
        cor: f.leilao?.cor ?? '#71717a',
      };
      for (const ref of refs) map.set(ref, info);
    }
    return map;
  }, [uploadedFiles, refsPerFile, excludedFiles]);

  const stats = useMemo(() => ({
    total:  rows.length,
    normal: rows.filter(r => !activeRefs.has(r.referencia.toUpperCase()) && r.recomendacao === 'NORMAL').length,
    top:    rows.filter(r => !activeRefs.has(r.referencia.toUpperCase()) && r.recomendacao === 'TOP').length,
    ativo:  rows.filter(r => activeRefs.has(r.referencia.toUpperCase())).length,
  }), [rows, activeRefs]);

  const FILTROS: { key: Filtro; label: string; count: number }[] = [
    { key: 'todos',  label: 'Todos',        count: stats.total },
    { key: 'normal', label: 'Leilão Normal', count: stats.normal },
    { key: 'top',    label: 'Leilão TOP',    count: stats.top },
    ...(activeRefs.size > 0
      ? [{ key: 'ativo' as Filtro, label: 'Já em leilão', count: stats.ativo }]
      : []),
  ];

  if (isLoading) return (
    <div className="flex items-center justify-center h-full text-sm text-zinc-400">Carregando base...</div>
  );
  if (error) return (
    <div className="flex items-center justify-center h-full text-sm text-red-500">Erro ao carregar. Verifique a conexão.</div>
  );

  return (
    <div className="h-full overflow-hidden p-3 sm:p-6 flex flex-col gap-4">

      {/* ── Filtros ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        {FILTROS.map(f => {
          const active = filtro === f.key;
          const colorActive =
            f.key === 'normal' ? 'bg-indigo-600 border-indigo-600 text-white' :
            f.key === 'top'    ? 'bg-amber-500 border-amber-500 text-white' :
            f.key === 'ativo'  ? 'bg-zinc-600 border-zinc-600 text-white' :
                                 'bg-zinc-800 dark:bg-zinc-200 border-zinc-800 dark:border-zinc-200 text-white dark:text-zinc-900';
          return (
            <button
              key={f.key}
              onClick={() => setFiltro(f.key)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${
                active
                  ? colorActive
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

      {/* ── Toolbar ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="relative flex-1 md:flex-none">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
          <input
            value={globalFilter}
            onChange={e => setGlobalFilter(e.target.value)}
            placeholder="Buscar referência, produto, destino..."
            className="w-full md:w-64 pl-8 pr-3 py-1.5 text-xs rounded-lg border border-zinc-200 dark:border-white/[0.10] bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 placeholder:text-zinc-400 focus:outline-none focus:border-indigo-400 dark:focus:border-indigo-500 transition-colors"
          />
        </div>

        <button
          onClick={() => refetch()}
          disabled={isFetching}
          title="Atualizar base do sistema"
          className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-white/[0.10] text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-white/[0.04] disabled:opacity-50 text-xs font-medium transition-colors"
        >
          <RefreshCw size={12} className={isFetching ? 'animate-spin' : ''} />
          <span className="hidden sm:inline">Atualizar</span>
        </button>
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
