'use client';

import React from 'react';
import { type LucideIcon } from 'lucide-react';

interface KPICardProps {
  icon?: LucideIcon;
  label: string;
  value: number | string;
  subtext?: string;
  variant?: 'blue' | 'green' | 'amber' | 'red' | 'purple';
  compact?: boolean;
  className?: string;
}

const VARIANTS = {
  blue: {
    strip:   'bg-indigo-500',
    value:   'text-indigo-600 dark:text-indigo-400',
    iconBg:  'bg-indigo-50 dark:bg-indigo-500/10',
    icon:    'text-indigo-600 dark:text-indigo-400',
  },
  green: {
    strip:   'bg-emerald-500',
    value:   'text-emerald-600 dark:text-emerald-400',
    iconBg:  'bg-emerald-50 dark:bg-emerald-500/10',
    icon:    'text-emerald-600 dark:text-emerald-400',
  },
  amber: {
    strip:   'bg-amber-500',
    value:   'text-amber-600 dark:text-amber-400',
    iconBg:  'bg-amber-50 dark:bg-amber-500/10',
    icon:    'text-amber-600 dark:text-amber-400',
  },
  red: {
    strip:   'bg-red-500',
    value:   'text-red-600 dark:text-red-400',
    iconBg:  'bg-red-50 dark:bg-red-500/10',
    icon:    'text-red-600 dark:text-red-400',
  },
  purple: {
    strip:   'bg-violet-500',
    value:   'text-violet-600 dark:text-violet-400',
    iconBg:  'bg-violet-50 dark:bg-violet-500/10',
    icon:    'text-violet-600 dark:text-violet-400',
  },
} as const;

export function KPICard({ icon: Icon, label, value, subtext, variant = 'blue', compact = false, className = '' }: KPICardProps) {
  const v = VARIANTS[variant];

  return (
    <div className={`relative overflow-hidden rounded-xl border border-zinc-200 dark:border-white/[0.13] bg-white dark:bg-zinc-900/60 hover:shadow-lg dark:hover:shadow-black/20 hover:border-zinc-300 dark:hover:border-white/[0.10] transition-all duration-200 ${className}`}>
      <div className={`absolute top-0 inset-x-0 h-[3px] ${v.strip}`} />

      <div className={compact ? 'px-3 pt-4 pb-3' : 'px-5 pt-6 pb-5'}>
        <div className={`flex items-start justify-between ${compact ? 'mb-2' : 'mb-3'}`}>
          <span className="text-[11px] font-semibold uppercase tracking-[0.5px] text-zinc-500 dark:text-zinc-400 pr-2">
            {label}
          </span>
          {Icon && (
            <div className={`rounded-xl flex items-center justify-center shrink-0 ${v.iconBg} ${compact ? 'w-7 h-7' : 'w-9 h-9'}`}>
              <Icon size={compact ? 14 : 17} className={v.icon} strokeWidth={2} />
            </div>
          )}
        </div>

        <div className={`font-black leading-none tracking-tight ${v.value} ${compact ? 'text-[26px]' : 'text-[34px]'}`}>
          {value}
        </div>

        {subtext && (
          <div className="text-xs text-zinc-400 dark:text-zinc-500 mt-1.5 font-medium">
            {subtext}
          </div>
        )}
      </div>
    </div>
  );
}
