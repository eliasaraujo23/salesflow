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
import { Download, X, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { type JmPeca } from '@/lib/actions/fetch-jm-dashboard';

type StringField = 'tipo' | 'produto' | 'subtipo' | 'destino_manutencao' | 'destino' | 'tipo_pedra' | 'lapidacao';

const fmtMoeda = (v: number): string =>
  v > 0 ? v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }) : '—';

const fmtDate = (s: string | null | undefined): string => {
  if (!s) return '—';
  const d = new Date(s);
  return isNaN(d.getTime()) ? s : d.toLocaleDateString('pt-BR');
};

function downloadCSV(rows: JmPeca[]) {
  const hdr = ['Ref','Tipo','Produto','Subtipo','Pedra','Lapidação','Dest. Manut.','Envio Fab.','Dias','Peso(g)','Custo'];
  const esc = (v: string | number | null | undefined) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = [
    hdr.join(','),
    ...rows.map(r => [
      r.referencia, r.tipo, r.produto, r.subtipo, r.tipo_pedra, r.lapidacao,
      r.destino_manutencao, fmtDate(r.data_envio_fabricacao), r.dias,
      r.peso > 0 ? r.peso.toFixed(2) : '',
      r.custo_real > 0 ? r.custo_real.toFixed(2) : '',
    ].map(esc).join(',')),
  ].join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'jm-modificacao.csv'; a.click();
  URL.revokeObjectURL(url);
}

function uniqStrings(rows: JmPeca[], field: StringField): string[] {
  return [...new Set(rows.map(r => r[field]).filter((v): v is string => v != null && v !== ''))].sort();
}

function applyDimFilters(
  rows: JmPeca[],
  tipos: string[], produtos: string[], subtipos: string[], destManut: string[],
  destinos: string[], pedras: string[], lapidacoes: string[],
): JmPeca[] {
  return rows.filter(r => {
    if (tipos.length     && !tipos.includes(r.tipo ?? ''))                   return false;
    if (produtos.length  && !produtos.includes(r.produto ?? ''))             return false;
    if (subtipos.length  && !subtipos.includes(r.subtipo ?? ''))             return false;
    if (destManut.length && !destManut.includes(r.destino_manutencao ?? '')) return false;
    if (destinos.length  && !destinos.includes(r.destino ?? ''))             return false;
    if (pedras.length    && !pedras.includes(r.tipo_pedra ?? ''))            return false;
    if (lapidacoes.length && !lapidacoes.includes(r.lapidacao ?? ''))        return false;
    return true;
  });
}

function toggle(arr: string[], v: string): string[] {
  return arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v];
}

type SortDir = 'asc' | 'desc' | false;
function SortIcon({ dir }: { dir: SortDir }) {
  if (dir === 'asc')  return <ArrowUp size={11} />;
  if (dir === 'desc') return <ArrowDown size={11} />;
  return <ArrowUpDown size={11} className="opacity-40" />;
}

function diasCls(d: number): string {
  if (d <= 15) return 'text-emerald-600 dark:text-emerald-400';
  if (d <= 30) return 'text-amber-600 dark:text-amber-400';
  if (d <= 60) return 'text-orange-500 dark:text-orange-400';
  return 'text-red-600 dark:text-red-400';
}

const inputCls = 'px-3 py-1.5 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-white/[0.08] rounded-lg text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-indigo-500 transition-colors placeholder:text-zinc-400';

interface JmModificacaoTabProps {
  pecas: JmPeca[];
}

