'use client';

import React from 'react';
import { type MensalRow } from '@/lib/actions/dashboard-metal';
import { CONVERSAO_OTIMA, CONVERSAO_BOA } from '@/lib/dashboard-metal-sql';

interface Props {
  rows: MensalRow[];
}

function fmtN(v: number, d = 2): string {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });
}

function fmtBRL(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function fmtPct(v: number): string {
  return (v * 100).toFixed(1).replace('.', ',') + '%';
}

function convColor(conv: number): string {
  if (conv >= CONVERSAO_OTIMA) return 'text-emerald-600 dark:text-emerald-400';
  if (conv >= CONVERSAO_BOA) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-500 dark:text-red-400';
}

export function DashboardMetalKpis({ rows }: Props) {
  const mesesDistintos = new Set(rows.map(r => r.ano_mes)).size;
  const avaliacoes = rows.reduce((s, r) => s + r.aval_s4, 0);
  const compras = rows.reduce((s, r) => s + r.compras, 0);
  const naoCompras = rows.reduce((s, r) => s + r.nc, 0);
  const conversao = avaliacoes > 0 ? compras / avaliacoes : 0;
  const metal = rows.reduce((s, r) => s + r.metal, 0);
  const valor = rows.reduce((s, r) => s + r.valor, 0);
  const ticketSum = rows.reduce((s, r) => s + r.ticket_sum, 0);
  const ticketCnt = rows.reduce((s, r) => s + r.ticket_cnt, 0);
  const ticketMedio = ticketCnt > 0 ? ticketSum / ticketCnt : 0;

  const cards = [
    { label: 'Avaliações', value: String(avaliacoes), sub: mesesDistintos > 0 ? `média ${fmtN(avaliacoes / mesesDistintos, 0)}/mês` : '', accent: undefined, bar: 'bg-zinc-300 dark:bg-zinc-600' },
    { label: 'Não Compras', value: String(naoCompras), sub: avaliacoes > 0 ? `${fmtPct(naoCompras / avaliacoes)} do total` : '', accent: 'text-red-500 dark:text-red-400', bar: 'bg-red-400' },
    { label: 'Compras', value: String(compras), sub: mesesDistintos > 0 ? `média ${fmtN(compras / mesesDistintos, 0)}/mês` : '', accent: undefined, bar: 'bg-indigo-400' },
    { label: 'Conversão', value: fmtPct(conversao), sub: '', accent: convColor(conversao), bar: conversao >= CONVERSAO_OTIMA ? 'bg-emerald-400' : conversao >= CONVERSAO_BOA ? 'bg-amber-400' : 'bg-red-400' },
    { label: 'Metal Comprado', value: `${fmtN(metal)}g`, sub: '', accent: undefined, bar: 'bg-amber-400' },
    { label: 'Ticket Médio', value: fmtBRL(ticketMedio), sub: `total ${fmtBRL(valor)}`, accent: undefined, bar: 'bg-emerald-400' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {cards.map(c => (
        <div
          key={c.label}
          className="group relative overflow-hidden bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.08] rounded-xl p-3 shadow-sm hover:shadow-md hover:border-zinc-300 dark:hover:border-white/[0.14] transition-all duration-200"
        >
          <span className={`absolute inset-x-0 top-0 h-0.5 ${c.bar} opacity-70 group-hover:opacity-100 transition-opacity`} />
          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-1">{c.label}</p>
          <p className={`text-xl font-bold font-mono tabular-nums leading-tight ${c.accent ?? 'text-zinc-900 dark:text-zinc-100'}`}>{c.value}</p>
          {c.sub && <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5">{c.sub}</p>}
        </div>
      ))}
    </div>
  );
}
