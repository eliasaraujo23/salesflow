'use client';

import React, { useState } from 'react';
import { CalendarIcon, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { DayPicker } from 'react-day-picker';
import { pt } from 'date-fns/locale';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function fromISO(iso: string): Date | undefined {
  if (!iso) return undefined;
  const parts = iso.split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return undefined;
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

function fmtDisplay(iso: string): string {
  const d = fromISO(iso);
  if (!d) return '';
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

const DPY_CLASSES = {
  months:          'p-3',
  month:           'space-y-2',
  month_caption:   'flex justify-center relative items-center h-8',
  caption_label:   'text-sm font-semibold text-zinc-900 dark:text-zinc-100 capitalize',
  nav:             'absolute inset-x-0 top-0 flex justify-between pointer-events-none',
  button_previous: 'pointer-events-auto h-8 w-8 flex items-center justify-center rounded-lg text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-white/[0.06] transition-colors',
  button_next:     'pointer-events-auto h-8 w-8 flex items-center justify-center rounded-lg text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-white/[0.06] transition-colors',
  month_grid:      'w-full border-collapse',
  weekdays:        'flex',
  weekday:         'w-9 text-[11px] font-medium text-zinc-400 dark:text-zinc-500 text-center pb-1',
  weeks:           '',
  week:            'flex mt-1',
  day:             'rdp-day relative w-9 h-9 p-0 text-center',
  day_button:      'rdp-day_button w-full h-full flex items-center justify-center text-[13px] font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/[0.06] rounded-lg transition-colors cursor-pointer',
  selected:        'rdp-selected',
  today:           'rdp-today',
  outside:         'opacity-30',
  disabled:        'opacity-30 cursor-not-allowed',
  hidden:          'invisible',
} as const;

interface SingleDatePickerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  clearable?: boolean;
  className?: string;
}

export function SingleDatePicker({
  value,
  onChange,
  placeholder = 'Selecionar data',
  disabled = false,
  clearable = true,
  className,
}: SingleDatePickerProps) {
  const [open, setOpen] = useState(false);
  const selected = fromISO(value);

  function handleSelect(d: Date | undefined) {
    onChange(d ? toISO(d) : '');
    if (d) setOpen(false);
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation();
    onChange('');
  }

  function handleToday() {
    onChange(toISO(new Date()));
    setOpen(false);
  }

  return (
    <Popover open={open && !disabled} onOpenChange={(v) => { if (!disabled) setOpen(v); }}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            'flex items-center gap-2 w-full px-3 py-2 text-left',
            'bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-white/[0.08]',
            'rounded-lg text-[13px] transition-colors',
            'focus:outline-none focus:border-indigo-400 dark:focus:border-indigo-500',
            'hover:border-zinc-300 dark:hover:border-white/[0.14]',
            'disabled:opacity-40 disabled:cursor-not-allowed',
            value ? 'text-zinc-800 dark:text-zinc-200' : 'text-zinc-400 dark:text-zinc-500',
            className,
          )}
        >
          <CalendarIcon size={13} className="shrink-0 text-zinc-400 dark:text-zinc-500" />
          <span className="flex-1">{value ? fmtDisplay(value) : placeholder}</span>
          {clearable && value && !disabled && (
            <X
              size={13}
              className="shrink-0 text-zinc-300 dark:text-zinc-600 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
              onClick={handleClear}
            />
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        sideOffset={6}
        className="p-0 w-auto rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-zinc-900 shadow-xl shadow-black/10 dark:shadow-black/40"
      >
        <DayPicker
          mode="single"
          selected={selected}
          onSelect={handleSelect}
          locale={pt}
          defaultMonth={selected ?? new Date()}
          className="drp-calendar"
          classNames={DPY_CLASSES}
          components={{
            Chevron: ({ orientation }) =>
              orientation === 'left' ? <ChevronLeft size={16} /> : <ChevronRight size={16} />,
          }}
        />
        <div className="flex items-center justify-between px-4 pb-3 border-t border-zinc-100 dark:border-white/[0.05] pt-2">
          {clearable && value ? (
            <button
              type="button"
              onClick={() => { onChange(''); setOpen(false); }}
              className="text-xs text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
            >
              Limpar
            </button>
          ) : <span />}
          <button
            type="button"
            onClick={handleToday}
            className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 font-medium transition-colors"
          >
            Hoje
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
