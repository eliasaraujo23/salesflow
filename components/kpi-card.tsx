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

export function KPICard({
  icon: Icon,
  label,
  value,
  subtext,
  variant = 'blue',
  className = '',
}: KPICardProps) {
  const topBorder = topBorderMap[variant] ?? topBorderMap.blue;
  const valueColor = valueColorMap[variant] ?? valueColorMap.blue;

  return (
    <div className={`relative bg-bg-surface border border-border rounded-xl overflow-hidden hover:border-border-2 transition-colors ${className}`}>
      <div className={`absolute top-0 inset-x-0 h-[3px] ${topBorder}`} />
      <div className="px-5 pt-6 pb-5">
        {Icon && (
          <Icon size={16} className={`${valueColor} opacity-35 mb-2`} />
        )}
        <div className="text-[11px] font-semibold text-text-muted uppercase tracking-[0.5px] mb-2">
          {label}
        </div>
        <div className={`text-[32px] font-bold leading-none tracking-tight ${valueColor}`}>
          {value}
        </div>
        {subtext && (
          <div className="text-xs text-text-muted mt-2">{subtext}</div>
        )}
      </div>
    </div>
  );
}
