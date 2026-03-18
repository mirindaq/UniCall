import { MessageCircleMore, Search, UserPlus, type LucideIcon } from "lucide-react"

import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

export type FriendshipTabItem<T extends string> = {
  value: T
  label: string
  icon: LucideIcon
}

export function FriendshipSidebar<T extends string>({
  tabs,
  activeTab,
  onChangeTab,
}: {
  tabs: FriendshipTabItem<T>[]
  activeTab: T
  onChangeTab: (tab: T) => void
}) {
  return (
    <aside className="flex w-full shrink-0 flex-col border-b border-slate-200 bg-white lg:w-[340px] lg:border-r lg:border-b-0">
      <div className="space-y-4 border-b border-slate-100 px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Tìm kiếm"
              className="h-11 rounded-xl border-slate-200 bg-slate-50 pl-9 shadow-none"
            />
          </div>

          <SidebarActionButton title="Lời mời kết bạn" icon={UserPlus} />
          <SidebarActionButton title="Tin nhắn" icon={MessageCircleMore} />
        </div>
      </div>

      <div className="flex flex-col gap-2 p-3">
        {tabs.map((tab) => {
          const TabIcon = tab.icon

          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => onChangeTab(tab.value)}
              className={cn(
                "flex min-h-14 w-full items-center gap-3 rounded-2xl px-4 py-4 text-left text-[15px] font-medium transition",
                activeTab === tab.value
                  ? "bg-blue-50 text-blue-700"
                  : "text-slate-700 hover:bg-slate-50",
              )}
            >
              <TabIcon className="size-5 shrink-0" />
              <span className="line-clamp-2">{tab.label}</span>
            </button>
          )
        })}
      </div>
    </aside>
  )
}

function SidebarActionButton({
  title,
  icon: Icon,
}: {
  title: string
  icon: LucideIcon
}) {
  return (
    <button
      type="button"
      className="flex size-10 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
      title={title}
    >
      <Icon className="size-5" />
    </button>
  )
}
