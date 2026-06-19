'use client';

import React, { useState, useMemo } from 'react';
import { X } from 'lucide-react';
import { type JfDashboardFeed } from '@/lib/actions/fetch-jf-dashboard';

type JfPeca = JfDashboardFeed['emFabricacao'][number];
type StringField = 'produto' | 'subtipo' | 'vendedor_interno' | 'destino' | 'tipo_pedra' | 'lapidacao';

function uniqStrings(rows: JfPeca[], field: StringField): string[] {
  return [...new Set(rows.map(r => r[field]).filter((v): v is string => v != null && v !== ''))].sort();
}

function applyDimFilters(
  rows: JfPeca[],
  produtos: string[], subtipos: string[], vendedores: string[],
  destinos: string[], pedras: string[], lapidacoes: string[],
): JfPeca[] {
  return rows.filter(r => {
    if (produtos.length && !produtos.includes(r.produto ?? '')) return false;
    if (subtipos.length && !subtipos.includes(r.subtipo ?? '')) return false;
    if (vendedores.length && !vendedores.includes(r.vendedor_interno ?? '')) return false;
    if (destinos.length && !destinos.includes(r.destino ?? '')) return false;
    if (pedras.length && !pedras.includes(r.tipo_pedra ?? '')) return false;
    if (lapidacoes.length && !lapidacoes.includes(r.lapidacao ?? '')) return false;
    return true;
  });
}

function toggle(arr: string[], v: string): string[] {
  return arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v];
}

function diasVariant(d: number): string {
  if (d <= 15) return 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400';
  if (d <= 30) return 'bg-amber-500/15 text-amber-600 dark:text-amber-400';
  if (d <= 60) return 'bg-orange-400/15 text-orange-400';
  return 'bg-red-500/15 text-red-600 dark:text-red-400';
}

const inputCls = 'px-3 py-1.5 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-white/[0.08] rounded-lg text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-indigo-500 transition-colors placeholder:text-zinc-400';

interface FabFabricacaoTabProps {
  pecas: JfPeca[];
}

export function FabFabricacaoTab({ pecas }: FabFabricacaoTabProps) {
  const [busca, setBusca] = useState('');
  const [produtos, setProdutos] = useState<string[]>([]);
  const [subtipos, setSubtipos] = useState<string[]>([]);
  const [vendedores, setVendedores] = useState<string[]>([]);
  const [destinos, setDestinos] = useState<string[]>([]);
  const [pedras, setPedras] = useState<string[]>([]);
  const [lapidacoes, setLapidacoes] = useState<string[]>([]);

  const buscaFiltered = useMemo(() => {
    if (!busca) return pecas;
    const q = busca.toLowerCase();
    return pecas.filter(p => p.referencia.toLowerCase().includes(q));
  }, [pecas, busca]);

  const filtered = useMemo(
    () => applyDimFilters(buscaFiltered, produtos, subtipos, vendedores, destinos, pedras, lapidacoes),
    [buscaFiltered, produtos, subtipos, vendedores, destinos, pedras, lapidacoes],
  );

  const availProdutos   = useMemo(() => uniqStrings(applyDimFilters(buscaFiltered, [],       subtipos,  vendedores, destinos, pedras, lapidacoes), 'produto'),          [buscaFiltered, subtipos,  vendedores, destinos, pedras, lapidacoes]);
  const availSubtipos   = useMemo(() => uniqStrings(applyDimFilters(buscaFiltered, produtos,  [],        vendedores, destinos, pedras, lapidacoes), 'subtipo'),           [buscaFiltered, produtos,  vendedores, destinos, pedras, lapidacoes]);
  const availVendedores = useMemo(() => uniqStrings(applyDimFilters(buscaFiltered, produtos,  subtipos,  [],         destinos, pedras, lapidacoes), 'vendedor_interno'),  [buscaFiltered, produtos,  subtipos,   destinos, pedras, lapidacoes]);
  const availDestinos   = useMemo(() => uniqStrings(applyDimFilters(buscaFiltered, produtos,  subtipos,  vendedores, [],       pedras, lapidacoes), 'destino'),           [buscaFiltered, produtos,  subtipos, vendedores, pedras, lapidacoes]);
  const availPedras     = useMemo(() => uniqStrings(applyDimFilters(buscaFiltered, produtos,  subtipos,  vendedores, destinos, [],     lapidacoes), 'tipo_pedra'),        [buscaFiltered, produtos,  subtipos, vendedores, destinos, lapidacoes]);
  const availLapidacoes = useMemo(() => uniqStrings(applyDimFilters(buscaFiltered, produtos,  subtipos,  vendedores, destinos, pedras, []),         'lapidacao'),         [buscaFiltered, produtos,  subtipos, vendedores, destinos, pedras]);

  const hasFilters = !!busca || produtos.length > 0 || subtipos.length > 0 || vendedores.length > 0 ||
    destinos.length > 0 || pedras.length > 0 || lapidacoes.length > 0;

  const dimDefs = [
    { label: 'Produto',      avail: availProdutos,   sel: produtos,   set: setProdutos },
    { label: 'Subtipo',      avail: availSubtipos,   sel: subtipos,   set: setSubtipos },
    { label: 'Dest. Manut.', avail: availVendedores, sel: vendedores, set: setVendedores },
    { label: 'Destino',      avail: availDestinos,   sel: destinos,   set: setDestinos },
    { label: 'Tipo Pedra',   avail: availPedras,     sel: pedras,     set: setPedras },
    { label: 'Lapidação',    avail: availLapidacoes, sel: lapidacoes, set: setLapidacoes },
  ];

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.06] rounded-xl p-4">
        <div className="flex items-start gap-4 overflow-x-auto pb-1">
          <div className="flex flex-col gap-1.5 shrink-0">
            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">Buscar</span>
            <input
              type="text"
              placeholder="Referência…"
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
                  setProdutos([]); setSubtipos([]); setVendedores([]);
                  setDestinos([]); setPedras([]); setLapidacoes([]); setBusca('');
                }}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-white/[0.06] rounded-lg hover:border-red-400 hover:text-red-500 transition-colors"
              >
                <X size={11} /> Limpar
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.06] rounded-xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-12 text-center text-zinc-500 dark:text-zinc-400 text-sm">
            {pecas.length === 0 ? 'Nenhuma peça em fabricação' : 'Nenhum item para os filtros selecionados'}
          </div>
        ) : (
          <div className="divide-y divide-zinc-100 dark:divide-white/[0.04]">
            {filtered.map((p, i) => (
              <div
                key={i}
                className="flex items-center justify-between px-5 py-3 hover:bg-zinc-50 dark:hover:bg-white/[0.03] transition-colors gap-3"
              >
                <div>
                  <div className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">{p.referencia}</div>
                  {p.subtipo && <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{p.subtipo}</div>}
                  {p.tipo_pedra && <div className="text-xs text-indigo-600 dark:text-indigo-400 mt-0.5">{p.tipo_pedra}</div>}
                </div>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-lg whitespace-nowrap ${diasVariant(p.dias)}`}>
                  {p.dias}d
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
