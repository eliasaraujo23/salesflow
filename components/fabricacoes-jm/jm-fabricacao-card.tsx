'use client';

import React from 'react';
import { Hammer } from 'lucide-react';
import { type JmPeca } from '@/lib/actions/fetch-jm-dashboard';

const TIPO_BADGE: Record<string, string> = {
  JRCP: 'bg-amber-500/20 text-amber-600 dark:text-amber-400',
  JMCP: 'bg-indigo-500/20 text-indigo-600 dark:text-indigo-400',
  JMSP: 'bg-violet-500/20 text-violet-600 dark:text-violet-400',
};

interface JmFabricacaoCardProps {
  pecas: JmPeca[];
}

export function JmFabricacaoCard({ pecas }: JmFabricacaoCardProps) {
  const totalPeso = pecas.reduce((s, p) => s + p.peso, 0);

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.06] rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <Hammer size={18} className="text-amber-500" />
        <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Em Fabricação</h3>
        <span className="ml-auto text-xs font-medium text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-950 px-2 py-0.5 rounded-full border border-zinc-200 dark:border-white/[0.06]">
          {pecas.length}
        </span>
      </div>

      {pecas.length > 0 && (
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-3">
          Peso total: <span className="font-semibold text-zinc-900 dark:text-zinc-100">{totalPeso.toFixed(3)}g</span>
        </p>
      )}

      {pecas.length === 0 ? (
        <div className="py-8 text-center text-zinc-500 dark:text-zinc-400 text-sm">Nenhuma peça em fabricação</div>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
          {pecas.map((p, i) => (
            <div key={i} className="flex items-center justify-between gap-3 p-2.5 bg-zinc-50 dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-white/[0.06]">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-indigo-600 dark:text-indigo-400">{p.referencia}</span>
                  {p.tipo && (
                    <span className={`px-1.5 py-0.5 rounded text-xs font-semibold ${TIPO_BADGE[p.tipo] ?? 'bg-zinc-200 dark:bg-white/[0.06] text-zinc-500 dark:text-zinc-400'}`}>
                      {p.tipo}
                    </span>
                  )}
                </div>
                {p.produto && <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate mt-0.5">{p.produto}</p>}
                {p.tipo_pedra && <p className="text-xs text-zinc-400 dark:text-zinc-500">{p.tipo_pedra}</p>}
              </div>
              <span className="text-xs text-zinc-500 dark:text-zinc-400 flex-shrink-0">{p.peso.toFixed(2)}g</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
