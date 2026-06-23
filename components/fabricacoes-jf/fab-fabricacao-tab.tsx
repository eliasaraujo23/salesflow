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
import { type JfDashboardFeed } from '@/lib/actions/fetch-jf-dashboard';

type JfPeca = JfDashboardFeed['emFabricacao'][number];
type StringField = 'tipo' | 'produto' | 'subtipo' | 'destino_manutencao' | 'destino' | 'tipo_pedra' | 'lapidacao';

const fmtMoeda = (v: number): string =>
  v > 0 ? v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }) : '—';

const fmtDate = (s: string | null | undefined): string => {
  if (!s) return '—';
  const d = new Date(s);
  return isNaN(d.getTime()) ? s : d.toLocaleDateString('pt-BR');
};

function downloadCSV(rows: JfPeca[]) {
  const hdr = ['Ref','Tipo','Produto','Subtipo','Pedra','Lapidação','Dest. Manut.','Envio Fab.','Dias','Custo'];
  const esc = (v: string | number | null | undefined) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = [
    hdr.join(','),
    ...rows.map(r => [
      r.referencia, r.tipo, r.produto, r.subtipo, r.tipo_pedra, r.lapidacao,
      r.destino_manutencao, fmtDate(r.data_envio_fabricacao), r.dias,
      r.custo_real > 0 ? r.custo_real.toFixed(2) : '',
    ].map(esc).join(',')),
  ].join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'jf-fabricacao.csv'; a.click();
  URL.revokeObjectURL(url);
}

function uniqStrings(rows: JfPeca[], field: StringField): string[] {
  return [...new Set(rows.map(r => r[field]).filter((v): v is string => v != null && v !== ''))].sort();
}

