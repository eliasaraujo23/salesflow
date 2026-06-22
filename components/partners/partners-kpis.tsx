'use client';

import React from 'react';

const fmtMoeda = (v: number) =>
  'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

interface PartnersKpisProps {
  partners: number;
  pecasEmCampo: number;
  vencidas: number;
  valorEmCampo: number;
}

export function PartnersKpis({ partners, pecasEmCampo, vencidas, valorEmCampo }: PartnersKpisProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-zinc-200 dark:bg-white/[0.06] rounded-xl overflow-hidden border border-zinc-200 dark:border-white/[0.06]">
      <KpiCell label="Parceiros" value={String(partners)} />
      <KpiCell label="Peças em Campo" value={String(pecasEmCampo)} />
      <KpiCell
        label="Vencidas >90d"
        value={String(vencidas)}
        valueClass={vencidas > 0 ? 'text-red-500 dark:text-red-400' : 'text-zinc-900 dark:text-zinc-100'}
      />
      <KpiCell
        label="Valor em Campo"
        value={fmtMoeda(valorEmCampo)}
        valueClass="text-emerald-600 dark:text-emerald-400"
      />
    </div>
  );
}

interface KpiCellProps {
  label: string;
  value: string;
  valueClass?: string;
}

function KpiCell({ label, value, valueClass = 'text-zinc-900 dark:text-zinc-100' }: KpiCellProps) {
  return (
    <div className="bg-white dark:bg-zinc-900 px-5 py-4">
      <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-1">
        {label}
      </div>
      <div className={`text-2xl font-bold leading-none ${valueClass}`}>{value}</div>
    </div>
  );
}
