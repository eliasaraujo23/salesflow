'use client';

import React, { useState, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  type SortingState,
  flexRender,
  type ColumnDef,
} from '@tanstack/react-table';
import { Download, RefreshCw, X, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { format } from 'date-fns';
import { type DateRange } from 'react-day-picker';
import { type JmFaturamentoItem } from '@/lib/actions/fetch-jm-dashboard';
import { CalendarDateRangePicker } from '@/components/ui/date-range-picker';

const fmtMoeda = (v: number | null | undefined): string => {
  if (v == null || isNaN(v)) return '—';
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
};

const fmtDate = (s: string | null | undefined): string => {
  if (!s) return '—';
  const d = new Date(s);
  return isNaN(d.getTime()) ? s : d.toLocaleDateString('pt-BR');
};

function downloadCSV(rows: JmFaturamentoItem[]) {
  const hdr = [
    'Referência','Tipo','Produto','Subtipo','Pedra','Lapidação','Destino',
    'Data','Peso(g)','Custo(R$)','Ticket(R$)','Lucro(R$)','Margem%',
    'Diamantes','Cts Diam.','Pedra Colorida','Cts PC',
  ];
  const esc = (v: string | number | null | undefined) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = [
    hdr.join(','),
    ...rows.map(r => {
      const preco = r.preco_cobrado ?? 0;
      const lucro = r.custo_real > 0 ? preco - r.custo_real : null;
      const margem = lucro !== null && preco > 0 ? (lucro / preco * 100).toFixed(1) : '';
      return [
        r.referencia, r.tipo, r.produto, r.subtipo, r.tipo_pedra, r.lapidacao, r.destino,
        fmtDate(r.data_venda), r.peso > 0 ? r.peso.toFixed(2) : '',
        r.custo_real > 0 ? r.custo_real.toFixed(2) : '', preco > 0 ? preco.toFixed(2) : '',
        lucro !== null ? lucro.toFixed(2) : '', margem,
        r.diamantes, r.cts_diamantes, r.pedra_colorida, r.cts_pedra_colorida,
      ].map(esc).join(',');
    }),
  ].join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'jm-vendas.csv';
  a.click();
  URL.revokeObjectURL(url);
}

const HIDDEN_DESTINOS = new Set(['helton', 'augusto', 'eduardo', 'thaís', 'thais']);

type StringField = 'tipo' | 'produto' | 'subtipo' | 'destino' | 'tipo_pedra' | 'lapidacao';

function uniqStrings(rows: JmFaturamentoItem[], field: StringField): string[] {
  return [...new Set(rows.map(r => r[field]).filter((v): v is string => v != null && v !== ''))].sort();
}

function applyDimFilters(
  rows: JmFaturamentoItem[],
  tipos: string[], produtos: string[], subtipos: string[],
  destinos: string[], pedras: string[], lapidacoes: string[],
): JmFaturamentoItem[] {
  return rows.filter(r => {
    if (tipos.length    && !tipos.includes(r.tipo ?? ''))       return false;
    if (produtos.length && !produtos.includes(r.produto ?? '')) return false;
    if (subtipos.length && !subtipos.includes(r.subtipo ?? '')) return false;
    if (destinos.length && !destinos.includes(r.destino ?? '')) return false;
    if (pedras.length   && !pedras.includes(r.tipo_pedra ?? '')) return false;
    if (lapidacoes.length && !lapidacoes.includes(r.lapidacao ?? '')) return false;
    return true;
  });
}

function toggle(arr: string[], v: string): string[] {
  return arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v];
}

type SortDir = 'asc' | 'desc' | false;

function SortIcon({ dir }: { dir: SortDir }) {
  if (dir === 'asc') return <ArrowUp size={11} />;
  if (dir === 'desc') return <ArrowDown size={11} />;
  return <ArrowUpDown size={11} className="opacity-40" />;
}

interface JmVendasTabProps {
  data: JmFaturamentoItem[];
  isLoading?: boolean;
}