export function JmModificacaoTab({ pecas }: JmModificacaoTabProps) {
  const [busca, setBusca]           = useState('');
  const [tipos, setTipos]           = useState<string[]>([]);
  const [produtos, setProdutos]     = useState<string[]>([]);
  const [subtipos, setSubtipos]     = useState<string[]>([]);
  const [destManut, setDestManut]   = useState<string[]>([]);
  const [destinos, setDestinos]     = useState<string[]>([]);
  const [pedras, setPedras]         = useState<string[]>([]);
  const [lapidacoes, setLapidacoes] = useState<string[]>([]);
  const [sorting, setSorting]       = useState<SortingState>([{ id: 'dias', desc: true }]);

  const buscaFiltered = useMemo(() => {
    if (!busca) return pecas;
    const q = busca.toLowerCase();
    return pecas.filter(p =>
      p.referencia.toLowerCase().includes(q) || (p.produto ?? '').toLowerCase().includes(q),
    );
  }, [pecas, busca]);

  const filtered = useMemo(
    () => applyDimFilters(buscaFiltered, tipos, produtos, subtipos, destManut, destinos, pedras, lapidacoes),
    [buscaFiltered, tipos, produtos, subtipos, destManut, destinos, pedras, lapidacoes],
  );

  const availTipos      = useMemo(() => uniqStrings(applyDimFilters(buscaFiltered, [],    produtos, subtipos, destManut, destinos, pedras,    lapidacoes), 'tipo'),              [buscaFiltered, produtos, subtipos, destManut, destinos, pedras, lapidacoes]);
  const availProdutos   = useMemo(() => uniqStrings(applyDimFilters(buscaFiltered, tipos, [],       subtipos, destManut, destinos, pedras,    lapidacoes), 'produto'),            [buscaFiltered, tipos, subtipos, destManut, destinos, pedras, lapidacoes]);
  const availSubtipos   = useMemo(() => uniqStrings(applyDimFilters(buscaFiltered, tipos, produtos, [],       destManut, destinos, pedras,    lapidacoes), 'subtipo'),            [buscaFiltered, tipos, produtos, destManut, destinos, pedras, lapidacoes]);
  const availDestManut  = useMemo(() => uniqStrings(applyDimFilters(buscaFiltered, tipos, produtos, subtipos, [],        destinos, pedras,    lapidacoes), 'destino_manutencao'), [buscaFiltered, tipos, produtos, subtipos, destinos, pedras, lapidacoes]);
  const availDestinos   = useMemo(() => uniqStrings(applyDimFilters(buscaFiltered, tipos, produtos, subtipos, destManut, [],       pedras,    lapidacoes), 'destino'),            [buscaFiltered, tipos, produtos, subtipos, destManut, pedras, lapidacoes]);
  const availPedras     = useMemo(() => uniqStrings(applyDimFilters(buscaFiltered, tipos, produtos, subtipos, destManut, destinos, [],        lapidacoes), 'tipo_pedra'),         [buscaFiltered, tipos, produtos, subtipos, destManut, destinos, lapidacoes]);
  const availLapidacoes = useMemo(() => uniqStrings(applyDimFilters(buscaFiltered, tipos, produtos, subtipos, destManut, destinos, pedras,    []),         'lapidacao'),          [buscaFiltered, tipos, produtos, subtipos, destManut, destinos, pedras]);

  const hasFilters = !!busca || tipos.length > 0 || produtos.length > 0 || subtipos.length > 0 ||
    destManut.length > 0 || destinos.length > 0 || pedras.length > 0 || lapidacoes.length > 0;

  const dimDefs = [
    { label: 'Tipo',         avail: availTipos,      sel: tipos,      set: setTipos },
    { label: 'Produto',      avail: availProdutos,   sel: produtos,   set: setProdutos },
    { label: 'Subtipo',      avail: availSubtipos,   sel: subtipos,   set: setSubtipos },
    { label: 'Dest. Manut.', avail: availDestManut,  sel: destManut,  set: setDestManut },
    { label: 'Destino',      avail: availDestinos,   sel: destinos,   set: setDestinos },
    { label: 'Tipo Pedra',   avail: availPedras,     sel: pedras,     set: setPedras },
    { label: 'Lapidação',    avail: availLapidacoes, sel: lapidacoes, set: setLapidacoes },
  ];

  const columns: ColumnDef<JmPeca>[] = [
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
        return v
          ? <span className="text-[11px] font-mono bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-700 dark:text-zinc-300">{v}</span>
          : <span className="text-zinc-400">—</span>;
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
      cell: ({ getValue }) => (
        <span className="text-sm text-zinc-700 dark:text-zinc-300">
          {getValue<string | null | undefined>() ?? '—'}
        </span>
      ),
    },
    {
      accessorKey: 'lapidacao',
      header: 'Lapidação',
      cell: ({ getValue }) => (
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          {getValue<string | null | undefined>() ?? '—'}
        </span>
      ),
    },
    {
      accessorKey: 'destino_manutencao',
      header: 'Dest. Manut.',
      cell: ({ getValue }) => {
        const v = getValue<string | null | undefined>() ?? '';
        return v
          ? <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400">{v}</span>
          : <span className="text-zinc-400">—</span>;
      },
    },
    {
      accessorKey: 'data_envio_fabricacao',
      header: 'Envio Fab.',
      cell: ({ getValue }) => (
        <span className="text-xs text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
          {fmtDate(getValue<string | null | undefined>())}
        </span>
      ),
    },
    {
      accessorKey: 'dias',
      header: 'Dias',
      cell: ({ getValue }) => {
        const d = getValue<number>();
        return <span className={`text-xs font-bold whitespace-nowrap ${diasCls(d)}`}>{d}d</span>;
      },
    },
    {
      accessorKey: 'peso',
      header: 'Peso',
      cell: ({ getValue }) => {
        const v = getValue<number>();
        return <span className="text-xs text-zinc-500 dark:text-zinc-400">{v > 0 ? `${v.toFixed(2)}g` : '—'}</span>;
      },
    },
    {
      accessorKey: 'custo_real',
      header: 'Custo',
      cell: ({ getValue }) => (
        <span className="text-xs text-zinc-700 dark:text-zinc-300 whitespace-nowrap">
          {fmtMoeda(getValue<number>())}
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

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.06] rounded-xl p-4">
        <div className="flex items-start gap-4 overflow-x-auto pb-1">
          <div className="flex flex-col gap-1.5 shrink-0">
            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">Buscar</span>
            <input
              type="text"
              placeholder="Ref ou produto…"
              value={busca}
              onChange={e => setBusca(e.target.value)}
              className={`w-44 ${inputCls}`}
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
            {hasFilters && (
              <button
                onClick={() => {
                  setTipos([]); setProdutos([]); setSubtipos([]);
                  setDestManut([]); setDestinos([]); setPedras([]); setLapidacoes([]); setBusca('');
                }}
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
          <table className="w-full text-sm data-table" style={{ minWidth: '1100px' }}>
            <thead>
              {table.getHeaderGroups().map(hg => (
                <tr key={hg.id} className="border-b border-zinc-200 dark:border-white/[0.06] bg-zinc-50 dark:bg-zinc-800/60">
                  {hg.headers.map(h => {
                    const canSort = h.column.getCanSort();
                    const sorted = h.column.getIsSorted();
                    return (
                      <th
                        key={h.id}
                        onClick={canSort ? h.column.getToggleSortingHandler() : undefined}
                        className={`px-3 py-2.5 text-left text-xs font-semibold text-zinc-500 dark:text-zinc-400 whitespace-nowrap ${canSort ? 'cursor-pointer select-none hover:text-zinc-900 dark:hover:text-zinc-100' : ''}`}
                      >
                        <div className="flex items-center gap-1">
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
              {pecas.length === 0 ? 'Nenhuma peça em modificação' : 'Nenhum item para os filtros selecionados'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
