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

const ChatPageContext = createContext<ChatPageContextValue | null>(null)

export function ChatPageProvider({ children }: { children: React.ReactNode }) {
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null)
  const [detailsView, setDetailsView] = useState<"main" | "storage" | "group-members" | "search">("main")
  const [isDetailsPanelOpen, setIsDetailsPanelOpen] = useState(true)
  const [messageFocusRequestId, setMessageFocusRequestId] = useState<string | null>(null)
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

  const [conversations, setConversations] = useState<ConversationResponse[]>([])
  const refetchInFlightRef = useRef(false)

  useEffect(() => {
    const incoming = conversationsResponse?.data ?? []
    setConversations((prev) => {
      const senderByConversationId = new Map(
        prev.map((conversation) => [conversation.idConversation, conversation.lastMessageSenderId]),
      )

      return incoming.map((conversation) => ({
        ...conversation,
        lastMessageContent: normalizeConversationPreviewContent(conversation.lastMessageContent),
        lastMessageSenderId:
          conversation.lastMessageSenderId ?? senderByConversationId.get(conversation.idConversation),
      }))
    })
  }, [conversationsResponse?.data])

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
      next.splice(index, 1)
      next.unshift(updated)
      return next
    })

    if (!found) {
      void refetchConversationsSafely()
    }
  }, [refetchConversationsSafely])

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
