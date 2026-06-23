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

const diasClass = (d: number): string => {
  if (d <= 30) return 'text-emerald-600 dark:text-emerald-400';
  if (d <= 90) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
};

export function PartnerConsignmentTable({ data }: PartnerConsignmentTableProps) {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'preco_loja', desc: true }]);

  const totals = data.reduce(
    (acc, r) => ({ custo: acc.custo + r.custo_real, loja: acc.loja + r.preco_loja }),
    { custo: 0, loja: 0 }
  );

  const columns: ColumnDef<PartnerConsignment>[] = [
    {
      accessorKey: 'referencia',
      header: ({ column }) => (
        <button className="flex items-center gap-1 text-xs font-semibold text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100" onClick={() => column.toggleSorting()}>
          Referência
          {column.getIsSorted() === 'asc' ? <ArrowUp size={12} /> : column.getIsSorted() === 'desc' ? <ArrowDown size={12} /> : <ArrowUpDown size={12} />}
        </button>
      ),
      cell: ({ getValue }) => (
        <span className="font-mono text-xs font-semibold text-indigo-600 dark:text-indigo-400">{getValue<string>()}</span>
      ),
    },
    {
      id: 'produto_info',
      header: 'Produto',
      cell: ({ row }) => {
        const { produto, subtipo } = row.original;
        return (
          <span className="text-sm text-zinc-700 dark:text-zinc-300">
            {[produto, subtipo].filter(Boolean).join(' · ') || '—'}
          </span>
        );
      },
    },
    {
      accessorKey: 'destino',
      header: ({ column }) => (
        <button className="flex items-center gap-1 text-xs font-semibold text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100" onClick={() => column.toggleSorting()}>
          Parceiro
          {column.getIsSorted() === 'asc' ? <ArrowUp size={12} /> : column.getIsSorted() === 'desc' ? <ArrowDown size={12} /> : <ArrowUpDown size={12} />}
        </button>
      ),
      cell: ({ getValue }) => (
        <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{getValue<string | undefined>() ?? '—'}</span>
      ),
    },
    {
      accessorKey: 'dias_campo',
      header: ({ column }) => (
        <button
          className="flex items-center gap-1 text-xs font-semibold text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
          onClick={() => column.toggleSorting()}
        >
          Dias
          {column.getIsSorted() === 'asc' ? <ArrowUp size={12} /> :
           column.getIsSorted() === 'desc' ? <ArrowDown size={12} /> :
           <ArrowUpDown size={12} />}
        </button>
      ),
      cell: ({ getValue }) => {
        const d = getValue<number>();
        return <span className={`text-sm font-semibold ${diasClass(d)}`}>{d}d</span>;
      },
    },
    {
      accessorKey: 'custo_real',
      header: ({ column }) => (
        <button className="flex items-center gap-1 text-xs font-semibold text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100" onClick={() => column.toggleSorting()}>
          Custo
          {column.getIsSorted() === 'asc' ? <ArrowUp size={12} /> : column.getIsSorted() === 'desc' ? <ArrowDown size={12} /> : <ArrowUpDown size={12} />}
        </button>
      ),
      cell: ({ getValue }) => (
        <span className="text-sm text-zinc-500 dark:text-zinc-400">{fmtMoeda(getValue<number>())}</span>
      ),
    },
    {
      accessorKey: 'preco_loja',
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
        const { custo_real: custo, preco_loja: loja } = row.original;
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
        <h3 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">Comodato</h3>
        <div className="text-xs text-zinc-500 dark:text-zinc-400">
          {data.length} peças · {fmtMoeda(totals.loja)}
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
            <tr className="bg-zinc-50 dark:bg-zinc-800 border-t-2 border-zinc-200 dark:border-white/[0.06]">
              <td className="px-4 py-3 text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase" colSpan={4}>
                Total ({data.length} itens)
              </td>
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
