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
import { useJfVendas } from '@/hooks/use-jf-vendas';
import { type JfVendasItem } from '@/lib/actions/fetch-jf-vendas';

const fmtMoeda = (v: number | null | undefined): string => {
  if (v == null || isNaN(v)) return '—';
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
};

const fmtDate = (s: string | null | undefined): string => {
  if (!s) return '—';
  const d = new Date(s);
  return isNaN(d.getTime()) ? s : d.toLocaleDateString('pt-BR');
};

function downloadCSV(rows: JfVendasItem[], prefix: string) {
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
  a.download = `${prefix}-vendas.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

type StringField = 'tipo' | 'subtipo' | 'tipo_pedra' | 'lapidacao' | 'destino';

function uniqStrings(rows: JfVendasItem[], field: StringField): string[] {
  return [...new Set(rows.map(r => r[field]).filter((v): v is string => v != null && v !== ''))].sort();
}

function applyDimFilters(
  rows: JfVendasItem[],
  tipos: string[], subtipos: string[], pedras: string[], lapidacoes: string[], destinos: string[],
): JfVendasItem[] {
  return rows.filter(r => {
    if (tipos.length && !tipos.includes(r.tipo ?? '')) return false;
    if (subtipos.length && !subtipos.includes(r.subtipo ?? '')) return false;
    if (pedras.length && !pedras.includes(r.tipo_pedra ?? '')) return false;
    if (lapidacoes.length && !lapidacoes.includes(r.lapidacao ?? '')) return false;
    if (destinos.length && !destinos.includes(r.destino ?? '')) return false;
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

export function FabVendasTab() {
  const { data = [], isLoading, isError, refetch, isFetching } = useJfVendas();

  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [busca, setBusca] = useState('');
  const [tipos, setTipos] = useState<string[]>([]);
  const [subtipos, setSubtipos] = useState<string[]>([]);
  const [pedras, setPedras] = useState<string[]>([]);
  const [lapidacoes, setLapidacoes] = useState<string[]>([]);
  const [destinos, setDestinos] = useState<string[]>([]);
  const [sorting, setSorting] = useState<SortingState>([{ id: 'data_venda', desc: true }]);

  const dateSearchFiltered = useMemo(() => {
    return data.filter(r => {
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
    () => applyDimFilters(dateSearchFiltered, tipos, subtipos, pedras, lapidacoes, destinos),
    [dateSearchFiltered, tipos, subtipos, pedras, lapidacoes, destinos],
  );

  const availTipos = useMemo(
    () => uniqStrings(applyDimFilters(dateSearchFiltered, [], subtipos, pedras, lapidacoes, destinos), 'tipo'),
    [dateSearchFiltered, subtipos, pedras, lapidacoes, destinos],
  );
  const availSubtipos = useMemo(
    () => uniqStrings(applyDimFilters(dateSearchFiltered, tipos, [], pedras, lapidacoes, destinos), 'subtipo'),
    [dateSearchFiltered, tipos, pedras, lapidacoes, destinos],
  );
  const availPedras = useMemo(
    () => uniqStrings(applyDimFilters(dateSearchFiltered, tipos, subtipos, [], lapidacoes, destinos), 'tipo_pedra'),
    [dateSearchFiltered, tipos, subtipos, lapidacoes, destinos],
  );
  const availLapidacoes = useMemo(
    () => uniqStrings(applyDimFilters(dateSearchFiltered, tipos, subtipos, pedras, [], destinos), 'lapidacao'),
    [dateSearchFiltered, tipos, subtipos, pedras, destinos],
  );
  const availDestinos = useMemo(
    () => uniqStrings(applyDimFilters(dateSearchFiltered, tipos, subtipos, pedras, lapidacoes, []), 'destino'),
    [dateSearchFiltered, tipos, subtipos, pedras, lapidacoes],
  );

  const totalFaturamento = useMemo(
    () => filtered.reduce((s, r) => s + (r.preco_cobrado ?? 0), 0),
    [filtered],
  );

  const hasFilters = tipos.length > 0 || subtipos.length > 0 || pedras.length > 0 ||
    lapidacoes.length > 0 || destinos.length > 0 || !!busca || !!from || !!to;

  function clearAll() {
    setTipos([]); setSubtipos([]); setPedras([]); setLapidacoes([]); setDestinos([]);
    setBusca(''); setFrom(''); setTo('');
  }

  const inputCls = 'px-3 py-1.5 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-white/[0.08] rounded-lg text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-indigo-500 transition-colors';

  const columns: ColumnDef<JfVendasItem>[] = [
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
          <span className="text-[11px] font-mono bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">
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

  if (isError) {
    return (
      <div className="flex items-center justify-center min-h-48">
        <div className="text-red-600 dark:text-red-400 text-sm">
          Erro ao carregar dados de vendas.{' '}
          <button onClick={() => refetch()} className="underline hover:no-underline">
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  const dimDefs = [
    { label: 'Tipo',      avail: availTipos,      sel: tipos,      set: setTipos },
    { label: 'Subtipo',   avail: availSubtipos,   sel: subtipos,   set: setSubtipos },
    { label: 'Pedra',     avail: availPedras,     sel: pedras,     set: setPedras },
    { label: 'Lapidação', avail: availLapidacoes, sel: lapidacoes, set: setLapidacoes },
    { label: 'Destino',   avail: availDestinos,   sel: destinos,   set: setDestinos },
  ];

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.06] rounded-xl p-4 space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">De</label>
            <input type="date" value={from} onChange={e => setFrom(e.target.value)} className={inputCls} />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">Até</label>
            <input type="date" value={to} onChange={e => setTo(e.target.value)} className={inputCls} />
          </div>
          <input
            type="text"
            placeholder="Buscar referência ou produto…"
            value={busca}
            onChange={e => setBusca(e.target.value)}
            className={`flex-1 min-w-[200px] ${inputCls} placeholder:text-zinc-400`}
          />
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-sm text-zinc-500 dark:text-zinc-400">
              <span className="font-semibold text-zinc-900 dark:text-zinc-100">{filtered.length}</span> vendas
              {' · '}
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">{fmtMoeda(totalFaturamento)}</span>
            </span>
            {hasFilters && (
              <button
                onClick={clearAll}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-white/[0.06] rounded-lg hover:border-red-400 hover:text-red-500 transition-colors"
              >
                <X size={12} /> Limpar
              </button>
            )}
            <button
              onClick={() => downloadCSV(filtered, 'jf')}
              disabled={filtered.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-white/[0.06] rounded-lg hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors disabled:opacity-40"
            >
              <Download size={13} /> CSV
            </button>
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="p-1.5 text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-white/[0.06] rounded-lg hover:border-indigo-500 transition-colors disabled:opacity-50"
            >
              <RefreshCw size={13} className={isFetching ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {dimDefs.some(d => d.avail.length > 0) && (
          <div className="space-y-2 pt-1 border-t border-zinc-100 dark:border-white/[0.04]">
            {dimDefs.filter(d => d.avail.length > 0).map(d => (
              <div key={d.label} className="flex items-start gap-3">
                <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 pt-1 min-w-[64px] shrink-0">
                  {d.label}
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {d.avail.map(v => (
                    <button
                      key={v}
                      onClick={() => d.set(toggle(d.sel, v))}
                      className={`px-2.5 py-0.5 rounded text-xs font-medium transition-colors ${
                        d.sel.includes(v)
                          ? 'bg-indigo-600 text-white'
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                      }`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.06] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ minWidth: '1400px' }}>
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
