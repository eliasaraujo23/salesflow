'use client';

import React, { useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  type SortingState,
  flexRender,
  type ColumnDef,
} from '@tanstack/react-table';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { type JmPeca } from '@/lib/actions/fetch-jm-dashboard';

const fmtMoeda = (v: number | null | undefined): string => {
  if (v == null || isNaN(v)) return '—';
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
};

const TIPO_BADGE: Record<string, string> = {
  JRCP: 'bg-amber-500/20 text-amber-600 dark:text-amber-400',
  JMCP: 'bg-indigo-500/20 text-indigo-600 dark:text-indigo-400',
  JMSP: 'bg-violet-500/20 text-violet-600 dark:text-violet-400',
};

interface JmEstoqueTableProps {
  data: JmPeca[];
}

export function JmEstoqueTable({ data }: JmEstoqueTableProps) {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'custo_real', desc: true }]);

  const columns: ColumnDef<JmPeca>[] = [
    {
      accessorKey: 'referencia',
      header: 'Referência',
      cell: ({ getValue }) => (
        <span className="font-mono text-xs text-indigo-600 dark:text-indigo-400">{getValue<string>()}</span>
      ),
    },
    {
      accessorKey: 'produto',
      header: 'Produto',
      cell: ({ row }) => (
        <div>
          <div className="text-sm text-zinc-900 dark:text-zinc-100">{row.original.produto ?? '—'}</div>
          {row.original.tipo_pedra && (
            <div className="text-xs text-zinc-500 dark:text-zinc-400">{row.original.tipo_pedra}</div>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'tipo',
      header: 'Metal',
      cell: ({ getValue }) => {
        const v = getValue<string | null | undefined>() ?? '';
        return (
          <span className={`px-2 py-0.5 rounded text-xs font-semibold ${TIPO_BADGE[v] ?? 'bg-zinc-200 dark:bg-white/[0.06] text-zinc-500 dark:text-zinc-400'}`}>
            {v || '—'}
          </span>
        );
      },
    },
    {
      accessorKey: 'lapidacao',
      header: 'Lapidação',
      cell: ({ getValue }) => (
        <span className="text-xs text-zinc-500 dark:text-zinc-400">{getValue<string | null | undefined>() ?? '—'}</span>
      ),
    },
    {
      accessorKey: 'peso',
      header: ({ column }) => (
        <button
          className="flex items-center gap-1 text-xs font-semibold text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
          onClick={() => column.toggleSorting()}
        >
          Peso (g)
          {column.getIsSorted() === 'asc' ? <ArrowUp size={12} /> :
           column.getIsSorted() === 'desc' ? <ArrowDown size={12} /> :
           <ArrowUpDown size={12} />}
        </button>
      ),
      cell: ({ getValue }) => (
        <span className="text-sm text-zinc-500 dark:text-zinc-400">{getValue<number>().toFixed(3)}g</span>
      ),
    },
    {
      accessorKey: 'custo_real',
      header: ({ column }) => (
        <button
          className="flex items-center gap-1 text-xs font-semibold text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
          onClick={() => column.toggleSorting()}
        >
          Custo Real
          {column.getIsSorted() === 'asc' ? <ArrowUp size={12} /> :
           column.getIsSorted() === 'desc' ? <ArrowDown size={12} /> :
           <ArrowUpDown size={12} />}
        </button>
      ),
      cell: ({ getValue }) => (
        <span className="text-sm text-zinc-500 dark:text-zinc-400">{fmtMoeda(getValue<number>())}</span>
      ),
    },
    {
      accessorKey: 'preco_cobrado',
      header: ({ column }) => (
        <button
          className="flex items-center gap-1 text-xs font-semibold text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
          onClick={() => column.toggleSorting()}
        >
          Preço Loja
          {column.getIsSorted() === 'asc' ? <ArrowUp size={12} /> :
           column.getIsSorted() === 'desc' ? <ArrowDown size={12} /> :
           <ArrowUpDown size={12} />}
        </button>
      ),
      cell: ({ getValue }) => (
        <span className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">{fmtMoeda(getValue<number | null>())}</span>
      ),
    },
  ];

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-white/[0.06]">
      <table className="w-full text-sm data-table">
        <thead>
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id} className="border-b border-zinc-200 dark:border-white/[0.06] bg-zinc-50 dark:bg-zinc-800">
              {hg.headers.map((h) => (
                <th key={h.id} className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                  {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id} className="border-b border-zinc-200 dark:border-white/[0.06] hover:bg-zinc-50 dark:hover:bg-zinc-900/60 transition-colors">
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="px-4 py-3">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {data.length === 0 && (
        <div className="p-12 text-center text-zinc-500 dark:text-zinc-400 text-sm">Nenhuma peça no estoque</div>
      )}
    </div>
  );
}
