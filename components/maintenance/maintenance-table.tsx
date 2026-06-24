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
import { type MaintenanceItem } from '@/lib/actions/fetch-maintenance';

const fmtMoeda = (v: unknown): string => {
  const n = Number(v);
  return isNaN(n) ? '—' : n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const diasClass = (d: number): string => {
  if (d <= 7) return 'text-emerald-600 dark:text-emerald-400';
  if (d <= 30) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
};

interface MaintenanceTableProps {
  data: MaintenanceItem[];
}

export function MaintenanceTable({ data }: MaintenanceTableProps) {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'dias', desc: true }]);

  const SortBtn = ({ column, label }: { column: { toggleSorting: () => void; getIsSorted: () => false | 'asc' | 'desc' }; label: string }) => (
    <button className="flex items-center gap-1 text-xs font-semibold text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100" onClick={() => column.toggleSorting()}>
      {label}
      {column.getIsSorted() === 'asc' ? <ArrowUp size={12} /> : column.getIsSorted() === 'desc' ? <ArrowDown size={12} /> : <ArrowUpDown size={12} />}
    </button>
  );

  const columns: ColumnDef<MaintenanceItem>[] = [
    {
      accessorKey: 'referencia',
      header: ({ column }) => <SortBtn column={column} label="Referência" />,
      cell: ({ getValue }) => (
        <span className="font-mono text-xs text-indigo-600 dark:text-indigo-400">{getValue<string>()}</span>
      ),
    },
    {
      accessorKey: 'produto',
      header: ({ column }) => <SortBtn column={column} label="Produto / Tipo" />,
      cell: ({ row }) => (
        <div>
          <div className="text-sm text-zinc-900 dark:text-zinc-100">{row.original.produto ?? '—'}</div>
          {row.original.subtipo && (
            <div className="text-xs text-zinc-500 dark:text-zinc-400">{row.original.subtipo}</div>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'tipo_pedra',
      header: ({ column }) => <SortBtn column={column} label="Pedra" />,
      cell: ({ getValue }) => (
        <span className="text-sm text-zinc-500 dark:text-zinc-400">{getValue<string | null | undefined>() ?? '—'}</span>
      ),
    },
    {
      accessorKey: 'destino',
      header: ({ column }) => <SortBtn column={column} label="Destino" />,
      cell: ({ getValue }) => (
        <span className="text-sm text-zinc-900 dark:text-zinc-100">{getValue<string | null | undefined>() ?? '—'}</span>
      ),
    },
    {
      accessorKey: 'data_saida_manutencao',
      header: ({ column }) => <SortBtn column={column} label="Saída" />,
      cell: ({ getValue }) => {
        const v = getValue<string | null | undefined>();
        if (!v) return <span className="text-zinc-500 dark:text-zinc-400 text-sm">—</span>;
        return <span className="text-sm text-zinc-900 dark:text-zinc-100">{new Date(v).toLocaleDateString('pt-BR')}</span>;
      },
    },
    {
      accessorKey: 'dias',
      header: ({ column }) => (
        <button
          className="flex items-center gap-1 text-xs font-semibold text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
          onClick={() => column.toggleSorting()}
        >
          Dias
          {column.getIsSorted() === 'asc' ? (
            <ArrowUp size={12} />
          ) : column.getIsSorted() === 'desc' ? (
            <ArrowDown size={12} />
          ) : (
            <ArrowUpDown size={12} />
          )}
        </button>
      ),
      cell: ({ getValue }) => {
        const d = getValue<number>();
        return <span className={`text-sm font-semibold ${diasClass(d)}`}>{d}d</span>;
      },
    },
    {
      accessorKey: 'preco_loja',
      header: ({ column }) => <SortBtn column={column} label="Preço Loja" />,
      cell: ({ getValue }) => (
        <span className="text-sm text-indigo-600 dark:text-indigo-400 font-medium">{fmtMoeda(getValue())}</span>
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
    <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-white/[0.13]">
      <table className="w-full text-sm data-table">
        <thead>
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id} className="border-b border-zinc-200 dark:border-white/[0.13] bg-zinc-50 dark:bg-zinc-800">
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
            <tr key={row.id} className="border-b border-zinc-200 dark:border-white/[0.13] hover:bg-zinc-50 dark:hover:bg-zinc-900/60 transition-colors">
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
        <div className="p-12 text-center text-zinc-500 dark:text-zinc-400 text-sm">Nenhuma manutenção encontrada</div>
      )}
    </div>
  );
}
