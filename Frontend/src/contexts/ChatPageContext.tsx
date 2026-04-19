import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"

import { useQuery } from "@/hooks/useQuery"
import { chatService } from "@/services/chat/chat.service"
import { userService } from "@/services/user/user.service"
import type { ChatMessageResponse, ConversationResponse } from "@/types/chat"
import type { UserProfile, UserSearchItem } from "@/types/user.type"
import { normalizeFileMessageContent } from "@/utils/file-display.util"
import { extractUrlsFromText } from "@/utils/link-display.util"

type ChatPageContextValue = {
  currentUserId: string | null
  conversations: ConversationResponse[]
  unreadCountByConversationId: Record<string, number>
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
  detailsView: "main" | "storage" | "group-members" | "search"
  setDetailsView: (view: "main" | "storage" | "group-members" | "search") => void
  isDetailsPanelOpen: boolean
  setDetailsPanelOpen: (open: boolean) => void
  toggleDetailsPanel: () => void
  messageFocusRequestId: string | null
  requestMessageFocus: (messageId: string) => void
  clearMessageFocusRequest: () => void
  onRealtimeMessage: (message: ChatMessageResponse) => void
}

const normalizeConversationPreviewContent = (value: string | null | undefined): string => {
  const normalized = normalizeFileMessageContent(value)
  if (!normalized) {
    return ""
  }
  if (extractUrlsFromText(normalized).length > 0) {
    return "Đã gửi link"
  }
  return normalized
}

const buildConversationPreview = (message: ChatMessageResponse): string => {
  const normalizedContent = normalizeFileMessageContent(message.content)

  if (message.type === "CALL") {
    return "Cuộc gọi thoại"
  }
  if (message.recalled) {
    return normalizedContent || "Tin nhắn đã thu hồi"
  }
  const attachmentType = message.attachments?.[0]?.type
  if (attachmentType === "GIF") {
    return "Đã gửi GIF"
  }
  if (attachmentType === "STICKER") {
    return "Đã gửi sticker"
  }
  if (attachmentType === "IMAGE") {
    return normalizedContent || "Đã gửi hình ảnh"
  }
  if (attachmentType === "VIDEO") {
    return normalizedContent || "Đã gửi video"
  }
  if (attachmentType === "AUDIO") {
    return normalizedContent || "Đã gửi file âm thanh"
  }
  if (attachmentType === "LINK") {
    return "Đã gửi link"
  }
  if (attachmentType === "FILE") {
    return normalizedContent || "Đã gửi file"
  }
  if (attachmentType) {
    return normalizedContent || "Đã gửi tệp đính kèm"
  }
  return normalizeConversationPreviewContent(normalizedContent)
}

const sortConversationsByPinnedAndTime = (items: ConversationResponse[]): ConversationResponse[] => {
  return [...items].sort((left, right) => {
    const leftPinned = Boolean(left.pinned)
    const rightPinned = Boolean(right.pinned)
    if (leftPinned !== rightPinned) {
      return leftPinned ? -1 : 1
    }
    const leftTime = left.dateUpdateMessage ? new Date(left.dateUpdateMessage).getTime() : 0
    const rightTime = right.dateUpdateMessage ? new Date(right.dateUpdateMessage).getTime() : 0
    return rightTime - leftTime
  })
}

const ChatPageContext = createContext<ChatPageContextValue | null>(null)

