'use client';

import React from 'react';
import { type GapRedist } from '@/hooks/use-partners';

function shortName(n: string): string {
  const parts = n.split(' ');
  return parts.length <= 2 ? n : parts.slice(0, 2).join(' ');
}

function diasClass(dias: number): string {
  if (dias > 90) return 'text-red-500 dark:text-red-400';
  if (dias >= 75) return 'text-amber-500 dark:text-amber-400';
  return 'text-zinc-500 dark:text-zinc-400';
}

interface RedistCellProps {
  redistFrom: GapRedist[];
  limit?: number;
}

export function RedistCell({ redistFrom, limit = 2 }: RedistCellProps) {
  if (redistFrom.length === 0) {
    return <span className="text-zinc-300 dark:text-zinc-600">—</span>;
  }

  return (
    <div className="space-y-1.5">
      {redistFrom.slice(0, limit).map(r => (
        <div key={r.partner} className="flex items-center gap-1.5 flex-wrap">
          <span className="font-semibold text-amber-600 dark:text-amber-400">
            {shortName(r.partner)} ×{r.count}
          </span>
          <span className="text-zinc-300 dark:text-zinc-600">→</span>
          <span className="font-mono text-zinc-600 dark:text-zinc-400">
            {r.oldest.referencia || '—'}
          </span>
          {r.oldest.tipo && (
            <span className="text-[9px] font-bold px-1 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400">
              {r.oldest.tipo}
            </span>
          )}
          <span className={`font-semibold ${diasClass(r.oldest.dias_campo)}`}>
            {r.oldest.dias_campo}d
          </span>
        </div>
      ))}
      {redistFrom.length > limit && (
        <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
          +{redistFrom.length - limit} outros
        </span>
      )}
    </div>
  );
}
