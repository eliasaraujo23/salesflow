'use client';

import React from 'react';
import { Card, CardHeader, CardTitle } from '@/components/card';

type Peca = {
  referencia: string;
  subtipo?: string | null;
  tipo_pedra?: string | null;
  dias: number;
};

function diasVariant(d: number): string {
  if (d <= 15) return 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400';
  if (d <= 30) return 'bg-amber-500/15 text-amber-600 dark:text-amber-400';
  if (d <= 60) return 'bg-orange-400/15 text-orange-400';
  return 'bg-red-500/15 text-red-600 dark:text-red-400';
}

interface FabFabricacaoCardProps {
  pecas: Peca[];
  expanded?: boolean;
}

export function FabFabricacaoCard({ pecas, expanded }: FabFabricacaoCardProps) {
  return (
    <Card variant="bordered">
      <CardHeader>
        <CardTitle className="text-sm">🔨 Em Fabricação Agora</CardTitle>
        <span className="text-xs bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 px-2.5 py-1 rounded-full font-semibold">
          {pecas.length}
        </span>
      </CardHeader>
      <div className={expanded ? 'overflow-y-auto' : 'max-h-80 overflow-y-auto'}>
        {pecas.length === 0 ? (
          <div className="py-8 text-center text-zinc-500 dark:text-zinc-400 text-sm">Nenhuma peça em fabricação</div>
        ) : (
          pecas.map((p, i) => (
            <div
              key={i}
              className="flex items-center justify-between px-5 py-3 border-b border-zinc-200/50 dark:border-white/[0.03] hover:bg-zinc-100 dark:hover:bg-white/[0.03] transition-colors gap-3"
            >
              <div>
                <div className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">{p.referencia}</div>
                {p.subtipo && <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{p.subtipo}</div>}
                {p.tipo_pedra && <div className="text-xs text-indigo-600 dark:text-indigo-400 mt-0.5">{p.tipo_pedra}</div>}
              </div>
              <span className={`text-xs font-bold px-2.5 py-1 rounded-lg whitespace-nowrap ${diasVariant(p.dias)}`}>
                {p.dias}d
              </span>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
