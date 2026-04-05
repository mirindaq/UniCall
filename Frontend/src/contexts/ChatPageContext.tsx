import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"

import { useQuery } from "@/hooks/useQuery"
import { chatService } from "@/services/chat/chat.service"
import { userService } from "@/services/user/user.service"
import type { ConversationResponse } from "@/types/chat"
import type { UserProfile, UserSearchItem } from "@/types/user.type"
import {
  displayNameFromProfile,
  getPeerAccountId,
  searchItemToProfile,
} from "@/utils/chat-display.util"

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
  const [peerById, setPeerById] = useState<Record<string, UserProfile>>({})
  const [isStartingChat, setIsStartingChat] = useState(false)
  const fetchedPeersRef = useRef(new Set<string>())

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

  useEffect(() => {
    if (!currentUserId || conversations.length === 0) {
      return
    }

    for (const c of conversations) {
      const peerId = getPeerAccountId(c, currentUserId)
      if (!peerId || fetchedPeersRef.current.has(peerId)) {
        continue
      }
      fetchedPeersRef.current.add(peerId)
      void userService
        .getProfileByIdentityUserId(peerId)
        .then((res) => {
          setPeerById((prev) => ({ ...prev, [peerId]: res.data }))
        })
        .catch(() => {
          fetchedPeersRef.current.delete(peerId)
        })
    }
  }, [conversations, currentUserId])

  const conversationTitle = useCallback(
    (c: ConversationResponse) => {
      if (c.type === "GROUP") {
        return c.name?.trim() || "Nhóm"
      }
      if (!currentUserId) {
        return "Cuộc trò chuyện"
      }
      const peerId = getPeerAccountId(c, currentUserId)
      if (!peerId) {
        return "Cuộc trò chuyện"
      }
      const name = displayNameFromProfile(peerById[peerId])
      return name || `Người dùng ${peerId.slice(0, 8)}…`
    },
    [currentUserId, peerById],
  )

  const conversationAvatar = useCallback(
    (c: ConversationResponse) => {
      if (c.type === "GROUP") {
        return c.avatar ?? undefined
      }
      if (!currentUserId) return undefined
      const peerId = getPeerAccountId(c, currentUserId)
      if (!peerId) return undefined
      return peerById[peerId]?.avatar ?? undefined
    },
    [currentUserId, peerById],
  )

  const selectedConversation = useMemo(
    () => conversations.find((c) => c.idConversation === selectedConversationId) ?? null,
    [conversations, selectedConversationId],
  )

  const selectedPeerProfile = useMemo(() => {
    if (!selectedConversation || !currentUserId || selectedConversation.type !== "DOUBLE") {
      return null
    }
    const peerId = getPeerAccountId(selectedConversation, currentUserId)
    if (!peerId) return null
    return peerById[peerId] ?? null
  }, [selectedConversation, currentUserId, peerById])

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

        setPeerById((prev) => ({
          ...prev,
          [user.identityUserId]: prev[user.identityUserId] ?? searchItemToProfile(user),
        }))

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
