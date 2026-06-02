import type { FormEvent, ReactNode } from "react"
import { Search } from "lucide-react"

import { AdminPageHeader } from "@/components/admin/AdminPageHeader"
import { AdminSimpleTable } from "@/components/admin/AdminSimpleTable"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface AdminDataPageTemplateProps<T> {
  title: string
  description: string
  tableTitle: string
  tableDescription: string
  rows: T[]
  columns: Array<{
    key: string
    title: string
    render: (row: T, index: number) => ReactNode
  }>
  actionLabel?: string
  onAction?: () => void
  searchValue?: string
  searchPlaceholder?: string
  onSearchValueChange?: (value: string) => void
  onSearch?: () => void
}

export function AdminDataPageTemplate<T>({
  title,
  description,
  tableTitle,
  tableDescription,
  rows,
  columns,
  actionLabel = "Làm mới",
  onAction,
  searchValue = "",
  searchPlaceholder = "Tìm kiếm...",
  onSearchValueChange,
  onSearch,
}: AdminDataPageTemplateProps<T>) {
  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onSearch?.()
  }

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title={title}
        description={description}
        action={<Button onClick={onAction}>{actionLabel}</Button>}
      />

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold text-slate-900">{tableTitle}</p>
            <p className="text-sm text-slate-500">{tableDescription}</p>
          </div>
          <Badge variant="secondary">Dữ liệu hệ thống</Badge>
        </div>

        <form
          className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]"
          onSubmit={handleSearchSubmit}
        >
          <div className="relative">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              className="pl-9"
              placeholder={searchPlaceholder}
              value={searchValue}
              onChange={(event) => onSearchValueChange?.(event.target.value)}
            />
          </div>
          <Button type="submit" variant="outline">
            Tìm kiếm
          </Button>
        </form>
      </section>

      <AdminSimpleTable columns={columns} rows={rows} />
    </div>
  )
}
