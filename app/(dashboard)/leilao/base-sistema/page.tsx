'use client';

import { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import { useLeilaoBase } from '@/lib/hooks/use-leilao-base';
import { useLeiloes, type Leilao } from '@/lib/hooks/use-leiloes';
import { BaseSistemaTable } from '@/components/leilao/base-sistema-table';
import {
  BaseSistemaUpload,
  type ActiveRefsMap,
  type ActivePieceInfo,
  type UploadedFile,
} from '@/components/leilao/base-sistema-upload';

type Filtro = 'todos' | 'normal' | 'top' | 'ativo';

export default function BaseSistemaPage() {
  const { data: rows = [], isLoading, error } = useLeilaoBase();
  const { leiloes } = useLeiloes();

  const [uploadedFiles,  setUploadedFiles]  = useState<UploadedFile[]>([]);
  const [refsPerFile,    setRefsPerFile]    = useState<Map<string, string[]>>(new Map());
  const [excludedFiles,  setExcludedFiles]  = useState<Set<string>>(new Set());
  const [globalFilter,   setGlobalFilter]   = useState('');
  const [filtro,         setFiltro]         = useState<Filtro>('todos');

  // Build merged activeRefs — only from non-excluded files
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

  function handleAdd(file: UploadedFile, refs: string[]) {
    setUploadedFiles(prev => prev.find(f => f.filename === file.filename) ? prev : [...prev, file]);
    setRefsPerFile(prev => new Map(prev).set(file.filename, refs));
  }

  function handleRemove(filename: string) {
    setUploadedFiles(prev => prev.filter(f => f.filename !== filename));
    setRefsPerFile(prev => { const m = new Map(prev); m.delete(filename); return m; });
    setExcludedFiles(prev => { const s = new Set(prev); s.delete(filename); return s; });
  }

  function handleToggleExclude(filename: string) {
    setExcludedFiles(prev => {
      const s = new Set(prev);
      s.has(filename) ? s.delete(filename) : s.add(filename);
      return s;
    });
  }

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

      {/* ── Toolbar + bases ─────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-4 shrink-0">
        {/* Search */}
        <div className="relative shrink-0">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
          <input
            value={globalFilter}
            onChange={e => setGlobalFilter(e.target.value)}
            placeholder="Buscar referência, produto, destino..."
            className="w-64 pl-8 pr-3 py-1.5 text-xs rounded-lg border border-zinc-200 dark:border-white/[0.10] bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 placeholder:text-zinc-400 focus:outline-none focus:border-indigo-400 dark:focus:border-indigo-500 transition-colors"
          />
        </div>

        {/* Bases upload + list */}
        <BaseSistemaUpload
          uploaded={uploadedFiles}
          excludedFiles={excludedFiles}
          leiloes={leiloes}
          onAdd={handleAdd}
          onRemove={handleRemove}
          onToggleExclude={handleToggleExclude}
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
