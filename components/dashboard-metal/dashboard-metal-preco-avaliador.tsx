'use client';

import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { LOJA_TAG_COLORS, isAvDono } from '@/lib/dashboard-metal-sql';
import { getLojaConfig } from '@/lib/controle-config';

const LIMITE_COLAPSADO = 5;

interface Props {
  precoAvaliador: { avaliador_id: string; avaliador: string; loja: string; nivel: string; n: number; somaPpg: number }[];
}

const NIVEIS = ['1', '2', '3', '4', '5'] as const;
const NIVEL_LABELS: Record<string, string> = { '1': '1º Preço', '2': '2º Preço', '3': '3º Preço', '4': '4º Preço', '5': '5º Preço', geral: 'Média Geral' };

function fmtPpg(v: number): string {
  return `R$${v.toFixed(2)}/g`;
}

interface RowAgg {
  av: string;
  loja: string;
  porNivel: Record<string, { n: number; med: number }>;
  geral: { n: number; med: number };
}

function buildRows(data: Props['precoAvaliador']): RowAgg[] {
  const map = new Map<string, RowAgg>();
  for (const r of data) {
    if (isAvDono(r.avaliador_id)) continue;
    const key = `${r.avaliador_id}__${r.loja}`;
    if (!map.has(key)) {
      map.set(key, { av: r.avaliador, loja: r.loja, porNivel: {}, geral: { n: 0, med: 0 } });
    }
    const row = map.get(key)!;
    row.porNivel[r.nivel] = { n: r.n, med: r.n > 0 ? r.somaPpg / r.n : 0 };
  }
  for (const row of map.values()) {
    let n = 0, soma = 0;
    for (const nivel of NIVEIS) {
      const d = row.porNivel[nivel];
      if (d) { n += d.n; soma += d.med * d.n; }
    }
    row.geral = { n, med: n > 0 ? soma / n : 0 };
  }
  return [...map.values()].filter(r => r.geral.n > 0);
}

export function DashboardMetalPrecoAvaliador({ precoAvaliador }: Props) {
  const [expandido, setExpandido] = useState(false);
  const rows = useMemo(() => buildRows(precoAvaliador), [precoAvaliador]);

  const colunas = useMemo(() => {
    return [...NIVEIS, 'geral'].map(key => {
      const isGeral = key === 'geral';
      const colData = rows
        .map(r => ({ av: r.av, loja: r.loja, ...(isGeral ? r.geral : (r.porNivel[key] ?? { n: 0, med: 0 })) }))
        .filter(x => x.n > 0)
        .sort((a, b) => a.med - b.med);
      return { key, label: NIVEL_LABELS[key], isGeral, colData };
    });
  }, [rows]);

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.08] rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow duration-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-200 flex items-center gap-1.5">
          <span className="w-1 h-3.5 rounded-full bg-amber-400" />
          Análise de Compras por Preço e Avaliador
        </h3>
        {rows.length > 0 && (
          <button
            onClick={() => setExpandido(e => !e)}
            className="flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-500/10 px-2.5 py-1 rounded-lg transition-colors duration-150"
          >
            {expandido ? (
              <>Recolher <ChevronUp size={14} /></>
            ) : (
              <>Expandir <ChevronDown size={14} /></>
            )}
          </button>
        )}
      </div>

      {rows.length === 0 ? (
        <p className="text-center text-sm text-zinc-400 py-8">Nenhum dado no período</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {colunas.map(col => {
            if (col.colData.length === 0) {
              return (
                <div key={col.key} className="rounded-lg border border-zinc-100 dark:border-white/[0.06] p-3 opacity-40">
                  <p className="text-xs font-semibold text-zinc-500 mb-2">{col.label}</p>
                  <p className="text-[11px] text-zinc-400">sem dados</p>
                </div>
              );
            }
            const maxBar = col.colData[col.colData.length - 1].med || 1;
            const visiveis = expandido ? col.colData : col.colData.slice(0, LIMITE_COLAPSADO);
            const ocultos = col.colData.length - visiveis.length;
            return (
              <div
                key={col.key}
                className={`rounded-lg border p-3 transition-colors duration-200 ${col.isGeral ? 'border-amber-400 dark:border-amber-500/60 bg-amber-50/40 dark:bg-amber-500/[0.04]' : 'border-zinc-100 dark:border-white/[0.06] hover:border-zinc-200 dark:hover:border-white/[0.12]'}`}
              >
                <p className={`text-xs font-semibold mb-2 ${col.isGeral ? 'text-amber-600 dark:text-amber-400' : 'text-zinc-500 dark:text-zinc-400'}`}>{col.label}</p>
                <div className="space-y-2">
                  {visiveis.map((x, i) => {
                    const isWinner = i === 0;
                    const barPct = (x.med / maxBar) * 100;
                    const barColor = isWinner ? '#4ade80' : col.isGeral ? '#8B6914' : '#6b5520';
                    const lojaColor = LOJA_TAG_COLORS[x.loja] ?? '#aaa';
                    const lojaSigla = getLojaConfig(x.loja)?.sigla ?? x.loja;
                    return (
                      <div key={`${x.av}-${x.loja}`}>
                        <div className="flex items-center justify-between mb-0.5">
                          <span className={`text-[11px] font-bold truncate ${isWinner ? 'text-emerald-500' : 'text-zinc-700 dark:text-zinc-200'}`}>
                            {isWinner ? '★ ' : ''}{i + 1}. {x.av}
                            <span className="text-[9px] ml-1" style={{ color: lojaColor }}>{lojaSigla}</span>
                          </span>
                          <span className="text-[10px] text-zinc-400 shrink-0">{x.n}x</span>
                        </div>
                        <div className="h-1 rounded-full bg-zinc-100 dark:bg-zinc-800 mb-0.5 overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${barPct}%`, background: barColor }} />
                        </div>
                        <div className="text-[11px] font-mono" style={{ color: barColor }}>{fmtPpg(x.med)}</div>
                      </div>
                    );
                  })}
                </div>
                {!expandido && ocultos > 0 && (
                  <p className="text-[10px] text-zinc-400 mt-2 pt-2 border-t border-zinc-100 dark:border-white/[0.06]">+{ocultos} avaliador{ocultos > 1 ? 'es' : ''}</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
