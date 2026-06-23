'use client';

import { CalendarIcon } from '@radix-ui/react-icons';
import { ChevronDown } from 'lucide-react';
import { format, isValid, parse } from 'date-fns';
import { pt } from 'date-fns/locale';
import { type DateRange } from 'react-day-picker';

import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { type Dispatch, useEffect, useState } from 'react';

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
  const [fromInput, setFromInput] = useState<string>('');
  const [toInput, setToInput] = useState<string>('');
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [pendingRange, setPendingRange] = useState<DateRange | undefined>(dateRange);
  const [isRangeComplete, setIsRangeComplete] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    setPendingRange(dateRange);
    setFromInput(dateRange?.from ? format(dateRange.from, 'dd/MM/yyyy') : '');
    setToInput(dateRange?.to   ? format(dateRange.to,   'dd/MM/yyyy') : '');
    setIsRangeComplete(!!(dateRange?.from && dateRange?.to));
  }, [dateRange]);

  const handleDateInputChange = (e: React.ChangeEvent<HTMLInputElement>, field: 'from' | 'to') => {
    const value = e.target.value;
    if (field === 'from') setFromInput(value);
    else setToInput(value);

    if (!value || value.replace(/[/_]/g, '').length === 0) {
      setPendingRange((prev) => ({
        from: field === 'from' ? undefined : prev?.from,
        to:   field === 'to'   ? undefined : prev?.to,
      }));
      return;
    }

    if (!value.includes('_') && value.length === 10) {
      const parsed = parse(value, 'dd/MM/yyyy', new Date());
      if (isValid(parsed)) {
        setPendingRange((prev) => ({
          from: field === 'from' ? parsed : prev?.from,
          to:   field === 'to'   ? parsed : prev?.to,
        }));
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
              <input
                type="text"
                inputMode="numeric"
                placeholder="dd/mm/aaaa"
                value={fromInput}
                onChange={(e) => handleDateInputChange(e, 'from')}
                className={inputCls}
                maxLength={10}
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
                Fim:
              </span>
              <input
                type="text"
                inputMode="numeric"
                placeholder="dd/mm/aaaa"
                value={toInput}
                onChange={(e) => handleDateInputChange(e, 'to')}
                className={inputCls}
                maxLength={10}
              />
            </div>
          </div>

          {/* Calendar */}
          <div className="px-4 py-3">
            <Calendar
              mode="range"
              defaultMonth={pendingRange?.from ?? new Date()}
              selected={pendingRange}
              onSelect={(range) => {
                if (isRangeComplete) {
                  if (range?.from && range?.to) {
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
                  }
                }
                setPendingRange(range);
                if (range?.from && range?.to) setIsRangeComplete(true);
              }}
              numberOfMonths={isMobile ? 1 : 2}
              locale={pt}
              className="drp-calendar"
            />
          </div>

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
