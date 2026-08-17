'use client';

import { useState } from 'react';
import {
  useReactTable, getCoreRowModel, getSortedRowModel,
  createColumnHelper, flexRender, type SortingState,
} from '@tanstack/react-table';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import {
  type PendenciaRow, type Pendencia,
  PENDENCIA_LABELS, PENDENCIA_COLOR,
} from '@/lib/hooks/use-leilao-pendencias';
import { statusLabel } from '@/lib/hooks/use-leilao-base';

interface Props {
  rows:         PendenciaRow[];
  globalFilter: string;
  filtro:       Pendencia | 'todos';
}

function fmtBrl(v: number | null): string {
  if (v == null) return '—';
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
}

const col = createColumnHelper<PendenciaRow>();

const COLUMNS = [
  col.accessor('referencia', { header: 'Referência', size: 90 }),
  col.accessor('produto', {
    header: 'Produto', size: 130,
    cell: info => info.getValue() ?? '—',
  }),
  col.accessor('descricao_jewel', {
    header: 'Descrição', size: 260, enableSorting: false,
    cell: info => (
      <span className="text-zinc-500 dark:text-zinc-400 truncate block max-w-[260px]" title={info.getValue() ?? ''}>
        {info.getValue() ?? '—'}
      </span>
    ),
  }),
  col.accessor('destino', {
    header: 'Destino', size: 140,
    cell: info => info.getValue() ?? 'ESTOQUE',
  }),
  col.accessor('status_id', {
    header: 'Status', size: 160,
    cell: info => statusLabel(info.getValue()),
  }),
  col.accessor('preco_avista', {
    header: 'À Vista', size: 90,
    cell: info => fmtBrl(info.getValue()),
  }),
  col.accessor('fotos', {
    header: 'Fotos', size: 55,
    cell: info => {
      const n = info.getValue();
      return (
        <span className={`font-semibold ${n > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
          {n}
        </span>
      );
    },
  }),
  col.accessor('pendencias', {
    header: 'Pendências',
    size: 320,
    enableSorting: false,
    cell: () => null,
  }),
];

export function PendenciasTable({ rows, globalFilter, filtro }: Props) {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'preco_avista', desc: false }]);

  const filtered = (() => {
    let result = filtro === 'todos' ? rows : rows.filter(r => r.pendencias.includes(filtro));
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
  })();

  const table = useReactTable({
    data:              filtered,
    columns:           COLUMNS,
    state:             { sorting },
    onSortingChange:   setSorting,
    getCoreRowModel:   getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="flex-1 min-h-0 overflow-auto border border-zinc-200 dark:border-white/[0.10] rounded-xl bg-white dark:bg-zinc-900">
      <table className="w-full text-xs border-separate border-spacing-0 data-table">
        <thead>
          <tr>
            <th
              colSpan={COLUMNS.length}
              className="sticky top-0 z-20 px-4 py-2.5 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-white/[0.08] text-left font-semibold text-zinc-700 dark:text-zinc-200"
            >
              {table.getRowModel().rows.length} peças com pendência
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
          {table.getRowModel().rows.map(row => (
            <tr
              key={row.id}
              className="border-b border-zinc-100 dark:border-white/[0.04] hover:bg-zinc-50 dark:hover:bg-white/[0.02] transition-colors"
            >
              {row.getVisibleCells().map(cell => {
                if (cell.column.id === 'pendencias') {
                  return (
                    <td key={cell.id} className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        {row.original.pendencias.map(p => (
                          <span
                            key={p}
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${PENDENCIA_COLOR[p]}`}
                          >
                            {PENDENCIA_LABELS[p]}
                          </span>
                        ))}
                      </div>
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
          ))}
        </tbody>
      </table>
    </div>
  );
}
