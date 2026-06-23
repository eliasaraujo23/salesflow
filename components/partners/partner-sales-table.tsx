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
import { type PartnerSales } from '@/lib/actions/fetch-partners';

interface PartnerSalesTableProps {
  data: PartnerSales[];
}

const fmtMoeda = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

export function PartnerSalesTable({ data }: PartnerSalesTableProps) {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'total_faturado', desc: true }]);

  const totalFaturado = data.reduce((s, r) => s + r.total_faturado, 0);
  const totalPecas = data.reduce((s, r) => s + r.total_vendas, 0);

  const columns: ColumnDef<PartnerSales>[] = [
    {
      accessorKey: 'destino',
      header: ({ column }) => (
        <button className="flex items-center gap-1 text-xs font-semibold text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100" onClick={() => column.toggleSorting()}>
          Parceiro
          {column.getIsSorted() === 'asc' ? <ArrowUp size={12} /> : column.getIsSorted() === 'desc' ? <ArrowDown size={12} /> : <ArrowUpDown size={12} />}
        </button>
      ),
      cell: ({ getValue }) => (
        <span className="font-medium text-zinc-900 dark:text-zinc-100">{getValue<string>()}</span>
      ),
    },
    {
      id: 'produto_info',
      header: 'Produto',
      cell: ({ row }) => {
        const { produto, subtipo } = row.original;
        return (
          <span className="text-sm text-zinc-500 dark:text-zinc-400">
            {[produto, subtipo].filter(Boolean).join(' · ') || '—'}
          </span>
        );
      },
    },
    {
      accessorKey: 'total_vendas',
      header: ({ column }) => (
        <button
          className="flex items-center gap-1 text-xs font-semibold text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
          onClick={() => column.toggleSorting()}
        >
          Peças
          {column.getIsSorted() === 'asc' ? <ArrowUp size={12} /> :
           column.getIsSorted() === 'desc' ? <ArrowDown size={12} /> :
           <ArrowUpDown size={12} />}
        </button>
      ),
      cell: ({ getValue }) => (
        <span className="text-sm text-zinc-900 dark:text-zinc-100">{getValue<number>()}</span>
      ),
    },
    {
      accessorKey: 'total_faturado',
      header: ({ column }) => (
        <button
          className="flex items-center gap-1 text-xs font-semibold text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
          onClick={() => column.toggleSorting()}
        >
          Faturado
          {column.getIsSorted() === 'asc' ? <ArrowUp size={12} /> :
           column.getIsSorted() === 'desc' ? <ArrowDown size={12} /> :
           <ArrowUpDown size={12} />}
        </button>
      ),
      cell: ({ getValue }) => (
        <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">{fmtMoeda(getValue<number>())}</span>
      ),
    },
    {
      id: 'share',
      header: '% Total',
      cell: ({ row }) => {
        const pct = totalFaturado > 0
          ? ((row.original.total_faturado / totalFaturado) * 100).toFixed(1)
          : '0';
        return (
          <div className="flex items-center gap-2">
            <div className="w-20 h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${pct}%` }} />
            </div>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">{pct}%</span>
          </div>
        );
      },
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
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">Vendas por Parceiro</h3>
        <div className="text-xs text-zinc-500 dark:text-zinc-400">
          {totalPecas} peças · {fmtMoeda(totalFaturado)}
        </div>
      </div>
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
          <div className="p-8 text-center text-zinc-500 dark:text-zinc-400 text-sm">Nenhum dado de vendas</div>
        )}
      </div>
    </div>
  );
}
