'use client';

import React, { useState, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import { Card, CardHeader, CardTitle } from '@/components/card';
import type { CategoriaRow } from '@/lib/actions/fetch-jf-dashboard';

const fmtMoeda = (n: number) =>
  n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

const TABS = [
  { id: 'todos', label: 'Todos' },
  { id: 'criticos', label: 'Críticos' },
  { id: 'fabricando', label: 'Em Fab.' },
] as const;

type TabId = (typeof TABS)[number]['id'];

const RIGHT_COLS = new Set(['estoque', 'em_fabricacao', 'vendidos', 'vendidos_90d', 'ticket_medio']);

function getStatus(row: CategoriaRow): { label: string; cls: string } | null {
  if (row.estoque === 0 && row.vendidos_90d > 0) return { label: 'RUPTURA', cls: 'bg-semantic-red text-white' };
  if (row.estoque <= 3 && row.vendidos_90d > 0) return { label: 'CRÍTICO', cls: 'bg-semantic-amber text-white' };
  if (row.estoque <= 6 && row.vendidos_90d > 0) return { label: 'ATENÇÃO', cls: 'bg-yellow-400 text-black' };
  return null;
}

interface FabSubtipoTableProps {
  data: CategoriaRow[];
}

export function FabSubtipoTable({ data }: FabSubtipoTableProps) {
  const [tab, setTab] = useState<TabId>('todos');
  const [sorting, setSorting] = useState<SortingState>([{ id: 'vendidos', desc: true }]);

  const filtered = useMemo(() => {
    let rows = [...data];
    if (tab === 'criticos') rows = rows.filter(r => r.estoque <= 3 && r.vendidos_90d > 0);
    if (tab === 'fabricando') rows = rows.filter(r => r.em_fabricacao > 0);
    return rows;
  }, [data, tab]);

  const maxVend = useMemo(() => Math.max(...filtered.map(r => r.vendidos_90d), 1), [filtered]);

  const columns = useMemo<ColumnDef<CategoriaRow>[]>(
    () => [
      {
        id: 'categoria',
        header: 'Categoria',
        accessorFn: r => r.subtipo,
        cell: ({ row }) => {
          const r = row.original;
          const status = getStatus(r);
          return (
            <div>
              <div className={`font-semibold text-sm ${status?.label === 'RUPTURA' ? 'text-semantic-red' : status ? 'text-semantic-amber' : 'text-text'}`}>
                {r.produto || r.subtipo}
              </div>
              {r.tipo_pedra && (
                <div className="text-xs text-accent mt-0.5">{r.tipo_pedra}{r.lapidacao ? ` · ${r.lapidacao}` : ''}</div>
              )}
              <div className="text-xs text-text-muted-2">{r.subtipo}</div>
            </div>
          );
        },
      },
      {
        accessorKey: 'estoque',
        header: 'Estoque',
        cell: ({ getValue }) => {
          const v = getValue<number>();
          const color = v === 0 ? 'text-semantic-red' : v <= 3 ? 'text-semantic-amber' : 'text-accent';
          return <span className={`font-bold ${color}`}>{v}</span>;
        },
      },
      {
        accessorKey: 'em_fabricacao',
        header: 'Em Fab.',
        cell: ({ getValue }) => {
          const v = getValue<number>();
          return <span className={v > 0 ? 'text-semantic-amber font-medium' : 'text-text-muted'}>{v}</span>;
        },
      },
      {
        accessorKey: 'vendidos_90d',
        header: 'Vel. 90d',
        cell: ({ row }) => {
          const v = row.original.vendidos_90d;
          const pct = Math.round((v / maxVend) * 100);
          return (
            <div className="flex items-center justify-end gap-2">
              <div className="w-14 h-1.5 bg-border rounded-full overflow-hidden">
                <div className="h-full bg-accent rounded-full" style={{ width: `${pct}%` }} />
              </div>
              <span className="font-semibold w-6 text-right">{v}</span>
            </div>
          );
        },
      },
      {
        accessorKey: 'vendidos',
        header: 'Total Vend.',
        cell: ({ getValue }) => <span className="text-text-muted">{getValue<number>()}</span>,
      },
      {
        accessorKey: 'ticket_medio',
        header: 'Ticket Médio',
        cell: ({ getValue }) => {
          const v = getValue<number | null | undefined>();
          return <span className="text-text-muted">{v ? fmtMoeda(v) : '—'}</span>;
        },
      },
      {
        id: 'status',
        header: 'Status',
        enableSorting: false,
        cell: ({ row }) => {
          const s = getStatus(row.original);
          if (!s) return <span className="text-xs text-semantic-green">OK</span>;
          return (
            <span className={`text-xs font-bold px-2 py-0.5 rounded uppercase ${s.cls}`}>{s.label}</span>
          );
        },
      },
    ],
    [maxVend]
  );

  const table = useReactTable({
    data: filtered,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <Card variant="bordered">
      <CardHeader>
        <CardTitle className="text-sm">📦 Estoque por Categoria</CardTitle>
        <div className="flex gap-3 text-xs text-text-muted">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-accent inline-block" />Estoque</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-semantic-amber inline-block" />Em Fab.</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-accent/40 inline-block" />Vel. 90d</span>
        </div>
      </CardHeader>

      <div className="flex gap-1 px-5 border-b border-border">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-3 py-2.5 text-xs font-semibold uppercase tracking-wide border-b-2 transition-colors ${
              tab === t.id ? 'border-accent text-accent' : 'border-transparent text-text-muted hover:text-text'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            {table.getHeaderGroups().map(hg => (
              <tr key={hg.id}>
                {hg.headers.map(h => (
                  <th
                    key={h.id}
                    onClick={h.column.getToggleSortingHandler()}
                    className={`px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-text-muted border-b border-border whitespace-nowrap select-none ${
                      h.column.getCanSort() ? 'cursor-pointer hover:text-text' : ''
                    } ${RIGHT_COLS.has(h.column.id) || h.column.id === 'status' ? 'text-right' : 'text-left'}`}
                  >
                    {flexRender(h.column.columnDef.header, h.getContext())}
                    {h.column.getIsSorted() === 'asc' ? ' ↑' : h.column.getIsSorted() === 'desc' ? ' ↓' : ''}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-text-muted text-sm">
                  Nenhum registro
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map(row => (
                <tr key={row.id} className="hover:bg-border/30 transition-colors">
                  {row.getVisibleCells().map(cell => (
                    <td
                      key={cell.id}
                      className={`px-4 py-2.5 border-b border-border/50 ${
                        RIGHT_COLS.has(cell.column.id) || cell.column.id === 'status' ? 'text-right' : ''
                      }`}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
