'use client';

import React, { useMemo, useState } from 'react';
import { notFound, useParams } from 'next/navigation';
import { Timestamp } from 'firebase/firestore';
import { getLojaConfig } from '@/lib/controle-config';
import { useMetal } from '@/hooks/use-metal';
import { useDespesas } from '@/hooks/use-despesas';
import { useLancamentos } from '@/hooks/use-lancamentos';
import { type LojaCode } from '@/lib/controle-config';
import { Loader2, TrendingUp, Scale, Package, DollarSign, ChevronDown, ChevronUp } from 'lucide-react';

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
  const [showCaixaDetail, setShowCaixaDetail] = useState(false);

  const now = new Date();
  const todayStart = startOfDay(now);
  const monthStart = startOfMonth(now);

  const kpis = useMemo(() => {
    const toDate = (ts: Timestamp | null | undefined): Date => {
      if (!ts) return new Date(0);
      return ts instanceof Timestamp ? ts.toDate() : new Date();
    };

    const today = metalRecords.filter(r => toDate(r.data) >= todayStart);
    const month = metalRecords.filter(r => toDate(r.data) >= monthStart);

    // Sem bijuteria = BX == 0
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

    // Financeiro mês
    const totalDespesas = despesas
      .filter(r => toDate(r.data) >= monthStart)
      .reduce((s, r) => s + r.valor, 0);

    const totalEntradas = lancamentos
      .filter(r => r.tipo === 'Entrada' && toDate(r.data) >= monthStart)
      .reduce((s, r) => s + r.valor, 0);

    return {
      todayConversao, monthConversao,
      todayPesoCompra, monthPesoCompra,
      todayValor, monthValor,
      todayPesoSemVenda, monthPesoSemVenda,
      todayBijuteria, monthBijuteria,
      todayTotal, monthTotal,
      totalDespesas, totalEntradas,
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

  return (
    <div className="p-5 space-y-6">
      {/* Metal KPIs */}
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
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
        </div>
      </div>

      {/* Caixa Summary */}
      <div>
        <button
          onClick={() => setShowCaixaDetail(v => !v)}
          className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors mb-3"
        >
          <DollarSign size={14} />
          Controle de Caixa — Lançamentos
          {showCaixaDetail ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </button>

        {showCaixaDetail && (
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.08] rounded-xl overflow-hidden">
            {lancamentos.length === 0 ? (
              <div className="py-8 text-center text-sm text-zinc-400">Nenhum lançamento registrado</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-100 dark:border-white/[0.04]">
                    <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-zinc-400">Data</th>
                    <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-zinc-400">Tipo</th>
                    <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-zinc-400">Banco/Caixa</th>
                    <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-zinc-400">Descrição</th>
                    <th className="px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider text-zinc-400">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {lancamentos.slice(0, 10).map(l => {
                    const d = l.data instanceof Timestamp ? l.data.toDate() : new Date();
                    return (
                      <tr key={l.id} className="border-b border-zinc-50 dark:border-white/[0.02] last:border-0">
                        <td className="px-4 py-2.5 text-zinc-600 dark:text-zinc-400 tabular-nums">
                          {d.toLocaleDateString('pt-BR')}
                        </td>
                        <td className="px-4 py-2.5">
                          <span className={`inline-flex px-2 py-0.5 rounded text-[11px] font-medium ${
                            l.tipo === 'Entrada'
                              ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                              : 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400'
                          }`}>
                            {l.tipo}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-zinc-600 dark:text-zinc-400">{l.banco}</td>
                        <td className="px-4 py-2.5 text-zinc-500 dark:text-zinc-500 text-xs">{l.descricao}</td>
                        <td className="px-4 py-2.5 text-right font-mono font-medium text-zinc-800 dark:text-zinc-200 tabular-nums">
                          {formatBRL(l.valor)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
