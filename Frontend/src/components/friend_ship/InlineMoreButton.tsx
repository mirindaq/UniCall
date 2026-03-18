import { MoreHorizontal } from "lucide-react"

import { Button } from "@/components/ui/button"

export function InlineMoreButton() {
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      className="rounded-full text-slate-400 hover:text-slate-700"
    >
      <MoreHorizontal className="size-4" />
    </Button>
  )
}
