import type { LucideIcon } from "lucide-react"
import { Search } from "lucide-react"

import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export type SelectOption = {
  value: string
  label: string
}

export function FriendshipSearchInput({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (value: string) => void
  placeholder: string
}) {
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-slate-400" />
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-10 rounded-xl border-slate-200 pl-10 text-sm shadow-none"
      />
    </div>
  )
}

export function FriendshipIconSelect({
  icon: Icon,
  value,
  onValueChange,
  placeholder,
  options,
}: {
  icon?: LucideIcon
  value: string
  onValueChange: (value: string) => void
  placeholder: string
  options: SelectOption[]
}) {
  return (
    <div className="relative">
      {Icon ? (
        <span className="pointer-events-none absolute inset-y-0 left-3 flex -translate-y-[1px] items-center justify-center text-slate-500">
          <Icon className="size-4" />
        </span>
      ) : null}
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger
          className={`h-10 w-full rounded-xl border-slate-200 bg-white text-sm shadow-none ${Icon ? "pl-10" : ""}`}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent
          position="popper"
          side="bottom"
          sideOffset={6}
          avoidCollisions={false}
          align="start"
          className="min-w-[var(--radix-select-trigger-width)]"
        >
          {options.map((option) => (
            <SelectItem
              key={option.value}
              value={option.value}
              className="focus:bg-slate-50 focus:text-slate-700"
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

export function FriendshipFilterChips({
  title,
  value,
  options,
  onValueChange,
  activeClassName,
}: {
  title: string
  value: string
  options: SelectOption[]
  onValueChange: (value: string) => void
  activeClassName: string
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <span className="font-medium text-slate-500">{title}</span>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onValueChange(option.value)}
          className={`rounded-full px-3 py-1 text-xs transition ${
            value === option.value
              ? activeClassName
              : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50 hover:text-slate-700"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
