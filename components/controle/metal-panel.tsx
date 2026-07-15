'use client';

import React from 'react';
import { type MetalRecord, QUALIDADES, QUALIDADE_LABELS, type MetalQualidade } from '@/types/controle';

interface Props {
  title: string;
  records: MetalRecord[];
  showMetaNova?: boolean;
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

export function MetalPanel({ title, records, showMetaNova = false }: Props) {
  const compras = records.filter(r => r.transacao === 'COMPRA');
  const naoCompras = records.filter(r => r.transacao === 'NAO_COMPRA');

  const bijuteria = records.filter(r => (r.bx ?? 0) > 0).length;
  const semBijuteria = records.length - bijuteria;
  const totalCompras = compras.length;
  const comprasSemBX = compras.filter(r => (r.bx ?? 0) === 0).length;

  const pesoOuro = compras.reduce((s, r) => s + r.total_peso, 0);
  const ouroPlatina = compras.reduce((s, r) =>
    s + (r.ouro_24k ?? 0) + (r.ouro_22k ?? 0) + (r.pt ?? 0) +
    (r.ouro_750 ?? 0) + (r.ouro_720 ?? 0) + (r.platina ?? 0), 0);
  const valorGasto = compras.reduce((s, r) => s + r.valor, 0);
  const mediaPreco = pesoOuro > 0 ? valorGasto / pesoOuro : 0;
  const pesoSemVenda = naoCompras.reduce((s, r) => s + r.total_peso, 0);
  const conversao = semBijuteria > 0 ? comprasSemBX / semBijuteria : 0;
  const metaNova = totalCompras > 0
    ? compras.filter(r => r.pago_por_grama > 0 && r.pago_por_grama <= 250).length / totalCompras
    : 0;

  const pesoByQ = QUALIDADES.map(q => ({
    label: QUALIDADE_LABELS[q as MetalQualidade],
    peso: compras.reduce((s, r) => s + ((r[q as MetalQualidade] as number) ?? 0), 0),
  }));

  const stats: Array<{ label: string; value: string; red?: boolean; highlight?: boolean }> = [
    { label: 'Peso Ouro', value: fmtN(pesoOuro, 2) + 'g' },
    { label: 'Total Avaliações', value: String(records.length) },
    { label: 'Ouro + Platina', value: fmtN(ouroPlatina, 2) + 'g' },
    { label: 'Total Compras', value: String(totalCompras) },
    { label: 'Valor Gasto', value: fmtBRL(valorGasto) },
    { label: 'Sem Bijuteria', value: String(semBijuteria) },
    { label: 'Média Preço', value: fmtBRL(mediaPreco) },
    { label: 'Bijuteria', value: String(bijuteria) },
    { label: 'Peso Sem Venda', value: pesoSemVenda > 0 ? fmtN(pesoSemVenda, 2) + 'g' : '—', red: true },
    { label: 'Conversão', value: fmtPct(conversao) },
    ...(showMetaNova ? [{ label: 'Meta Nova', value: fmtPct(metaNova), highlight: true }] : []),
  ];

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.08] rounded-xl overflow-hidden">
      <div className="bg-zinc-800 dark:bg-zinc-700 px-4 py-2 text-center">
        <span className="text-[11px] font-bold uppercase tracking-widest text-zinc-200">{title}</span>
      </div>

      <div className="grid grid-cols-2 divide-x divide-zinc-100 dark:divide-white/[0.06]">
        {/* Quality weights */}
        <table className="w-full data-table">
          <thead>
            <tr className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-100 dark:border-white/[0.04]">
              <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-zinc-400">Qualidade</th>
              <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-wider text-zinc-400">Peso</th>
            </tr>
          </thead>
          <tbody>
            {pesoByQ.map(({ label, peso }) => (
              <tr key={label} className="border-b border-zinc-50 dark:border-white/[0.02] last:border-0">
                <td className="px-3 py-[6px] text-[12px] font-medium text-zinc-500 dark:text-zinc-400">{label}</td>
                <td className={`px-3 py-[6px] text-right font-mono text-[12px] tabular-nums ${
                  peso > 0
                    ? 'font-semibold text-zinc-900 dark:text-zinc-100'
                    : 'text-zinc-300 dark:text-zinc-600'
                }`}>
                  {fmtN(peso)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Stats */}
        <table className="w-full data-table">
          <thead>
            <tr className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-100 dark:border-white/[0.04]">
              <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-zinc-400 invisible">–</th>
              <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-wider text-zinc-400 invisible">–</th>
            </tr>
          </thead>
          <tbody>
            {stats.map(s => (
              <tr
                key={s.label}
                className={`border-b border-zinc-50 dark:border-white/[0.02] last:border-0 ${
                  s.red ? 'bg-red-50 dark:bg-red-500/10' :
                  s.highlight ? 'bg-violet-50 dark:bg-violet-500/10' : ''
                }`}
              >
                <td className="px-3 py-[6px] text-[11px] text-zinc-500 dark:text-zinc-400 whitespace-nowrap">{s.label}</td>
                <td className={`px-3 py-[6px] text-right font-mono text-[12px] font-semibold tabular-nums ${
                  s.red ? 'text-red-600 dark:text-red-400' :
                  s.highlight ? 'text-violet-700 dark:text-violet-400' :
                  'text-zinc-900 dark:text-zinc-100'
                }`}>
                  {s.value}
                </td>
              </tr>
            ))}
            {/* Pad remaining rows if stats < pesoByQ */}
            {Array.from({ length: Math.max(0, pesoByQ.length - stats.length) }).map((_, i) => (
              <tr key={`pad-${i}`} className="border-b border-zinc-50 dark:border-white/[0.02] last:border-0">
                <td className="px-3 py-[6px]">&nbsp;</td>
                <td />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
