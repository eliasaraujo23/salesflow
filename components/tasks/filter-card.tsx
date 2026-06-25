'use client';

import React from 'react';

type Variant = 'blue' | 'green' | 'amber' | 'red' | 'purple' | 'indigo';

const VARIANTS: Record<Variant, { strip: string; value: string; ring: string; activeBg: string }> = {
  blue:   { strip: 'bg-indigo-500',  value: 'text-indigo-600 dark:text-indigo-400',   ring: 'ring-indigo-400 dark:ring-indigo-500',   activeBg: 'bg-indigo-50 dark:bg-indigo-500/10' },
  indigo: { strip: 'bg-indigo-500',  value: 'text-indigo-600 dark:text-indigo-400',   ring: 'ring-indigo-400 dark:ring-indigo-500',   activeBg: 'bg-indigo-50 dark:bg-indigo-500/10' },
  green:  { strip: 'bg-emerald-500', value: 'text-emerald-600 dark:text-emerald-400', ring: 'ring-emerald-400 dark:ring-emerald-500', activeBg: 'bg-emerald-50 dark:bg-emerald-500/10' },
  amber:  { strip: 'bg-amber-500',   value: 'text-amber-600 dark:text-amber-400',     ring: 'ring-amber-400 dark:ring-amber-500',     activeBg: 'bg-amber-50 dark:bg-amber-500/10' },
  red:    { strip: 'bg-red-500',     value: 'text-red-600 dark:text-red-400',         ring: 'ring-red-400 dark:ring-red-500',         activeBg: 'bg-red-50 dark:bg-red-500/10' },
  purple: { strip: 'bg-violet-500',  value: 'text-violet-600 dark:text-violet-400',   ring: 'ring-violet-400 dark:ring-violet-500',   activeBg: 'bg-violet-50 dark:bg-violet-500/10' },
};

interface FilterCardProps {
  label: string;
  count: number;
  subtext: string;
  variant: Variant;
  active: boolean;
  onClick: () => void;
}

export function FilterCard({ label, count, subtext, variant, active, onClick }: FilterCardProps) {
  const v = VARIANTS[variant];

  return (
    <button
      onClick={onClick}
      className={`relative overflow-hidden rounded-xl border text-left transition-all duration-200 w-full
        ${active
          ? `${v.activeBg} border-transparent ring-2 ${v.ring} shadow-md`
          : 'bg-white dark:bg-zinc-900/60 border-zinc-200 dark:border-white/[0.13] hover:border-zinc-300 dark:hover:border-white/[0.20] hover:shadow-md dark:hover:shadow-black/20'
        }`}
    >
      <div className={`absolute top-0 inset-x-0 h-[3px] ${v.strip}`} />

      <div className="px-4 pt-5 pb-4">
        <span className="text-[10px] font-semibold uppercase tracking-[0.5px] text-zinc-500 dark:text-zinc-400">
          {label}
        </span>
        <div className={`text-[30px] font-black leading-none tracking-tight mt-2 ${v.value}`}>
          {count}
        </div>
        <div className="text-xs text-zinc-400 dark:text-zinc-500 mt-1.5 font-medium">
          {subtext}
        </div>
      </div>
    </button>
  );
}
