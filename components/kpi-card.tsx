'use client';

import React from 'react';
import { LucideIcon } from 'lucide-react';

interface KPICardProps {
  icon: LucideIcon;
  label: string;
  value: number | string;
  subtext?: string;
  variant?: 'blue' | 'green' | 'amber' | 'red' | 'purple';
  className?: string;
}

const variantStyles = {
  blue: 'bg-accent/10 text-accent border-accent/20',
  green: 'bg-semantic-green/10 text-semantic-green border-semantic-green/20',
  amber: 'bg-semantic-amber/10 text-semantic-amber border-semantic-amber/20',
  red: 'bg-semantic-red/10 text-semantic-red border-semantic-red/20',
  purple: 'bg-semantic-purple/10 text-semantic-purple border-semantic-purple/20',
};

export function KPICard({
  icon: Icon,
  label,
  value,
  subtext,
  variant = 'blue',
  className = '',
}: KPICardProps) {
  return (
    <div
      className={`
        p-4 rounded-lg border transition-all duration-300
        hover:shadow-lg hover:scale-105
        ${variantStyles[variant]} ${className}
      `}
    >
      <div className="flex items-start justify-between mb-3">
        <Icon size={24} className="opacity-60" />
      </div>
      <div className="text-xs font-medium opacity-70 mb-1">{label}</div>
      <div className="text-2xl font-bold tracking-tight mb-1">{value}</div>
      {subtext && (
        <div className="text-xs opacity-60">
          {subtext.split(/(\d+%)/).map((part, i) =>
            part.match(/\d+%/) ?
              <span key={i} className="text-semantic-green font-medium">{part}</span> :
              part
          )}
        </div>
      )}
    </div>
  );
}
