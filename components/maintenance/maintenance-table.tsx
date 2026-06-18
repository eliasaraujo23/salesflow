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
  if (d <= 7) return 'text-semantic-green';
  if (d <= 30) return 'text-semantic-amber';
  return 'text-semantic-red';
};

interface MaintenanceTableProps {
  data: MaintenanceItem[];
}

export function MaintenanceTable({ data }: MaintenanceTableProps) {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'dias', desc: true }]);

  const columns: ColumnDef<MaintenanceItem>[] = [
    {
      accessorKey: 'referencia',
      header: 'Referência',
      cell: ({ getValue }) => (
        <span className="font-mono text-xs text-accent">{getValue<string>()}</span>
      ),
    },
    {
      accessorKey: 'produto',
      header: 'Produto / Tipo',
      cell: ({ row }) => (
        <div>
          <div className="text-sm text-text">{row.original.produto ?? '—'}</div>
          {row.original.subtipo && (
            <div className="text-xs text-text-muted">{row.original.subtipo}</div>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'tipo_pedra',
      header: 'Pedra',
      cell: ({ getValue }) => (
        <span className="text-sm text-text-muted">{getValue<string | null | undefined>() ?? '—'}</span>
      ),
    },
    {
      accessorKey: 'destino',
      header: 'Destino',
      cell: ({ getValue }) => (
        <span className="text-sm">{getValue<string | null | undefined>() ?? '—'}</span>
      ),
    },
    {
      accessorKey: 'data_saida_manutencao',
      header: 'Saída',
      cell: ({ getValue }) => {
        const v = getValue<string | null | undefined>();
        if (!v) return <span className="text-text-muted text-sm">—</span>;
        return <span className="text-sm">{new Date(v).toLocaleDateString('pt-BR')}</span>;
      },
    },
    {
      accessorKey: 'dias',
      header: ({ column }) => (
        <button
          className="flex items-center gap-1 text-xs font-semibold text-text-muted hover:text-text"
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
      header: 'Preço Loja',
      cell: ({ getValue }) => (
        <span className="text-sm text-accent font-medium">{fmtMoeda(getValue())}</span>
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
        <div className="p-12 text-center text-text-muted text-sm">Nenhuma manutenção encontrada</div>
      )}
    </div>
  );
}
