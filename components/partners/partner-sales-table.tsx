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
  const [sorting, setSorting] = useState<SortingState>([{ id: 'total_vendas', desc: true }]);

  const totalVendas = data.reduce((s, r) => s + r.total_vendas, 0);
  const totalPecas = data.reduce((s, r) => s + r.qtd_pecas, 0);

  const columns: ColumnDef<PartnerSales>[] = [
    {
      accessorKey: 'parceiro',
      header: 'Parceiro',
      cell: ({ getValue }) => <span className="font-medium text-text">{getValue<string>()}</span>,
    },
    {
      accessorKey: 'qtd_pecas',
      header: ({ column }) => (
        <button
          className="flex items-center gap-1 text-xs font-semibold text-text-muted hover:text-text"
          onClick={() => column.toggleSorting()}
        >
          Peças
          {column.getIsSorted() === 'asc' ? <ArrowUp size={12} /> :
           column.getIsSorted() === 'desc' ? <ArrowDown size={12} /> :
           <ArrowUpDown size={12} />}
        </button>
      ),
      cell: ({ getValue }) => <span className="text-sm">{getValue<number>()}</span>,
    },
    {
      accessorKey: 'total_vendas',
      header: ({ column }) => (
        <button
          className="flex items-center gap-1 text-xs font-semibold text-text-muted hover:text-text"
          onClick={() => column.toggleSorting()}
        >
          Total Vendas
          {column.getIsSorted() === 'asc' ? <ArrowUp size={12} /> :
           column.getIsSorted() === 'desc' ? <ArrowDown size={12} /> :
           <ArrowUpDown size={12} />}
        </button>
      ),
      cell: ({ getValue }) => (
        <span className="text-sm font-semibold text-semantic-green">{fmtMoeda(getValue<number>())}</span>
      ),
    },
    {
      id: 'share',
      header: '% Total',
      cell: ({ row }) => {
        const pct = totalVendas > 0 ? ((row.original.total_vendas / totalVendas) * 100).toFixed(1) : '0';
        return (
          <div className="flex items-center gap-2">
            <div className="w-20 h-1.5 bg-bg-surface-2 rounded-full overflow-hidden">
              <div
                className="h-full bg-accent rounded-full"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-xs text-text-muted">{pct}%</span>
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
        <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wide">Vendas por Parceiro</h3>
        <div className="text-xs text-text-muted">
          {totalPecas} peças · {fmtMoeda(totalVendas)}
        </div>
      </div>
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
          <div className="p-8 text-center text-text-muted text-sm">Nenhum dado de vendas</div>
        )}
      </div>
    </div>
  );
}
