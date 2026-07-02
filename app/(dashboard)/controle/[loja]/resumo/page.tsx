'use client';

import React, { useMemo, useState } from 'react';
import { notFound, useParams } from 'next/navigation';
import { Timestamp } from 'firebase/firestore';
import { getLojaConfig, type LojaCode } from '@/lib/controle-config';
import { useMetal } from '@/hooks/use-metal';
import { useDespesas } from '@/hooks/use-despesas';
import { useEntradasPg } from '@/hooks/use-entradas-pg';
import { Loader2, Vault } from 'lucide-react';
import { MetalPanel } from '@/components/controle/metal-panel';

function formatBRL(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function toDate(ts: Timestamp | null | undefined): Date {
  if (!ts) return new Date(0);
  return ts instanceof Timestamp ? ts.toDate() : new Date();
}

export default function ResumoPage() {
  const { loja: lojaCode } = useParams<{ loja: string }>();
  const loja = getLojaConfig(lojaCode);
  if (!loja) notFound();

  const [now] = useState(() => new Date());
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const { records: metalRecords, loading: metalLoading } = useMetal(loja.code as LojaCode);
  const { records: despesas, loading: despLoading } = useDespesas(loja.code as LojaCode);
  const { data: entradas = [], isLoading: entLoading } = useEntradasPg(
    loja.code as LojaCode, currentYear, currentMonth,
  );

  const todayRecords = useMemo(() => {
    const d = now.getDate(), m = now.getMonth(), y = now.getFullYear();
    return metalRecords.filter(r => {
      const rd = toDate(r.data);
      return rd.getFullYear() === y && rd.getMonth() === m && rd.getDate() === d;
    });
  }, [metalRecords, now]);

  const monthRecords = useMemo(() => {
    const m = now.getMonth(), y = now.getFullYear();
    return metalRecords.filter(r => {
      const rd = toDate(r.data);
      return rd.getFullYear() === y && rd.getMonth() === m;
    });
  }, [metalRecords, now]);

  const totalEntradas = useMemo(() => entradas.reduce((s, r) => s + r.valor, 0), [entradas]);

  const totalDespesas = useMemo(() => {
    const monthStart = new Date(currentYear, currentMonth - 1, 1);
    return despesas
      .filter(r => toDate(r.data) >= monthStart)
      .reduce((s, r) => s + r.valor, 0);
  }, [despesas, currentYear, currentMonth]);

  const monthValor = useMemo(
    () => monthRecords.filter(r => r.transacao === 'COMPRA').reduce((s, r) => s + r.valor, 0),
    [monthRecords],
  );

  const saldoKey = `saldo_ini_${lojaCode}_${currentYear}-${String(currentMonth).padStart(2, '0')}`;
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

  const loading = metalLoading || despLoading || entLoading;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 gap-2 text-zinc-400 text-sm">
        <Loader2 size={15} className="animate-spin" /> Carregando...
      </div>
    );
  }

  const saldoFinal = saldoInicial + totalEntradas - monthValor - totalDespesas;

  return (
    <div className="p-5 space-y-6">
      {/* Controle de Metal */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-3">
          Controle de Metal
        </p>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <MetalPanel title="DIA" records={todayRecords} />
          <MetalPanel title="MÊS" records={monthRecords} showMetaNova />
        </div>
      </div>

      {/* Fluxo de Caixa */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Vault size={14} className="text-zinc-400" />
          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            Fluxo de Caixa — Mês
          </p>
        </div>
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.08] rounded-xl overflow-hidden max-w-md">
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
                <td className="px-4 py-3 text-emerald-600 dark:text-emerald-400 font-medium">(+) Entradas</td>
                <td className="px-4 py-3 text-right font-mono font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                  {formatBRL(totalEntradas)}
                </td>
              </tr>
              <tr className="border-b border-zinc-100 dark:border-white/[0.04]">
                <td className="px-4 py-3 text-red-500 dark:text-red-400 font-medium">(-) Metal Comprado</td>
                <td className="px-4 py-3 text-right font-mono font-semibold tabular-nums text-red-500 dark:text-red-400">
                  {formatBRL(monthValor)}
                </td>
              </tr>
              <tr className="border-b border-zinc-100 dark:border-white/[0.04]">
                <td className="px-4 py-3 text-red-500 dark:text-red-400 font-medium">(-) Despesas</td>
                <td className="px-4 py-3 text-right font-mono font-semibold tabular-nums text-red-500 dark:text-red-400">
                  {formatBRL(totalDespesas)}
                </td>
              </tr>
              <tr className="bg-zinc-50 dark:bg-zinc-800/50">
                <td className="px-4 py-3 font-bold text-zinc-800 dark:text-zinc-100">(=) Saldo Final</td>
                <td className={`px-4 py-3 text-right font-mono font-bold tabular-nums text-base ${
                  saldoFinal >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'
                }`}>
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
