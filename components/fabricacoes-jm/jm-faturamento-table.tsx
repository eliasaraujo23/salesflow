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
import { type JmFaturamentoItem } from '@/lib/actions/fetch-jm-dashboard';

const fmtMoeda = (v: number | null | undefined): string => {
  if (v == null || isNaN(v)) return '—';
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
};

interface JmFaturamentoTableProps {
  data: JmFaturamentoItem[];
}

export function JmFaturamentoTable({ data }: JmFaturamentoTableProps) {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'data_venda', desc: true }]);

  const columns: ColumnDef<JmFaturamentoItem>[] = [
    {
      accessorKey: 'referencia',
      header: 'Referência',
      cell: ({ getValue }) => (
        <span className="font-mono text-xs text-accent">{getValue<string>()}</span>
      ),
    },
    {
      accessorKey: 'produto',
      header: 'Produto',
      cell: ({ row }) => (
        <div>
          <div className="text-sm text-text">{row.original.produto ?? '—'}</div>
          {row.original.subtipo && <div className="text-xs text-text-muted">{row.original.subtipo}</div>}
        </div>
      ),
    },
    {
      accessorKey: 'preco_loja',
      header: ({ column }) => (
        <button
          className="flex items-center gap-1 text-xs font-semibold text-text-muted hover:text-text"
          onClick={() => column.toggleSorting()}
        >
          Preço Loja
          {column.getIsSorted() === 'asc' ? <ArrowUp size={12} /> :
           column.getIsSorted() === 'desc' ? <ArrowDown size={12} /> :
           <ArrowUpDown size={12} />}
        </button>
      ),
      cell: ({ getValue }) => (
        <span className="text-sm font-semibold text-semantic-green">
          {fmtMoeda(getValue<number | null>())}
        </span>
      ),
    },
    {
      accessorKey: 'data_venda',
      header: ({ column }) => (
        <button
          className="flex items-center gap-1 text-xs font-semibold text-text-muted hover:text-text"
          onClick={() => column.toggleSorting()}
        >
          Data
          {column.getIsSorted() === 'asc' ? <ArrowUp size={12} /> :
           column.getIsSorted() === 'desc' ? <ArrowDown size={12} /> :
           <ArrowUpDown size={12} />}
        </button>
      ),
      cell: ({ getValue }) => {
        const v = getValue<string | null | undefined>();
        if (!v) return <span className="text-text-muted text-sm">—</span>;
        const d = new Date(v);
        return <span className="text-sm text-text-muted">{isNaN(d.getTime()) ? v : d.toLocaleDateString('pt-BR')}</span>;
      },
    },
    {
      accessorKey: 'vendedor',
      header: 'Vendedor',
      cell: ({ getValue }) => (
        <span className="text-sm text-text-muted">{getValue<string | null | undefined>() ?? '—'}</span>
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
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead>
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id} className="border-b border-border bg-bg-surface-2">
              {hg.headers.map((h) => (
                <th key={h.id} className="px-4 py-3 text-left text-xs font-semibold text-text-muted">
                  {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id} className="border-b border-border hover:bg-bg-surface transition-colors">
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
        <div className="p-12 text-center text-text-muted text-sm">Nenhum faturamento registrado</div>
      )}
    </div>
  );
}
