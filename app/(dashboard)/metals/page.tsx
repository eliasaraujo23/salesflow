'use client';

import React, { useMemo } from 'react';
import { useFirebase } from '@/components/firebase-provider';
import { MetalsEntryForm } from '@/components/metals/metals-entry-form';
import { MetalsChart } from '@/components/metals/metals-chart';
import { MetalsTable } from '@/components/metals/metals-table';

const METAL_CARD_STYLES = {
  ouro:    { border: 'border-amber-300/60 dark:border-amber-500/30',  badge: 'text-amber-500 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10' },
  prata:   { border: 'border-zinc-300/60 dark:border-zinc-500/30',    badge: 'text-zinc-500 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-700/40' },
  platina: { border: 'border-violet-300/60 dark:border-violet-500/30', badge: 'text-violet-500 dark:text-violet-400 bg-violet-50 dark:bg-violet-500/10' },
} as const;

type MetalType = 'ouro' | 'prata' | 'platina';

function metalDelta(m: ReturnType<typeof useFirebase>['metals'][number]): number {
  if (m.tipo === 'entrada') return m.chegou ?? m.peso ?? 0;
  return -(m.peso ?? 0);
}

function MetalKPICard({ metal, metals }: { metal: MetalType; metals: ReturnType<typeof useFirebase>['metals'] }) {
  const items = metals.filter((m) => m.metal === metal);
  const total = items.reduce((s, m) => s + metalDelta(m), 0);
  const byOrigem = (origem: string) =>
    items.filter((m) => m.origem === origem).reduce((s, m) => s + metalDelta(m), 0);

  const style = METAL_CARD_STYLES[metal];
  const label = metal.charAt(0).toUpperCase() + metal.slice(1);

  return (
    <div className={`bg-white dark:bg-zinc-900 border ${style.border} rounded-xl p-5`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
          {label}
        </span>
        <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded-full ${style.badge}`}>
          {label}
        </span>
      </div>
      <div className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 leading-none mb-1.5">
        {total.toFixed(2)}{' '}
        <span className="text-base font-semibold text-zinc-400 dark:text-zinc-500">g</span>
      </div>
      <div className="text-xs text-zinc-500 dark:text-zinc-400 space-x-3 mb-1">
        <span>Second: {byOrigem('second').toFixed(2)}g</span>
        <span>Scrap: {byOrigem('scrap').toFixed(2)}g</span>
      </div>
      <div className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
        saldo em estoque
      </div>
    </div>
  );
}

export default function MetalsPage() {
  const { metals, currentUser } = useFirebase();
  const isAdmin = currentUser?.role === 'admin';

  return (
    <div className="p-3 sm:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Controle de Metais</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          Ouro · Prata · Platina — Second Hand &amp; Scrap
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetalKPICard metal="ouro"    metals={metals} />
        <MetalKPICard metal="prata"   metals={metals} />
        <MetalKPICard metal="platina" metals={metals} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MetalsEntryForm />
        <MetalsChart metals={metals} />
      </div>

      <MetalsTable metals={metals} canDelete={isAdmin} />
    </div>
  );
}
