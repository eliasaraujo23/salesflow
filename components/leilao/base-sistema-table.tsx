'use client';

import { useMemo, useState, useRef } from 'react';
import {
  useReactTable, getCoreRowModel, getSortedRowModel, getFilteredRowModel,
  createColumnHelper, flexRender, type SortingState,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { type LeilaoBaseRow, statusLabel } from '@/lib/hooks/use-leilao-base';
import type { ActiveRefsMap } from '@/components/leilao/base-sistema-upload';

interface Props {
  rows:         LeilaoBaseRow[];
  activeRefs:   ActiveRefsMap;
  globalFilter: string;
  tipoFiltro:   'todos' | 'normal' | 'top' | 'ativo';
}

function fmtBrl(v: number | null): string {
  if (v == null) return '—';
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
}

const col = createColumnHelper<LeilaoBaseRow>();

const COLUMNS = [
  col.accessor('referencia', {
    header: 'Referência',
    size: 90,
  }),
  col.accessor('produto', {
    header: 'Produto',
    size: 130,
    cell: info => info.getValue() ?? '—',
  }),
  col.accessor('descricao_jewel', {
    header: 'Descrição',
    size: 280,
    enableSorting: false,
    cell: info => (
      <span className="text-zinc-500 dark:text-zinc-400 truncate block max-w-[280px]" title={info.getValue() ?? ''}>
        {info.getValue() ?? '—'}
      </span>
    ),
  }),
  col.accessor('destino', {
    header: 'Destino',
    size: 140,
    cell: info => info.getValue() ?? 'ESTOQUE',
  }),
  col.accessor('status_id', {
    header: 'Status',
    size: 160,
    cell: info => statusLabel(info.getValue()),
  }),
  col.accessor('preco_avista', {
    header: 'À Vista',
    size: 90,
    cell: info => fmtBrl(info.getValue()),
  }),
  col.accessor('fotos', {
    header: 'Fotos',
    size: 60,
    cell: info => {
      const n = info.getValue();
      return (
        <span className={`font-semibold ${n > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-400'}`}>
          {n}
        </span>
      );
    },
  }),
  col.accessor('recomendacao', {
    header: 'Recomendação',
    size: 140,
    enableSorting: false,
    cell: () => null,
  }),
];

const ROW_HEIGHT = 37;

export function BaseSistemaTable({ rows, activeRefs, globalFilter, tipoFiltro }: Props) {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'preco_avista', desc: false }]);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    return rows.filter(r => {
      const inAtivo = activeRefs.has(r.referencia.toUpperCase());
      if (tipoFiltro === 'ativo')  return inAtivo;
      if (tipoFiltro === 'normal') return !inAtivo && r.recomendacao === 'NORMAL';
      if (tipoFiltro === 'top')    return !inAtivo && r.recomendacao === 'TOP';
      return true;
    });
  }, [rows, activeRefs, tipoFiltro]);

  const table = useReactTable({
    data:              filtered,
    columns:           COLUMNS,
    state:             { sorting, globalFilter },
    onSortingChange:   setSorting,
    getCoreRowModel:   getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const tableRows = table.getRowModel().rows;

  const rowVirtualizer = useVirtualizer({
    count:            tableRows.length,
    getScrollElement: () => containerRef.current,
    estimateSize:     () => ROW_HEIGHT,
    overscan:         15,
  });

  const virtualItems  = rowVirtualizer.getVirtualItems();
  const totalSize     = rowVirtualizer.getTotalSize();
  const paddingTop    = virtualItems.length > 0 ? virtualItems[0].start : 0;
  const paddingBottom = virtualItems.length > 0 ? totalSize - virtualItems[virtualItems.length - 1].end : 0;

  return (
    <div
      ref={containerRef}
      className="flex-1 min-h-0 overflow-auto border border-zinc-200 dark:border-white/[0.10] rounded-xl bg-white dark:bg-zinc-900"
    >
      <table className="w-full text-xs border-separate border-spacing-0 data-table">
        <thead>
          <tr>
            <th
              colSpan={COLUMNS.length}
              className="sticky top-0 z-20 px-4 py-2.5 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-white/[0.08] text-left font-semibold text-zinc-700 dark:text-zinc-200"
            >
              {tableRows.length} peças
            </th>
          </tr>
          <tr>
            {table.getFlatHeaders().map(header => (
              <th
                key={header.id}
                onClick={header.column.getCanSort() ? header.column.getToggleSortingHandler() : undefined}
                className="sticky top-[37px] z-10 px-3 py-2 bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-white/[0.08] text-zinc-500 dark:text-zinc-400 font-semibold uppercase tracking-wide text-[10px] whitespace-nowrap select-none"
                style={{ cursor: header.column.getCanSort() ? 'pointer' : 'default', width: header.column.getSize() }}
              >
                <span className="inline-flex items-center gap-1">
                  {flexRender(header.column.columnDef.header, header.getContext())}
                  {header.column.getCanSort() && (
                    header.column.getIsSorted() === 'asc'  ? <ChevronUp size={10} /> :
                    header.column.getIsSorted() === 'desc' ? <ChevronDown size={10} /> :
                    <ChevronsUpDown size={10} className="opacity-30" />
                  )}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {paddingTop > 0 && (
            <tr><td style={{ height: paddingTop }} colSpan={COLUMNS.length} /></tr>
          )}
          {virtualItems.map(virtualRow => {
            const row       = tableRows[virtualRow.index];
            const ativoInfo = activeRefs.get(row.original.referencia.toUpperCase());
            const inAtivo   = !!ativoInfo;
            return (
              <tr
                key={row.id}
                style={{ height: ROW_HEIGHT }}
                className={`border-b border-zinc-100 dark:border-white/[0.04] hover:bg-zinc-50 dark:hover:bg-white/[0.02] transition-colors ${inAtivo ? 'opacity-40' : ''}`}
              >
                {row.getVisibleCells().map(cell => {
                  if (cell.column.id === 'recomendacao') {
                    if (inAtivo && ativoInfo) {
                      return (
                        <td key={cell.id} className="px-3 py-2">
                          <span
                            className="px-2 py-0.5 rounded-full text-[10px] font-semibold text-white whitespace-nowrap"
                            style={{ background: ativoInfo.cor }}
                          >
                            {ativoInfo.label}
                          </span>
                        </td>
                      );
                    }
                    const rec = row.original.recomendacao;
                    return (
                      <td key={cell.id} className="px-3 py-2">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          rec === 'TOP'
                            ? 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400'
                            : 'bg-indigo-100 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400'
                        }`}>
                          {rec === 'TOP' ? 'LEILÃO TOP' : 'LEILÃO NORMAL'}
                        </span>
                      </td>
                    );
                  }
                  return (
                    <td key={cell.id} className="px-3 py-2 text-zinc-700 dark:text-zinc-300 whitespace-nowrap">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  );
                })}
              </tr>
            );
          })}
          {paddingBottom > 0 && (
            <tr><td style={{ height: paddingBottom }} colSpan={COLUMNS.length} /></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
