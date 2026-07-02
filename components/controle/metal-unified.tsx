'use client';

import React from 'react';
import { type MetalRecord, QUALIDADES, QUALIDADE_LABELS, type MetalQualidade } from '@/types/controle';

interface Props {
  dayRecords: MetalRecord[];
  monthRecords: MetalRecord[];
}

function fmtN(v: number, d = 3): string {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });
}

function fmtBRL(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function fmtPct(v: number): string {
  return (v * 100).toFixed(2).replace('.', ',') + '%';
}

interface Stats {
  pesoOuro: number;
  ouroPlatina: number;
  totalCompras: number;
  valorGasto: number;
  mediaPreco: number;
  bijuteria: number;
  semBijuteria: number;
  pesoSemVenda: number;
  conversao: number;
  metaNova: number;
  pesoByQ: number[];
  totalAvaliacoes: number;
}

function computeStats(records: MetalRecord[]): Stats {
  const compras = records.filter(r => r.transacao === 'COMPRA');
  const naoCompras = records.filter(r => r.transacao === 'NAO_COMPRA');
  const bijuteria = records.filter(r => (r.bx ?? 0) > 0).length;
  const semBijuteria = records.length - bijuteria;
  const comprasSemBX = compras.filter(r => (r.bx ?? 0) === 0).length;
  const pesoOuro = compras.reduce((s, r) => s + r.total_peso, 0);
  const ouroPlatina = compras.reduce((s, r) =>
    s + (r.ouro_24k ?? 0) + (r.ouro_22k ?? 0) + (r.pt ?? 0) +
    (r.ouro_750 ?? 0) + (r.ouro_720 ?? 0) + (r.platina ?? 0), 0);
  const valorGasto = compras.reduce((s, r) => s + r.valor, 0);
  const pesoSemVenda = naoCompras.reduce((s, r) => s + r.total_peso, 0);
  const totalCompras = compras.length;
  const conversao = semBijuteria > 0 ? comprasSemBX / semBijuteria : 0;
  const metaNova = totalCompras > 0
    ? compras.filter(r => r.pago_por_grama > 0 && r.pago_por_grama <= 250).length / totalCompras
    : 0;
  const pesoByQ = QUALIDADES.map(q =>
    compras.reduce((s, r) => s + ((r[q as MetalQualidade] as number) ?? 0), 0),
  );
  return {
    pesoOuro, ouroPlatina, totalCompras, valorGasto,
    mediaPreco: pesoOuro > 0 ? valorGasto / pesoOuro : 0,
    bijuteria, semBijuteria, pesoSemVenda, conversao, metaNova,
    pesoByQ, totalAvaliacoes: records.length,
  };
}

export function MetalUnified({ dayRecords, monthRecords }: Props) {
  const day = computeStats(dayRecords);
  const month = computeStats(monthRecords);

  const statRows: Array<{ label: string; d: string; m: string; red?: boolean; violet?: boolean }> = [
    { label: 'Peso Ouro', d: fmtN(day.pesoOuro, 2) + 'g', m: fmtN(month.pesoOuro, 2) + 'g' },
    { label: 'Total Avaliações', d: String(day.totalAvaliacoes), m: String(month.totalAvaliacoes) },
    { label: 'Ouro + Platina', d: fmtN(day.ouroPlatina, 2) + 'g', m: fmtN(month.ouroPlatina, 2) + 'g' },
    { label: 'Total Compras', d: String(day.totalCompras), m: String(month.totalCompras) },
    { label: 'Valor Gasto', d: fmtBRL(day.valorGasto), m: fmtBRL(month.valorGasto) },
    { label: 'Sem Bijuteria', d: String(day.semBijuteria), m: String(month.semBijuteria) },
    { label: 'Média Preço', d: fmtBRL(day.mediaPreco), m: fmtBRL(month.mediaPreco) },
    { label: 'Bijuteria', d: String(day.bijuteria), m: String(month.bijuteria) },
    { label: 'Peso Sem Venda', d: day.pesoSemVenda > 0 ? fmtN(day.pesoSemVenda, 2) + 'g' : '—', m: month.pesoSemVenda > 0 ? fmtN(month.pesoSemVenda, 2) + 'g' : '—', red: true },
    { label: 'Conversão', d: fmtPct(day.conversao), m: fmtPct(month.conversao) },
    { label: 'Meta Nova', d: fmtPct(day.metaNova), m: fmtPct(month.metaNova), violet: true },
  ];

  return (
    <div className="space-y-4">
      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.08] rounded-xl p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-500 dark:text-indigo-400 mb-2">
            Hoje
          </p>
          <p className="text-3xl font-bold font-mono tabular-nums text-indigo-600 dark:text-indigo-400 leading-none">
            {fmtN(day.pesoOuro, 2)}g
          </p>
          <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1.5">
            {day.totalAvaliacoes} avaliações · {day.totalCompras} compras
          </p>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.08] rounded-xl p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-500 dark:text-indigo-400 mb-2">
            No Mês
          </p>
          <p className="text-3xl font-bold font-mono tabular-nums text-indigo-600 dark:text-indigo-400 leading-none">
            {fmtN(month.pesoOuro, 2)}g
          </p>
          <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1.5">
            {month.totalAvaliacoes} avaliações · {month.totalCompras} compras
          </p>
        </div>
      </div>

      {/* Unified detail table */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.08] rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-100 dark:border-white/[0.04]">
              <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-zinc-400 w-1/2">
                Qualidade
              </th>
              <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-wider text-zinc-400 w-1/4">
                Dia
              </th>
              <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-wider text-zinc-400 w-1/4">
                Mês
              </th>
            </tr>
          </thead>
          <tbody>
            {QUALIDADES.map((q, i) => {
              const dp = day.pesoByQ[i];
              const mp = month.pesoByQ[i];
              return (
                <tr key={q} className="border-b border-zinc-50 dark:border-white/[0.02]">
                  <td className="px-3 py-[6px] text-[12px] font-medium text-zinc-500 dark:text-zinc-400">
                    {QUALIDADE_LABELS[q as MetalQualidade]}
                  </td>
                  <td className={`px-3 py-[6px] text-right font-mono text-[12px] tabular-nums ${
                    dp > 0 ? 'font-semibold text-zinc-900 dark:text-zinc-100' : 'text-zinc-300 dark:text-zinc-600'
                  }`}>
                    {fmtN(dp)}
                  </td>
                  <td className={`px-3 py-[6px] text-right font-mono text-[12px] tabular-nums ${
                    mp > 0 ? 'font-semibold text-zinc-900 dark:text-zinc-100' : 'text-zinc-300 dark:text-zinc-600'
                  }`}>
                    {fmtN(mp)}
                  </td>
                </tr>
              );
            })}

            <tr className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-100 dark:border-white/[0.04]">
              <td className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-zinc-400">Métrica</td>
              <td className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-wider text-zinc-400">Dia</td>
              <td className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-wider text-zinc-400">Mês</td>
            </tr>

            {statRows.map(row => (
              <tr
                key={row.label}
                className={`border-b border-zinc-50 dark:border-white/[0.02] last:border-0 ${
                  row.red ? 'bg-red-50 dark:bg-red-500/10' :
                  row.violet ? 'bg-violet-50 dark:bg-violet-500/10' : ''
                }`}
              >
                <td className="px-3 py-[6px] text-[11px] text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                  {row.label}
                </td>
                <td className={`px-3 py-[6px] text-right font-mono text-[12px] font-semibold tabular-nums ${
                  row.red ? 'text-red-600 dark:text-red-400' :
                  row.violet ? 'text-violet-700 dark:text-violet-400' :
                  'text-zinc-900 dark:text-zinc-100'
                }`}>
                  {row.d}
                </td>
                <td className={`px-3 py-[6px] text-right font-mono text-[12px] font-semibold tabular-nums ${
                  row.red ? 'text-red-600 dark:text-red-400' :
                  row.violet ? 'text-violet-700 dark:text-violet-400' :
                  'text-zinc-900 dark:text-zinc-100'
                }`}>
                  {row.m}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
