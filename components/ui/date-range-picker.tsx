'use client';

import { CalendarIcon } from '@radix-ui/react-icons';
import { ChevronDown } from 'lucide-react';
import { format, isValid, parse } from 'date-fns';
import { pt } from 'date-fns/locale';
import { type DateRange } from 'react-day-picker';

import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import React, { type Dispatch, useEffect, useRef, useState } from 'react';

// ── Masked date input (sem react-input-mask) ────────────────────────────────
// Mostra __/__/____ e preenche da esquerda pra direita conforme o usuário digita.
// Suporta backspace, desktop (onKeyDown) e mobile (onChange fallback).

function buildDisplay(digits: string): string {
  const d = (digits + '________').slice(0, 8).split('');
  return `${d[0]}${d[1]}/${d[2]}${d[3]}/${d[4]}${d[5]}${d[6]}${d[7]}`;
}

function toDateStr(digits: string): string {
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)}`;
}

function digitsFromValue(value: string): string {
  return value.replace(/\D/g, '').slice(0, 8);
}

interface MaskedDateInputProps {
  value: string;
  onChange: (v: string) => void; // emite 'dd/mm/yyyy' quando completo, '' para limpar
  className?: string;
}

function MaskedDateInput({ value, onChange, className }: MaskedDateInputProps) {
  const [digits, setDigits] = useState(() => digitsFromValue(value));
  const prevDisplayRef = useRef(buildDisplay(digitsFromValue(value)));
  // Evita dupla atualização quando keyDown e onChange disparam juntos
  const skipChangeRef = useRef(false);

  // Sincroniza apenas quando o pai envia valor completo ou vazio
  useEffect(() => {
    if (value === '' || value.length === 10) {
      const d = digitsFromValue(value);
      setDigits(d);
      prevDisplayRef.current = buildDisplay(d);
    }
  }, [value]);

  const apply = (d: string) => {
    prevDisplayRef.current = buildDisplay(d);
    setDigits(d);
    if (d.length === 0) onChange('');
    else if (d.length === 8) onChange(toDateStr(d));
    // parcial: não emite, preserva o que o usuário digitou
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      skipChangeRef.current = true;
      apply(digits.slice(0, -1));
    } else if (/^\d$/.test(e.key) && digits.length < 8) {
      e.preventDefault();
      skipChangeRef.current = true;
      apply(digits + e.key);
    } else if (e.key !== 'Tab' && e.key !== 'Enter' && !e.metaKey && !e.ctrlKey) {
      e.preventDefault();
    }
  };

  // Fallback para mobile (teclado virtual não dispara onKeyDown confiável)
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (skipChangeRef.current) { skipChangeRef.current = false; return; }
    const newRaw = e.target.value;
    const prevRaw = prevDisplayRef.current;
    if (newRaw.length > prevRaw.length) {
      const added = newRaw.replace(/\D/g, '').slice(digits.length);
      if (added && digits.length < 8) apply((digits + added).slice(0, 8));
    } else if (newRaw.length < prevRaw.length && digits.length > 0) {
      apply(digits.slice(0, -1));
    }
  };

  return (
    <input
      type="text"
      inputMode="numeric"
      value={buildDisplay(digits)}
      onKeyDown={handleKeyDown}
      onChange={handleChange}
      className={className}
    />
  );
}

// ── CalendarDateRangePicker ─────────────────────────────────────────────────

const MONTHS_PT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

function pillDate(d: Date): string {
  return `${String(d.getDate()).padStart(2, '0')}/${MONTHS_PT[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`;
}

interface CalendarDateRangePickerProps {
  className?: string;
  buttonClassName?: string;
  dateRange: DateRange | undefined;
  setDateRange: Dispatch<React.SetStateAction<DateRange | undefined>>;
  onDateChange?: (dateRange: DateRange | undefined) => void;
}

export function CalendarDateRangePicker({
  className,
  buttonClassName,
  dateRange,
  setDateRange,
  onDateChange,
}: CalendarDateRangePickerProps) {
  const [fromVal, setFromVal] = useState(dateRange?.from ? format(dateRange.from, 'dd/MM/yyyy') : '');
  const [toVal,   setToVal]   = useState(dateRange?.to   ? format(dateRange.to,   'dd/MM/yyyy') : '');
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [pendingRange, setPendingRange] = useState<DateRange | undefined>(dateRange);
  const [isRangeComplete, setIsRangeComplete] = useState(false);
  // Reseta pending state tanto quando dateRange muda quanto quando o popover abre
  // (evita exibir seleção parcial antiga ao reabrir sem ter clicado Aplicar)
  useEffect(() => {
    setPendingRange(dateRange);
    setFromVal(dateRange?.from ? format(dateRange.from, 'dd/MM/yyyy') : '');
    setToVal(  dateRange?.to   ? format(dateRange.to,   'dd/MM/yyyy') : '');
    setIsRangeComplete(!!(dateRange?.from && dateRange?.to));
  }, [dateRange, isPopoverOpen]);

  const handleFieldChange = (val: string, field: 'from' | 'to') => {
    if (field === 'from') setFromVal(val);
    else setToVal(val);

    if (!val) {
      setPendingRange(prev => ({ from: field === 'from' ? undefined : prev?.from, to: field === 'to' ? undefined : prev?.to }));
      return;
    }
    if (val.length === 10) {
      const parsed = parse(val, 'dd/MM/yyyy', new Date());
      if (isValid(parsed)) {
        setPendingRange(prev => ({ from: field === 'from' ? parsed : prev?.from, to: field === 'to' ? parsed : prev?.to }));
      }
    }
  };

  const handleApply = () => {
    setDateRange(pendingRange);
    if (onDateChange) onDateChange(pendingRange);
    setIsPopoverOpen(false);
  };

  const pillLabel = dateRange?.from
    ? dateRange.to
      ? `${pillDate(dateRange.from)} → ${pillDate(dateRange.to)}`
      : `De ${pillDate(dateRange.from)}`
    : 'Selecionar período';

  const inputCls =
    'px-2.5 py-1 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-white/[0.08] rounded-lg text-xs text-zinc-800 dark:text-zinc-100 w-[110px] focus:outline-none focus:border-indigo-500 transition-colors';

  return (
    <div className={cn('shrink-0', className)}>
      <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              'flex items-center gap-2 px-3.5 py-1.5 rounded-full border-2 border-zinc-800 dark:border-zinc-300',
              'text-sm font-semibold text-zinc-800 dark:text-zinc-100',
              'bg-white dark:bg-zinc-900',
              'hover:border-indigo-500 dark:hover:border-indigo-400 transition-colors whitespace-nowrap',
              buttonClassName,
            )}
          >
            <CalendarIcon className="w-3.5 h-3.5" />
            {pillLabel}
            <ChevronDown size={12} className="text-zinc-400 dark:text-zinc-500" />
          </button>
        </PopoverTrigger>

        <PopoverContent
          className="w-auto max-w-[100vw] overflow-x-auto p-0 rounded-2xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-zinc-900 shadow-2xl"
          align="start"
          sideOffset={8}
        >
          {/* INÍCIO / FIM */}
          <div className="flex items-center gap-6 px-5 pt-4 pb-3 border-b border-zinc-100 dark:border-white/[0.05]">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
                Início:
              </span>
              <MaskedDateInput value={fromVal} onChange={v => handleFieldChange(v, 'from')} className={inputCls} />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
                Fim:
              </span>
              <MaskedDateInput value={toVal} onChange={v => handleFieldChange(v, 'to')} className={inputCls} />
            </div>
          </div>

          {/* Calendar */}
          {(() => {
            const numMonths = typeof window !== 'undefined' && window.innerWidth < 640 ? 1 : 2;
            return (
              <div className="px-4 py-3" style={{ minWidth: numMonths === 2 ? 540 : undefined }}>
                <Calendar
                  mode="range"
                  defaultMonth={pendingRange?.from ?? new Date()}
                  selected={pendingRange}
                  onSelect={(range) => {
                    if (isRangeComplete) {
                      if (range?.from && range?.to) {
                        // react-day-picker returned a full range — determine the clicked date
                        const newDate =
                          range.to > (dateRange?.to ?? range.to) ? range.to : range.from;
                        if (
                          newDate.getTime() !== dateRange?.from?.getTime() &&
                          newDate.getTime() !== dateRange?.to?.getTime()
                        ) {
                          setPendingRange({ from: newDate, to: undefined });
                          setIsRangeComplete(false);
                          return;
                        }
                      } else if (range?.from) {
                        // react-day-picker started a new selection (from only) — restart
                        setPendingRange({ from: range.from, to: undefined });
                        setIsRangeComplete(false);
                        return;
                      }
                    }
                    setPendingRange(range);
                    if (range?.from && range?.to) setIsRangeComplete(true);
                  }}
                  numberOfMonths={numMonths}
                  locale={pt}
                  className="drp-calendar"
                />
              </div>
            );
          })()}

          {/* Apply */}
          <div className="flex justify-end px-5 pb-4 pt-2 border-t border-zinc-100 dark:border-white/[0.05]">
            <button
              type="button"
              onClick={handleApply}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              Aplicar
            </button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
