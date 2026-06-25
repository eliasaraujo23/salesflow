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
  const [openVariants, setOpenVariants] = useState<Set<number>>(new Set());

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

  function toggleVariants(catIdx: number) {
    setOpenVariants(prev => {
      const next = new Set(prev);
      if (next.has(catIdx)) next.delete(catIdx);
      else next.add(catIdx);
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
    const varOpen       = openVariants.has(row.catIdx);
    const hasVariants   = row.variants.length > 0 && !isGroupParent;
    const canExpand     = isGroupParent || (row.total > 0 && hasVariants);

    const indent = depth === 1 ? 'pl-8 pr-4' : 'px-4';
    const rowBg  = depth === 1
      ? 'bg-zinc-50/60 dark:bg-zinc-800/20'
      : '';

    return (
      <React.Fragment key={`${row.grupo}-${row.catIdx}`}>
        <tr
          onClick={() => {
            if (!canExpand) return;
            if (isGroupParent) toggleGroup(row.grupo);
            else toggleVariants(row.catIdx);
          }}
          className={`border-b border-zinc-100 dark:border-white/[0.04] transition-colors ${rowBg} ${
            canExpand ? 'cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/40' : ''
          }`}
        >
          <td className={`${indent} py-2.5`}>
            <span className={`flex items-center gap-1.5 ${depth === 1 ? 'text-[11px] text-zinc-600 dark:text-zinc-300' : 'text-xs font-semibold text-zinc-800 dark:text-zinc-200'}`}>
              {canExpand ? (
                (isGroupParent ? groupOpen : varOpen) ? (
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

        {/* Variant rows (pedras) — only for leaf rows */}
        {!isGroupParent && varOpen && hasVariants && row.variants.map((v, vi) => (
          <tr
            key={vi}
            className="border-b border-zinc-100 dark:border-white/[0.04] bg-zinc-50 dark:bg-zinc-800/30"
          >
            <td className="pl-12 pr-4 py-2 text-[11px] text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
              <span className="opacity-50 mr-1">└</span>
              {v.sub} · {v.pedra} · {v.lap}
            </td>
            {v.counts.map((c, pi) => (
              <td key={pi} className="px-2 py-2 text-center text-[11px] font-semibold">
                {c > 0 ? (
                  <span className="text-emerald-600 dark:text-emerald-400">{c}</span>
                ) : (
                  <span className="text-zinc-300 dark:text-zinc-600">·</span>
                )}
              </td>
            ))}
            <td className="px-3 py-2 text-center text-[11px] text-zinc-500 dark:text-zinc-400">
              {v.total}
            </td>
          </tr>
        ))}
      </React.Fragment>
    );
  }

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.13] rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm data-table">
          <thead>
            <tr className="bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-100 dark:border-white/[0.04]">
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
