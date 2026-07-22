"use client"

import * as React from "react"
import {
  DayPicker,
  getDefaultClassNames,
  type DayButton,
  type Locale,
} from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button, buttonVariants } from "@/components/ui/button"
import { ChevronLeftIcon, ChevronRightIcon, ChevronDownIcon } from "lucide-react"

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = "label",
  buttonVariant = "ghost",
  locale,
  formatters,
  components,
  ...props
}: React.ComponentProps<typeof DayPicker> & {
  buttonVariant?: React.ComponentProps<typeof Button>["variant"]
}) {
  const defaultClassNames = getDefaultClassNames()

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn(
        "group/calendar bg-white p-3 border border-gray-200 rounded-2xl shadow-xl border-collapse select-none z-50 text-gray-900 [--cell-size:2.25rem] [--cell-radius:0.5rem]",
        String.raw`rtl:**:[.rdp-button\_next>svg]:rotate-180`,
        String.raw`rtl:**:[.rdp-button\_previous>svg]:rotate-180`,
        className
      )}
      captionLayout={captionLayout}
      locale={locale}
      formatters={{
        formatMonthDropdown: (date) =>
          date.toLocaleString(locale?.code, { month: "short" }),
        ...formatters,
      }}
      classNames={{
        root: cn("w-fit bg-white", defaultClassNames.root),
        months: cn(
          "relative flex flex-col gap-3",
          defaultClassNames.months
        ),
        month: cn("flex w-full flex-col gap-3", defaultClassNames.month),
        nav: cn(
          "flex w-full items-center justify-between gap-1 mb-2 px-1",
          defaultClassNames.nav
        ),
        button_previous: cn(
          buttonVariants({ variant: buttonVariant }),
          "h-8 w-8 p-0 border border-gray-200 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-700",
          defaultClassNames.button_previous
        ),
        button_next: cn(
          buttonVariants({ variant: buttonVariant }),
          "h-8 w-8 p-0 border border-gray-200 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-700",
          defaultClassNames.button_next
        ),
        month_caption: cn(
          "flex h-8 items-center justify-center text-sm font-bold text-gray-900",
          defaultClassNames.month_caption
        ),
        dropdowns: cn(
          "flex items-center justify-center gap-2 text-sm font-semibold text-gray-900",
          defaultClassNames.dropdowns
        ),
        dropdown_root: cn(
          "relative rounded-md",
          defaultClassNames.dropdown_root
        ),
        dropdown: cn(
          "bg-white text-gray-900 rounded-md border border-gray-200 px-2 py-1 text-xs font-semibold",
          defaultClassNames.dropdown
        ),
        caption_label: cn(
          "font-semibold text-sm text-gray-900",
          defaultClassNames.caption_label
        ),
        month_grid: cn("w-full border-collapse", defaultClassNames.month_grid),
        weekdays: cn("flex justify-between border-b border-gray-100 pb-1 mb-1", defaultClassNames.weekdays),
        weekday: cn(
          "w-9 text-center text-xs font-semibold text-gray-500 select-none",
          defaultClassNames.weekday
        ),
        week: cn("flex w-full justify-between mt-1", defaultClassNames.week),
        day: cn(
          "relative p-0 text-center select-none w-9 h-9 flex items-center justify-center text-xs rounded-lg font-medium",
          defaultClassNames.day
        ),
        range_start: cn("rounded-l-lg bg-emerald-600 text-white", defaultClassNames.range_start),
        range_middle: cn("bg-emerald-50 text-emerald-900 rounded-none", defaultClassNames.range_middle),
        range_end: cn("rounded-l-lg bg-emerald-600 text-white", defaultClassNames.range_end),
        today: cn(
          "font-bold text-emerald-600 border border-emerald-300 bg-emerald-50/50",
          defaultClassNames.today
        ),
        outside: cn(
          "text-gray-300 opacity-40",
          defaultClassNames.outside
        ),
        disabled: cn(
          "text-gray-300 opacity-40 cursor-not-allowed",
          defaultClassNames.disabled
        ),
        hidden: cn("invisible", defaultClassNames.hidden),
        ...classNames,
      }}
      components={{
        Root: ({ className, rootRef, ...props }) => {
          return (
            <div
              data-slot="calendar"
              ref={rootRef}
              className={cn(className)}
              {...props}
            />
          )
        },
        Chevron: ({ className, orientation, ...props }) => {
          if (orientation === "left") {
            return (
              <ChevronLeftIcon className={cn("w-4 h-4 text-gray-700", className)} {...props} />
            )
          }

          if (orientation === "right") {
            return (
              <ChevronRightIcon className={cn("w-4 h-4 text-gray-700", className)} {...props} />
            )
          }

          return (
            <ChevronDownIcon className={cn("w-4 h-4 text-gray-700", className)} {...props} />
          )
        },
        DayButton: ({ ...props }) => (
          <CalendarDayButton locale={locale} {...props} />
        ),
        WeekNumber: ({ children, ...props }) => {
          return (
            <td {...props}>
              <div className="flex w-9 h-9 items-center justify-center text-center text-xs text-gray-400">
                {children}
              </div>
            </td>
          )
        },
        ...components,
      }}
      {...props}
    />
  )
}

function CalendarDayButton({
  className,
  day,
  modifiers,
  locale,
  ...props
}: React.ComponentProps<typeof DayButton> & { locale?: Partial<Locale> }) {
  const defaultClassNames = getDefaultClassNames()

  const ref = React.useRef<HTMLButtonElement>(null)
  React.useEffect(() => {
    if (modifiers.focused) ref.current?.focus()
  }, [modifiers.focused])

  return (
    <Button
      variant="ghost"
      size="icon"
      data-day={day.date.toLocaleDateString(locale?.code)}
      data-selected-single={
        modifiers.selected &&
        !modifiers.range_start &&
        !modifiers.range_end &&
        !modifiers.range_middle
      }
      className={cn(
        "w-9 h-9 p-0 text-xs font-medium rounded-lg hover:bg-gray-100 flex items-center justify-center transition-all cursor-pointer text-gray-800 data-[selected-single=true]:bg-[var(--theme-primary,#17211e)] data-[selected-single=true]:text-white data-[selected-single=true]:font-bold shadow-none",
        defaultClassNames.day,
        className
      )}
      {...props}
    />
  )
}

export { Calendar, CalendarDayButton }
