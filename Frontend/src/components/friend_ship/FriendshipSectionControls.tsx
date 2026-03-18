import { ChevronDown, ChevronUp } from "lucide-react"

import { Button } from "@/components/ui/button"

export function FriendshipCollapsibleTitle({
  title,
  expanded,
  onToggle,
}: {
  title: string
  expanded: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex items-center gap-2 text-left text-xl font-semibold text-slate-900"
    >
      <span>{title}</span>
      {expanded ? (
        <ChevronUp className="size-5 text-slate-500" />
      ) : (
        <ChevronDown className="size-5 text-slate-500" />
      )}
    </button>
  )
}

export function FriendshipLoadMoreButton({
  onClick,
}: {
  onClick: () => void
}) {
  return (
    <Button
      variant="secondary"
      onClick={onClick}
      className="h-11 rounded-xl bg-slate-100 px-8 text-base font-semibold text-slate-700 hover:bg-slate-200"
    >
      Xem thêm
    </Button>
  )
}
