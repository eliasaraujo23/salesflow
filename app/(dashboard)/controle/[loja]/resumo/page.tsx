'use client';

import React, { useMemo, useState } from 'react';
import { notFound, useParams } from 'next/navigation';
import { Timestamp } from 'firebase/firestore';
import { getLojaConfig } from '@/lib/controle-config';
import { useMetal } from '@/hooks/use-metal';
import { useDespesas } from '@/hooks/use-despesas';
import { useLancamentos } from '@/hooks/use-lancamentos';
import { type LojaCode } from '@/lib/controle-config';
import { QUALIDADES, QUALIDADE_LABELS } from '@/types/controle';
import { Loader2, TrendingUp, Scale, Package, DollarSign, Target, Vault } from 'lucide-react';

function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatGrams(value: number): string {
  return value.toFixed(3) + 'g';
}

function formatPct(value: number): string {
  return (value * 100).toFixed(1) + '%';
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

interface KpiCardProps {
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  color: string;
}

function KpiCard({ label, value, sub, icon, color }: KpiCardProps) {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.08] rounded-xl p-4">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-3 ${color}`}>
        {icon}
      </div>
      <div className="text-xl font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">{value}</div>
      <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{label}</div>
      {sub && <div className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-1">{sub}</div>}
    </div>
  );
}

