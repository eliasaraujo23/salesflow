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
import { Download, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';

type SortDir = 'asc' | 'desc' | false;
function SortIcon({ dir }: { dir: SortDir }) {
  if (dir === 'asc')  return <ArrowUp size={11} />;
  if (dir === 'desc') return <ArrowDown size={11} />;
  return <ArrowUpDown size={11} className="opacity-40" />;
}
import { Card, CardHeader, CardTitle } from '@/components/card';
import type { CategoriaRow } from '@/lib/actions/fetch-jf-dashboard';

const fmtMoeda = (n: number) =>
  n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

const TABS = [
  { id: 'todos',      label: 'Todos' },
  { id: 'carroChefe', label: 'Carro Chefe' },
  { id: 'criticos',   label: 'Críticos' },
] as const;

type TabId = (typeof TABS)[number]['id'];

type BadgeType = 'ruptura' | 'critico' | 'atencao' | 'destaque' | 'ok';

const BADGE_CLS: Record<BadgeType, string> = {
  ruptura:  'bg-red-500/15 text-red-500 border border-red-500/30',
  critico:  'bg-amber-500/15 text-amber-500 border border-amber-500/30',
  atencao:  'bg-yellow-400/[0.12] text-yellow-500 dark:text-yellow-400 border border-yellow-400/30',
  destaque: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30',
  ok:       'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25',
};

function getStatus(row: CategoriaRow, checkCC?: (row: CategoriaRow) => boolean): { label: string; type: BadgeType } {
  const e = row.estoque, v = row.vendidos_90d;
  if (e === 0 && v > 0)   return { label: 'Ruptura',       type: 'ruptura'  };
  if (e <= 2  && v >= 3)  return { label: 'Crítico',       type: 'critico'  };
  if (e <= 5  && v >= 5)  return { label: 'Atenção',       type: 'atencao'  };
  if (checkCC?.(row))     return { label: '★ Carro chefe', type: 'destaque' };
  return                         { label: 'OK',             type: 'ok'       };
}

function downloadCSV(rows: CategoriaRow[], checkCC?: (row: CategoriaRow) => boolean) {
  const hdr = ['Subtipo','Produto','Pedra','Lapidação','Estoque','Em Fab.','Vel. 90d','Total Vend.','Ticket Médio','Status'];
  const esc = (v: string | number | null | undefined) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = [
    hdr.join(','),
    ...rows.map(r => {
      const s = getStatus(r, checkCC);
      return [r.subtipo, r.produto, r.tipo_pedra, r.lapidacao, r.estoque, r.em_fabricacao, r.vendidos_90d, r.vendidos, r.ticket_medio ? fmtMoeda(r.ticket_medio) : '', s.label].map(esc).join(',');
    }),
  ].join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'controle-categorias.csv'; a.click();
  URL.revokeObjectURL(url);
}

interface FabSubtipoTableProps {
  data: CategoriaRow[];
  isCarroChefe?: (row: CategoriaRow) => boolean;
}

export function FabSubtipoTable({ data, isCarroChefe }: FabSubtipoTableProps) {
  const [tab, setTab]         = useState<TabId>('todos');
  const [busca, setBusca]     = useState('');
  const [sorting, setSorting] = useState<SortingState>([{ id: 'vendidos', desc: true }]);

  const filtered = useMemo(() => {
    let rows = [...data];
    if (busca) {
      const q = busca.toLowerCase();
      rows = rows.filter(r =>
        (r.subtipo    || '').toLowerCase().includes(q) ||
        (r.produto    || '').toLowerCase().includes(q) ||
        (r.tipo_pedra || '').toLowerCase().includes(q),
      );
    }
    if (tab === 'carroChefe') rows = rows.filter(r => isCarroChefe?.(r));
    if (tab === 'criticos')   rows = rows.filter(r => (r.estoque === 0 && r.vendidos_90d > 0) || (r.estoque <= 2 && r.vendidos_90d >= 2));
    return rows;
  }, [data, tab, busca]);

  const maxVend = useMemo(() => Math.max(...filtered.map(r => r.vendidos_90d), 1), [filtered]);

  const columns = useMemo<ColumnDef<CategoriaRow>[]>(
    () => [
      {
        id: 'categoria',
        header: 'Categoria',
        accessorFn: r => r.subtipo,
        cell: ({ row }) => {
          const r = row.original;
          const { type } = getStatus(r, isCarroChefe);
          return (
            <div className="text-left">
              <div className={`font-semibold text-sm leading-tight ${type === 'ruptura' ? 'text-red-600 dark:text-red-400' : type === 'critico' ? 'text-amber-600 dark:text-amber-400' : 'text-zinc-900 dark:text-zinc-100'}`}>
                {r.subtipo || '—'}
              </div>
              {(r.produto || r.tipo_pedra) && (
                <div className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5">
                  {[r.produto, r.tipo_pedra].filter(Boolean).join(' · ')}
                  {r.lapidacao ? ` · ${r.lapidacao}` : ''}
                </div>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: 'estoque',
        header: 'Estoque',
        cell: ({ getValue }) => {
          const v = getValue<number>();
          const color = v === 0 ? 'text-red-600 dark:text-red-400' : v <= 3 ? 'text-amber-600 dark:text-amber-400' : 'text-indigo-600 dark:text-indigo-400';
          return <span className={`font-bold ${color}`}>{v}</span>;
        },
      },
      {
        accessorKey: 'em_fabricacao',
        header: 'Em Fab.',
        cell: ({ getValue }) => {
          const v = getValue<number>();
          return <span className={v > 0 ? 'text-amber-600 dark:text-amber-400 font-medium' : 'text-zinc-500 dark:text-zinc-400'}>{v}</span>;
        },
      },
      {
        accessorKey: 'vendidos_90d',
        header: 'Vel. 90d',
        cell: ({ row }) => {
          const v = row.original.vendidos_90d;
          const pct = Math.round((v / maxVend) * 100);
          return (
            <div className="flex items-center justify-center gap-2">
              <div className="w-14 h-1.5 bg-zinc-200 dark:bg-white/[0.06] rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${pct}%` }} />
              </div>
              <span className="font-semibold w-6 text-right tabular-nums">{v}</span>
            </div>
          );
        },
      },
      {
        accessorKey: 'vendidos',
        header: 'Total Vend.',
        cell: ({ getValue }) => <span className="text-zinc-500 dark:text-zinc-400 tabular-nums">{getValue<number>()}</span>,
      },
      {
        accessorKey: 'ticket_medio',
        header: 'Ticket Médio',
        cell: ({ getValue }) => {
          const v = getValue<number | null | undefined>();
          return <span className="text-zinc-500 dark:text-zinc-400 tabular-nums">{v ? fmtMoeda(v) : '—'}</span>;
        },
      },
      {
        id: 'status',
        header: 'Status',
        enableSorting: false,
        cell: ({ row }) => {
          const { label, type } = getStatus(row.original, isCarroChefe);
          return (
            <span className={`inline-block text-[9px] font-black uppercase tracking-[0.7px] px-2 py-0.5 rounded-full whitespace-nowrap ${BADGE_CLS[type]}`}>
              {label}
            </span>
          );
        },
      },
    ],
    [maxVend, isCarroChefe],
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
        <CardTitle className="text-[13px]">Categorias de Produto</CardTitle>
        <div className="ml-auto flex items-center gap-4">
          <div className="flex gap-3 text-xs text-zinc-500 dark:text-zinc-400">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-indigo-500 inline-block" />Estoque</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-amber-500 inline-block" />Em Fab.</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-indigo-500/40 inline-block" />Vel. 90d</span>
          </div>
          <button
            onClick={() => downloadCSV(filtered, isCarroChefe)}
            disabled={filtered.length === 0}
            className="flex items-center gap-1 px-2.5 py-1 text-xs text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-white/[0.13] rounded hover:border-emerald-500 hover:text-emerald-600 transition-colors disabled:opacity-40"
          >
            <Download size={12} /> Exportar
          </button>
        </div>
      </CardHeader>

      {/* Search row */}
      <div className="px-4 py-2 border-b border-zinc-200 dark:border-white/[0.13]">
        <input
          type="text"
          placeholder="Buscar subtipo, produto ou pedra…"
          value={busca}
          onChange={e => setBusca(e.target.value)}
          className="w-full max-w-xs px-3 py-1.5 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-white/[0.08] rounded-lg text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-indigo-500 transition-colors placeholder:text-zinc-400"
        />
      </div>

      {/* Tabs */}
      <div className="flex px-[18px] border-b border-zinc-200 dark:border-white/[0.13]">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-3.5 py-2.5 text-xs font-semibold uppercase tracking-[0.4px] border-b-2 transition-colors ${
              tab === t.id
                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full" style={{ borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            {table.getHeaderGroups().map(hg => (
              <tr key={hg.id} className="border-b-2 border-zinc-200 dark:border-white/[0.13] bg-zinc-50 dark:bg-zinc-800/60">
                {hg.headers.map(h => {
                  const canSort = h.column.getCanSort();
                  const sorted = h.column.getIsSorted();
                  return (
                    <th
                      key={h.id}
                      onClick={canSort ? h.column.getToggleSortingHandler() : undefined}
                      className={`px-3.5 py-2.5 text-center text-[11px] font-semibold uppercase tracking-[0.5px] text-zinc-500 dark:text-zinc-400 whitespace-nowrap border-r border-zinc-200 dark:border-white/[0.13] last:border-r-0 ${canSort ? 'cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 select-none' : ''}`}
                    >
                      <div className="flex items-center justify-center gap-1">
                        {flexRender(h.column.columnDef.header, h.getContext())}
                        {canSort && <SortIcon dir={sorted} />}
                      </div>
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-zinc-500 dark:text-zinc-400 text-sm">
                  Nenhum registro
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row, i) => (
                <tr
                  key={row.id}
                  className={`hover:bg-indigo-50/50 dark:hover:bg-indigo-500/[0.05] transition-colors ${
                    i % 2 === 1 ? 'bg-zinc-50/80 dark:bg-zinc-800/20' : ''
                  }`}
                >
                  {row.getVisibleCells().map(cell => (
                    <td
                      key={cell.id}
                      className="px-3.5 py-2.5 text-center border-b border-r border-zinc-100 dark:border-white/[0.04] last:border-r-0"
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
