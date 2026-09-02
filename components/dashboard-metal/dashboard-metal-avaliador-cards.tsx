'use client';

import React, { useMemo, useState } from 'react';
import { isAvDono, LOJA_TAG_COLORS, CONVERSAO_OTIMA, CONVERSAO_BOA } from '@/lib/dashboard-metal-sql';
import { getLojaConfig } from '@/lib/controle-config';
import { DashboardMetalAvaliadorDetalhe } from './dashboard-metal-avaliador-detalhe';
import type { DashboardMetalDetalhes } from '@/lib/actions/dashboard-metal';

interface Props {
  detalhes: DashboardMetalDetalhes;
}

type SortKey = 'compras' | 'conv' | 'metal' | 'valor' | 'ticket';

const SORTS: { key: SortKey; label: string }[] = [
  { key: 'compras', label: 'Compras' },
  { key: 'conv', label: 'Conversão' },
  { key: 'metal', label: 'Metal' },
  { key: 'valor', label: 'Valor' },
  { key: 'ticket', label: 'Ticket Médio' },
];

function convColor(conv: number): string {
  if (conv >= CONVERSAO_OTIMA * 100) return '#4ade80';
  if (conv >= CONVERSAO_BOA * 100) return '#D4AF37';
  return '#f87171';
}

function convBadge(conv: number): { text: string; cls: string } {
  if (conv >= CONVERSAO_OTIMA * 100) {
    return { text: '★ Alta conversão', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' };
  }
  if (conv >= CONVERSAO_BOA * 100) {
    return { text: '● Boa conversão', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' };
  }
  return { text: '▼ Atenção', cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' };
}

function fmtN(v: number): string {
  return v.toLocaleString('pt-BR');
}
function fmtBRL(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
}

export function DashboardMetalAvaliadorCards({ detalhes }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('compras');
  const [selecionado, setSelecionado] = useState<string | null>(null);

  const cards = useMemo(() => {
    const map = new Map<string, { avId: string; av: string; lojas: Set<string>; aval: number; compras: number; metal: number; valor: number }>();
    for (const r of detalhes.avaliadores) {
      if (isAvDono(r.avaliador_id)) continue;
      if (!map.has(r.avaliador_id)) map.set(r.avaliador_id, { avId: r.avaliador_id, av: r.avaliador, lojas: new Set(), aval: 0, compras: 0, metal: 0, valor: 0 });
      const c = map.get(r.avaliador_id)!;
      c.lojas.add(r.loja);
      c.aval += r.aval;
      c.compras += r.compras;
      c.metal += r.metal;
      c.valor += r.valor;
    }
    const list = [...map.values()].map(c => ({
      ...c,
      nc: c.aval - c.compras,
      conv: c.aval > 0 ? (c.compras / c.aval) * 100 : 0,
      ticket: c.compras > 0 ? c.valor / c.compras : 0,
    }));
    list.sort((a, b) => b[sortKey === 'ticket' ? 'ticket' : sortKey] - a[sortKey === 'ticket' ? 'ticket' : sortKey]);
    return list;
  }, [detalhes.avaliadores, sortKey]);

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.08] rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow duration-200">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-200 flex items-center gap-1.5">
          <span className="w-1 h-3.5 rounded-full bg-indigo-400" />
          Desempenho por Avaliador
        </h3>
        <div className="flex items-center gap-1">
          {SORTS.map(s => (
            <button
              key={s.key}
              onClick={() => setSortKey(s.key)}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors duration-150 ${
                sortKey === s.key ? 'bg-indigo-600 text-white shadow-sm' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {cards.length === 0 ? (
        <p className="text-center text-sm text-zinc-400 py-8">Nenhum avaliador no período selecionado.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-3">
          {cards.map((c, i) => {
            const badge = convBadge(c.conv);
            const cor = convColor(c.conv);
            const isSelected = selecionado === c.avId;
            return (
              <button
                key={c.avId}
                onClick={() => setSelecionado(isSelected ? null : c.avId)}
                className={`text-left rounded-lg border p-3 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-sm ${
                  isSelected ? 'border-indigo-500 ring-1 ring-indigo-500 bg-indigo-50/40 dark:bg-indigo-500/[0.06]' : 'border-zinc-100 dark:border-white/[0.06] hover:border-indigo-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold text-zinc-400">#{i + 1}</span>
                  <div className="flex gap-1">
                    {[...c.lojas].map(l => (
                      <span
                        key={l}
                        className="text-[9px] font-bold px-1 py-0.5 rounded"
                        style={{ color: LOJA_TAG_COLORS[l] ?? '#aaa', background: `${LOJA_TAG_COLORS[l] ?? '#aaa'}22` }}
                      >
                        {getLojaConfig(l)?.sigla ?? l}
                      </span>
                    ))}
                  </div>
                </div>
                <p className="text-sm font-bold text-zinc-800 dark:text-zinc-100 mb-2 truncate">{c.av}</p>
                <div className="space-y-0.5 text-[11px]">
                  <div className="flex justify-between"><span className="text-zinc-400">Avaliações</span><span className="font-mono text-zinc-700 dark:text-zinc-200">{fmtN(c.aval)}</span></div>
                  <div className="flex justify-between"><span className="text-zinc-400">Não Compras</span><span className="font-mono text-red-400">{fmtN(c.nc)}</span></div>
                  <div className="flex justify-between"><span className="text-zinc-400">Compras</span><span className="font-mono text-zinc-700 dark:text-zinc-200">{fmtN(c.compras)}</span></div>
                  <div className="flex justify-between"><span className="text-zinc-400">Conversão</span><span className="font-mono font-bold" style={{ color: cor }}>{c.conv.toFixed(1)}%</span></div>
                  <div className="flex justify-between"><span className="text-zinc-400">Metal</span><span className="font-mono text-zinc-700 dark:text-zinc-200">{c.metal.toFixed(2)}g</span></div>
                  <div className="flex justify-between"><span className="text-zinc-400">Ticket Médio</span><span className="font-mono text-zinc-700 dark:text-zinc-200">{fmtBRL(c.ticket)}</span></div>
                </div>
                <div className="h-1 rounded-full bg-zinc-100 dark:bg-zinc-800 mt-2 overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-500 ease-out" style={{ width: `${c.conv}%`, background: cor }} />
                </div>
                <span className={`inline-block mt-2 text-[10px] font-semibold px-2 py-0.5 rounded ${badge.cls}`}>{badge.text}</span>
              </button>
            );
          })}
        </div>
      )}

      {selecionado && (
        <DashboardMetalAvaliadorDetalhe avId={selecionado} detalhes={detalhes} onClose={() => setSelecionado(null)} />
      )}
    </div>
  );
}