export default function ResumoPage() {
  const { loja: lojaCode } = useParams<{ loja: string }>();
  const loja = getLojaConfig(lojaCode);
  if (!loja) notFound();

  const { records: metalRecords, loading: metalLoading } = useMetal(loja.code as LojaCode);
  const { records: despesas, loading: despLoading } = useDespesas(loja.code as LojaCode);
  const { records: lancamentos, loading: lancLoading } = useLancamentos(loja.code as LojaCode);

  const now = new Date();
  const todayStart = startOfDay(now);
  const monthStart = startOfMonth(now);

  const saldoKey = `saldo_inicial_${lojaCode}_${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const [saldoInicial, setSaldoInicial] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      return parseFloat(localStorage.getItem(saldoKey) ?? '0') || 0;
    }
    return 0;
  });

  function updateSaldoInicial(val: number) {
    localStorage.setItem(saldoKey, String(val));
    setSaldoInicial(val);
  }

  const kpis = useMemo(() => {
    const toDate = (ts: Timestamp | null | undefined): Date => {
      if (!ts) return new Date(0);
      return ts instanceof Timestamp ? ts.toDate() : new Date();
    };

    const today = metalRecords.filter(r => toDate(r.data) >= todayStart);
    const month = metalRecords.filter(r => toDate(r.data) >= monthStart);

    const todaySemBX = today.filter(r => !r.bx || r.bx === 0);
    const monthSemBX = month.filter(r => !r.bx || r.bx === 0);

    const todayConversao = todaySemBX.length > 0
      ? todaySemBX.filter(r => r.transacao === 'COMPRA').length / todaySemBX.length
      : 0;
    const monthConversao = monthSemBX.length > 0
      ? monthSemBX.filter(r => r.transacao === 'COMPRA').length / monthSemBX.length
      : 0;

    const todayPesoCompra = today.filter(r => r.transacao === 'COMPRA').reduce((s, r) => s + r.total_peso, 0);
    const monthPesoCompra = month.filter(r => r.transacao === 'COMPRA').reduce((s, r) => s + r.total_peso, 0);

    const todayValor = today.filter(r => r.transacao === 'COMPRA').reduce((s, r) => s + r.valor, 0);
    const monthValor = month.filter(r => r.transacao === 'COMPRA').reduce((s, r) => s + r.valor, 0);

    const todayPesoSemVenda = today.filter(r => r.transacao === 'NAO_COMPRA').reduce((s, r) => s + r.total_peso, 0);
    const monthPesoSemVenda = month.filter(r => r.transacao === 'NAO_COMPRA').reduce((s, r) => s + r.total_peso, 0);

    const todayBijuteria = today.filter(r => r.bx > 0).length;
    const monthBijuteria = month.filter(r => r.bx > 0).length;

    const todayTotal = today.length;
    const monthTotal = month.length;

    const totalDespesas = despesas
      .filter(r => toDate(r.data) >= monthStart)
      .reduce((s, r) => s + r.valor, 0);

    const totalEntradas = lancamentos
      .filter(r => toDate(r.data) >= monthStart)
      .reduce((s, r) => s + r.valor, 0);

    const monthCompras = month.filter(r => r.transacao === 'COMPRA');
    const metaNovaTotal = monthCompras.length;
    const metaNovaHit = monthCompras.filter(r => r.pago_por_grama > 0 && r.pago_por_grama <= 250).length;
    const metaNova = metaNovaTotal > 0 ? metaNovaHit / metaNovaTotal : 0;

    const teoresMonth = QUALIDADES.map(q => {
      const peso = month
        .filter(r => r.transacao === 'COMPRA')
        .reduce((s, r) => s + (r[q] ?? 0), 0);
      return { qualidade: q, label: QUALIDADE_LABELS[q], peso };
    });

    return {
      todayConversao, monthConversao,
      todayPesoCompra, monthPesoCompra,
      todayValor, monthValor,
      todayPesoSemVenda, monthPesoSemVenda,
      todayBijuteria, monthBijuteria,
      todayTotal, monthTotal,
      totalDespesas, totalEntradas,
      metaNova,
      teoresMonth,
    };
  }, [metalRecords, despesas, lancamentos, todayStart, monthStart]);

  const loading = metalLoading || despLoading || lancLoading;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 gap-2 text-zinc-400 text-sm">
        <Loader2 size={15} className="animate-spin" /> Carregando...
      </div>
    );
  }

  const saldoFinal = saldoInicial + kpis.totalEntradas - kpis.monthValor - kpis.totalDespesas;

  return (
    <div className="p-5 space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Scale size={14} className="text-zinc-400" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Metal — Hoje</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <KpiCard
            label="Conversão (sem BX)"
            value={formatPct(kpis.todayConversao)}
            sub={`${kpis.todayTotal} atendimentos`}
            icon={<TrendingUp size={14} className="text-emerald-600" />}
            color="bg-emerald-50 dark:bg-emerald-500/10"
          />
          <KpiCard
            label="Peso Comprado"
            value={formatGrams(kpis.todayPesoCompra)}
            sub={formatBRL(kpis.todayValor)}
            icon={<Scale size={14} className="text-indigo-600" />}
            color="bg-indigo-50 dark:bg-indigo-500/10"
          />
          <KpiCard
            label="Peso Sem Venda (NC)"
            value={formatGrams(kpis.todayPesoSemVenda)}
            icon={<Package size={14} className="text-amber-600" />}
            color="bg-amber-50 dark:bg-amber-500/10"
          />
          <KpiCard
            label="Bijuteria"
            value={String(kpis.todayBijuteria)}
            sub="atendimentos com BX"
            icon={<Package size={14} className="text-zinc-500" />}
            color="bg-zinc-100 dark:bg-zinc-800"
          />
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-3">
          <Scale size={14} className="text-zinc-400" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Metal — Mês</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <KpiCard
            label="Conversão (sem BX)"
            value={formatPct(kpis.monthConversao)}
            sub={`${kpis.monthTotal} atendimentos`}
            icon={<TrendingUp size={14} className="text-emerald-600" />}
            color="bg-emerald-50 dark:bg-emerald-500/10"
          />
          <KpiCard
            label="Peso Comprado"
            value={formatGrams(kpis.monthPesoCompra)}
            sub={formatBRL(kpis.monthValor)}
            icon={<Scale size={14} className="text-indigo-600" />}
            color="bg-indigo-50 dark:bg-indigo-500/10"
          />
          <KpiCard
            label="Peso Sem Venda (NC)"
            value={formatGrams(kpis.monthPesoSemVenda)}
            icon={<Package size={14} className="text-amber-600" />}
            color="bg-amber-50 dark:bg-amber-500/10"
          />
          <KpiCard
            label="Despesas Mês"
            value={formatBRL(kpis.totalDespesas)}
            icon={<DollarSign size={14} className="text-red-500" />}
            color="bg-red-50 dark:bg-red-500/10"
          />
          <KpiCard
            label="Meta Nova (≤ R$250/g)"
            value={formatPct(kpis.metaNova)}
            sub="compras ≤ 250/g"
            icon={<Target size={14} className="text-violet-600" />}
            color="bg-violet-50 dark:bg-violet-500/10"
          />
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-3">
          <Scale size={14} className="text-zinc-400" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Breakdown por Teor — Mês</h2>
        </div>
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.08] rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-100 dark:border-white/[0.04]">
                <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-zinc-400">Qualidade</th>
                <th className="px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider text-zinc-400">Peso (g)</th>
                <th className="px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider text-zinc-400">% do Total</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                const totalPeso = kpis.teoresMonth.reduce((s, t) => s + t.peso, 0);
                return kpis.teoresMonth.filter(t => t.peso > 0).map(t => (
                  <tr key={t.qualidade} className="border-b border-zinc-50 dark:border-white/[0.02] last:border-0">
                    <td className="px-4 py-2.5 font-medium text-zinc-700 dark:text-zinc-300">{t.label}</td>
                    <td className="px-4 py-2.5 text-right font-mono tabular-nums text-zinc-800 dark:text-zinc-200">{t.peso.toFixed(3)}g</td>
                    <td className="px-4 py-2.5 text-right font-mono tabular-nums text-zinc-500 dark:text-zinc-400">
                      {totalPeso > 0 ? ((t.peso / totalPeso) * 100).toFixed(1) + '%' : '—'}
                    </td>
                  </tr>
                ));
              })()}
              {kpis.teoresMonth.every(t => t.peso === 0) && (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-zinc-400 text-sm">Nenhuma compra no mês</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-3">
          <Vault size={14} className="text-zinc-400" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Fluxo de Caixa — Mês</h2>
        </div>
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.08] rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <tbody>
              <tr className="border-b border-zinc-100 dark:border-white/[0.04]">
                <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400 font-medium">Saldo Inicial</td>
                <td className="px-4 py-3 text-right">
                  <input
                    type="number"
                    step="0.01"
                    value={saldoInicial}
                    onChange={e => updateSaldoInicial(parseFloat(e.target.value) || 0)}
                    className="w-36 px-2 py-1 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-white/[0.08] rounded-lg text-sm text-right font-mono tabular-nums text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </td>
              </tr>
              <tr className="border-b border-zinc-100 dark:border-white/[0.04]">
                <td className="px-4 py-3 text-emerald-600 dark:text-emerald-400 font-medium">(+) Entradas / Lançamentos</td>
                <td className="px-4 py-3 text-right font-mono font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                  {formatBRL(kpis.totalEntradas)}
                </td>
              </tr>
              <tr className="border-b border-zinc-100 dark:border-white/[0.04]">
                <td className="px-4 py-3 text-red-500 dark:text-red-400 font-medium">(-) Metal Comprado</td>
                <td className="px-4 py-3 text-right font-mono font-semibold tabular-nums text-red-500 dark:text-red-400">
                  {formatBRL(kpis.monthValor)}
                </td>
              </tr>
              <tr className="border-b border-zinc-100 dark:border-white/[0.04]">
                <td className="px-4 py-3 text-red-500 dark:text-red-400 font-medium">(-) Despesas</td>
                <td className="px-4 py-3 text-right font-mono font-semibold tabular-nums text-red-500 dark:text-red-400">
                  {formatBRL(kpis.totalDespesas)}
                </td>
              </tr>
              <tr className="bg-zinc-50 dark:bg-zinc-800/50">
                <td className="px-4 py-3 font-bold text-zinc-800 dark:text-zinc-100">(=) Saldo Final</td>
                <td className={`px-4 py-3 text-right font-mono font-bold tabular-nums text-lg ${saldoFinal >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
                  {formatBRL(saldoFinal)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
