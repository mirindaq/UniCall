import { useState } from "react"
import { FileText, UserCircle } from "lucide-react"

import {
  FriendshipPageHeader,
  FriendshipSidebar,
  type FriendshipTabItem,
} from "@/components/friend_ship"
import { FeedTab } from "@/pages/user/posts/FeedTab"
import { MyPostsTab } from "@/pages/user/posts/MyPostsTab"

type PostTab = "feed" | "my-posts"

const postTabs: FriendshipTabItem<PostTab>[] = [
  {
    value: "feed",
    label: "Bảng tin",
    icon: FileText,
  },
  {
    value: "my-posts",
    label: "Bài viết của tôi",
    icon: UserCircle,
  },
]

export function UserPostsPage() {
  const [activeTab, setActiveTab] = useState<PostTab>("feed")
  const selectedTab = postTabs.find((tab) => tab.value === activeTab) ?? postTabs[0]

  const renderContent = () => {
    switch (activeTab) {
      case "feed":
        return <FeedTab />
      case "my-posts":
        return <MyPostsTab />
      default:
        return <FeedTab />
    }
  }

  return (
    <div className="flex h-full w-full min-h-0 overflow-hidden bg-background lg:flex-row">
      <FriendshipSidebar tabs={postTabs} activeTab={activeTab} onChangeTab={setActiveTab} />

      <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-background">
        <FriendshipPageHeader title={selectedTab.label} icon={selectedTab.icon} />
        <div className="flex-1 min-h-0 overflow-hidden">{renderContent()}</div>
      </section>
    </div>
  )
}
