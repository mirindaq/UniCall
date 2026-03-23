import type { LucideIcon } from "lucide-react"

export function FriendshipPageHeader({
  title,
  icon: Icon,
}: {
  title: string
  icon: LucideIcon
  subtitle?: string
}) {
  return (
    <header className="flex h-16 items-center gap-3 border-b border-slate-200 bg-white px-4">
      <Icon className="size-5 shrink-0 text-slate-800" />
      <div className="min-w-0">
        <h2 className="truncate text-base font-semibold text-slate-900">{title}</h2>
      </div>
    </header>
  )
}
