"use client"

import * as React from "react"
import { DayPicker } from "react-day-picker"
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
      className={cn("p-3", className)}
      locale={pt}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