export function JmVendasTab({ data, isLoading }: JmVendasTabProps) {
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    const now = new Date();
    return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: new Date(now.getFullYear(), now.getMonth() + 1, 0) };
  });
  const from = dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : '';
  const to   = dateRange?.to   ? format(dateRange.to,   'yyyy-MM-dd') : '';
  const [busca, setBusca] = useState('');
  const [tipos, setTipos]           = useState<string[]>([]);
  const [produtos, setProdutos]     = useState<string[]>([]);
  const [subtipos, setSubtipos]     = useState<string[]>([]);
  const [destinos, setDestinos]     = useState<string[]>([]);
  const [pedras, setPedras]         = useState<string[]>([]);
  const [lapidacoes, setLapidacoes] = useState<string[]>([]);
  const [sorting, setSorting] = useState<SortingState>([{ id: 'data_venda', desc: true }]);

  const dateSearchFiltered = useMemo(() => {
    return data.filter(r => {
      if (HIDDEN_DESTINOS.has((r.destino ?? '').toLowerCase())) return false;
      if (from && (!r.data_venda || new Date(r.data_venda) < new Date(from + 'T00:00:00'))) return false;
      if (to && (!r.data_venda || new Date(r.data_venda) > new Date(to + 'T23:59:59'))) return false;
      if (busca) {
        const q = busca.toLowerCase();
        if (!r.referencia.toLowerCase().includes(q) && !(r.produto ?? '').toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [data, from, to, busca]);

  const filtered = useMemo(
    () => applyDimFilters(dateSearchFiltered, tipos, produtos, subtipos, destinos, pedras, lapidacoes),
    [dateSearchFiltered, tipos, produtos, subtipos, destinos, pedras, lapidacoes],
  );

  const availTipos      = useMemo(() => uniqStrings(applyDimFilters(dateSearchFiltered, [],    produtos, subtipos, destinos, pedras, lapidacoes), 'tipo'),      [dateSearchFiltered, produtos, subtipos, destinos, pedras, lapidacoes]);
  const availProdutos   = useMemo(() => uniqStrings(applyDimFilters(dateSearchFiltered, tipos, [],       subtipos, destinos, pedras, lapidacoes), 'produto'),   [dateSearchFiltered, tipos, subtipos, destinos, pedras, lapidacoes]);
  const availSubtipos   = useMemo(() => uniqStrings(applyDimFilters(dateSearchFiltered, tipos, produtos, [],       destinos, pedras, lapidacoes), 'subtipo'),   [dateSearchFiltered, tipos, produtos, destinos, pedras, lapidacoes]);
  const availDestinos   = useMemo(() => uniqStrings(applyDimFilters(dateSearchFiltered, tipos, produtos, subtipos, [],       pedras, lapidacoes), 'destino'),   [dateSearchFiltered, tipos, produtos, subtipos, pedras, lapidacoes]);
  const availPedras     = useMemo(() => uniqStrings(applyDimFilters(dateSearchFiltered, tipos, produtos, subtipos, destinos, [],     lapidacoes), 'tipo_pedra'), [dateSearchFiltered, tipos, produtos, subtipos, destinos, lapidacoes]);
  const availLapidacoes = useMemo(() => uniqStrings(applyDimFilters(dateSearchFiltered, tipos, produtos, subtipos, destinos, pedras, []),         'lapidacao'),  [dateSearchFiltered, tipos, produtos, subtipos, destinos, pedras]);

  const totalFaturamento = useMemo(
    () => filtered.reduce((s, r) => s + (r.preco_cobrado ?? 0), 0),
    [filtered],
  );

  const hasFilters = tipos.length > 0 || produtos.length > 0 || subtipos.length > 0 ||
    destinos.length > 0 || pedras.length > 0 || lapidacoes.length > 0 || !!busca || !!from || !!to;

  function clearAll() {
    setTipos([]); setProdutos([]); setSubtipos([]);
    setDestinos([]); setPedras([]); setLapidacoes([]);
    setBusca(''); setDateRange(undefined);
  }

  const inputCls = 'px-3 py-1.5 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-white/[0.08] rounded-lg text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-indigo-500 transition-colors';

  const columns: ColumnDef<JmFaturamentoItem>[] = [
    {
      accessorKey: 'referencia',
      header: 'Ref',
      cell: ({ getValue }) => (
        <span className="font-mono text-xs text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
          {getValue<string>()}
        </span>
      ),
    },
    {
      accessorKey: 'tipo',
      header: 'Tipo',
      cell: ({ getValue }) => {
        const v = getValue<string | null | undefined>() ?? '';
        return (
          <span className="text-[11px] font-mono bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-700 dark:text-zinc-300">
            {v || '—'}
          </span>
        );
      },
    },
    {
      accessorKey: 'produto',
      header: 'Produto',
      cell: ({ getValue }) => (
        <span className="text-sm text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
          {getValue<string | null | undefined>() ?? '—'}
        </span>
      ),
    },
    {
      accessorKey: 'subtipo',
      header: 'Subtipo',
      cell: ({ getValue }) => (
        <span className="text-sm text-zinc-500 dark:text-zinc-400">
          {getValue<string | null | undefined>() ?? '—'}
        </span>
      ),
    },
    {
      accessorKey: 'tipo_pedra',
      header: 'Pedra',
      cell: ({ row }) => (
        <div>
          <div className="text-sm text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
            {row.original.tipo_pedra ?? '—'}
          </div>
          {row.original.lapidacao && (
            <div className="text-[10px] text-zinc-400 dark:text-zinc-500">{row.original.lapidacao}</div>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'destino',
      header: 'Destino',
      cell: ({ getValue }) => (
        <span className="text-sm text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
          {getValue<string | null | undefined>() ?? '—'}
        </span>
      ),
    },
    {
      accessorKey: 'data_venda',
      header: ({ column }) => (
        <button className="flex items-center gap-1 text-xs font-semibold text-zinc-500 dark:text-zinc-400" onClick={() => column.toggleSorting()}>
          Data <SortIcon dir={column.getIsSorted()} />
        </button>
      ),
      cell: ({ getValue }) => (
        <span className="text-xs text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
          {fmtDate(getValue<string | null>())}
        </span>
      ),
    },
    {
      accessorKey: 'peso',
      header: ({ column }) => (
        <button className="flex items-center gap-1 text-xs font-semibold text-zinc-500 dark:text-zinc-400" onClick={() => column.toggleSorting()}>
          Peso <SortIcon dir={column.getIsSorted()} />
        </button>
      ),
      cell: ({ getValue }) => {
        const v = getValue<number>();
        return (
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            {v > 0 ? v.toFixed(2) + 'g' : '—'}
          </span>
        );
      },
    },
    {
      accessorKey: 'custo_real',
      header: ({ column }) => (
        <button className="flex items-center gap-1 text-xs font-semibold text-zinc-500 dark:text-zinc-400" onClick={() => column.toggleSorting()}>
          Custo <SortIcon dir={column.getIsSorted()} />
        </button>
      ),
      cell: ({ getValue }) => (
        <span className="text-xs text-zinc-500 dark:text-zinc-400">{fmtMoeda(getValue<number>())}</span>
      ),
    },
    {
      accessorKey: 'preco_cobrado',
      header: ({ column }) => (
        <button className="flex items-center gap-1 text-xs font-semibold text-zinc-500 dark:text-zinc-400" onClick={() => column.toggleSorting()}>
          Ticket <SortIcon dir={column.getIsSorted()} />
        </button>
      ),
      cell: ({ getValue }) => (
        <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
          {fmtMoeda(getValue<number | null>())}
        </span>
      ),
    },
    {
      id: 'lucro',
      header: ({ column }) => (
        <button className="flex items-center gap-1 text-xs font-semibold text-zinc-500 dark:text-zinc-400" onClick={() => column.toggleSorting()}>
          Lucro <SortIcon dir={column.getIsSorted()} />
        </button>
      ),
      accessorFn: (r): number | null => {
        const preco = r.preco_cobrado ?? 0;
        return r.custo_real > 0 ? preco - r.custo_real : null;
      },
      cell: ({ getValue }) => {
        const v = getValue<number | null>();
        if (v === null) return <span className="text-xs text-zinc-400">—</span>;
        return (
          <span className={`text-sm font-semibold ${v >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
            {fmtMoeda(v)}
          </span>
        );
      },
    },
    {
      id: 'margem',
      header: 'Margem',
      accessorFn: (r): number | null => {
        const preco = r.preco_cobrado ?? 0;
        if (!r.custo_real || !preco) return null;
        return (preco - r.custo_real) / preco * 100;
      },
      cell: ({ getValue }) => {
        const v = getValue<number | null>();
        if (v === null) return <span className="text-xs text-zinc-400">—</span>;
        return (
          <span className={`text-xs font-semibold ${v >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
            {v.toFixed(1)}%
          </span>
        );
      },
    },
    {
      accessorKey: 'diamantes',
      header: 'Diamantes',
      cell: ({ getValue }) => (
        <span className="text-xs text-zinc-500 dark:text-zinc-400 max-w-[120px] truncate block">
          {getValue<string | null | undefined>() ?? '—'}
        </span>
      ),
    },
    {
      accessorKey: 'cts_diamantes',
      header: 'Cts Diam.',
      cell: ({ getValue }) => (
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          {getValue<number | null | undefined>() ?? '—'}
        </span>
      ),
    },
    {
      accessorKey: 'pedra_colorida',
      header: 'Pedra Color.',
      cell: ({ getValue }) => (
        <span className="text-xs text-zinc-500 dark:text-zinc-400 max-w-[120px] truncate block">
          {getValue<string | null | undefined>() ?? '—'}
        </span>
      ),
    },
    {
      accessorKey: 'cts_pedra_colorida',
      header: 'Cts PC',
      cell: ({ getValue }) => (
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          {getValue<number | null | undefined>() ?? '—'}
        </span>
      ),
    },
  ];

  const table = useReactTable({
    data: filtered,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-48">
        <div className="text-zinc-500 dark:text-zinc-400 text-sm flex items-center gap-2">
          <RefreshCw size={16} className="animate-spin" />
          Carregando vendas...
        </div>
      </div>
    );
  }

  const dimDefs = [
    { label: 'Tipo',       avail: availTipos,      sel: tipos,      set: setTipos },
    { label: 'Produto',    avail: availProdutos,   sel: produtos,   set: setProdutos },
    { label: 'Subtipo',    avail: availSubtipos,   sel: subtipos,   set: setSubtipos },
    { label: 'Destino',    avail: availDestinos,   sel: destinos,   set: setDestinos },
    { label: 'Tipo Pedra', avail: availPedras,     sel: pedras,     set: setPedras },
    { label: 'Lapidação',  avail: availLapidacoes, sel: lapidacoes, set: setLapidacoes },
  ];

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.06] rounded-xl p-4">
        <div className="flex items-start gap-4 overflow-x-auto pb-1">
          <CalendarDateRangePicker dateRange={dateRange} setDateRange={setDateRange} />
          <div className="flex flex-col gap-1.5 shrink-0">
            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">Buscar</span>
            <input
              type="text"
              placeholder="Ref ou produto…"
              value={busca}
              onChange={e => setBusca(e.target.value)}
              className={`w-44 ${inputCls} placeholder:text-zinc-400`}
            />
          </div>

          {dimDefs.filter(d => d.avail.length > 0).map(d => (
            <div key={d.label} className="flex flex-col min-w-[120px] shrink-0">
              <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-1.5">
                {d.label}
              </span>
              <div className="max-h-[88px] overflow-y-auto space-y-0.5 pr-1">
                {d.avail.map(v => (
                  <label key={v} className="flex items-center gap-1.5 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={d.sel.includes(v)}
                      onChange={() => d.set(toggle(d.sel, v))}
                      className="w-3.5 h-3.5 accent-indigo-600 cursor-pointer shrink-0"
                    />
                    <span className="text-xs text-zinc-700 dark:text-zinc-300 group-hover:text-zinc-900 dark:group-hover:text-zinc-100 leading-tight">
                      {v}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          ))}

          <div className="ml-auto flex flex-col items-end gap-1.5 shrink-0">
            <div className="text-right">
              <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 leading-none">{filtered.length}</span>
              <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">itens</div>
            </div>
            <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">{fmtMoeda(totalFaturamento)}</div>
            {hasFilters && (
              <button
                onClick={clearAll}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-white/[0.06] rounded-lg hover:border-red-400 hover:text-red-500 transition-colors"
              >
                <X size={11} /> Limpar
              </button>
            )}
            <button
              onClick={() => downloadCSV(filtered)}
              disabled={filtered.length === 0}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-white/[0.06] rounded-lg hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors disabled:opacity-40"
            >
              <Download size={13} /> CSV
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.06] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm data-table" style={{ minWidth: '1400px' }}>
            <thead>
              {table.getHeaderGroups().map(hg => (
                <tr key={hg.id} className="border-b border-zinc-200 dark:border-white/[0.06] bg-zinc-50 dark:bg-zinc-800/60">
                  {hg.headers.map(h => (
                    <th key={h.id} className="px-3 py-2.5 text-left text-xs font-semibold text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                      {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map(row => (
                <tr key={row.id} className="border-b border-zinc-100 dark:border-white/[0.04] hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
                  {row.getVisibleCells().map(cell => (
                    <td key={cell.id} className="px-3 py-2">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="p-10 text-center text-zinc-500 dark:text-zinc-400 text-sm">
              {data.length === 0 ? 'Nenhuma venda registrada' : 'Nenhuma venda para os filtros selecionados'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
