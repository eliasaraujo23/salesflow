"use client"

import * as React from "react"
import { DayPicker } from "react-day-picker"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { pt } from 'date-fns/locale';
import { cn } from "@/lib/utils"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn('drp-calendar', className)}
      locale={pt}
      classNames={{
        months:          'flex flex-wrap gap-4 p-3',
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
        range_start:     'rdp-range_start',
        range_end:       'rdp-range_end',
        range_middle:    'rdp-range_middle',
        today:           'rdp-today',
        outside:         'opacity-30',
        disabled:        'opacity-30 cursor-not-allowed',
        hidden:          'invisible',
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation }) =>
          orientation === 'left' ? <ChevronLeft size={16} /> : <ChevronRight size={16} />,
      }}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