function applyDimFilters(
  rows: JfPeca[],
  tipos: string[], produtos: string[], subtipos: string[], destManut: string[],
  destinos: string[], pedras: string[], lapidacoes: string[],
): JfPeca[] {
  return rows.filter(r => {
    if (tipos.length    && !tipos.includes(r.tipo ?? ''))                   return false;
    if (produtos.length && !produtos.includes(r.produto ?? ''))             return false;
    if (subtipos.length && !subtipos.includes(r.subtipo ?? ''))             return false;
    if (destManut.length && !destManut.includes(r.destino_manutencao ?? '')) return false;
    if (destinos.length && !destinos.includes(r.destino ?? ''))             return false;
    if (pedras.length   && !pedras.includes(r.tipo_pedra ?? ''))            return false;
    if (lapidacoes.length && !lapidacoes.includes(r.lapidacao ?? ''))       return false;
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

function diasBadgeCls(d: number): string {
  if (d <= 15) return 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30';
  if (d <= 30) return 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30';
  if (d <= 60) return 'bg-orange-500/15 text-orange-500 dark:text-orange-400 border border-orange-500/30';
  return 'bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30';
}

interface FabFabricacaoTabProps {
  pecas: JfPeca[];
}

export function FabFabricacaoTab({ pecas }: FabFabricacaoTabProps) {
  const [busca, setBusca] = useState('');
  const [tipos, setTipos]         = useState<string[]>([]);
  const [produtos, setProdutos]   = useState<string[]>([]);
  const [subtipos, setSubtipos]   = useState<string[]>([]);
  const [destManut, setDestManut] = useState<string[]>([]);
  const [destinos, setDestinos]   = useState<string[]>([]);
  const [pedras, setPedras]       = useState<string[]>([]);
  const [lapidacoes, setLapidacoes] = useState<string[]>([]);
  const [sorting, setSorting]     = useState<SortingState>([{ id: 'dias', desc: true }]);

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

  const availTipos      = useMemo(() => uniqStrings(applyDimFilters(buscaFiltered, [],     produtos, subtipos, destManut, destinos, pedras,    lapidacoes), 'tipo'),               [buscaFiltered, produtos, subtipos, destManut, destinos, pedras, lapidacoes]);
  const availProdutos   = useMemo(() => uniqStrings(applyDimFilters(buscaFiltered, tipos,  [],       subtipos, destManut, destinos, pedras,    lapidacoes), 'produto'),             [buscaFiltered, tipos, subtipos, destManut, destinos, pedras, lapidacoes]);
  const availSubtipos   = useMemo(() => uniqStrings(applyDimFilters(buscaFiltered, tipos,  produtos, [],       destManut, destinos, pedras,    lapidacoes), 'subtipo'),             [buscaFiltered, tipos, produtos, destManut, destinos, pedras, lapidacoes]);
  const availDestManut  = useMemo(() => uniqStrings(applyDimFilters(buscaFiltered, tipos,  produtos, subtipos, [],        destinos, pedras,    lapidacoes), 'destino_manutencao'),  [buscaFiltered, tipos, produtos, subtipos, destinos, pedras, lapidacoes]);
  const availDestinos   = useMemo(() => uniqStrings(applyDimFilters(buscaFiltered, tipos,  produtos, subtipos, destManut, [],       pedras,    lapidacoes), 'destino'),             [buscaFiltered, tipos, produtos, subtipos, destManut, pedras, lapidacoes]);
  const availPedras     = useMemo(() => uniqStrings(applyDimFilters(buscaFiltered, tipos,  produtos, subtipos, destManut, destinos, [],        lapidacoes), 'tipo_pedra'),          [buscaFiltered, tipos, produtos, subtipos, destManut, destinos, lapidacoes]);
  const availLapidacoes = useMemo(() => uniqStrings(applyDimFilters(buscaFiltered, tipos,  produtos, subtipos, destManut, destinos, pedras,    []),         'lapidacao'),           [buscaFiltered, tipos, produtos, subtipos, destManut, destinos, pedras]);

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

  const columns: ColumnDef<JfPeca>[] = [
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
        return (
          <span className={`inline-block text-[11px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${diasBadgeCls(d)}`}>
            {d}d
          </span>
        );
      },
    },
    {
      accessorKey: 'custo_real',
      header: 'Custo',
      cell: ({ getValue }) => (
        <span className="text-xs text-zinc-700 dark:text-zinc-300 whitespace-nowrap tabular-nums">
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
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.06] rounded-xl overflow-hidden">
      {/* Filter panel — surface2 background, inside the card */}
      {/* Filter panel — scrolls horizontally on mobile */}
      <div className="overflow-x-auto border-b-2 border-zinc-200 dark:border-white/[0.08]">
      <div
        className="flex items-stretch bg-zinc-50 dark:bg-zinc-800/50"
        style={{ maxHeight: '158px', minWidth: 'max-content' }}
      >
        {/* Search column */}
        <div className="flex-none flex flex-col justify-center gap-1.5 px-3 py-2 border-r border-zinc-200 dark:border-white/[0.06]" style={{ minWidth: '145px', maxWidth: '175px' }}>
          <span className="text-[9px] font-black uppercase tracking-[0.9px] text-zinc-400 dark:text-zinc-500">Buscar</span>
          <input
            type="text"
            placeholder="Ref ou produto…"
            value={busca}
            onChange={e => setBusca(e.target.value)}
            className="w-full px-2.5 py-1 text-[12px] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.08] rounded text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-indigo-500 transition-colors placeholder:text-zinc-400"
          />
        </div>

        {/* Filter columns */}
        {dimDefs.filter(d => d.avail.length > 0).map(d => (
          <div key={d.label} className="flex flex-col overflow-hidden border-r border-zinc-200 dark:border-white/[0.06]" style={{ flex: '1 1 0', minWidth: '86px' }}>
            <span className="block px-2 py-1 text-[9px] font-black uppercase tracking-[0.9px] text-zinc-400 dark:text-zinc-500 border-b border-zinc-200 dark:border-white/[0.06] flex-shrink-0 bg-zinc-100/50 dark:bg-zinc-800/80">
              {d.label}
            </span>
            <div className="overflow-y-auto flex-1 py-0.5">
              {d.avail.map(v => (
                <label
                  key={v}
                  className={`flex items-center gap-1.5 px-2 py-0.5 cursor-pointer text-[11.5px] leading-[1.6] transition-colors select-none ${
                    d.sel.includes(v)
                      ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-500/[0.13] font-medium'
                      : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-indigo-500/[0.07]'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={d.sel.includes(v)}
                    onChange={() => d.set(toggle(d.sel, v))}
                    className="w-3 h-3 accent-indigo-600 cursor-pointer flex-shrink-0"
                  />
                  {v}
                </label>
              ))}
            </div>
          </div>
        ))}

        {/* Right panel — count + actions */}
        <div className="flex-none flex flex-col items-center justify-center gap-2 px-3 py-2" style={{ minWidth: '68px' }}>
          <div className="text-center">
            <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 leading-none">{filtered.length}</div>
            <div className="text-[9px] font-semibold uppercase tracking-[0.5px] text-zinc-400 dark:text-zinc-500 mt-0.5">itens</div>
          </div>
          {hasFilters && (
            <button
              onClick={() => { setTipos([]); setProdutos([]); setSubtipos([]); setDestManut([]); setDestinos([]); setPedras([]); setLapidacoes([]); setBusca(''); }}
              className="flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-white/[0.06] rounded hover:border-red-400 hover:text-red-500 transition-colors"
            >
              <X size={10} /> Limpar
            </button>
          )}
          <button
            onClick={() => downloadCSV(filtered)}
            disabled={filtered.length === 0}
            className="flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-white/[0.06] rounded hover:border-emerald-500 hover:text-emerald-600 transition-colors disabled:opacity-40"
          >
            <Download size={12} /> CSV
          </button>
        </div>
      </div>
      </div>{/* end overflow-x-auto filter wrapper */}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full" style={{ minWidth: '1000px', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            {table.getHeaderGroups().map(hg => (
              <tr key={hg.id} className="border-b-2 border-zinc-200 dark:border-white/[0.06] bg-zinc-50 dark:bg-zinc-800/60">
                {hg.headers.map(h => {
                  const canSort = h.column.getCanSort();
                  const sorted = h.column.getIsSorted();
                  return (
                    <th
                      key={h.id}
                      onClick={canSort ? h.column.getToggleSortingHandler() : undefined}
                      className={`px-3.5 py-2.5 text-center text-[11px] font-semibold uppercase tracking-[0.5px] text-zinc-500 dark:text-zinc-400 whitespace-nowrap border-r border-zinc-200 dark:border-white/[0.06] last:border-r-0 ${canSort ? 'cursor-pointer select-none hover:text-indigo-600 dark:hover:text-indigo-400' : ''}`}
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
            {table.getRowModel().rows.map((row, i) => (
              <tr
                key={row.id}
                className={`hover:bg-indigo-50/50 dark:hover:bg-indigo-500/[0.05] transition-colors ${
                  i % 2 === 1 ? 'bg-zinc-50/80 dark:bg-zinc-800/20' : ''
                }`}
              >
                {row.getVisibleCells().map(cell => (
                  <td key={cell.id} className="px-3.5 py-2.5 text-center border-b border-r border-zinc-100 dark:border-white/[0.04] last:border-r-0">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="p-10 text-center text-zinc-500 dark:text-zinc-400 text-sm">
            {pecas.length === 0 ? 'Nenhuma peça em fabricação' : 'Nenhum item para os filtros selecionados'}
          </div>
        )}
      </div>
    </div>
  );
}
