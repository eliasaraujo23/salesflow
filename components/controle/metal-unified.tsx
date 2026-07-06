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

const OURO_PLATINA_FIELDS: MetalQualidade[] = ['ouro_24k', 'ouro_22k', 'pt', 'ouro_750', 'ouro_720', 'bx', 'platina'];

function somaOuroPlatina(r: MetalRecord): number {
  return OURO_PLATINA_FIELDS.reduce((s, q) => s + ((r[q] as number) ?? 0), 0);
}

function computeStats(records: MetalRecord[]): Stats {
  const bijuteria = records.filter(r => r.motivo_nc === '4').length;
  const totalAvaliacoes = records.length;
  const semBijuteria = totalAvaliacoes - bijuteria;

  const compras = records.filter(r => r.transacao === 'COMPRA' && somaOuroPlatina(r) > 0);
  const naoCompras = records.filter(r => r.transacao === 'NAO_COMPRA' && r.motivo_nc !== '4');

  const totalCompras = compras.length;
  const pesoOuro = compras.reduce((s, r) => s + r.total_peso, 0);
  const ouroPlatina = compras.reduce((s, r) => s + somaOuroPlatina(r), 0);
  const valorGasto = compras.reduce((s, r) => s + r.valor, 0);
  const mediaPreco = ouroPlatina > 0 ? valorGasto / ouroPlatina : 0;
  const pesoSemVenda = naoCompras.reduce((s, r) => s + somaOuroPlatina(r), 0);
  const conversao = semBijuteria > 0 ? totalCompras / semBijuteria : 0;

  const metaNova =
    totalCompras > 0
      ? compras.filter(r => r.pago_por_grama > 0 && r.pago_por_grama <= 250).length / totalCompras
      : 0;

  const pesoByQ = QUALIDADES.map(q =>
    compras.reduce((s, r) => s + ((r[q as MetalQualidade] as number) ?? 0), 0),
  );

  return {
    pesoOuro, ouroPlatina, totalCompras, valorGasto, mediaPreco,
    bijuteria, semBijuteria, pesoSemVenda, conversao, metaNova,
    pesoByQ, totalAvaliacoes,
  };
}

const card = 'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.08] rounded-xl';

const QUALIDADE_COLOR: Record<string, string> = {
  ouro_24k: '#8B6000',
  ouro_22k: '#B8820A',
  pt:       '#C89C20',
  ouro_750: '#D9B840',
  ouro_720: '#EDD070',
  bx:       '#F2E49A',
  platina:  '#6B8CA8',
  prata:    '#96B0CC',
};

