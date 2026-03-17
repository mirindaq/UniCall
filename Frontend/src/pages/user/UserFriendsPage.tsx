import { useState } from "react"
import { BellPlus, MessageCircleMore, Search, UserPlus, Users, UsersRound } from "lucide-react"

import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { CommunitiesTab } from "@/pages/user/friend_ship/CommunitiesTab"
import { FriendInvitationsTab } from "@/pages/user/friend_ship/FriendInvitationsTab"
import { FriendsListTab } from "@/pages/user/friend_ship/FriendsListTab"
import { GroupInvitationsTab } from "@/pages/user/friend_ship/GroupInvitationsTab"

type FriendTab = "friends" | "communities" | "friend-requests" | "group-requests"

const friendTabs = [
  {
    value: "friends",
    label: "Danh sách bạn bè",
    icon: Users,
  },
  {
    value: "communities",
    label: "Danh sách nhóm và cộng đồng",
    icon: UsersRound,
  },
  {
    value: "friend-requests",
    label: "Lời mời kết bạn",
    icon: UserPlus,
  },
  {
    value: "group-requests",
    label: "Lời mời vào nhóm và cộng đồng",
    icon: BellPlus,
  },
] satisfies {
  value: FriendTab
  label: string
  icon: typeof Users
}[]

export function UserFriendsPage() {
  const [activeTab, setActiveTab] = useState<FriendTab>("friends")
  const selectedTab = friendTabs.find((tab) => tab.value === activeTab) ?? friendTabs[0]
  const HeaderIcon = selectedTab.icon

  const renderContent = () => {
    switch (activeTab) {
      case "friends":
        return <FriendsListTab />
      case "communities":
        return <CommunitiesTab />
      case "friend-requests":
        return <FriendInvitationsTab />
      case "group-requests":
        return <GroupInvitationsTab />
      default:
        return <FriendsListTab />
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col lg:flex-row">
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

            <button
              type="button"
              className="flex size-10 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
              title="Lời mời kết bạn"
            >
              <UserPlus className="size-5" />
            </button>
            <button
              type="button"
              className="flex size-10 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
              title="Tin nhắn"
            >
              <MessageCircleMore className="size-5" />
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-2 p-3">
          {friendTabs.map((tab) => {
            const TabIcon = tab.icon

            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => setActiveTab(tab.value)}
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

      <section className="flex min-h-0 min-w-0 flex-1 flex-col bg-slate-100">
        <header className="flex items-center gap-3 border-b border-slate-200 bg-white px-5 py-5">
          <HeaderIcon className="size-5 shrink-0 text-slate-800" />
          <div className="min-w-0">
            <h2 className="truncate text-xl font-semibold text-slate-900">{selectedTab.label}</h2>
            <p className="text-sm text-slate-500">Mock UI friendship theo layout hiện có của UniCall</p>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-4 lg:p-5">
          <div className="min-h-full rounded-[28px] border border-slate-200 bg-[#f5f7fb]">{renderContent()}</div>
        </div>
      </section>
    </div>
  )
}
