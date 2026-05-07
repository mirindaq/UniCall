import { useState } from "react"
import { Users, UserPlus, UsersRound } from "lucide-react"

import {
  FriendshipPageHeader,
  FriendshipSidebar,
  type FriendshipTabItem,
} from "@/components/friend_ship"
import { CommunitiesTab } from "@/pages/user/friend_ship/CommunitiesTab"
import { FriendInvitationsTab } from "@/pages/user/friend_ship/FriendInvitationsTab"
import { FriendsListTab } from "@/pages/user/friend_ship/FriendsListTab"

type FriendTab = "friends" | "communities" | "friend-requests"

const friendTabs: FriendshipTabItem<FriendTab>[] = [
  {
    value: "friends",
    label: "Danh sách bạn bè",
    icon: Users,
  },
  {
    value: "communities",
    label: "Danh sách nhóm",
    icon: UsersRound,
  },
  {
    value: "friend-requests",
    label: "Lời mời kết bạn",
    icon: UserPlus,
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
      default:
        return <FriendsListTab />
    }
  }

  return (
    <div className="flex h-full w-full min-h-0 overflow-hidden bg-background lg:flex-row">
      <FriendshipSidebar tabs={friendTabs} activeTab={activeTab} onChangeTab={setActiveTab} />

      <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-background">
        <FriendshipPageHeader title={selectedTab.label} icon={selectedTab.icon} />
        <div className="flex-1 min-h-0 overflow-hidden">{renderContent()}</div>
      </section>
    </div>
  )
}
