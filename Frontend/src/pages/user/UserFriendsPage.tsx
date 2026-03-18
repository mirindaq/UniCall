import { useState } from "react"
import { BellPlus, Users, UserPlus, UsersRound } from "lucide-react"

import {
  FriendshipPageHeader,
  FriendshipSidebar,
  type FriendshipTabItem,
} from "@/components/friend_ship"
import { CommunitiesTab } from "@/pages/user/friend_ship/CommunitiesTab"
import { FriendInvitationsTab } from "@/pages/user/friend_ship/FriendInvitationsTab"
import { FriendsListTab } from "@/pages/user/friend_ship/FriendsListTab"
import { GroupInvitationsTab } from "@/pages/user/friend_ship/GroupInvitationsTab"

type FriendTab = "friends" | "communities" | "friend-requests" | "group-requests"

const friendTabs: FriendshipTabItem<FriendTab>[] = [
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
]

export function UserFriendsPage() {
  const [activeTab, setActiveTab] = useState<FriendTab>("friends")
  const selectedTab = friendTabs.find((tab) => tab.value === activeTab) ?? friendTabs[0]

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
    <div className="flex h-full min-h-0 overflow-hidden flex-col lg:flex-row">
      <FriendshipSidebar tabs={friendTabs} activeTab={activeTab} onChangeTab={setActiveTab} />

      <section className="flex min-h-0 min-w-0 flex-1 overflow-hidden flex-col bg-slate-100">
        <FriendshipPageHeader title={selectedTab.label} icon={selectedTab.icon} />

        <div className="flex-1 overflow-hidden p-0">
          <div className="h-full border-t border-slate-200 bg-[#f5f7fb]">{renderContent()}</div>
        </div>
      </section>
    </div>
  )
}