export function ChatPageProvider({ children }: { children: React.ReactNode }) {
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null)
  const [detailsView, setDetailsView] = useState<"main" | "storage" | "group-members" | "search">("main")
  const [isDetailsPanelOpen, setIsDetailsPanelOpen] = useState(true)
  const [messageFocusRequestId, setMessageFocusRequestId] = useState<string | null>(null)
  const [isStartingChat, setIsStartingChat] = useState(false)
  const [unreadCountByConversationId, setUnreadCountByConversationId] = useState<Record<string, number>>({})

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

  const [conversations, setConversations] = useState<ConversationResponse[]>([])
  const refetchInFlightRef = useRef(false)

  useEffect(() => {
    const incoming = conversationsResponse?.data ?? []
    setConversations((prev) => {
      const senderByConversationId = new Map(
        prev.map((conversation) => [conversation.idConversation, conversation.lastMessageSenderId]),
      )

      const normalized = incoming.map((conversation) => ({
        ...conversation,
        lastMessageContent: normalizeConversationPreviewContent(conversation.lastMessageContent),
        lastMessageSenderId:
          conversation.lastMessageSenderId ?? senderByConversationId.get(conversation.idConversation),
      }))
      return sortConversationsByPinnedAndTime(normalized)
    })

    setUnreadCountByConversationId((prev) => {
      const next: Record<string, number> = {}
      for (const conversation of incoming) {
        const backendUnreadCount = conversation.unreadCount
        const fallbackUnreadCount = prev[conversation.idConversation] ?? 0
        next[conversation.idConversation] = Math.max(0, backendUnreadCount ?? fallbackUnreadCount)
      }
      return next
    })
  }, [conversationsResponse?.data])

  const markConversationAsReadLocal = useCallback((conversationId: string | null) => {
    if (!conversationId) {
      return
    }
    setUnreadCountByConversationId((prev) => {
      const previousCount = prev[conversationId] ?? 0
      if (previousCount === 0 && conversationId in prev) {
        return prev
      }
      return {
        ...prev,
        [conversationId]: 0,
      }
    })
  }, [])

  const markConversationAsRead = useCallback(async (conversationId: string | null) => {
    if (!conversationId) {
      return
    }

    markConversationAsReadLocal(conversationId)
    if (!currentUserId) {
      return
    }

    try {
      await chatService.markConversationAsRead(conversationId)
    } catch {
      // keep UI responsive even if sync call fails
    }
  }, [currentUserId, markConversationAsReadLocal])

  useEffect(() => {
    if (!selectedConversationId) {
      return
    }
    void markConversationAsRead(selectedConversationId)
  }, [markConversationAsRead, selectedConversationId])

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

  const refetchConversationsSafely = useCallback(async () => {
    if (refetchInFlightRef.current) {
      return
    }
    refetchInFlightRef.current = true
    try {
      await refetchConversations()
    } finally {
      refetchInFlightRef.current = false
    }
  }, [refetchConversations])

  const onRealtimeMessage = useCallback((message: ChatMessageResponse) => {
    if (!message?.idConversation) {
      return
    }

    const preview = buildConversationPreview(message)
    const updateAt = message.timeSent ?? new Date().toISOString()
    let found = false

    setConversations((prev) => {
      const index = prev.findIndex((conversation) => conversation.idConversation === message.idConversation)
      if (index < 0) {
        return prev
      }
      found = true
      const next = [...prev]
      const updated: ConversationResponse = {
        ...next[index],
        lastMessageContent: preview,
        lastMessageSenderId: message.idAccountSent,
        dateUpdateMessage: updateAt,
      }
      next[index] = updated
      return sortConversationsByPinnedAndTime(next)
    })

    if (!found) {
      void refetchConversationsSafely()
    }

    if (!currentUserId) {
      return
    }

    const isIncomingFromOther = message.idAccountSent !== currentUserId
    if (!isIncomingFromOther) {
      return
    }

    const isActiveConversation = selectedConversationId === message.idConversation
    if (isActiveConversation) {
      void markConversationAsRead(message.idConversation)
      return
    }

    setUnreadCountByConversationId((prev) => {
      const previousCount = prev[message.idConversation] ?? 0
      const nextCount = previousCount + 1

      if (nextCount === previousCount && message.idConversation in prev) {
        return prev
      }

      return {
        ...prev,
        [message.idConversation]: nextCount,
      }
    })
  }, [currentUserId, markConversationAsRead, refetchConversationsSafely, selectedConversationId])

  const selectConversation = useCallback((id: string | null) => {
    setSelectedConversationId(id)
    setDetailsView("main")
    setMessageFocusRequestId(null)
  }, [])

  const setDetailsPanelOpen = useCallback((open: boolean) => {
    setIsDetailsPanelOpen(open)
  }, [])

  const toggleDetailsPanel = useCallback(() => {
    setIsDetailsPanelOpen((prev) => !prev)
  }, [])

  const requestMessageFocus = useCallback((messageId: string) => {
    setMessageFocusRequestId(messageId)
  }, [])

  const clearMessageFocusRequest = useCallback(() => {
    setMessageFocusRequestId(null)
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
      unreadCountByConversationId,
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
      isDetailsPanelOpen,
      setDetailsPanelOpen,
      toggleDetailsPanel,
      messageFocusRequestId,
      requestMessageFocus,
      clearMessageFocusRequest,
      onRealtimeMessage,
    }),
    [
      conversationAvatar,
      conversationTitle,
      conversations,
      conversationsError,
      conversationsLoading,
      currentUserId,
      unreadCountByConversationId,
      isStartingChat,
      refetchConversations,
      selectConversation,
      selectedConversation,
      selectedPeerProfile,
      detailsView,
      isDetailsPanelOpen,
      setDetailsPanelOpen,
      toggleDetailsPanel,
      messageFocusRequestId,
      requestMessageFocus,
      clearMessageFocusRequest,
      onRealtimeMessage,
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