export function MetalUnified({ dayRecords, monthRecords }: Props) {
  const day = computeStats(dayRecords);
  const month = computeStats(monthRecords);

  const metrics: Array<{ label: string; d: string; m: string; accent?: 'violet' | 'red' }> = [
    { label: 'Ouro + Platina', d: fmtN(day.ouroPlatina, 2) + 'g', m: fmtN(month.ouroPlatina, 2) + 'g' },
    { label: 'Média Preço',    d: fmtBRL(day.mediaPreco),          m: fmtBRL(month.mediaPreco) },
    { label: 'Conversão',      d: fmtPct(day.conversao),           m: fmtPct(month.conversao) },
    { label: 'Meta Nova',      d: fmtPct(day.metaNova),            m: fmtPct(month.metaNova), accent: 'violet' },
    { label: 'Sem Bijuteria',  d: String(day.semBijuteria),        m: String(month.semBijuteria) },
    { label: 'Bijuteria',      d: String(day.bijuteria),           m: String(month.bijuteria) },
    {
      label: 'Peso Sem Venda',
      d: day.pesoSemVenda > 0 ? fmtN(day.pesoSemVenda, 2) + 'g' : '—',
      m: month.pesoSemVenda > 0 ? fmtN(month.pesoSemVenda, 2) + 'g' : '—',
      accent: 'red',
    },
  ];

  return (
    <div className="space-y-3">

      {/* ── Hero ── */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { title: 'Hoje', s: day },
          { title: 'No Mês', s: month },
        ].map(({ title, s }) => (
          <div key={title} className={`${card} p-5`}>
            <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-500 dark:text-indigo-400 mb-2">
              {title}
            </p>
            <p className="text-4xl font-bold font-mono tabular-nums text-indigo-600 dark:text-indigo-400 leading-none">
              {fmtN(s.pesoOuro, 2)}
              <span className="text-xl ml-1 font-semibold opacity-60">g</span>
            </p>
            <div className="flex gap-5 mt-3">
              <span className="text-sm text-zinc-400 dark:text-zinc-500">
                <span className="font-semibold text-zinc-700 dark:text-zinc-200">{s.totalAvaliacoes}</span> aval
              </span>
              <span className="text-sm text-zinc-400 dark:text-zinc-500">
                <span className="font-semibold text-zinc-700 dark:text-zinc-200">{s.totalCompras}</span> compras
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* ── Métricas primárias (4) ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {metrics.slice(0, 4).map(({ label, d, m, accent }) => {
          const labelCls =
            accent === 'violet' ? 'text-violet-500 dark:text-violet-400' : 'text-zinc-500 dark:text-zinc-400';
          const valCls =
            accent === 'violet' ? 'text-violet-700 dark:text-violet-300' : 'text-zinc-900 dark:text-zinc-100';
          return (
            <div key={label} className={`${card} p-4`}>
              <p className={`text-[10px] font-bold uppercase tracking-widest mb-3 ${labelCls}`}>{label}</p>
              <div className="space-y-2">
                <div>
                  <p className="text-[10px] text-zinc-400 dark:text-zinc-600 uppercase tracking-wider mb-0.5">Hoje</p>
                  <p className={`text-xl font-bold font-mono tabular-nums leading-none ${valCls}`}>{d}</p>
                </div>
                <div className="w-full h-px bg-zinc-100 dark:bg-white/[0.05]" />
                <div>
                  <p className="text-[10px] text-zinc-400 dark:text-zinc-600 uppercase tracking-wider mb-0.5">Mês</p>
                  <p className="text-sm font-mono tabular-nums text-zinc-500 dark:text-zinc-400 leading-none">{m}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Métricas secundárias (3) ── */}
      <div className="grid grid-cols-3 gap-3">
        {metrics.slice(4).map(({ label, d, m, accent }) => {
          const labelCls =
            accent === 'red' ? 'text-red-400' : 'text-zinc-500 dark:text-zinc-400';
          const valCls =
            accent === 'red' ? 'text-red-600 dark:text-red-400' : 'text-zinc-900 dark:text-zinc-100';
          return (
            <div key={label} className={`${card} p-4`}>
              <p className={`text-[10px] font-bold uppercase tracking-widest mb-3 ${labelCls}`}>{label}</p>
              <div className="space-y-2">
                <div>
                  <p className="text-[10px] text-zinc-400 dark:text-zinc-600 uppercase tracking-wider mb-0.5">Hoje</p>
                  <p className={`text-xl font-bold font-mono tabular-nums leading-none ${valCls}`}>{d}</p>
                </div>
                <div className="w-full h-px bg-zinc-100 dark:bg-white/[0.05]" />
                <div>
                  <p className="text-[10px] text-zinc-400 dark:text-zinc-600 uppercase tracking-wider mb-0.5">Mês</p>
                  <p className="text-sm font-mono tabular-nums text-zinc-500 dark:text-zinc-400 leading-none">{m}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Qualidades ── */}
      <div className={`${card} p-5`}>
        <div className="flex items-center justify-between mb-5">
          <p className="text-xs font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
            Qualidades
          </p>
          <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-indigo-500" />
              Hoje
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-zinc-600" />
              Mês
            </span>
          </div>
        </div>
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
          {QUALIDADES.map((q, i) => {
            const dp = day.pesoByQ[i];
            const mp = month.pesoByQ[i];
            const active = dp > 0 || mp > 0;
            const color = QUALIDADE_COLOR[q] ?? '#888';
            return (
              <div
                key={q}
                className={`rounded-lg border border-zinc-200 dark:border-white/[0.06] p-3 space-y-1.5 ${active ? '' : 'opacity-20'}`}
                style={{ borderLeftColor: color, borderLeftWidth: 3 }}
              >
                <p
                  className="text-[10px] font-bold uppercase tracking-wider leading-none"
                  style={{ color }}
                >
                  {QUALIDADE_LABELS[q as MetalQualidade]}
                </p>
                <p className={`text-2xl font-bold font-mono tabular-nums leading-none ${active ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-600'}`}>
                  {fmtN(dp, 1)}
                </p>
                <p className="text-sm font-mono tabular-nums text-zinc-400 dark:text-zinc-500 leading-none">
                  {fmtN(mp, 1)}
                </p>
                <div className="h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: active && mp > 0 ? `${Math.min(100, (dp / mp) * 100)}%` : '0%',
                      backgroundColor: color,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
