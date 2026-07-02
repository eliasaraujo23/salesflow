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
  const ouroPlatina = compras.reduce(
    (s, r) =>
      s +
      (r.ouro_24k ?? 0) +
      (r.ouro_22k ?? 0) +
      (r.pt ?? 0) +
      (r.ouro_750 ?? 0) +
      (r.ouro_720 ?? 0) +
      (r.platina ?? 0),
    0,
  );
  const valorGasto = compras.reduce((s, r) => s + r.valor, 0);
  const pesoSemVenda = naoCompras.reduce((s, r) => s + r.total_peso, 0);
  const totalCompras = compras.length;
  const conversao = semBijuteria > 0 ? comprasSemBX / semBijuteria : 0;
  const metaNova =
    totalCompras > 0
      ? compras.filter(r => r.pago_por_grama > 0 && r.pago_por_grama <= 250).length / totalCompras
      : 0;
  const pesoByQ = QUALIDADES.map(q =>
    compras.reduce((s, r) => s + ((r[q as MetalQualidade] as number) ?? 0), 0),
  );
  return {
    pesoOuro,
    ouroPlatina,
    totalCompras,
    valorGasto,
    mediaPreco: pesoOuro > 0 ? valorGasto / pesoOuro : 0,
    bijuteria,
    semBijuteria,
    pesoSemVenda,
    conversao,
    metaNova,
    pesoByQ,
    totalAvaliacoes: records.length,
  };
}

const cardBase =
  'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.08] rounded-xl';

export function MetalUnified({ dayRecords, monthRecords }: Props) {
  const day = computeStats(dayRecords);
  const month = computeStats(monthRecords);

  const metrics: Array<{
    label: string;
    d: string;
    m: string;
    accent?: 'violet' | 'red';
  }> = [
    { label: 'Valor Gasto', d: fmtBRL(day.valorGasto), m: fmtBRL(month.valorGasto) },
    { label: 'Média Preço', d: fmtBRL(day.mediaPreco), m: fmtBRL(month.mediaPreco) },
    { label: 'Conversão', d: fmtPct(day.conversao), m: fmtPct(month.conversao) },
    { label: 'Meta Nova', d: fmtPct(day.metaNova), m: fmtPct(month.metaNova), accent: 'violet' },
    { label: 'Sem Bijuteria', d: String(day.semBijuteria), m: String(month.semBijuteria) },
    { label: 'Bijuteria', d: String(day.bijuteria), m: String(month.bijuteria) },
    { label: 'Ouro + Platina', d: fmtN(day.ouroPlatina, 2) + 'g', m: fmtN(month.ouroPlatina, 2) + 'g' },
    {
      label: 'Peso Sem Venda',
      d: day.pesoSemVenda > 0 ? fmtN(day.pesoSemVenda, 2) + 'g' : '—',
      m: month.pesoSemVenda > 0 ? fmtN(month.pesoSemVenda, 2) + 'g' : '—',
      accent: 'red',
    },
  ];

  return (
    <div className="space-y-3">
      {/* Summary */}
      <div className="grid grid-cols-2 gap-3">
        <div className={`${cardBase} p-4`}>
          <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-500 dark:text-indigo-400 mb-1">
            Hoje
          </p>
          <p className="text-3xl font-bold font-mono tabular-nums text-indigo-600 dark:text-indigo-400 leading-none">
            {fmtN(day.pesoOuro, 2)}g
          </p>
          <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1.5">
            {day.totalAvaliacoes} aval · {day.totalCompras} compras
          </p>
        </div>
        <div className={`${cardBase} p-4`}>
          <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-500 dark:text-indigo-400 mb-1">
            No Mês
          </p>
          <p className="text-3xl font-bold font-mono tabular-nums text-indigo-600 dark:text-indigo-400 leading-none">
            {fmtN(month.pesoOuro, 2)}g
          </p>
          <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1.5">
            {month.totalAvaliacoes} aval · {month.totalCompras} compras
          </p>
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {metrics.map(({ label, d, m, accent }) => {
          const labelCls =
            accent === 'violet'
              ? 'text-violet-500 dark:text-violet-400'
              : accent === 'red'
              ? 'text-red-400 dark:text-red-400'
              : 'text-zinc-400 dark:text-zinc-500';
          const valCls =
            accent === 'violet'
              ? 'text-violet-700 dark:text-violet-400'
              : accent === 'red'
              ? 'text-red-600 dark:text-red-400'
              : 'text-zinc-900 dark:text-zinc-100';
          return (
            <div key={label} className={`${cardBase} p-3`}>
              <p className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${labelCls}`}>
                {label}
              </p>
              <p className={`text-sm font-bold font-mono tabular-nums leading-tight ${valCls}`}>{d}</p>
              <p className="text-[11px] font-mono tabular-nums text-zinc-400 dark:text-zinc-500 mt-0.5">
                {m} mês
              </p>
            </div>
          );
        })}
      </div>

      {/* Quality strip */}
      <div className={`${cardBase} p-3`}>
        <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-2">
          Qualidades — dia / mês
        </p>
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-x-2 gap-y-1">
          {QUALIDADES.map((q, i) => {
            const dp = day.pesoByQ[i];
            const mp = month.pesoByQ[i];
            const active = dp > 0 || mp > 0;
            return (
              <div key={q} className={active ? '' : 'opacity-30'}>
                <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500">
                  {QUALIDADE_LABELS[q as MetalQualidade]}
                </p>
                <p className={`text-xs font-mono font-semibold tabular-nums ${active ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-400'}`}>
                  {fmtN(dp)}
                </p>
                <p className="text-[10px] font-mono tabular-nums text-zinc-400 dark:text-zinc-500">
                  {fmtN(mp)}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
