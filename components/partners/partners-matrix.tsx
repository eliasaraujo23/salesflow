'use client';

import React, { useState, useEffect } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { type MatrixRow } from '@/hooks/use-partners';

function shortName(n: string): string {
  return n.split(' ').slice(0, 2).join(' ');
}

function toTitleCase(s: string): string {
  return s.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}

interface PartnersMatrixProps {
  rows: MatrixRow[];
  partners: string[];
}

export function PartnersMatrix({ rows, partners }: PartnersMatrixProps) {
  const [openGroups, setOpenGroups]     = useState<Set<string>>(
    () => new Set(rows.filter(r => (r.children?.length ?? 0) > 1).map(r => r.grupo))
  );

  // Abre automaticamente grupos novos quando rows mudar (ex: carros-chefe carregando do Firestore)
  useEffect(() => {
    setOpenGroups(prev => {
      const next = new Set(prev);
      rows.filter(r => (r.children?.length ?? 0) > 1).forEach(r => next.add(r.grupo));
      return next;
    });
  }, [rows]);

  function toggleGroup(grupo: string) {
    setOpenGroups(prev => {
      const next = new Set(prev);
      if (next.has(grupo)) next.delete(grupo);
      else next.add(grupo);
      return next;
    });
  }

  function renderCountCells(counts: number[]) {
    return counts.map((c, pi) => (
      <td key={pi} className="px-2 py-2.5">
        <span className={`block text-center text-xs font-bold rounded px-1 py-0.5 ${
          c > 0
            ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
            : 'bg-red-500/10 text-red-500 dark:text-red-400'
        }`}>
          {c > 0 ? c : '—'}
        </span>
      </td>
    ));
  }

  function renderRow(row: MatrixRow, depth = 0) {
    const isGroupParent = (row.children?.length ?? 0) > 1;
    const groupOpen     = openGroups.has(row.grupo);
    const canExpand     = isGroupParent;

    const indent = depth === 1 ? 'pl-8 pr-4' : 'px-4';
    const rowBg  = depth === 1
      ? 'bg-zinc-50/60 dark:bg-zinc-800/20'
      : '';

    return (
      <React.Fragment key={`${row.grupo}-${row.catIdx}`}>
        <tr
          onClick={() => {
            if (!canExpand) return;
            toggleGroup(row.grupo);
          }}
          className={`border-b border-zinc-100 dark:border-white/[0.04] transition-colors ${rowBg} ${
            canExpand ? 'cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/40' : ''
          }`}
        >
          <td className={`${indent} py-2.5`}>
            <span className={`flex items-center gap-1.5 ${depth === 1 ? 'text-[11px] text-zinc-600 dark:text-zinc-300' : 'text-xs font-semibold text-zinc-800 dark:text-zinc-200'}`}>
              {canExpand ? (
                groupOpen ? (
                  <ChevronDown size={11} className="text-zinc-400 shrink-0" />
                ) : (
                  <ChevronRight size={11} className="text-zinc-400 shrink-0" />
                )
              ) : (
                <span className="w-[11px] shrink-0" />
              )}
              {depth === 1 ? (
                <><span className="opacity-30 mr-0.5">└</span> {row.label}</>
              ) : row.label}
            </span>
          </td>
          {renderCountCells(row.counts)}
          <td className={`px-3 py-2.5 text-center font-bold ${
            depth === 1
              ? 'text-[11px] text-zinc-500 dark:text-zinc-400'
              : 'text-xs text-amber-600 dark:text-amber-400'
          }`}>
            {row.total || '—'}
          </td>
        </tr>

        {/* Children rows (subtipos) */}
        {isGroupParent && groupOpen && row.children!.map(child =>
          renderRow(child, depth + 1)
        )}

      </React.Fragment>
    );
  }

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.13] rounded-xl overflow-hidden">
      <div className="overflow-x-auto overflow-y-auto max-h-[70vh]">
        <table className="w-full text-sm data-table">
          <thead className="sticky top-0 z-10">
            <tr className="bg-zinc-50 dark:bg-zinc-800 border-b border-zinc-100 dark:border-white/[0.04]">
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-zinc-500 dark:text-zinc-400 whitespace-nowrap min-w-[160px]">
                ★ Categoria
              </th>
              {partners.map(p => (
                <th key={p} className="px-2 py-2.5 text-center text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                  {shortName(p)}
                </th>
              ))}
              <th className="px-3 py-2.5 text-center text-xs font-semibold text-amber-600 dark:text-amber-400 whitespace-nowrap">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => renderRow(row))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
