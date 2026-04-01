import { useState } from "react"

import { useChatPage } from "@/contexts/ChatPageContext"
import { displayNameFromProfile } from "@/utils/chat-display.util"

import ChatInfoMain from "./ChatInfoMain"
import ChatStorage from "./ChatStorage"

export default function ChatDetails() {
  const { selectedConversation, conversationTitle, conversationAvatar, selectedPeerProfile } =
    useChatPage()

  const [currentView, setCurrentView] = useState<"main" | "storage">("main")
  const [activeStorageTab, setActiveStorageTab] = useState<"images" | "files" | "links">("images")

  const handleOpenStorage = (tab: "images" | "files" | "links") => {
    setActiveStorageTab(tab)
    setCurrentView("storage")
  }

  if (currentView === "storage") {
    return (
      <ChatStorage
        onBack={() => setCurrentView("main")}
        activeTab={activeStorageTab}
        setActiveTab={setActiveStorageTab}
      />
    )
  }

  if (!selectedConversation) {
    return (
      <div className="hidden h-full w-full max-w-[340px] shrink-0 flex-col items-center justify-center border-l bg-background px-4 text-center text-sm text-muted-foreground lg:flex">
        Chọn hội thoại để xem thông tin chi tiết, ảnh và file đính kèm.
      </div>
    )
  }

  const title = conversationTitle(selectedConversation)
  const avatarSrc = conversationAvatar(selectedConversation)
  const fallback =
    selectedConversation.type === "DOUBLE"
      ? (displayNameFromProfile(selectedPeerProfile) || title).slice(0, 2)
      : title.slice(0, 2)

  return (
    <ChatInfoMain
      openStorage={handleOpenStorage}
      title={title}
      avatarSrc={avatarSrc}
      avatarFallback={fallback}
    />
  )
}
