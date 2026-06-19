'use client';

import React, { useState, useMemo } from 'react';
import { X } from 'lucide-react';
import { type JmPeca } from '@/lib/actions/fetch-jm-dashboard';

type StringField = 'tipo' | 'produto' | 'subtipo' | 'tipo_pedra' | 'lapidacao' | 'destino';

function uniqStrings(rows: JmPeca[], field: StringField): string[] {
  return [...new Set(rows.map(r => r[field]).filter((v): v is string => v != null && v !== ''))].sort();
}

function applyDimFilters(
  rows: JmPeca[],
  tipos: string[], produtos: string[], subtipos: string[],
  pedras: string[], lapidacoes: string[], destinos: string[],
): JmPeca[] {
  return rows.filter(r => {
    if (tipos.length && !tipos.includes(r.tipo ?? '')) return false;
    if (produtos.length && !produtos.includes(r.produto ?? '')) return false;
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

const TIPO_BADGE: Record<string, string> = {
  JRCP: 'bg-amber-500/20 text-amber-600 dark:text-amber-400',
  JMCP: 'bg-indigo-500/20 text-indigo-600 dark:text-indigo-400',
  JMSP: 'bg-violet-500/20 text-violet-600 dark:text-violet-400',
};

const inputCls = 'px-3 py-1.5 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-white/[0.08] rounded-lg text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-indigo-500 transition-colors placeholder:text-zinc-400';

interface JmModificacaoTabProps {
  pecas: JmPeca[];
}

export function JmModificacaoTab({ pecas }: JmModificacaoTabProps) {
  const [busca, setBusca] = useState('');
  const [tipos, setTipos] = useState<string[]>([]);
  const [produtos, setProdutos] = useState<string[]>([]);
  const [subtipos, setSubtipos] = useState<string[]>([]);
  const [pedras, setPedras] = useState<string[]>([]);
  const [lapidacoes, setLapidacoes] = useState<string[]>([]);
  const [destinos, setDestinos] = useState<string[]>([]);

  const buscaFiltered = useMemo(() => {
    if (!busca) return pecas;
    const q = busca.toLowerCase();
    return pecas.filter(p =>
      p.referencia.toLowerCase().includes(q) || (p.produto ?? '').toLowerCase().includes(q),
    );
  }, [pecas, busca]);

  const filtered = useMemo(
    () => applyDimFilters(buscaFiltered, tipos, produtos, subtipos, pedras, lapidacoes, destinos),
    [buscaFiltered, tipos, produtos, subtipos, pedras, lapidacoes, destinos],
  );

  const availTipos      = useMemo(() => uniqStrings(applyDimFilters(buscaFiltered, [],     produtos,  subtipos, pedras, lapidacoes, destinos), 'tipo'),      [buscaFiltered, produtos,  subtipos, pedras, lapidacoes, destinos]);
  const availProdutos   = useMemo(() => uniqStrings(applyDimFilters(buscaFiltered, tipos,  [],        subtipos, pedras, lapidacoes, destinos), 'produto'),    [buscaFiltered, tipos,     subtipos, pedras, lapidacoes, destinos]);
  const availSubtipos   = useMemo(() => uniqStrings(applyDimFilters(buscaFiltered, tipos,  produtos,  [],       pedras, lapidacoes, destinos), 'subtipo'),    [buscaFiltered, tipos, produtos,   pedras, lapidacoes, destinos]);
  const availPedras     = useMemo(() => uniqStrings(applyDimFilters(buscaFiltered, tipos,  produtos,  subtipos, [],     lapidacoes, destinos), 'tipo_pedra'), [buscaFiltered, tipos, produtos, subtipos, lapidacoes, destinos]);
  const availLapidacoes = useMemo(() => uniqStrings(applyDimFilters(buscaFiltered, tipos,  produtos,  subtipos, pedras, [],         destinos), 'lapidacao'),  [buscaFiltered, tipos, produtos, subtipos, pedras,     destinos]);
  const availDestinos   = useMemo(() => uniqStrings(applyDimFilters(buscaFiltered, tipos,  produtos,  subtipos, pedras, lapidacoes, []),      'destino'),    [buscaFiltered, tipos, produtos, subtipos, pedras, lapidacoes]);

  const hasFilters = !!busca || tipos.length > 0 || produtos.length > 0 || subtipos.length > 0 ||
    pedras.length > 0 || lapidacoes.length > 0 || destinos.length > 0;

  const totalPeso = useMemo(() => filtered.reduce((s, p) => s + p.peso, 0), [filtered]);

  const dimDefs = [
    { label: 'Tipo',       avail: availTipos,      sel: tipos,      set: setTipos },
    { label: 'Produto',    avail: availProdutos,   sel: produtos,   set: setProdutos },
    { label: 'Subtipo',    avail: availSubtipos,   sel: subtipos,   set: setSubtipos },
    { label: 'Tipo Pedra', avail: availPedras,     sel: pedras,     set: setPedras },
    { label: 'Lapidação',  avail: availLapidacoes, sel: lapidacoes, set: setLapidacoes },
    { label: 'Destino',    avail: availDestinos,   sel: destinos,   set: setDestinos },
  ];

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
            {filtered.length > 0 && (
              <div className="text-xs text-zinc-500 dark:text-zinc-400">{totalPeso.toFixed(2)}g total</div>
            )}
            {hasFilters && (
              <button
                onClick={() => {
                  setTipos([]); setProdutos([]); setSubtipos([]);
                  setPedras([]); setLapidacoes([]); setDestinos([]); setBusca('');
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
            {pecas.length === 0 ? 'Nenhuma peça em modificação' : 'Nenhum item para os filtros selecionados'}
          </div>
        ) : (
          <div className="divide-y divide-zinc-100 dark:divide-white/[0.04]">
            {filtered.map((p, i) => (
              <div
                key={i}
                className="flex items-center justify-between px-5 py-3 hover:bg-zinc-50 dark:hover:bg-white/[0.03] transition-colors gap-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-indigo-600 dark:text-indigo-400">{p.referencia}</span>
                    {p.tipo && (
                      <span className={`px-1.5 py-0.5 rounded text-xs font-semibold ${TIPO_BADGE[p.tipo] ?? 'bg-zinc-200 dark:bg-white/[0.06] text-zinc-500 dark:text-zinc-400'}`}>
                        {p.tipo}
                      </span>
                    )}
                  </div>
                  {p.produto && <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate mt-0.5">{p.produto}</p>}
                  {p.tipo_pedra && (
                    <p className="text-xs text-zinc-400 dark:text-zinc-500">
                      {p.tipo_pedra}{p.lapidacao ? ` · ${p.lapidacao}` : ''}
                    </p>
                  )}
                </div>
                <span className="text-xs text-zinc-500 dark:text-zinc-400 flex-shrink-0">{p.peso.toFixed(2)}g</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
