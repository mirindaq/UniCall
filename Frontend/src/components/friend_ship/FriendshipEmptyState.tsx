import { SearchX } from "lucide-react"

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"

export function FriendshipEmptyState({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <div className="flex min-h-[360px] items-center justify-center px-6 py-8">
      <Empty className="border-0">
        <EmptyHeader>
          <EmptyMedia className="flex size-20 items-center justify-center rounded-full bg-blue-50 text-blue-300">
            <SearchX className="size-10" />
          </EmptyMedia>
          <EmptyTitle className="text-lg text-slate-900">{title}</EmptyTitle>
          <EmptyDescription className="text-sm text-slate-500">
            {description}
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    </div>
  )
}
