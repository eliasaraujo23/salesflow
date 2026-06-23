'use client';

import React from 'react';
import { type LucideIcon } from 'lucide-react';

interface FabKpiCardProps {
  icon: LucideIcon;
  label: string;
  value: number | string;
  subtext?: string;
  variant?: 'blue' | 'green' | 'amber' | 'orange' | 'purple';
}

const VARIANTS = {
  blue:   { iconBg: 'bg-indigo-500/15',  iconColor: 'text-indigo-600 dark:text-indigo-400',   value: 'text-indigo-600 dark:text-indigo-400'   },
  green:  { iconBg: 'bg-emerald-500/15', iconColor: 'text-emerald-600 dark:text-emerald-400', value: 'text-emerald-600 dark:text-emerald-400' },
  amber:  { iconBg: 'bg-amber-500/15',   iconColor: 'text-amber-500 dark:text-amber-400',     value: 'text-amber-500 dark:text-amber-400'     },
  orange: { iconBg: 'bg-orange-500/15',  iconColor: 'text-orange-500 dark:text-orange-400',   value: 'text-orange-500 dark:text-orange-400'   },
  purple: { iconBg: 'bg-purple-500/15',  iconColor: 'text-purple-500 dark:text-purple-400',   value: 'text-purple-500 dark:text-purple-400'   },
} as const;

export function FabKpiCard({ icon: Icon, label, value, subtext, variant = 'blue' }: FabKpiCardProps) {
  const v = VARIANTS[variant];
  return (
    <div className="flex items-start gap-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.06] rounded-xl px-4 py-4 min-w-0 hover:border-zinc-300 dark:hover:border-white/10 hover:shadow-md transition-all duration-200">
      <div className={`w-[38px] h-[38px] flex-shrink-0 flex items-center justify-center rounded-lg ${v.iconBg} ${v.iconColor}`}>
        <Icon size={17} strokeWidth={2} />
      </div>
      <div className="min-w-0 flex-1 overflow-hidden">
        <div className="text-[11px] font-semibold uppercase tracking-[0.5px] text-zinc-500 dark:text-zinc-400 mb-1 truncate whitespace-nowrap overflow-hidden text-ellipsis">
          {label}
        </div>
        <div className={`font-bold leading-tight tracking-tight truncate ${v.value}`} style={{ fontSize: 'clamp(13px, 1.55vw, 26px)' }}>
          {value}
        </div>
        {subtext && (
          <div className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-1 truncate">{subtext}</div>
        )}
      </div>
    </div>
  );
}
