'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { type PartnerConsignment } from '@/lib/actions/fetch-partners';

function diasClass(dias: number): string {
  if (dias > 90) return 'text-red-500 dark:text-red-400';
  if (dias >= 75) return 'text-amber-500 dark:text-amber-400';
  return 'text-zinc-500 dark:text-zinc-400';
}

interface PieceRefsChipProps {
  label: string;
  count: number;
  tipos: string[];
  pieces: PartnerConsignment[];
  colorClass: string;
}

export function PieceRefsChip({ label, count, tipos, pieces, colorClass }: PieceRefsChipProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="inline-block">
      <button
        onClick={() => setOpen(o => !o)}
        className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded transition-colors ${colorClass}`}
      >
        {open ? <ChevronDown size={9} /> : <ChevronRight size={9} />}
        {label}
        {count > 1 && <span className="opacity-70">×{count}</span>}
        <span className="opacity-50">{tipos.join('/')}</span>
      </button>
      {open && (
        <div className="mt-1 mb-1 ml-3 space-y-0.5 border-l border-zinc-200 dark:border-white/[0.08] pl-2">
          {pieces.map((p, i) => (
            <div key={`${p.referencia}-${i}`} className="flex items-center gap-1.5 flex-wrap text-[10px]">
              <span className="font-mono font-semibold text-indigo-600 dark:text-indigo-400">
                {p.referencia || '—'}
              </span>
              {p.tipo && (
                <span className="text-[9px] font-bold px-1 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400">
                  {p.tipo}
                </span>
              )}
              <span className={`font-semibold ${diasClass(p.dias_campo)}`}>{p.dias_campo}d</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
