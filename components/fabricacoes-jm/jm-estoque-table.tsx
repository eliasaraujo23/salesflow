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
import { type JmEstoqueItem } from '@/lib/actions/fetch-jm-dashboard';

const fmtMoeda = (v: number | null | undefined): string => {
  if (v == null || isNaN(v)) return '—';
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
};

const estoqueClass = (estoque: number, vendidos_90d: number): string => {
  if (estoque === 0 && vendidos_90d > 0) return 'text-semantic-red font-bold';
  if (estoque <= 3 && vendidos_90d > 0) return 'text-semantic-amber font-semibold';
  if (estoque <= 6 && vendidos_90d > 0) return 'text-yellow-400';
  return 'text-semantic-green';
};

function getStatus(row: JmEstoqueItem): { label: string; cls: string } | null {
  if (row.estoque === 0 && row.vendidos_90d > 0) return { label: 'RUPTURA', cls: 'bg-semantic-red/20 text-semantic-red' };
  if (row.estoque <= 3 && row.vendidos_90d > 0) return { label: 'CRÍTICO', cls: 'bg-semantic-amber/20 text-semantic-amber' };
  if (row.estoque <= 6 && row.vendidos_90d > 0) return { label: 'ATENÇÃO', cls: 'bg-yellow-400/20 text-yellow-400' };
  return null;
}

interface JmEstoqueTableProps {
  data: JmEstoqueItem[];
}

export function JmEstoqueTable({ data }: JmEstoqueTableProps) {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'estoque', desc: false }]);

  const columns: ColumnDef<JmEstoqueItem>[] = [
    {
      id: 'categoria',
      header: 'Categoria',
      accessorFn: (row) => row.subtipo,
      cell: ({ row }) => (
        <div>
          <div className="text-sm font-medium text-text">{row.original.subtipo}</div>
          {row.original.produto && <div className="text-xs text-text-muted">{row.original.produto}</div>}
          {row.original.tipo_pedra && <div className="text-xs text-text-muted">{row.original.tipo_pedra}</div>}
        </div>
      ),
    },
    {
      accessorKey: 'estoque',
      header: ({ column }) => (
        <button
          className="flex items-center gap-1 text-xs font-semibold text-text-muted hover:text-text"
          onClick={() => column.toggleSorting()}
        >
          Estoque
          {column.getIsSorted() === 'asc' ? <ArrowUp size={12} /> :
           column.getIsSorted() === 'desc' ? <ArrowDown size={12} /> :
           <ArrowUpDown size={12} />}
        </button>
      ),
      cell: ({ row }) => (
        <span className={`text-sm ${estoqueClass(row.original.estoque, row.original.vendidos_90d)}`}>
          {row.original.estoque}
        </span>
      ),
    },
    {
      accessorKey: 'em_fabricacao',
      header: 'Em Fab.',
      cell: ({ getValue }) => <span className="text-sm text-semantic-amber">{getValue<number>()}</span>,
    },
    {
      accessorKey: 'vendidos_90d',
      header: 'Vel. 90d',
      cell: ({ getValue }) => {
        const v = getValue<number>();
        const pct = Math.min(100, (v / 20) * 100);
        return (
          <div className="flex items-center gap-2">
            <div className="w-12 h-1.5 bg-bg-surface-2 rounded-full overflow-hidden">
              <div className="h-full bg-accent rounded-full" style={{ width: `${pct}%` }} />
            </div>
            <span className="text-xs text-text-muted">{v}</span>
          </div>
        );
      },
    },
    {
      accessorKey: 'vendidos',
      header: 'Total Vend.',
      cell: ({ getValue }) => <span className="text-sm text-text-muted">{getValue<number>()}</span>,
    },
    {
      accessorKey: 'ticket_medio',
      header: 'Ticket Médio',
      cell: ({ getValue }) => <span className="text-sm text-accent">{fmtMoeda(getValue<number | null>())}</span>,
    },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const s = getStatus(row.original);
        return s ? (
          <span className={`px-2 py-0.5 rounded text-xs font-bold ${s.cls}`}>{s.label}</span>
        ) : (
          <span className="text-xs text-semantic-green/70">OK</span>
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
        <div className="p-12 text-center text-text-muted text-sm">Nenhum item no estoque</div>
      )}
    </div>
  );
}
