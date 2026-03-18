import type { LucideIcon } from "lucide-react"

export function FriendshipPageHeader({
  title,
  icon: Icon,
  subtitle = "Mock UI friendship theo layout hiện có của UniCall",
}: {
  title: string
  icon: LucideIcon
  subtitle?: string
}) {
  return (
    <header className="flex items-center gap-3 border-b border-slate-200 bg-white px-5 py-5">
      <Icon className="size-5 shrink-0 text-slate-800" />
      <div className="min-w-0">
        <h2 className="truncate text-xl font-semibold text-slate-900">{title}</h2>
        <p className="text-sm text-slate-500">{subtitle}</p>
      </div>
    </header>
  )
}
