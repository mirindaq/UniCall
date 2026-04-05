import { CalendarIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { formatDateVi } from "@/utils/date.util"

type CustomDatePickerProps = {
  value?: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  required?: boolean
  className?: string
  triggerClassName?: string
}

const parseDateValue = (value?: string) => {
  if (!value) {
    return undefined
  }

  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (isoMatch) {
    const [, y, m, d] = isoMatch
    return new Date(Number(y), Number(m) - 1, Number(d))
  }

  const viMatch = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value)
  if (viMatch) {
    const [, d, m, y] = viMatch
    return new Date(Number(y), Number(m) - 1, Number(d))
  }

  const fallback = new Date(value)
  return Number.isNaN(fallback.getTime()) ? undefined : fallback
}

const toIsoDate = (date: Date) => {
  const yyyy = date.getFullYear()
  const mm = `${date.getMonth() + 1}`.padStart(2, "0")
  const dd = `${date.getDate()}`.padStart(2, "0")
  return `${yyyy}-${mm}-${dd}`
}

export function CustomDatePicker({
  value,
  onChange,
  placeholder = "Chọn ngày",
  disabled,
  required,
  className,
  triggerClassName,
}: CustomDatePickerProps) {
  const selected = parseDateValue(value)

  return (
    <div className={cn("w-full", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            className={cn(
              "h-10 w-full justify-start rounded-md border-slate-300 bg-background px-2.5 py-1 text-left text-sm font-normal shadow-none hover:bg-background",
              !value && "text-slate-400",
              triggerClassName
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4 text-slate-500" />
            {value ? formatDateVi(value) : placeholder}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={selected}
            onSelect={(date) => {
              if (!date) return
              onChange(toIsoDate(date))
            }}
            captionLayout="dropdown"
          />
        </PopoverContent>
      </Popover>
      {required ? (
        <input
          tabIndex={-1}
          aria-hidden="true"
          className="sr-only"
          required
          readOnly
          value={value ?? ""}
        />
      ) : null}
    </div>
  )
}
