'use client';

import { useState, useMemo } from 'react';
import { Search, Download } from 'lucide-react';
import { useLeilaoPendencias, type Pendencia, PENDENCIA_LABELS, PENDENCIA_COLOR } from '@/lib/hooks/use-leilao-pendencias';
import { PendenciasTable } from '@/components/leilao/pendencias-table';
import { downloadCsv } from '@/lib/leilao-csv';

type Filtro = Pendencia | 'todos';

export default function PendenciasPage() {
  const { data: rows = [], isLoading, error } = useLeilaoPendencias();
  const [globalFilter, setGlobalFilter] = useState('');
  const [filtro, setFiltro] = useState<Filtro>('todos');

  const filteredRows = useMemo(() => {
    let result = rows;
    if (filtro !== 'todos') result = result.filter(r => r.pendencias.includes(filtro));
    if (globalFilter.trim()) {
      const q = globalFilter.trim().toLowerCase();
      result = result.filter(r =>
        r.referencia.toLowerCase().includes(q) ||
        (r.produto ?? '').toLowerCase().includes(q) ||
        (r.destino ?? '').toLowerCase().includes(q) ||
        (r.descricao_jewel ?? '').toLowerCase().includes(q),
      );
    }
    return result;
  }, [rows, filtro, globalFilter]);

  function handleExportCsv() {
    const header = 'referencia;produto;descricao;destino;status;preco_avista;fotos;pendencias';
    const csvRows = filteredRows.map(r => [
      r.referencia,
      r.produto ?? '',
      (r.descricao_jewel ?? '').replace(/;/g, ',').replace(/[\r\n]+/g, ' '),
      r.destino ?? '',
      r.status_id === 3 ? 'Sem Venda Efetivada' : r.status_id === 6 ? 'Em Comodato' : String(r.status_id ?? ''),
      r.preco_avista != null ? String(Math.round(r.preco_avista)) : '',
      String(r.fotos),
      r.pendencias.map(p => PENDENCIA_LABELS[p]).join(', '),
    ].join(';'));
    downloadCsv([header, ...csvRows].join('\n'), `pendencias_leilao.csv`);
  }

  const counts = useMemo(() => {
    const map: Partial<Record<Filtro, number>> = { todos: rows.length };
    const tipos: Pendencia[] = ['SEM_PRECO', 'SEM_FOTOS', 'FOTOS_INSUFICIENTES', 'SEM_FOTO_PRINCIPAL', 'SEM_FOTO_SECUNDARIA'];
    for (const t of tipos) {
      map[t] = rows.filter(r => r.pendencias.includes(t)).length;
    }
    return map;
  }, [rows]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-zinc-400">
        Carregando pendências...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-red-500">
        Erro ao carregar. Verifique a conexão.
      </div>
    );
  }

  const FILTROS: { key: Filtro; label: string }[] = [
    { key: 'todos',              label: 'Todas' },
    { key: 'SEM_PRECO',          label: PENDENCIA_LABELS.SEM_PRECO },
    { key: 'SEM_FOTOS',          label: PENDENCIA_LABELS.SEM_FOTOS },
    { key: 'FOTOS_INSUFICIENTES',label: PENDENCIA_LABELS.FOTOS_INSUFICIENTES },
    { key: 'SEM_FOTO_PRINCIPAL', label: PENDENCIA_LABELS.SEM_FOTO_PRINCIPAL },
    { key: 'SEM_FOTO_SECUNDARIA',label: PENDENCIA_LABELS.SEM_FOTO_SECUNDARIA },
  ];

  return (
    <div className="h-full overflow-hidden p-3 sm:p-6 flex flex-col gap-4">

      {/* ── Filtros + Export ────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        {FILTROS.map(f => {
          const count = counts[f.key] ?? 0;
          const active = filtro === f.key;
          const colorCls = f.key === 'todos'
            ? active
              ? 'bg-zinc-800 dark:bg-zinc-200 border-zinc-800 dark:border-zinc-200 text-white dark:text-zinc-900'
              : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-white/[0.10] text-zinc-600 dark:text-zinc-400'
            : active
              ? 'bg-red-600 border-red-600 text-white'
              : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-white/[0.10] text-zinc-600 dark:text-zinc-400';

          return (
            <button
              key={f.key}
              onClick={() => setFiltro(f.key)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors hover:opacity-90 ${colorCls}`}
            >
              <span>{f.label}</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                active ? 'bg-white/20 text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400'
              }`}>
                {count}
              </span>
            </button>
          );
        })}
        <button
          onClick={handleExportCsv}
          disabled={filteredRows.length === 0}
          className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-white/[0.10] bg-white dark:bg-zinc-900 text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-white/[0.04] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <Download size={13} />
          Exportar CSV ({filteredRows.length})
        </button>
      </div>

      {/* ── Busca ───────────────────────────────────────────────── */}
      <div className="shrink-0">
        <div className="relative max-w-xs">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
          <input
            value={globalFilter}
            onChange={e => setGlobalFilter(e.target.value)}
            placeholder="Buscar referência, produto, destino..."
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-zinc-200 dark:border-white/[0.10] bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 placeholder:text-zinc-400 focus:outline-none focus:border-indigo-400 dark:focus:border-indigo-500 transition-colors"
          />
        </div>
      </div>

      {/* ── Tabela ──────────────────────────────────────────────── */}
      <PendenciasTable rows={rows} globalFilter={globalFilter} filtro={filtro} />

    </div>
  );
}
