import React from 'react';
import { cn } from '@/lib/utils';

export const colorThemes = {
  blue: {
    bg: 'bg-blue-50/60',
    border: 'border-blue-200',
    text: 'text-blue-700',
    iconBg: 'bg-blue-100',
  },
  purple: {
    bg: 'bg-purple-50/60',
    border: 'border-purple-200',
    text: 'text-purple-700',
    iconBg: 'bg-purple-100',
  },
  emerald: {
    bg: 'bg-emerald-50/60',
    border: 'border-emerald-200',
    text: 'text-emerald-700',
    iconBg: 'bg-emerald-100',
  },
  orange: {
    bg: 'bg-orange-50/60',
    border: 'border-orange-200',
    text: 'text-orange-700',
    iconBg: 'bg-orange-100',
  },
  teal: {
    bg: 'bg-teal-50/60',
    border: 'border-teal-200',
    text: 'text-teal-700',
    iconBg: 'bg-teal-100',
  },
  gray: {
    bg: 'bg-gray-50/80',
    border: 'border-gray-200',
    text: 'text-gray-700',
    iconBg: 'bg-gray-200',
  },
  indigo: {
    bg: 'bg-indigo-50/60',
    border: 'border-indigo-200',
    text: 'text-indigo-700',
    iconBg: 'bg-indigo-100',
  },
  rose: {
    bg: 'bg-rose-50/60',
    border: 'border-rose-200',
    text: 'text-rose-700',
    iconBg: 'bg-rose-100',
  },
};

export type ThemeKeys = keyof typeof colorThemes;

interface VisualFieldProps {
  icon: React.ElementType;
  label: string;
  colorTheme: ThemeKeys;
  children: React.ReactNode;
  className?: string;
}

export const VisualField = ({ icon: Icon, label, colorTheme, children, className }: VisualFieldProps) => {
  const theme = colorThemes[colorTheme];

  return (
    <div
      className={cn(
        'relative flex flex-col gap-1.5 rounded-lg border p-2 transition-all',
        theme.bg,
        theme.border,
        className,
      )}
    >
      <div className={cn('flex items-center gap-2', theme.text)}>
        <div className={cn('flex h-6 w-6 items-center justify-center rounded-md', theme.iconBg)}>
          <Icon className="h-3.5 w-3.5" />
        </div>
        <span className="text-xs font-bold uppercase tracking-wide">{label}</span>
      </div>
      <div className="-mt-1">{children}</div>
    </div>
  );
};

interface VisualGroupProps {
  icon: React.ElementType;
  title: string;
  colorTheme: ThemeKeys;
  children: React.ReactNode;
  className?: string;
}

export const VisualGroup = ({ icon: Icon, title, colorTheme, children, className }: VisualGroupProps) => {
  const theme = colorThemes[colorTheme];

  return (
    <div className={cn('flex flex-col gap-1.5 rounded-lg border p-2', theme.bg, theme.border, className)}>
      <div className={cn('flex items-center gap-2 border-b border-black/5 pb-1.5', theme.text)}>
        <div className={cn('flex h-6 w-6 items-center justify-center rounded-md', theme.iconBg)}>
          <Icon className="h-3.5 w-3.5" />
        </div>
        <span className="text-xs font-bold uppercase tracking-wide">{title}</span>
      </div>
      <div className="mt-1">{children}</div>
    </div>
  );
};
