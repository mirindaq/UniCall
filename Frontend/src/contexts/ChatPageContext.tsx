import { createContext, useCallback, useContext, useMemo, useState } from "react"
import { toast } from "sonner"

import { useQuery } from "@/hooks/useQuery"
import { chatService } from "@/services/chat/chat.service"
import { userService } from "@/services/user/user.service"
import type { ConversationResponse } from "@/types/chat"
import type { UserProfile, UserSearchItem } from "@/types/user.type"

type ChatPageContextValue = {
  currentUserId: string | null
  conversations: ConversationResponse[]
  conversationsLoading: boolean
  conversationsError: unknown
  refetchConversations: () => Promise<unknown>
  selectedConversationId: string | null
  selectConversation: (id: string | null) => void
  startChatWithUser: (user: UserSearchItem) => Promise<void>
  isStartingChat: boolean
  conversationTitle: (c: ConversationResponse) => string
  conversationAvatar: (c: ConversationResponse) => string | undefined
  selectedConversation: ConversationResponse | null
  selectedPeerProfile: UserProfile | null
  detailsView: "main" | "storage" | "group-members"
  setDetailsView: (view: "main" | "storage" | "group-members") => void
}

const ChatPageContext = createContext<ChatPageContextValue | null>(null)

export function ChatPageProvider({ children }: { children: React.ReactNode }) {
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null)
  const [detailsView, setDetailsView] = useState<"main" | "storage" | "group-members">("main")
  const [isStartingChat, setIsStartingChat] = useState(false)

  const { data: profileResponse } = useQuery(() => userService.getMyProfile(), {
    onError: () => undefined,
  })
  const currentUserId = profileResponse?.data?.identityUserId ?? null

  const {
    data: conversationsResponse,
    isLoading: conversationsLoading,
    error: conversationsError,
    refetch: refetchConversations,
  } = useQuery(() => chatService.listConversations(), {
    enabled: currentUserId != null,
    deps: [currentUserId],
    onError: () => {
      toast.error("Không tải được danh sách hội thoại")
    },
  })

  const conversations = useMemo(
    () => conversationsResponse?.data ?? [],
    [conversationsResponse?.data],
  )

  const conversationTitle = useCallback(
    (c: ConversationResponse) => {
      return c.name?.trim() || (c.type === "GROUP" ? "Nhóm" : "Cuộc trò chuyện")
    },
    [],
  )

  const conversationAvatar = useCallback(
    (c: ConversationResponse) => c.avatar ?? undefined,
    [],
  )

  const selectedConversation = useMemo(
    () => conversations.find((c) => c.idConversation === selectedConversationId) ?? null,
    [conversations, selectedConversationId],
  )

  const selectedPeerProfile = useMemo(() => null, [])

  const selectConversation = useCallback((id: string | null) => {
    setSelectedConversationId(id)
    setDetailsView("main")
  }, [])

  const startChatWithUser = useCallback(
    async (user: UserSearchItem) => {
      setIsStartingChat(true)
      try {
        const res = await chatService.getOrCreateDirect(user.identityUserId)
        const conv = res.data

        setSelectedConversationId(conv.idConversation)
        void refetchConversations()
        toast.success("Đã mở cuộc trò chuyện")
      } catch {
        toast.error("Không thể tạo hội thoại")
      } finally {
        setIsStartingChat(false)
      }
    },
    [refetchConversations],
  )

  const value = useMemo<ChatPageContextValue>(
    () => ({
      currentUserId,
      conversations,
      conversationsLoading,
      conversationsError,
      refetchConversations,
      selectedConversationId,
      selectConversation,
      startChatWithUser,
      isStartingChat,
      conversationTitle,
      conversationAvatar,
      selectedConversation,
      selectedPeerProfile,
      detailsView,
      setDetailsView,
    }),
    [
      conversationAvatar,
      conversationTitle,
      conversations,
      conversationsError,
      conversationsLoading,
      currentUserId,
      isStartingChat,
      refetchConversations,
      selectConversation,
      selectedConversation,
      selectedPeerProfile,
      detailsView,
      selectedConversationId,
      startChatWithUser,
    ],
  )

  return <ChatPageContext.Provider value={value}>{children}</ChatPageContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components -- hook kèm provider trong một module
export function useChatPage() {
  const ctx = useContext(ChatPageContext)
  if (!ctx) {
    throw new Error("useChatPage must be used within ChatPageProvider")
  }
  return ctx
}
