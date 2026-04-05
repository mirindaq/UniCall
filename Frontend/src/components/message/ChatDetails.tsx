import { useState } from "react"
import { toast } from "sonner"

import { useChatPage } from "@/contexts/ChatPageContext"
import { chatService } from "@/services/chat/chat.service"
import { displayNameFromProfile } from "@/utils/chat-display.util"

import GroupMembersPanel from "./GroupMembersPanel"
import ChatInfoMain from "./ChatInfoMain"
import ChatStorage from "./ChatStorage"

export default function ChatDetails() {
  const {
    selectedConversation,
    conversationTitle,
    conversationAvatar,
    selectedPeerProfile,
    detailsView,
    setDetailsView,
    currentUserId,
    refetchConversations,
    selectConversation,
  } =
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

  if (selectedConversation.type === "GROUP" && detailsView === "group-members") {
    return (
      <GroupMembersPanel
        conversationId={selectedConversation.idConversation}
        onBack={() => setDetailsView("main")}
      />
    )
  }

  const title = conversationTitle(selectedConversation)
  const avatarSrc = conversationAvatar(selectedConversation)
  const fallback =
    selectedConversation.type === "DOUBLE"
      ? (displayNameFromProfile(selectedPeerProfile) || title).slice(0, 2)
      : title.slice(0, 2)

  const currentUserRole =
    selectedConversation.participantInfos?.find((item) => item.idAccount === currentUserId)?.role ?? null
  const canDissolveGroup = selectedConversation.type === "GROUP" && currentUserRole === "ADMIN"

  const handleLeaveGroupFromInfo = async () => {
    if (selectedConversation.type !== "GROUP") {
      return
    }
    try {
      await chatService.leaveGroupConversation(selectedConversation.idConversation)
      toast.success("Bạn đã rời nhóm.")
      await refetchConversations()
      setDetailsView("main")
      selectConversation(null)
    } catch {
      toast.error("Rời nhóm thất bại, vui lòng thử lại.")
    }
  }

  const handleDissolveGroupFromInfo = async () => {
    if (selectedConversation.type !== "GROUP") {
      return
    }
    try {
      await chatService.dissolveGroupConversation(selectedConversation.idConversation)
      toast.success("Giải tán nhóm thành công.")
      await refetchConversations()
      setDetailsView("main")
      selectConversation(null)
    } catch {
      toast.error("Giải tán nhóm thất bại, vui lòng thử lại.")
    }
  }

  return (
    <ChatInfoMain
      openStorage={handleOpenStorage}
      title={title}
      avatarSrc={avatarSrc}
      avatarFallback={fallback}
      isGroup={selectedConversation.type === "GROUP"}
      canDissolveGroup={canDissolveGroup}
      onLeaveGroup={handleLeaveGroupFromInfo}
      onDissolveGroup={handleDissolveGroupFromInfo}
    />
  )
}
