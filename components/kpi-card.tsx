'use client';

import React from 'react';
import { type LucideIcon } from 'lucide-react';

interface KPICardProps {
  icon?: LucideIcon;
  label: string;
  value: number | string;
  subtext?: string;
  variant?: 'blue' | 'green' | 'amber' | 'red' | 'purple';
  className?: string;
}

const topBorderMap: Record<string, string> = {
  blue:   'bg-accent',
  green:  'bg-semantic-green',
  amber:  'bg-semantic-amber',
  red:    'bg-semantic-red',
  purple: 'bg-semantic-purple',
};

const valueColorMap: Record<string, string> = {
  blue:   'text-accent',
  green:  'text-semantic-green',
  amber:  'text-semantic-amber',
  red:    'text-semantic-red',
  purple: 'text-semantic-purple',
};

const iconBgMap: Record<string, string> = {
  blue:   'bg-accent/10 dark:bg-accent/15',
  green:  'bg-semantic-green/10 dark:bg-semantic-green/15',
  amber:  'bg-semantic-amber/10 dark:bg-semantic-amber/15',
  red:    'bg-semantic-red/10 dark:bg-semantic-red/15',
  purple: 'bg-semantic-purple/10 dark:bg-semantic-purple/15',
};

export function KPICard({
  icon: Icon,
  label,
  value,
  subtext,
  variant = 'blue',
  className = '',
}: KPICardProps) {
  const topBorder  = topBorderMap[variant]  ?? topBorderMap.blue;
  const valueColor = valueColorMap[variant] ?? valueColorMap.blue;
  const iconBg     = iconBgMap[variant]     ?? iconBgMap.blue;

  return (
    <div
      className={`relative overflow-hidden rounded-xl border border-border bg-bg-surface hover:shadow-md hover:border-border-2 transition-all duration-200 ${className}`}
    >
      {/* Top accent strip */}
      <div className={`absolute top-0 inset-x-0 h-[3px] ${topBorder}`} />

      <div className="px-5 pt-6 pb-5">
        {/* Label + Icon row */}
        <div className="flex items-start justify-between mb-3">
          <div className="text-[11px] font-semibold uppercase tracking-[0.5px] text-text-muted pr-2">
            {label}
          </div>
          {Icon && (
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>
              <Icon size={17} className={valueColor} strokeWidth={2} />
            </div>
          )}
        </div>

        {/* Value */}
        <div className={`text-[34px] font-black leading-none tracking-tight ${valueColor}`}>
          {value}
        </div>

        {/* Subtext */}
        {subtext && (
          <div className="text-xs text-text-muted mt-2 font-medium">{subtext}</div>
        )}
      </div>
    </div>
  );
}
