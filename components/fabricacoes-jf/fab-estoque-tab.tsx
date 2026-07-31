'use client';

import { useState, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  type SortingState,
  flexRender,
  type ColumnDef,
} from '@tanstack/react-table';
import { Download, RefreshCw, X, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { useJfEstoque } from '@/hooks/use-jf-estoque';
import { type JfEstoqueItem } from '@/lib/actions/fetch-jf-estoque';

const fmtMoeda = (v: number | null | undefined): string => {
  if (v == null || isNaN(v)) return '—';
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
};

function downloadCSV(rows: JfEstoqueItem[]) {
  const hdr = [
    'Referência','Tipo','Produto','Subtipo','Pedra','Lapidação','Destino','Fabricante','Certificada','Nº Certificado',
    'Peso(g)','Custo(R$)','Preço Cobrado(R$)',
    'Diamantes','Cts Diam.','Pedra Colorida','Cts PC',
  ];
  const esc = (v: string | number | null | undefined) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = [
    hdr.join(','),
    ...rows.map(r => [
      r.referencia, r.tipo, r.produto, r.subtipo, r.tipo_pedra, r.lapidacao, r.destino, r.fabricante,
      r.certificada,
      r.certificada?.toUpperCase() === 'SIM' ? (r.numero_certificado ?? '') : '',
      r.peso > 0 ? r.peso.toFixed(2) : '',
      r.custo_real > 0 ? r.custo_real.toFixed(2) : '',
      r.preco_cobrado != null ? r.preco_cobrado.toFixed(2) : '',
      r.diamantes, r.cts_diamantes, r.pedra_colorida, r.cts_pedra_colorida,
    ].map(esc).join(',')),
  ].join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'jf-estoque.csv'; a.click();
  URL.revokeObjectURL(url);
}

type StringField = 'tipo' | 'produto' | 'subtipo' | 'destino' | 'tipo_pedra' | 'lapidacao' | 'fabricante' | 'certificada';

function uniqStrings(rows: JfEstoqueItem[], field: StringField): string[] {
  return [...new Set(rows.map(r => r[field]).filter((v): v is string => v != null && v !== ''))].sort();
}

function applyDimFilters(
  rows: JfEstoqueItem[],
  tipos: string[], produtos: string[], subtipos: string[],
  destinos: string[], pedras: string[], lapidacoes: string[],
  fabricantes: string[], certificadas: string[],
): JfEstoqueItem[] {
  return rows.filter(r => {
    if (tipos.length        && !tipos.includes(r.tipo ?? ''))           return false;
    if (produtos.length     && !produtos.includes(r.produto ?? ''))      return false;
    if (subtipos.length     && !subtipos.includes(r.subtipo ?? ''))      return false;
    if (destinos.length     && !destinos.includes(r.destino ?? ''))      return false;
    if (pedras.length       && !pedras.includes(r.tipo_pedra ?? ''))     return false;
    if (lapidacoes.length   && !lapidacoes.includes(r.lapidacao ?? ''))  return false;
    if (fabricantes.length  && !fabricantes.includes(r.fabricante ?? '')) return false;
    if (certificadas.length && !certificadas.includes(r.certificada ?? '')) return false;
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

export function FabEstoqueTab() {
  const { data = [], isLoading, isError, refetch, isFetching } = useJfEstoque();

  const [busca, setBusca]           = useState('');
  const [tipos, setTipos]           = useState<string[]>([]);
  const [produtos, setProdutos]     = useState<string[]>([]);
  const [subtipos, setSubtipos]     = useState<string[]>([]);
  const [destinos, setDestinos]     = useState<string[]>([]);
  const [pedras, setPedras]         = useState<string[]>([]);
  const [lapidacoes, setLapidacoes]   = useState<string[]>([]);
  const [fabricantes, setFabricantes]   = useState<string[]>([]);
  const [certificadas, setCertificadas] = useState<string[]>([]);
  const [sorting, setSorting]         = useState<SortingState>([{ id: 'custo_real', desc: true }]);

  const buscaFiltered = useMemo(() => {
    if (!busca) return data;
    const q = busca.toLowerCase();
    return data.filter(r =>
      r.referencia.toLowerCase().includes(q) || (r.produto ?? '').toLowerCase().includes(q),
    );
  }, [data, busca]);

  const filtered = useMemo(
    () => applyDimFilters(buscaFiltered, tipos, produtos, subtipos, destinos, pedras, lapidacoes, fabricantes, certificadas),
    [buscaFiltered, tipos, produtos, subtipos, destinos, pedras, lapidacoes, fabricantes, certificadas],
  );

  const availTipos        = useMemo(() => uniqStrings(applyDimFilters(buscaFiltered, [],    produtos, subtipos, destinos, pedras, lapidacoes, fabricantes, certificadas), 'tipo'),        [buscaFiltered, produtos, subtipos, destinos, pedras, lapidacoes, fabricantes, certificadas]);
  const availProdutos     = useMemo(() => uniqStrings(applyDimFilters(buscaFiltered, tipos, [],       subtipos, destinos, pedras, lapidacoes, fabricantes, certificadas), 'produto'),     [buscaFiltered, tipos, subtipos, destinos, pedras, lapidacoes, fabricantes, certificadas]);
  const availSubtipos     = useMemo(() => uniqStrings(applyDimFilters(buscaFiltered, tipos, produtos, [],       destinos, pedras, lapidacoes, fabricantes, certificadas), 'subtipo'),     [buscaFiltered, tipos, produtos, destinos, pedras, lapidacoes, fabricantes, certificadas]);
  const availDestinos     = useMemo(() => uniqStrings(applyDimFilters(buscaFiltered, tipos, produtos, subtipos, [],       pedras, lapidacoes, fabricantes, certificadas), 'destino'),     [buscaFiltered, tipos, produtos, subtipos, pedras, lapidacoes, fabricantes, certificadas]);
  const availPedras       = useMemo(() => uniqStrings(applyDimFilters(buscaFiltered, tipos, produtos, subtipos, destinos, [],     lapidacoes, fabricantes, certificadas), 'tipo_pedra'),  [buscaFiltered, tipos, produtos, subtipos, destinos, lapidacoes, fabricantes, certificadas]);
  const availLapidacoes   = useMemo(() => uniqStrings(applyDimFilters(buscaFiltered, tipos, produtos, subtipos, destinos, pedras, [],         fabricantes, certificadas), 'lapidacao'),   [buscaFiltered, tipos, produtos, subtipos, destinos, pedras, fabricantes, certificadas]);
  const availFabricantes  = useMemo(() => uniqStrings(applyDimFilters(buscaFiltered, tipos, produtos, subtipos, destinos, pedras, lapidacoes, [],          certificadas), 'fabricante'),  [buscaFiltered, tipos, produtos, subtipos, destinos, pedras, lapidacoes, certificadas]);


  const hasFilters = tipos.length > 0 || produtos.length > 0 || subtipos.length > 0 ||
    destinos.length > 0 || pedras.length > 0 || lapidacoes.length > 0 ||
    fabricantes.length > 0 || certificadas.length > 0 || !!busca;

  function clearAll() {
    setTipos([]); setProdutos([]); setSubtipos([]);
    setDestinos([]); setPedras([]); setLapidacoes([]);
    setFabricantes([]); setCertificadas([]); setBusca('');
  }

  const SortBtn = ({ column, label }: { column: { toggleSorting: () => void; getIsSorted: () => false | 'asc' | 'desc' }; label: string }) => (
    <button className="flex items-center justify-center gap-1 w-full text-[11px] font-semibold text-zinc-500 dark:text-zinc-400" onClick={() => column.toggleSorting()}>
      {label} <SortIcon dir={column.getIsSorted()} />
    </button>
  );

  const columns: ColumnDef<JfEstoqueItem>[] = [
    {
      accessorKey: 'referencia',
      header: ({ column }) => <SortBtn column={column} label="Ref" />,
      cell: ({ getValue }) => (
        <span className="font-mono text-xs text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
          {getValue<string>()}
        </span>
      ),
    },
    {
      accessorKey: 'tipo',
      header: ({ column }) => <SortBtn column={column} label="Tipo" />,
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
      header: ({ column }) => <SortBtn column={column} label="Produto" />,
      cell: ({ getValue }) => (
        <span className="text-xs text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
          {getValue<string | null | undefined>() ?? '—'}
        </span>
      ),
    },
    {
      accessorKey: 'subtipo',
      header: ({ column }) => <SortBtn column={column} label="Subtipo" />,
      cell: ({ getValue }) => (
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          {getValue<string | null | undefined>() ?? '—'}
        </span>
      ),
    },
    {
      accessorKey: 'tipo_pedra',
      header: ({ column }) => <SortBtn column={column} label="Tipo Pedra" />,
      cell: ({ row }) => (
        <div className="text-center">
          <div className="text-xs text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
            {row.original.tipo_pedra ?? '—'}
          </div>
          {row.original.lapidacao && (
            <div className="text-[10px] text-zinc-400 dark:text-zinc-500">{row.original.lapidacao}</div>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'lapidacao',
      header: ({ column }) => <SortBtn column={column} label="Lapidação" />,
      cell: ({ getValue }) => (
        <span className="text-xs text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
          {getValue<string | null | undefined>() ?? '—'}
        </span>
      ),
    },
    {
      accessorKey: 'destino',
      header: ({ column }) => <SortBtn column={column} label="Destino" />,
      cell: ({ getValue }) => (
        <span className="text-xs text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
          {getValue<string | null | undefined>() ?? '—'}
        </span>
      ),
    },
    {
      accessorKey: 'fabricante',
      header: ({ column }) => <SortBtn column={column} label="Fabricante" />,
      cell: ({ getValue }) => (
        <span className="text-xs text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
          {getValue<string | null | undefined>() ?? '—'}
        </span>
      ),
    },
    {
      accessorKey: 'certificada',
      header: ({ column }) => <SortBtn column={column} label="Certificada" />,
      cell: ({ row }) => {
        const cert = row.original.certificada;
        const num  = row.original.numero_certificado;
        const isSim = cert?.toUpperCase() === 'SIM';
        return (
          <div className="text-center">
            <span className={`text-xs font-medium ${isSim ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-400 dark:text-zinc-500'}`}>
              {cert ?? '—'}
            </span>
            {isSim && num && (
              <div className="text-[10px] text-zinc-400 dark:text-zinc-500 whitespace-nowrap">{num}</div>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'peso',
      header: ({ column }) => (
        <button className="flex items-center justify-center gap-1 w-full text-[11px] font-semibold text-zinc-500 dark:text-zinc-400" onClick={() => column.toggleSorting()}>
          Peso <SortIcon dir={column.getIsSorted()} />
        </button>
      ),
      cell: ({ getValue }) => {
        const v = getValue<number>();
        return (
          <span className="text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">
            {v > 0 ? v.toFixed(2) + 'g' : '—'}
          </span>
        );
      },
    },
    {
      accessorKey: 'custo_real',
      header: ({ column }) => (
        <button className="flex items-center justify-center gap-1 w-full text-[11px] font-semibold text-zinc-500 dark:text-zinc-400" onClick={() => column.toggleSorting()}>
          Custo <SortIcon dir={column.getIsSorted()} />
        </button>
      ),
      cell: ({ getValue }) => (
        <span className="text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">{fmtMoeda(getValue<number>())}</span>
      ),
    },
    {
      accessorKey: 'preco_cobrado',
      header: ({ column }) => (
        <button className="flex items-center justify-center gap-1 w-full text-[11px] font-semibold text-zinc-500 dark:text-zinc-400" onClick={() => column.toggleSorting()}>
          Preço Cobrado <SortIcon dir={column.getIsSorted()} />
        </button>
      ),
      cell: ({ getValue }) => (
        <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
          {fmtMoeda(getValue<number | null>())}
        </span>
      ),
    },
    {
      accessorKey: 'diamantes',
      header: ({ column }) => <SortBtn column={column} label="Diamantes" />,
      cell: ({ getValue }) => (
        <span className="text-xs text-zinc-500 dark:text-zinc-400 max-w-[120px] truncate block">
          {getValue<string | null | undefined>() ?? '—'}
        </span>
      ),
    },
    {
      accessorKey: 'cts_diamantes',
      header: ({ column }) => <SortBtn column={column} label="Cts Diam." />,
      cell: ({ getValue }) => (
        <span className="text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">
          {getValue<number | null | undefined>() ?? '—'}
        </span>
      ),
    },
    {
      accessorKey: 'pedra_colorida',
      header: ({ column }) => <SortBtn column={column} label="Pedra Color." />,
      cell: ({ getValue }) => (
        <span className="text-xs text-zinc-500 dark:text-zinc-400 max-w-[120px] truncate block">
          {getValue<string | null | undefined>() ?? '—'}
        </span>
      ),
    },
    {
      accessorKey: 'cts_pedra_colorida',
      header: ({ column }) => <SortBtn column={column} label="Cts PC" />,
      cell: ({ getValue }) => (
        <span className="text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">
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

  const dimDefs = [
    { label: 'Tipo',         avail: availTipos,        sel: tipos,        set: setTipos },
    { label: 'Produto',      avail: availProdutos,     sel: produtos,     set: setProdutos },
    { label: 'Subtipo',      avail: availSubtipos,     sel: subtipos,     set: setSubtipos },
    { label: 'Destino',      avail: availDestinos,     sel: destinos,     set: setDestinos },
    { label: 'Tipo Pedra',   avail: availPedras,       sel: pedras,       set: setPedras },
    { label: 'Lapidação',    avail: availLapidacoes,   sel: lapidacoes,   set: setLapidacoes },
    { label: 'Fabricante',   avail: availFabricantes,  sel: fabricantes,  set: setFabricantes },
    { label: 'Certificada',  avail: ['SIM', 'NÃO'],    sel: certificadas, set: setCertificadas },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-48">
        <div className="text-zinc-500 dark:text-zinc-400 text-sm flex items-center gap-2">
          <RefreshCw size={16} className="animate-spin" />
          Carregando estoque…
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center min-h-48">
        <div className="text-red-600 dark:text-red-400 text-sm">
          Erro ao carregar estoque.{' '}
          <button onClick={() => refetch()} className="underline hover:no-underline">
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.13] rounded-xl overflow-hidden">
      {/* Card header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 dark:border-white/[0.13]">
        <span className="text-[13px] font-semibold text-zinc-900 dark:text-zinc-100">Estoque Disponível</span>
        <div className="flex items-center gap-3">
          <span className="text-xs bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 px-2.5 py-1 rounded-full font-semibold">
            {filtered.length}
          </span>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-1.5 text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-white/[0.13] rounded hover:border-indigo-500 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={13} className={isFetching ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Filter panel */}
      {/* Filter panel — scrolls horizontally on mobile */}
      <div className="overflow-x-auto border-b-2 border-zinc-200 dark:border-white/[0.08]">
      <div
        className="flex items-stretch bg-zinc-50 dark:bg-zinc-800/50"
        style={{ maxHeight: '158px', minWidth: 'max-content' }}
      >
        {/* Search column */}
        <div className="flex-none flex flex-col justify-center gap-1.5 px-3 py-2 border-r border-zinc-200 dark:border-white/[0.13]" style={{ minWidth: '145px', maxWidth: '175px' }}>
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
          <div key={d.label} className="flex flex-col overflow-hidden border-r border-zinc-200 dark:border-white/[0.13]" style={{ flex: '1 1 0', minWidth: '86px' }}>
            <span className="block px-2 py-1 text-[9px] font-black uppercase tracking-[0.9px] text-zinc-400 dark:text-zinc-500 border-b border-zinc-200 dark:border-white/[0.13] flex-shrink-0 bg-zinc-100/50 dark:bg-zinc-800/80">
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

        {/* Right panel */}
        <div className="flex-none flex flex-col items-center justify-center gap-2 px-3 py-2" style={{ minWidth: '68px' }}>
          <div className="text-center">
            <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 leading-none">{filtered.length}</div>
            <div className="text-[9px] font-semibold uppercase tracking-[0.5px] text-zinc-400 dark:text-zinc-500 mt-0.5">itens</div>
          </div>
          {hasFilters && (
            <button
              onClick={clearAll}
              className="flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-white/[0.13] rounded hover:border-red-400 hover:text-red-500 transition-colors"
            >
              <X size={10} /> Limpar
            </button>
          )}
          <button
            onClick={() => downloadCSV(filtered)}
            disabled={filtered.length === 0}
            className="flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-white/[0.13] rounded hover:border-emerald-500 hover:text-emerald-600 transition-colors disabled:opacity-40"
          >
            <Download size={12} /> CSV
          </button>
        </div>
      </div>
      </div>{/* end overflow-x-auto filter wrapper */}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full data-table" style={{ minWidth: '1300px', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            {table.getHeaderGroups().map(hg => (
              <tr key={hg.id} className="border-b-2 border-zinc-200 dark:border-white/[0.13] bg-zinc-50 dark:bg-zinc-800/60">
                {hg.headers.map(h => (
                  <th key={h.id} className="px-3.5 py-2.5 text-center text-[11px] font-semibold uppercase tracking-[0.5px] text-zinc-500 dark:text-zinc-400 whitespace-nowrap border-r border-zinc-200 dark:border-white/[0.13] last:border-r-0">
                    {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                  </th>
                ))}
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
            {data.length === 0 ? 'Nenhum item em estoque' : 'Nenhum item para os filtros selecionados'}
          </div>
        )}
      </div>
    </div>
  );
}
