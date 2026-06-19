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
import { type PartnerConsignment } from '@/lib/actions/fetch-partners';

interface PartnerConsignmentTableProps {
  data: PartnerConsignment[];
}

const fmtMoeda = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

const fmtPeso = (v: number) => `${v.toFixed(2)}g`;

export function PartnerConsignmentTable({ data }: PartnerConsignmentTableProps) {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'total_loja', desc: true }]);

  const totals = data.reduce(
    (acc, r) => ({
      pecas: acc.pecas + r.total_pecas,
      peso: acc.peso + r.total_peso,
      custo: acc.custo + r.total_custo,
      loja: acc.loja + r.total_loja,
    }),
    { pecas: 0, peso: 0, custo: 0, loja: 0 }
  );

  const columns: ColumnDef<PartnerConsignment>[] = [
    {
      accessorKey: 'parceiro',
      header: 'Parceiro',
      cell: ({ getValue }) => <span className="font-medium text-zinc-900 dark:text-zinc-100">{getValue<string>()}</span>,
    },
    {
      accessorKey: 'total_pecas',
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
      cell: ({ getValue }) => <span className="text-sm text-zinc-900 dark:text-zinc-100">{getValue<number>()}</span>,
    },
    {
      accessorKey: 'total_peso',
      header: 'Peso',
      cell: ({ getValue }) => (
        <span className="text-sm text-zinc-500 dark:text-zinc-400">{fmtPeso(getValue<number>())}</span>
      ),
    },
    {
      accessorKey: 'total_custo',
      header: 'Custo',
      cell: ({ getValue }) => (
        <span className="text-sm text-zinc-500 dark:text-zinc-400">{fmtMoeda(getValue<number>())}</span>
      ),
    },
    {
      accessorKey: 'total_loja',
      header: ({ column }) => (
        <button
          className="flex items-center gap-1 text-xs font-semibold text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
          onClick={() => column.toggleSorting()}
        >
          Valor Loja
          {column.getIsSorted() === 'asc' ? <ArrowUp size={12} /> :
           column.getIsSorted() === 'desc' ? <ArrowDown size={12} /> :
           <ArrowUpDown size={12} />}
        </button>
      ),
      cell: ({ getValue }) => (
        <span className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">{fmtMoeda(getValue<number>())}</span>
      ),
    },
    {
      id: 'margem',
      header: 'Margem',
      cell: ({ row }) => {
        const { total_custo: custo, total_loja: loja } = row.original;
        if (custo <= 0) return <span className="text-zinc-500 dark:text-zinc-400 text-sm">—</span>;
        const pct = (((loja - custo) / custo) * 100).toFixed(0);
        return <span className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">{pct}%</span>;
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
        <h3 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">Comodato por Parceiro</h3>
        <div className="text-xs text-zinc-500 dark:text-zinc-400">
          {totals.pecas} peças · {fmtPeso(totals.peso)} · {fmtMoeda(totals.loja)}
        </div>
      </div>
      <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-white/[0.06]">
        <table className="w-full text-sm">
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
            <tr className="bg-zinc-50 dark:bg-zinc-800 border-t-2 border-zinc-200 dark:border-white/[0.06]">
              <td className="px-4 py-3 text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase">Total</td>
              <td className="px-4 py-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100">{totals.pecas}</td>
              <td className="px-4 py-3 text-sm text-zinc-500 dark:text-zinc-400">{fmtPeso(totals.peso)}</td>
              <td className="px-4 py-3 text-sm text-zinc-500 dark:text-zinc-400">{fmtMoeda(totals.custo)}</td>
              <td className="px-4 py-3 text-sm font-bold text-indigo-600 dark:text-indigo-400">{fmtMoeda(totals.loja)}</td>
              <td className="px-4 py-3 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                {totals.custo > 0 ? `${(((totals.loja - totals.custo) / totals.custo) * 100).toFixed(0)}%` : '—'}
              </td>
            </tr>
          </tbody>
        </table>
        {data.length === 0 && (
          <div className="p-8 text-center text-zinc-500 dark:text-zinc-400 text-sm">Nenhum comodato encontrado</div>
        )}
      </div>
    </div>
  );
}
