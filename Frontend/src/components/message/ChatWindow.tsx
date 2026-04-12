import {
  CalendarDays,
  ChevronDown,
  Copy,
  FileText,
  Forward,
  Image as ImageIcon,
  ListChecks,
  MoreHorizontal,
  PanelRight,
  Paperclip,
  Phone,
  Pin,
  Quote,
  Search,
  Send,
  Smile,
  Sticker,
  Trash2,
  Undo2,
  UserRound,
  Users,
  Video,
  X,
} from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { toast } from "sonner"

import IncomingCallPopup from "@/components/message/IncomingCallPopup"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { useAuth } from "@/contexts/auth-context"
import { useChatPage } from "@/contexts/ChatPageContext"
import { useConversationCall } from "@/hooks/useConversationCall"
import { useChatSocket } from "@/hooks/useChatSocket"
import { cn } from "@/lib/utils"
import { chatService } from "@/services/chat/chat.service"
import { chatSocketService } from "@/services/chat/chat-socket.service"
import { fileService, type AttachmentResponse } from "@/services/file/file.service"
import { userService } from "@/services/user/user.service"
import type { ChatAttachment, ChatMessageResponse, UserRealtimeEvent } from "@/types/chat"
import { displayNameFromProfile, formatChatMessageTime, formatChatSidebarTime } from "@/utils/chat-display.util"
import {
  extractFileNameFromFileMessage,
  getOriginalFileNameFromUrl,
  normalizeFileMessageContent,
} from "@/utils/file-display.util"
import { extractUrlsFromText, splitTextWithUrls } from "@/utils/link-display.util"

const MESSAGE_PAGE_SIZE = 30
const LOAD_MORE_THRESHOLD_PX = 80
const EMOJIS = ["😀", "😂", "😍", "🥰", "😭", "😡", "👍", "🙏", "🎉", "❤️", "🔥", "🤝"]
const STICKERS = [
  "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f63a.png",
  "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f436.png",
  "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f43c.png",
  "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f431.png",
  "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f438.png",
  "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f98a.png",
]
const GIFS = [
  "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExYjV2Nm9nYzNod2VwM2lydjI5dGVvMWhqb3U3ZGpmMmlyMW5ib2hkZSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/xT9IgG50Fb7Mi0prBC/giphy.gif",
  "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExYjV2Nm9nYzNod2VwM2lydjI5dGVvMWhqb3U3ZGpmMmlyMW5ib2hkZSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/l0HUpt2s9Pclgt9Vm/giphy.gif",
  "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExYjV2Nm9nYzNod2VwM2lydjI5dGVvMWhqb3U3ZGpmMmlyMW5ib2hkZSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/26ufdipQqU2lhNA4g/giphy.gif",
  "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExYjV2Nm9nYzNod2VwM2lydjI5dGVvMWhqb3U3ZGpmMmlyMW5ib2hkZSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/3o7aD2saalBwwftBIY/giphy.gif",
]
const SEARCH_PAGE_SIZE = 12
const SEARCH_DEBOUNCE_MS = 500
const SEARCH_FILES_PREVIEW_LIMIT = 8

function renderHighlightedSearchText(content: string, keyword: string): ReactNode {
  const normalizedKeyword = keyword.trim()
  if (!normalizedKeyword) {
    return content
  }

  const escapedKeyword = normalizedKeyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const regex = new RegExp(`(${escapedKeyword})`, "ig")
  const chunks = content.split(regex)

  return chunks.map((chunk, index) => {
    if (!chunk) {
      return null
    }
    if (chunk.toLowerCase() === normalizedKeyword.toLowerCase()) {
      return (
        <span key={`highlight-${index}-${chunk}`} className="font-semibold text-blue-600">
          {chunk}
        </span>
      )
    }
    return <span key={`plain-${index}`}>{chunk}</span>
  })
}

function messagePlainTextForCopy(msg: ChatMessageResponse): string {
  const normalizedContent = normalizeFileMessageContent(msg.content)

  if (msg.recalled) {
    return normalizedContent
  }
  if (msg.type === "CALL") {
    return "Cuộc gọi thoại"
  }
  if (msg.type === "TEXT") {
    return normalizedContent
  }
  const a = msg.attachments?.[0]
  if (a?.type === "STICKER") {
    return "[Sticker]"
  }
  if (a?.type === "GIF") {
    return "[GIF]"
  }
  if (a?.type === "LINK") {
    return a.url || normalizedContent || "[Link]"
  }
  return normalizedContent
}

function renderMessageRichText(content: string): ReactNode {
  const parts = splitTextWithUrls(content)
  if (parts.length === 0) {
    return content
  }

  return parts.map((part, index) => {
    if (part.type === "url") {
      return (
        <a
          key={`url-${index}-${part.value}`}
          href={part.value}
          target="_blank"
          rel="noreferrer noopener"
          className="break-all text-blue-600 underline hover:text-blue-700"
          onClick={(event) => event.stopPropagation()}
        >
          {part.value}
        </a>
      )
    }
    return <span key={`text-${index}`}>{part.value}</span>
  })
}

const formatCallDuration = (seconds?: number) => {
  if (!seconds || seconds <= 0) {
    return "0 phút 0 giây"
  }
  const minute = Math.floor(seconds / 60)
  const second = seconds % 60
  return `${minute} phút ${second} giây`
}

function buildCallMessageCard(
  msg: ChatMessageResponse,
  currentUserId: string | null
): {
  title: string
  subtitle: string
  tone: "danger" | "neutral" | "success"
} {
  const info = msg.callInfo
  if (!info || !currentUserId) {
    return {
      title: "Cuộc gọi",
      subtitle: "Gọi lại",
      tone: "neutral",
    }
  }
  const callKind = info.audioOnly ? "thoại" : "video"
  const isCaller = info.callerUserId === currentUserId
  if (info.outcome === "COMPLETED") {
    return {
      title: isCaller ? `Cuộc gọi ${callKind} đi` : `Cuộc gọi ${callKind} đến`,
      subtitle: formatCallDuration(info.durationSeconds),
      tone: "success",
    }
  }
  if (info.outcome === "NO_ANSWER") {
    return {
      title: isCaller ? "Bạn đã hủy" : "Bạn bị nhỡ",
      subtitle: `Cuộc gọi ${callKind}`,
      tone: "danger",
    }
  }
  if (info.outcome === "REJECTED") {
    return {
      title: isCaller ? "Cuộc gọi bị từ chối" : "Bạn đã từ chối",
      subtitle: `Cuộc gọi ${callKind}`,
      tone: "danger",
    }
  }
  return {
    title: "Cuộc gọi đã kết thúc",
    subtitle: `Cuộc gọi ${callKind}`,
    tone: "neutral",
  }
}

export default function ChatWindow() {
  const { isAuthenticated } = useAuth()
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const draftCaretRef = useRef({ start: 0, end: 0 })
  const bottomRef = useRef<HTMLDivElement>(null)
  const selectedIdRef = useRef<string | null>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const viewportRef = useRef<HTMLElement | null>(null)
  const prependAnchorRef = useRef<{ prevTop: number; prevHeight: number } | null>(null)
  const pendingScrollToBottomRef = useRef(false)
  const messageElementRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const highlightTimeoutRef = useRef<number | null>(null)
  const loadingMissingMessageIdsRef = useRef<Set<string>>(new Set())
  const failedMissingMessageIdsRef = useRef<Set<string>>(new Set())
  const pendingFocusMessageIdRef = useRef<string | null>(null)
  const suppressAutoLoadMoreUntilRef = useRef(0)

  const {
    selectedConversationId,
    selectedConversation,
    currentUserId,
    conversationTitle,
    conversationAvatar,
    onRealtimeMessage,
    selectedPeerProfile,
    detailsView,
    setDetailsView,
    isDetailsPanelOpen,
    setDetailsPanelOpen,
    toggleDetailsPanel,
    messageFocusRequestId,
    clearMessageFocusRequest,
    conversations,
  } = useChatPage()

  selectedIdRef.current = selectedConversationId

  const headerTitle = selectedConversation ? conversationTitle(selectedConversation) : ""
  const headerAvatar = selectedConversation ? conversationAvatar(selectedConversation) : undefined
  const peerFallback = displayNameFromProfile(selectedPeerProfile)
  const peerUserId = useMemo(() => {
    if (!selectedConversation || selectedConversation.type !== "DOUBLE" || !currentUserId) {
      return null
    }
    return (
      selectedConversation.participantInfos.find((participant) => participant.idAccount !== currentUserId)
        ?.idAccount ?? null
    )
  }, [currentUserId, selectedConversation])

  const conversationCall = useConversationCall({
    conversationId: selectedConversationId ?? undefined,
    conversationType: selectedConversation?.type,
    currentUserId,
    peerUserId,
  })

  const [apiMessages, setApiMessages] = useState<ChatMessageResponse[]>([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)

  const [socketExtras, setSocketExtras] = useState<ChatMessageResponse[]>([])
  const [replyTargetCache, setReplyTargetCache] = useState<Record<string, ChatMessageResponse>>({})
  const [senderProfiles, setSenderProfiles] = useState<Record<string, { displayName: string; avatar?: string }>>({})
  const [callPeerProfile, setCallPeerProfile] = useState<{ displayName: string; avatar?: string } | null>(null)

  const [draft, setDraft] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [isUploadingFile, setIsUploadingFile] = useState(false)
  const [emojiOpen, setEmojiOpen] = useState(false)
  const [stickerOpen, setStickerOpen] = useState(false)
  const [gifOpen, setGifOpen] = useState(false)
  const [forwardTarget, setForwardTarget] = useState<ChatMessageResponse | null>(null)
  const [replyingTo, setReplyingTo] = useState<ChatMessageResponse | null>(null)
  const [multiSelectActive, setMultiSelectActive] = useState(false)
  const [selectedMessageIds, setSelectedMessageIds] = useState<Set<string>>(() => new Set())
  const [selectedPinnedMessageId, setSelectedPinnedMessageId] = useState<string | null>(null)
  const [selectedReplyTargetMessageId, setSelectedReplyTargetMessageId] = useState<string | null>(null)
  const [imagePreview, setImagePreview] = useState<{ url: string; alt: string } | null>(null)
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null)
  const [isMessageSearchOpen, setIsMessageSearchOpen] = useState(false)
  const [messageSearchKeyword, setMessageSearchKeyword] = useState("")
  const [searchKeywordDebounced, setSearchKeywordDebounced] = useState("")
  const [searchSenderId, setSearchSenderId] = useState("")
  const [searchFromDate, setSearchFromDate] = useState("")
  const [searchToDate, setSearchToDate] = useState("")
  const [isSearchSenderPopoverOpen, setIsSearchSenderPopoverOpen] = useState(false)
  const [isSearchDatePopoverOpen, setIsSearchDatePopoverOpen] = useState(false)
  const [searchMatchMessages, setSearchMatchMessages] = useState<ChatMessageResponse[]>([])
  const [searchMessagePage, setSearchMessagePage] = useState(1)
  const [searchMessageHasMore, setSearchMessageHasMore] = useState(false)
  const [isLoadingMoreSearchMessages, setIsLoadingMoreSearchMessages] = useState(false)
  const [isSearchingMessages, setIsSearchingMessages] = useState(false)
  const [searchMatchedFiles, setSearchMatchedFiles] = useState<AttachmentResponse[]>([])
  const [isSearchingFiles, setIsSearchingFiles] = useState(false)

  useEffect(() => {
    let cancelled = false

    const loadInitialMessages = async () => {
      if (!selectedConversationId) {
        setApiMessages([])
        setPage(1)
        setHasMore(false)
        return
      }
      setMessagesLoading(true)
      try {
        const res = await chatService.listMessages(selectedConversationId, 1, MESSAGE_PAGE_SIZE)
        if (cancelled) {
          return
        }
        setApiMessages(res.data.items ?? [])
        setPage(1)
        setHasMore((res.data.page ?? 1) < (res.data.totalPage ?? 1))
        pendingScrollToBottomRef.current = true
      } catch {
        if (!cancelled) {
          toast.error("Không tải được tin nhắn")
        }
      } finally {
        if (!cancelled) {
          setMessagesLoading(false)
        }
      }
    }

    void loadInitialMessages()
    setSocketExtras([])
    setReplyTargetCache({})
    prependAnchorRef.current = null
    return () => {
      cancelled = true
    }
  }, [selectedConversationId])

  const loadMoreMessages = useCallback(async () => {
    if (!selectedConversationId || !hasMore || messagesLoading || isLoadingMore) {
      return
    }
    const viewport = viewportRef.current
    if (viewport) {
      prependAnchorRef.current = {
        prevTop: viewport.scrollTop,
        prevHeight: viewport.scrollHeight,
      }
    }

    setIsLoadingMore(true)
    try {
      const nextPage = page + 1
      const res = await chatService.listMessages(selectedConversationId, nextPage, MESSAGE_PAGE_SIZE)
      const moreItems = res.data.items ?? []
      setApiMessages((prev) => [...prev, ...moreItems])
      setPage(nextPage)
      setHasMore((res.data.page ?? nextPage) < (res.data.totalPage ?? nextPage))
    } catch {
      toast.error("Không tải thêm được tin nhắn")
      prependAnchorRef.current = null
    } finally {
      setIsLoadingMore(false)
    }
  }, [hasMore, isLoadingMore, messagesLoading, page, selectedConversationId])

  useEffect(() => {
    const root = scrollAreaRef.current
    if (!root) {
      return
    }
    const viewport = root.querySelector('[data-slot="scroll-area-viewport"]') as HTMLElement | null
    viewportRef.current = viewport
    if (!viewport) {
      return
    }

    const onScroll = () => {
      if (Date.now() < suppressAutoLoadMoreUntilRef.current) {
        return
      }
      if (viewport.scrollTop <= LOAD_MORE_THRESHOLD_PX) {
        void loadMoreMessages()
      }
    }
    viewport.addEventListener("scroll", onScroll, { passive: true })
    return () => {
      viewport.removeEventListener("scroll", onScroll)
    }
  }, [loadMoreMessages])

  const mergeIncomingOrUpdatedMessage = useCallback((msg: ChatMessageResponse) => {
    onRealtimeMessage(msg)
    if (msg.idConversation !== selectedIdRef.current) {
      return
    }
    setSocketExtras((prev) => {
      const i = prev.findIndex((x) => x.idMessage === msg.idMessage)
      if (i >= 0) {
        const next = [...prev]
        next[i] = msg
        return next
      }
      pendingScrollToBottomRef.current = true
      return [...prev, msg]
    })
    setApiMessages((prev) => {
      const i = prev.findIndex((x) => x.idMessage === msg.idMessage)
      if (i < 0) {
        return prev
      }
      const next = [...prev]
      next[i] = msg
      return next
    })
  }, [onRealtimeMessage])

  useChatSocket({
    autoConnect: true,
    onUserEvent: (event: UserRealtimeEvent) => {
      if (event.eventType === "MESSAGE_UPSERT" && event.message) {
        mergeIncomingOrUpdatedMessage(event.message)
      }
    },
  })

  const displayMessages = useMemo(() => {
    const apiItems = apiMessages
    const fromApi = [...apiItems].reverse()
    const byId = new Map<string, ChatMessageResponse>()
    for (const m of fromApi) {
      byId.set(m.idMessage, m)
    }
    for (const m of socketExtras) {
      byId.set(m.idMessage, m)
    }
    return [...byId.values()].sort(
      (a, b) => new Date(a.timeSent).getTime() - new Date(b.timeSent).getTime(),
    )
  }, [apiMessages, socketExtras])

  const messageById = useMemo(() => {
    const m = new Map<string, ChatMessageResponse>()
    for (const x of displayMessages) {
      m.set(x.idMessage, x)
    }
    return m
  }, [displayMessages])

  const pinnedMessagesSorted = useMemo(() => {
    return displayMessages
      .filter((message) => !!message.pinned)
      .sort((left, right) => {
        const rightTime = new Date(right.pinnedAt ?? right.timeSent).getTime()
        const leftTime = new Date(left.pinnedAt ?? left.timeSent).getTime()
        return rightTime - leftTime
      })
  }, [displayMessages])

  useEffect(() => {
    if (!selectedPinnedMessageId) {
      return
    }

    const stillPinned = pinnedMessagesSorted.some((message) => message.idMessage === selectedPinnedMessageId)
    if (!stillPinned) {
      setSelectedPinnedMessageId(null)
    }
  }, [pinnedMessagesSorted, selectedPinnedMessageId])

  useEffect(() => {
    if (!selectedReplyTargetMessageId) {
      return
    }

    const stillExistsInView = displayMessages.some((message) => message.idMessage === selectedReplyTargetMessageId)
    if (!stillExistsInView && pendingFocusMessageIdRef.current !== selectedReplyTargetMessageId) {
      setSelectedReplyTargetMessageId(null)
    }
  }, [displayMessages, selectedReplyTargetMessageId])

  const searchMatchIds = useMemo(() => {
    return searchMatchMessages.map((message) => message.idMessage)
  }, [searchMatchMessages])

  const searchMatchIdSet = useMemo(() => {
    return new Set(searchMatchIds)
  }, [searchMatchIds])

  const searchSenderOptions = useMemo(() => {
    if (!selectedConversation) {
      return [] as Array<{ id: string; name: string; avatar?: string }>
    }

    const ids = Array.from(
      new Set(
        (selectedConversation.participantInfos ?? [])
          .map((participant) => participant.idAccount)
          .filter((id): id is string => !!id),
      ),
    )

    return ids.map((id) => {
      if (id === currentUserId) {
        return { id, name: "Bạn" }
      }
      if (selectedConversation.type === "DOUBLE") {
        return {
          id,
          name: headerTitle || id,
          avatar: headerAvatar,
        }
      }
      return {
        id,
        name: senderProfiles[id]?.displayName ?? id,
        avatar: senderProfiles[id]?.avatar,
      }
    })
  }, [currentUserId, headerAvatar, headerTitle, selectedConversation, senderProfiles])

  const selectedSearchSenderLabel = useMemo(() => {
    if (!searchSenderId) {
      return "Người gửi"
    }
    return searchSenderOptions.find((option) => option.id === searchSenderId)?.name ?? "Người gửi"
  }, [searchSenderId, searchSenderOptions])

  const matchesSearchFilters = useCallback((message: ChatMessageResponse) => {
    if (searchSenderId && message.idAccountSent !== searchSenderId) {
      return false
    }

    const sentAt = new Date(message.timeSent).getTime()
    if (Number.isNaN(sentAt)) {
      return true
    }

    if (searchFromDate) {
      const fromDate = new Date(searchFromDate)
      fromDate.setHours(0, 0, 0, 0)
      if (sentAt < fromDate.getTime()) {
        return false
      }
    }

    if (searchToDate) {
      const toDate = new Date(searchToDate)
      toDate.setHours(23, 59, 59, 999)
      if (sentAt > toDate.getTime()) {
        return false
      }
    }

    return true
  }, [searchFromDate, searchSenderId, searchToDate])

  const loadMissingMessageById = useCallback((
    messageId: string,
    options?: { silentIfMissing?: boolean; focusAfterLoad?: boolean; forceRetry?: boolean },
  ) => {
    if (!selectedConversationId || !messageId) {
      return
    }

    if (!options?.forceRetry && failedMissingMessageIdsRef.current.has(messageId)) {
      if (!options?.silentIfMissing) {
        toast.error("Tin nhắn gốc chưa được tải")
      }
      return
    }

    if (loadingMissingMessageIdsRef.current.has(messageId)) {
      if (options?.focusAfterLoad) {
        pendingFocusMessageIdRef.current = messageId
      }
      return
    }

    loadingMissingMessageIdsRef.current.add(messageId)
    if (options?.focusAfterLoad) {
      pendingFocusMessageIdRef.current = messageId
    }

    void chatService
      .getMessageById(selectedConversationId, messageId)
      .then((response) => {
        const fetchedMessage = response.data
        failedMissingMessageIdsRef.current.delete(messageId)
        setReplyTargetCache((prev) => ({
          ...prev,
          [fetchedMessage.idMessage]: fetchedMessage,
        }))
        setSocketExtras((prev) => {
          const index = prev.findIndex((message) => message.idMessage === fetchedMessage.idMessage)
          if (index >= 0) {
            const next = [...prev]
            next[index] = fetchedMessage
            return next
          }
          return [...prev, fetchedMessage]
        })
      })
      .catch(() => {
        failedMissingMessageIdsRef.current.add(messageId)
        if (!options?.silentIfMissing) {
          toast.error("Tin nhắn gốc chưa được tải")
        }
      })
      .finally(() => {
        loadingMissingMessageIdsRef.current.delete(messageId)
      })
  }, [selectedConversationId])

  const focusReplyTargetMessage = useCallback((messageId?: string, options?: {
    silentIfMissing?: boolean
    tryFetchWhenMissing?: boolean
    forceRetryWhenMissing?: boolean
  }) => {
    if (!messageId) {
      return false
    }

    const target = messageElementRefs.current[messageId]
    if (!target) {
      const shouldTryFetchWhenMissing = options?.tryFetchWhenMissing !== false
      if (shouldTryFetchWhenMissing && selectedConversationId) {
        const cachedTargetMessage = replyTargetCache[messageId]
        if (cachedTargetMessage) {
          pendingFocusMessageIdRef.current = messageId
          setSocketExtras((prev) => {
            const index = prev.findIndex((message) => message.idMessage === cachedTargetMessage.idMessage)
            if (index >= 0) {
              const next = [...prev]
              next[index] = cachedTargetMessage
              return next
            }
            return [...prev, cachedTargetMessage]
          })
          return false
        }

        loadMissingMessageById(messageId, {
          silentIfMissing: options?.silentIfMissing,
          focusAfterLoad: true,
          forceRetry: options?.forceRetryWhenMissing,
        })
        return false
      }

      if (!options?.silentIfMissing) {
        toast.error("Tin nhắn gốc chưa được tải")
      }
      return false
    }

    target.scrollIntoView({ behavior: "smooth", block: "center" })

    // Avoid triggering top-load immediately when the focus jump lands near the top.
    suppressAutoLoadMoreUntilRef.current = Date.now() + 1000
    setHighlightedMessageId(messageId)

    if (highlightTimeoutRef.current != null) {
      window.clearTimeout(highlightTimeoutRef.current)
    }
    highlightTimeoutRef.current = window.setTimeout(() => {
      setHighlightedMessageId((current) => (current === messageId ? null : current))
      highlightTimeoutRef.current = null
    }, 1600)
    return true
  }, [loadMissingMessageById, replyTargetCache, selectedConversationId])

  const focusPinnedMessage = useCallback((messageId: string) => {
    if (selectedPinnedMessageId === messageId) {
      setSelectedPinnedMessageId(null)
      if (pendingFocusMessageIdRef.current === messageId) {
        pendingFocusMessageIdRef.current = null
      }
      return
    }

    setSelectedReplyTargetMessageId(null)
    setSelectedPinnedMessageId(messageId)
    focusReplyTargetMessage(messageId, {
      silentIfMissing: false,
      forceRetryWhenMissing: true,
    })
  }, [focusReplyTargetMessage, selectedPinnedMessageId])

  const focusReplyMessageFromSnippet = useCallback((messageId?: string) => {
    if (!messageId) {
      return
    }

    if (selectedReplyTargetMessageId === messageId) {
      setSelectedReplyTargetMessageId(null)
      if (pendingFocusMessageIdRef.current === messageId) {
        pendingFocusMessageIdRef.current = null
      }
      return
    }

    setSelectedPinnedMessageId(null)
    setSelectedReplyTargetMessageId(messageId)
    focusReplyTargetMessage(messageId, {
      silentIfMissing: false,
      forceRetryWhenMissing: true,
    })
  }, [focusReplyTargetMessage, selectedReplyTargetMessageId])

  useEffect(() => {
    if (!messageFocusRequestId) {
      return
    }

    focusReplyTargetMessage(messageFocusRequestId, {
      silentIfMissing: false,
      forceRetryWhenMissing: true,
    })
    clearMessageFocusRequest()
  }, [clearMessageFocusRequest, focusReplyTargetMessage, messageFocusRequestId])

  useEffect(() => {
    setReplyTargetCache((prev) => {
      let changed = false
      const next = { ...prev }

      for (const message of displayMessages) {
        if (!message.replyToMessageId) {
          continue
        }
        const replyTarget = messageById.get(message.replyToMessageId)
        if (!replyTarget) {
          continue
        }
        if (next[replyTarget.idMessage] === replyTarget) {
          continue
        }
        next[replyTarget.idMessage] = replyTarget
        changed = true
      }

      return changed ? next : prev
    })
  }, [displayMessages, messageById])

  useEffect(() => {
    const pendingMessageId = pendingFocusMessageIdRef.current
    if (!pendingMessageId) {
      return
    }

    const focused = focusReplyTargetMessage(pendingMessageId, {
      silentIfMissing: true,
      tryFetchWhenMissing: false,
    })
    if (focused) {
      pendingFocusMessageIdRef.current = null
    }
  }, [displayMessages, focusReplyTargetMessage])

  useEffect(() => {
    if (!selectedConversationId) {
      return
    }

    const missingReplyIds = Array.from(
      new Set(
        displayMessages
          .map((message) => message.replyToMessageId)
          .filter((id): id is string => !!id),
      ),
    ).filter((id) => !messageById.has(id) && !replyTargetCache[id] && !loadingMissingMessageIdsRef.current.has(id))

    for (const missingReplyId of missingReplyIds.slice(0, 8)) {
      loadMissingMessageById(missingReplyId, {
        silentIfMissing: true,
        focusAfterLoad: false,
      })
    }
  }, [displayMessages, loadMissingMessageById, messageById, replyTargetCache, selectedConversationId])

  useEffect(() => {
    return () => {
      if (highlightTimeoutRef.current != null) {
        window.clearTimeout(highlightTimeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (!isMessageSearchOpen) {
      return
    }
    const timer = window.setTimeout(() => {
      searchInputRef.current?.focus()
      searchInputRef.current?.select()
    }, 0)
    return () => {
      window.clearTimeout(timer)
    }
  }, [isMessageSearchOpen])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearchKeywordDebounced(messageSearchKeyword.trim())
    }, SEARCH_DEBOUNCE_MS)

    return () => {
      window.clearTimeout(timer)
    }
  }, [messageSearchKeyword])

  const fetchSearchMessages = useCallback(async (targetPage: number, append: boolean) => {
    if (!isMessageSearchOpen || !selectedConversationId) {
      setSearchMatchMessages([])
      setSearchMessagePage(1)
      setSearchMessageHasMore(false)
      setIsSearchingMessages(false)
      setIsLoadingMoreSearchMessages(false)
      return
    }

    if (!searchKeywordDebounced) {
      setSearchMatchMessages([])
      setSearchMessagePage(1)
      setSearchMessageHasMore(false)
      setIsSearchingMessages(false)
      setIsLoadingMoreSearchMessages(false)
      return
    }

    if (append) {
      setIsLoadingMoreSearchMessages(true)
    } else {
      setIsSearchingMessages(true)
    }

    try {
      const response = await chatService.searchMessages(selectedConversationId, searchKeywordDebounced, targetPage, SEARCH_PAGE_SIZE)
      const rawItems = response.data.items ?? []
      const filteredItems = rawItems.filter(matchesSearchFilters)

      setSearchMatchMessages((prev) => {
        if (!append) {
          return filteredItems
        }

        const existingIds = new Set(prev.map((message) => message.idMessage))
        const nextItems = filteredItems.filter((message) => !existingIds.has(message.idMessage))
        return [...prev, ...nextItems]
      })

      setSocketExtras((prev) => {
        const byId = new Map<string, ChatMessageResponse>()
        for (const message of prev) {
          byId.set(message.idMessage, message)
        }
        for (const message of filteredItems) {
          byId.set(message.idMessage, message)
        }
        return [...byId.values()]
      })

      const currentPage = response.data.page ?? targetPage
      const totalPage = response.data.totalPage ?? targetPage
      setSearchMessagePage(targetPage)
      setSearchMessageHasMore(currentPage < totalPage)
    } catch {
      if (!append) {
        toast.error("Không tìm kiếm được tin nhắn")
      }
    } finally {
      setIsSearchingMessages(false)
      setIsLoadingMoreSearchMessages(false)
    }
  }, [isMessageSearchOpen, matchesSearchFilters, searchKeywordDebounced, selectedConversationId])

  useEffect(() => {
    void fetchSearchMessages(1, false)
  }, [fetchSearchMessages, searchSenderId, searchFromDate, searchToDate])

  const loadMoreSearchMessages = useCallback(() => {
    if (!searchKeywordDebounced || !searchMessageHasMore || isSearchingMessages || isLoadingMoreSearchMessages) {
      return
    }
    void fetchSearchMessages(searchMessagePage + 1, true)
  }, [fetchSearchMessages, isLoadingMoreSearchMessages, isSearchingMessages, searchKeywordDebounced, searchMessageHasMore, searchMessagePage])

  useEffect(() => {
    if (!isMessageSearchOpen || !selectedConversationId) {
      setSearchMatchedFiles([])
      setIsSearchingFiles(false)
      return
    }

    let cancelled = false
    setIsSearchingFiles(true)

    void fileService
      .getAttachments(selectedConversationId, {
        type: "files",
        search: searchKeywordDebounced || undefined,
        senderId: searchSenderId || undefined,
        fromDate: searchFromDate || undefined,
        toDate: searchToDate || undefined,
      })
      .then((response) => {
        if (cancelled) {
          return
        }
        const sortedFiles = (response.data ?? []).slice().sort((a, b) => {
          const right = new Date(b.timeSent ?? b.timeUpload).getTime()
          const left = new Date(a.timeSent ?? a.timeUpload).getTime()
          return right - left
        })
        setSearchMatchedFiles(sortedFiles.slice(0, SEARCH_FILES_PREVIEW_LIMIT))
      })
      .catch(() => {
        if (!cancelled) {
          setSearchMatchedFiles([])
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsSearchingFiles(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [isMessageSearchOpen, searchFromDate, searchKeywordDebounced, searchSenderId, searchToDate, selectedConversationId])

  useEffect(() => {
    setMultiSelectActive(false)
    setSelectedMessageIds(new Set())
    setSelectedPinnedMessageId(null)
    setSelectedReplyTargetMessageId(null)
    setReplyingTo(null)
    loadingMissingMessageIdsRef.current.clear()
    failedMissingMessageIdsRef.current.clear()
    pendingFocusMessageIdRef.current = null
    suppressAutoLoadMoreUntilRef.current = 0
    setReplyTargetCache({})
    setIsMessageSearchOpen(false)
    setMessageSearchKeyword("")
    setSearchKeywordDebounced("")
    setSearchSenderId("")
    setSearchFromDate("")
    setSearchToDate("")
    setIsSearchSenderPopoverOpen(false)
    setIsSearchDatePopoverOpen(false)
    setSearchMatchMessages([])
    setSearchMessagePage(1)
    setSearchMessageHasMore(false)
    setIsLoadingMoreSearchMessages(false)
    setIsSearchingMessages(false)
    setSearchMatchedFiles([])
    setIsSearchingFiles(false)
  }, [selectedConversationId])

  useEffect(() => {
    if (!selectedConversation || selectedConversation.type !== "GROUP") {
      setSenderProfiles((prev) => (Object.keys(prev).length > 0 ? {} : prev))
      return
    }
    const senderIds = Array.from(
      new Set(
        displayMessages
          .map((message) => message.idAccountSent)
          .filter((id) => id && id !== currentUserId),
      ),
    )
    const missingIds = senderIds.filter((id) => !senderProfiles[id])
    if (missingIds.length === 0) {
      return
    }

    let cancelled = false
    void Promise.all(
      missingIds.map(async (identityUserId) => {
        try {
          const response = await userService.getProfileByIdentityUserId(identityUserId)
          const profile = response.data
          const displayName = `${profile.lastName ?? ""} ${profile.firstName ?? ""}`.trim() || identityUserId
          return [identityUserId, { displayName, avatar: profile.avatar ?? undefined }] as const
        } catch {
          return [identityUserId, { displayName: identityUserId }] as const
        }
      }),
    ).then((entries) => {
      if (cancelled) {
        return
      }
      if (entries.length === 0) {
        return
      }
      setSenderProfiles((prev) => ({ ...prev, ...Object.fromEntries(entries) }))
    })

    return () => {
      cancelled = true
    }
  }, [currentUserId, displayMessages, selectedConversation, senderProfiles])

  useEffect(() => {
    const peerId = conversationCall.activeCall?.peerUserId
    if (!peerId || !isAuthenticated) {
      setCallPeerProfile(null)
      return
    }

    const fromKnownPeer =
      peerUserId === peerId
        ? {
            displayName: headerTitle || peerId,
            avatar: headerAvatar,
          }
        : null

    if (fromKnownPeer?.displayName) {
      setCallPeerProfile(fromKnownPeer)
      return
    }

    let cancelled = false
    void userService
      .getProfileByIdentityUserId(peerId)
      .then((response) => {
        if (cancelled) {
          return
        }
        const data = response.data
        const displayName = `${data.lastName ?? ""} ${data.firstName ?? ""}`.trim() || peerId
        setCallPeerProfile({
          displayName,
          avatar: data.avatar ?? undefined,
        })
      })
      .catch(() => {
        if (cancelled) {
          return
        }
        setCallPeerProfile({
          displayName: peerId,
          avatar: undefined,
        })
      })
    return () => {
      cancelled = true
    }
  }, [conversationCall.activeCall?.peerUserId, headerAvatar, headerTitle, isAuthenticated, peerUserId])

  const isCallModalOpen = useMemo(
    () => conversationCall.phase !== "idle",
    [conversationCall.phase],
  )
  const callModalPeerId = conversationCall.activeCall?.peerUserId ?? null
  const callModalAvatarFallback =
    peerUserId && callModalPeerId && peerUserId === callModalPeerId ? headerAvatar : undefined
  const callModalName =
    callPeerProfile?.displayName
      ?? (peerUserId && callModalPeerId && peerUserId === callModalPeerId ? headerTitle : callModalPeerId)
      ?? "Người dùng"
  const callModalAvatar = callPeerProfile?.avatar ?? callModalAvatarFallback

  const toggleMessageSelection = useCallback((messageId: string) => {
    setSelectedMessageIds((prev) => {
      const next = new Set(prev)
      if (next.has(messageId)) {
        next.delete(messageId)
      } else {
        next.add(messageId)
      }
      return next
    })
  }, [])

  useEffect(() => {
    const viewport = viewportRef.current
    const prependAnchor = prependAnchorRef.current
    if (viewport && prependAnchor) {
      const heightDiff = viewport.scrollHeight - prependAnchor.prevHeight
      viewport.scrollTop = prependAnchor.prevTop + heightDiff
      prependAnchorRef.current = null
      return
    }

    if (pendingScrollToBottomRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: "auto" })
      pendingScrollToBottomRef.current = false
    }
  }, [displayMessages])

  const handleInput = () => {
    const textarea = textareaRef.current
    if (!textarea) {
      return
    }

    textarea.style.height = "auto"
    textarea.style.height = `${textarea.scrollHeight}px`
  }

  const sendMessage = async (
    content: string,
    type: ChatMessageResponse["type"] = "TEXT",
    attachments?: Array<Pick<ChatAttachment, "type" | "url" | "size" | "order">>,
    replyToMessageId?: string | null,
  ) => {
    const normalized = content.trim()
    if (!normalized || !selectedConversationId || !currentUserId) {
      return
    }

    setIsSending(true)
    try {
      const client = chatSocketService.getClient()
      if (client?.connected) {
        chatSocketService.sendMessage(
          selectedConversationId,
          normalized,
          type,
          attachments,
          replyToMessageId,
        )
      } else {
        const res = await chatService.sendMessageRest(
          selectedConversationId,
          normalized,
          type,
          attachments,
          replyToMessageId,
        )
        onRealtimeMessage(res.data)
        setSocketExtras((prev) => {
          if (prev.some((x) => x.idMessage === res.data.idMessage)) {
            return prev
          }
          return [...prev, res.data]
        })
        pendingScrollToBottomRef.current = true
      }
      if (replyToMessageId) {
        setReplyingTo(null)
      }
    } catch {
      toast.error("Gửi tin nhắn thất bại")
    } finally {
      setIsSending(false)
    }
  }

  const sendText = async () => {
    const normalizedDraft = draft.trim()
    if (!normalizedDraft) {
      return
    }

    const linkAttachments = extractUrlsFromText(normalizedDraft).map((url, index) => ({
      type: "LINK" as const,
      url,
      order: index,
    }))

    await sendMessage(
      draft,
      "TEXT",
      linkAttachments.length > 0 ? linkAttachments : undefined,
      replyingTo?.idMessage,
    )
    setDraft("")
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
    }
  }

  const syncDraftCaret = () => {
    const el = textareaRef.current
    if (el) {
      draftCaretRef.current = { start: el.selectionStart, end: el.selectionEnd }
    }
  }

  const insertEmojiIntoDraft = (emoji: string) => {
    const { start, end } = draftCaretRef.current
    const text = textareaRef.current?.value ?? ""
    const safeStart = Math.min(Math.max(0, start), text.length)
    const safeEnd = Math.min(Math.max(safeStart, end), text.length)
    const next = text.slice(0, safeStart) + emoji + text.slice(safeEnd)
    const caretAfter = safeStart + emoji.length
    setDraft(next)
    draftCaretRef.current = { start: caretAfter, end: caretAfter }
    // Không focus textarea ở đây — focus sẽ đóng popover Radix. Co giãn ô nhập sau khi React cập nhật.
    setTimeout(() => {
      handleInput()
    }, 0)
  }

  const handleEmojiOpenChange = (open: boolean) => {
    setEmojiOpen(open)
    if (!open) {
      setTimeout(() => {
        const el = textareaRef.current
        if (el) {
          const { start, end } = draftCaretRef.current
          const len = el.value.length
          const s = Math.min(Math.max(0, start), len)
          const e = Math.min(Math.max(s, end), len)
          el.focus()
          el.setSelectionRange(s, e)
          handleInput()
        }
      }, 0)
    }
  }

  const sendSticker = async (stickerUrl: string) => {
    await sendMessage(
      "Đã gửi sticker",
      "NONTEXT",
      [{ type: "STICKER", url: stickerUrl, order: 0 }],
      replyingTo?.idMessage,
    )
    setStickerOpen(false)
  }

  const sendGif = async (gifUrl: string) => {
    await sendMessage(
      "Đã gửi GIF",
      "NONTEXT",
      [{ type: "GIF", url: gifUrl, order: 0 }],
      replyingTo?.idMessage,
    )
    setGifOpen(false)
  }

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    // Reset input value to allow selecting the same file again
    event.target.value = ""

    // Validate file size (max 25MB)
    const maxSize = 25 * 1024 * 1024
    if (file.size > maxSize) {
      toast.error("Kích thước file tối đa 25MB")
      return
    }

    setIsUploadingFile(true)
    try {
      const uploadResult = await fileService.uploadFile(file)
      const { url, fileSize, type: attachmentType } = uploadResult.data

      // Determine message content based on file type
      let messageContent = ""
      let messageType: ChatMessageResponse["type"] = "NONTEXT"

      if (attachmentType === "IMAGE") {
        messageContent = "Đã gửi hình ảnh"
      } else if (attachmentType === "VIDEO") {
        messageContent = "Đã gửi video"
      } else if (attachmentType === "GIF") {
        messageContent = "Đã gửi GIF"
      } else if (attachmentType === "AUDIO") {
        messageContent = "Đã gửi file âm thanh"
      } else {
        // Lấy tên file từ URL đã upload (đã bỏ UUID)
        messageContent = `Đã gửi file: ${getOriginalFileNameFromUrl(url)}`
      }

      // If there's text in the draft, use MIX type
      if (draft.trim()) {
        messageContent = draft.trim()
        messageType = "MIX"
      }

      await sendMessage(
        messageContent,
        messageType,
        [{ type: attachmentType, url, size: formatFileSize(fileSize), order: 0 }],
        replyingTo?.idMessage,
      )

      // Clear draft if it was used
      if (draft.trim()) {
        setDraft("")
        if (textareaRef.current) {
          textareaRef.current.style.height = "auto"
        }
      }

      toast.success("Gửi file thành công")
    } catch (error) {
      console.error("File upload error:", error)
      toast.error("Upload file thất bại")
    } finally {
      setIsUploadingFile(false)
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const copyMessageText = useCallback(async (msg: ChatMessageResponse) => {
    const text = messagePlainTextForCopy(msg)
    try {
      await navigator.clipboard.writeText(text)
      toast.success("Đã sao chép tin nhắn")
    } catch {
      toast.error("Không sao chép được")
    }
  }, [])

  const removeMessageLocally = useCallback((messageId: string) => {
    setApiMessages((prev) => prev.filter((m) => m.idMessage !== messageId))
    setSocketExtras((prev) => prev.filter((m) => m.idMessage !== messageId))
  }, [])

  const handleRecallMessage = useCallback(
    async (msg: ChatMessageResponse) => {
      if (!selectedConversationId) {
        return
      }
      try {
        const res = await chatService.recallMessage(selectedConversationId, msg.idMessage)
        mergeIncomingOrUpdatedMessage(res.data)
        toast.success("Đã thu hồi tin nhắn")
      } catch {
        toast.error("Không thu hồi được tin nhắn")
      }
    },
    [mergeIncomingOrUpdatedMessage, selectedConversationId],
  )

  const handleHideMessageForMe = useCallback(
    async (msg: ChatMessageResponse) => {
      if (!selectedConversationId) {
        return
      }
      try {
        await chatService.hideMessageForMe(selectedConversationId, msg.idMessage)
        removeMessageLocally(msg.idMessage)
        toast.success("Đã xóa tin nhắn ở phía bạn")
      } catch {
        toast.error("Không xóa được tin nhắn")
      }
    },
    [removeMessageLocally, selectedConversationId],
  )

  const handleTogglePinMessage = useCallback(
    async (msg: ChatMessageResponse) => {
      if (!selectedConversationId) {
        return
      }
      try {
        const response = msg.pinned
          ? await chatService.unpinMessage(selectedConversationId, msg.idMessage)
          : await chatService.pinMessage(selectedConversationId, msg.idMessage)
        mergeIncomingOrUpdatedMessage(response.data)
        if (msg.pinned && selectedPinnedMessageId === msg.idMessage) {
          setSelectedPinnedMessageId(null)
        }
        if (msg.pinned && selectedReplyTargetMessageId === msg.idMessage) {
          setSelectedReplyTargetMessageId(null)
        }
        toast.success(msg.pinned ? "Đã bỏ ghim tin nhắn" : "Đã ghim tin nhắn")
      } catch {
        toast.error(msg.pinned ? "Không bỏ ghim được tin nhắn" : "Không ghim được tin nhắn")
      }
    },
    [mergeIncomingOrUpdatedMessage, selectedConversationId, selectedPinnedMessageId, selectedReplyTargetMessageId],
  )

  const handleForwardTo = useCallback(
    async (targetConversationId: string) => {
      if (!forwardTarget) {
        return
      }
      const content = (forwardTarget.content ?? "").trim()
      const attachments = forwardTarget.attachments?.map((a) => ({
        type: a.type,
        url: a.url,
        size: a.size,
        order: a.order ?? 0,
      }))
      if (!content && (!attachments || attachments.length === 0)) {
        toast.error("Không có nội dung để chuyển")
        return
      }
      try {
        await chatService.sendMessageRest(
          targetConversationId,
          content || " ",
          forwardTarget.type,
          attachments && attachments.length > 0 ? attachments : undefined,
        )
        toast.success("Đã chuyển tin nhắn")
        setForwardTarget(null)
      } catch {
        toast.error("Chuyển tin nhắn thất bại")
      }
    },
    [forwardTarget],
  )

  if (!selectedConversationId || !selectedConversation) {
    return (
      <div className="relative flex h-full min-w-0 flex-1 flex-col items-center justify-center bg-muted/20 px-6 text-center">
        <p className="text-sm text-muted-foreground">
          Chọn một cuộc trò chuyện ở cột bên trái để xem tin nhắn, hoặc tìm người để bắt đầu nhắn tin.
        </p>
        <IncomingCallPopup
          open={isCallModalOpen}
          phase={conversationCall.phase === "idle" ? "outgoing" : conversationCall.phase}
          callerName={callModalName}
          callerAvatar={callModalAvatar}
          audioOnly={conversationCall.activeCall?.audioOnly ?? true}
          startedAt={conversationCall.activeCall?.startedAt}
          ringDeadlineAt={conversationCall.ringDeadlineAt}
          ringDurationMs={conversationCall.ringDurationMs}
          statusMessage={conversationCall.statusMessage}
          micEnabled={conversationCall.micEnabled}
          cameraEnabled={conversationCall.cameraEnabled}
          canToggleCamera={conversationCall.canToggleCamera}
          remoteAudioRef={conversationCall.remoteAudioRef}
          remoteVideoRef={conversationCall.remoteVideoRef}
          localVideoRef={conversationCall.localVideoRef}
          onAccept={conversationCall.acceptIncomingCall}
          onAcceptWithoutCamera={conversationCall.acceptIncomingCallWithoutCamera}
          onReject={conversationCall.rejectIncomingCall}
          onEnd={conversationCall.endCurrentCall}
          onToggleMic={conversationCall.toggleMicrophone}
          onToggleCamera={conversationCall.toggleCamera}
        />
      </div>
    )
  }

  return (
    <div className="relative flex h-full min-w-0 flex-1 flex-col bg-muted/20">
      <div className="flex h-16 shrink-0 items-center justify-between border-b bg-background px-4">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar size="lg">
            <AvatarImage src={headerAvatar} alt={headerTitle} />
            <AvatarFallback>{(peerFallback || headerTitle).slice(0, 2)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold text-foreground">{headerTitle}</h2>
            {selectedConversation.type === "GROUP" ? (
              <button
                type="button"
                className="flex items-center gap-1 text-xs text-slate-600 hover:text-blue-600"
                onClick={() => {
                  setDetailsView("group-members")
                  setDetailsPanelOpen(true)
                }}
              >
                <Users className="h-3.5 w-3.5" />
                {selectedConversation.numberMember} thành viên
              </button>
            ) : (
              <p className="text-xs text-green-600">Trực tuyến</p>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            title="Tìm kiếm"
            className={cn(
              "rounded-md",
              isDetailsPanelOpen && detailsView === "search" ? "bg-blue-50 text-blue-700" : undefined,
            )}
            onClick={() => {
              if (isDetailsPanelOpen && detailsView === "search") {
                setDetailsView("main")
                return
              }
              setDetailsView("search")
              setDetailsPanelOpen(true)
              setIsMessageSearchOpen(false)
            }}
          >
            <Search className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            title="Cuộc gọi thoại"
            disabled={!conversationCall.canStartAudioCall}
            onClick={() => conversationCall.startAudioCall()}
          >
            <Phone className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            title="Cuộc gọi video"
            disabled={!conversationCall.canStartVideoCall}
            onClick={() => conversationCall.startVideoCall()}
          >
            <Video className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            className={cn("text-primary", isDetailsPanelOpen ? "bg-blue-50" : undefined)}
            onClick={() => {
              if (!isDetailsPanelOpen) {
                setDetailsView("main")
              }
              toggleDetailsPanel()
            }}
            title={isDetailsPanelOpen ? "Đóng thanh thông tin" : "Mở thanh thông tin"}
          >
            <PanelRight className={cn("h-5 w-5", isDetailsPanelOpen ? "text-blue-700" : "text-blue-600")} />
          </Button>
        </div>
      </div>

      {pinnedMessagesSorted.length > 0 ? (
        <div className="flex shrink-0 items-center gap-2 border-b bg-amber-50/70 px-3 py-1.5 text-xs">
          <div className="flex shrink-0 items-center gap-1 text-amber-800">
            <Pin className="size-3.5" />
            <span className="font-medium">{pinnedMessagesSorted.length} tin ghim</span>
          </div>

          <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto pb-0.5">
            {pinnedMessagesSorted.map((pinnedMessage) => (
              <div
                key={pinnedMessage.idMessage}
                className={cn(
                  "flex min-w-0 max-w-xs shrink-0 items-center gap-1 rounded-md border px-2 py-1",
                  selectedPinnedMessageId === pinnedMessage.idMessage
                    ? "border-amber-400 bg-amber-200/80 ring-1 ring-amber-300"
                    : "border-amber-200 bg-amber-100/70",
                )}
              >
                <button
                  type="button"
                  className="truncate text-left text-amber-900 hover:text-amber-950"
                  onClick={() => focusPinnedMessage(pinnedMessage.idMessage)}
                  title={messagePlainTextForCopy(pinnedMessage)}
                >
                  {messagePlainTextForCopy(pinnedMessage)}
                </button>
                <button
                  type="button"
                  className="rounded p-0.5 text-amber-700 hover:bg-amber-200 hover:text-amber-900"
                  title="Bỏ ghim"
                  onClick={() => void handleTogglePinMessage(pinnedMessage)}
                >
                  <X className="size-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {isMessageSearchOpen ? (
        <div className="absolute bottom-0 right-0 top-16 z-30 w-[380px] border-l bg-slate-100 shadow-[-8px_0_24px_rgba(15,23,42,0.08)]">
          <div className="flex h-full flex-col">
            <div className="border-b bg-white px-4 pb-4 pt-3">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-2xl font-semibold text-slate-800">Tìm kiếm trong trò chuyện</h3>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="rounded-full"
                  onClick={() => setIsMessageSearchOpen(false)}
                  title="Đóng tìm kiếm"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <Input
                  ref={searchInputRef}
                  value={messageSearchKeyword}
                  onChange={(event) => setMessageSearchKeyword(event.target.value)}
                  placeholder="Tìm kiếm"
                  className="h-11 rounded-md border-slate-300 bg-white pl-9 pr-12"
                />
                {messageSearchKeyword ? (
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-500 hover:text-slate-700"
                    onClick={() => setMessageSearchKeyword("")}
                  >
                    Xóa
                  </button>
                ) : null}
              </div>

              <div className="mt-3 flex items-center gap-2">
                <span className="text-sm text-slate-500">Lọc theo:</span>
                <Popover open={isSearchSenderPopoverOpen} onOpenChange={setIsSearchSenderPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="h-8 rounded-md border-slate-300 bg-slate-50 px-2 text-slate-700">
                      <UserRound className="mr-1.5 h-3.5 w-3.5" />
                      <span className="max-w-[100px] truncate text-sm">{selectedSearchSenderLabel}</span>
                      <ChevronDown className="ml-1 h-3.5 w-3.5" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-2" align="start">
                    <button
                      type="button"
                      className="flex w-full items-center rounded-md px-2 py-2 text-left text-sm hover:bg-muted"
                      onClick={() => {
                        setSearchSenderId("")
                        setIsSearchSenderPopoverOpen(false)
                      }}
                    >
                      Tất cả
                    </button>
                    <div className="max-h-56 space-y-0.5 overflow-y-auto">
                      {searchSenderOptions.map((option) => (
                        <button
                          key={option.id}
                          type="button"
                          className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-muted"
                          onClick={() => {
                            setSearchSenderId(option.id)
                            setIsSearchSenderPopoverOpen(false)
                          }}
                        >
                          <Avatar size="sm">
                            <AvatarImage src={option.avatar} alt={option.name} />
                            <AvatarFallback>{option.name.slice(0, 2)}</AvatarFallback>
                          </Avatar>
                          <span className="truncate">{option.name}</span>
                        </button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>

                <Popover open={isSearchDatePopoverOpen} onOpenChange={setIsSearchDatePopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="h-8 rounded-md border-slate-300 bg-slate-50 px-2 text-slate-700">
                      <CalendarDays className="mr-1.5 h-3.5 w-3.5" />
                      <span className="max-w-[90px] truncate text-sm">
                        {searchFromDate || searchToDate ? "Đang lọc ngày" : "Ngày gửi"}
                      </span>
                      <ChevronDown className="ml-1 h-3.5 w-3.5" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[320px] p-0" align="start">
                    <div className="border-b px-4 py-3">
                      <p className="text-sm font-medium">Gợi ý thời gian</p>
                      <div className="mt-2 flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const toDate = new Date()
                            const fromDate = new Date()
                            fromDate.setDate(toDate.getDate() - 6)
                            setSearchFromDate(fromDate.toISOString().slice(0, 10))
                            setSearchToDate(toDate.toISOString().slice(0, 10))
                          }}
                        >
                          7 ngày
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const toDate = new Date()
                            const fromDate = new Date()
                            fromDate.setDate(toDate.getDate() - 29)
                            setSearchFromDate(fromDate.toISOString().slice(0, 10))
                            setSearchToDate(toDate.toISOString().slice(0, 10))
                          }}
                        >
                          30 ngày
                        </Button>
                      </div>
                    </div>
                    <div className="px-4 py-3">
                      <p className="mb-2 text-sm font-medium">Khoảng thời gian</p>
                      <div className="grid grid-cols-2 gap-2">
                        <Input type="date" value={searchFromDate} onChange={(event) => setSearchFromDate(event.target.value)} />
                        <Input type="date" value={searchToDate} onChange={(event) => setSearchToDate(event.target.value)} />
                      </div>
                      <div className="mt-2 flex justify-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSearchFromDate("")
                            setSearchToDate("")
                          }}
                        >
                          Xóa lọc
                        </Button>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <ScrollArea className="min-h-0 flex-1">
              <div className="px-4 py-3">
                <p className="text-[22px] font-semibold text-slate-800">Tin nhắn</p>

                {!searchKeywordDebounced ? (
                  <p className="mt-3 text-sm text-slate-500">Nhập từ khóa để tìm tin nhắn trong cuộc trò chuyện.</p>
                ) : null}

                {isSearchingMessages ? (
                  <div className="flex justify-center py-4">
                    <Spinner className="size-5 text-muted-foreground" />
                  </div>
                ) : null}

                {searchKeywordDebounced && !isSearchingMessages && searchMatchMessages.length === 0 ? (
                  <p className="mt-3 text-sm text-slate-500">Không tìm thấy tin nhắn phù hợp.</p>
                ) : null}

                <div className="mt-2 space-y-1">
                  {searchMatchMessages.map((message) => {
                    const sender = searchSenderOptions.find((option) => option.id === message.idAccountSent)
                    const senderName = sender?.name ?? message.idAccountSent
                    const senderAvatar = sender?.avatar
                    const plainText = messagePlainTextForCopy(message)

                    return (
                      <button
                        key={`search-message-${message.idMessage}`}
                        type="button"
                        className="w-full rounded-md border-b border-slate-200 px-1 py-2 text-left hover:bg-slate-200/70"
                        onClick={() => {
                          focusReplyTargetMessage(message.idMessage, {
                            silentIfMissing: false,
                            forceRetryWhenMissing: true,
                          })
                        }}
                      >
                        <div className="flex items-start gap-2.5">
                          <Avatar size="default">
                            <AvatarImage src={senderAvatar} alt={senderName} />
                            <AvatarFallback>{senderName.slice(0, 2)}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <p className="truncate text-sm font-medium text-slate-700">{senderName}</p>
                              <span className="shrink-0 text-xs text-slate-500">{formatChatSidebarTime(message.timeSent)}</span>
                            </div>
                            <p className="mt-0.5 line-clamp-2 text-sm text-slate-700">
                              {renderHighlightedSearchText(plainText, searchKeywordDebounced)}
                            </p>
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>

                {searchMessageHasMore ? (
                  <Button
                    type="button"
                    variant="secondary"
                    className="mt-2 h-8 w-full bg-slate-300 text-slate-700 hover:bg-slate-400"
                    disabled={isLoadingMoreSearchMessages}
                    onClick={loadMoreSearchMessages}
                  >
                    {isLoadingMoreSearchMessages ? "Đang tải..." : "Xem thêm"}
                  </Button>
                ) : null}
              </div>

              <Separator className="bg-slate-300" />

              <div className="px-4 py-4">
                <p className="text-2xl font-semibold text-slate-800">File</p>

                {isSearchingFiles ? (
                  <div className="flex justify-center py-4">
                    <Spinner className="size-5 text-muted-foreground" />
                  </div>
                ) : null}

                {!isSearchingFiles && searchMatchedFiles.length === 0 ? (
                  <p className="mt-2 text-sm text-slate-500">Không có file phù hợp.</p>
                ) : null}

                <div className="mt-2 space-y-1.5">
                  {searchMatchedFiles.map((file) => {
                    const fileName = getOriginalFileNameFromUrl(file.url)
                    const ext = fileName.split(".").pop()?.toUpperCase().slice(0, 3) ?? "FILE"
                    const senderName = searchSenderOptions.find((option) => option.id === file.senderId)?.name
                      ?? file.senderId
                      ?? "Người gửi"
                    const fileDate = new Date(file.timeSent ?? file.timeUpload).toLocaleDateString("vi-VN", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "2-digit",
                    })

                    return (
                      <a
                        key={`search-file-${file.idAttachment}`}
                        href={file.url}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="flex items-start gap-2.5 rounded-md px-1 py-1.5 hover:bg-slate-200/70"
                      >
                        <div className="flex h-11 w-10 shrink-0 items-center justify-center rounded-md bg-red-500 text-xs font-semibold text-white">
                          {ext === "DOC" || ext === "DOCX" ? "W" : ext === "XLS" || ext === "XLSX" ? "X" : ext}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-base text-slate-800">{renderHighlightedSearchText(fileName, searchKeywordDebounced)}</p>
                          <p className="truncate text-sm text-slate-500">
                            {file.size || "Unknown size"} - {senderName}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center text-xs text-slate-500">
                          <FileText className="mr-1 h-3.5 w-3.5" />
                          {fileDate}
                        </div>
                      </a>
                    )
                  })}
                </div>
              </div>
            </ScrollArea>
          </div>
        </div>
      ) : null}
      <IncomingCallPopup
        open={isCallModalOpen}
        phase={conversationCall.phase === "idle" ? "outgoing" : conversationCall.phase}
        callerName={callModalName}
        callerAvatar={callModalAvatar}
        audioOnly={conversationCall.activeCall?.audioOnly ?? true}
        startedAt={conversationCall.activeCall?.startedAt}
        ringDeadlineAt={conversationCall.ringDeadlineAt}
        ringDurationMs={conversationCall.ringDurationMs}
        statusMessage={conversationCall.statusMessage}
        micEnabled={conversationCall.micEnabled}
        cameraEnabled={conversationCall.cameraEnabled}
        canToggleCamera={conversationCall.canToggleCamera}
        remoteAudioRef={conversationCall.remoteAudioRef}
        remoteVideoRef={conversationCall.remoteVideoRef}
        localVideoRef={conversationCall.localVideoRef}
        onAccept={conversationCall.acceptIncomingCall}
        onAcceptWithoutCamera={conversationCall.acceptIncomingCallWithoutCamera}
        onReject={conversationCall.rejectIncomingCall}
        onEnd={conversationCall.endCurrentCall}
        onToggleMic={conversationCall.toggleMicrophone}
        onToggleCamera={conversationCall.toggleCamera}
      />

      <div ref={scrollAreaRef} className="min-h-0 flex-1">
        <ScrollArea className="h-full min-h-0">
          <div className="space-y-2 p-4">
            {messagesLoading ? (
              <div className="flex justify-center py-20">
                <Spinner className="size-8 text-muted-foreground" />
              </div>
            ) : (
              <>
                {isLoadingMore && (
                  <div className="flex justify-center py-2">
                    <Spinner className="size-4 text-muted-foreground" />
                  </div>
                )}
                {displayMessages.map((msg) => {
                  const isMe = msg.idAccountSent === currentUserId
                  const showAvatar = !isMe
                  const showSenderName = !isMe && selectedConversation.type === "GROUP"
                  const senderInfo = senderProfiles[msg.idAccountSent]
                  const senderName =
                    selectedConversation.type === "GROUP"
                      ? senderInfo?.displayName ?? msg.idAccountSent
                      : headerTitle
                  const senderAvatar =
                    selectedConversation.type === "GROUP"
                      ? senderInfo?.avatar
                      : headerAvatar
                  const firstAttachment = msg.attachments?.[0]
                  const isCallMessage = msg.type === "CALL" && msg.callInfo != null
                  const callCard = isCallMessage ? buildCallMessageCard(msg, currentUserId) : null

                  const replyParent = msg.replyToMessageId
                    ? (messageById.get(msg.replyToMessageId) ?? replyTargetCache[msg.replyToMessageId])
                    : undefined
                  const normalizedMessageContent = normalizeFileMessageContent(msg.content)
                  const fileNameFromMessage = extractFileNameFromFileMessage(normalizedMessageContent)

                  return (
                    <div
                      key={msg.idMessage}
                      ref={(element) => {
                        if (element) {
                          messageElementRefs.current[msg.idMessage] = element
                          return
                        }
                        delete messageElementRefs.current[msg.idMessage]
                      }}
                      className={cn(
                        "flex gap-2 rounded-md px-1 py-0.5 transition-colors",
                        searchMatchIdSet.has(msg.idMessage) && "bg-amber-50/70 ring-1 ring-amber-200",
                        selectedPinnedMessageId === msg.idMessage && "bg-amber-100/50 ring-1 ring-amber-300",
                        selectedReplyTargetMessageId === msg.idMessage && "bg-primary/10 ring-1 ring-primary/40",
                        highlightedMessageId === msg.idMessage && "bg-primary/10",
                        isMe ? "justify-end" : "justify-start",
                      )}
                    >
                      {showAvatar && (
                        <Avatar size="sm" className={cn("shrink-0", showSenderName ? "mt-5 self-start" : "mb-1 self-end")}>
                          <AvatarImage src={senderAvatar} alt={senderName} />
                          <AvatarFallback>{senderName.slice(0, 2)}</AvatarFallback>
                        </Avatar>
                      )}
                      <div
                        className={cn(
                          "flex max-w-[min(70%,28rem)] items-end gap-2",
                          isMe ? "flex-row-reverse" : "flex-row",
                        )}
                      >
                        {multiSelectActive ? (
                          <button
                            type="button"
                            aria-label="Chọn tin nhắn"
                            onClick={() => toggleMessageSelection(msg.idMessage)}
                            className={cn(
                              "mb-5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2",
                              selectedMessageIds.has(msg.idMessage)
                                ? "border-blue-600 bg-blue-600 text-white"
                                : "border-muted-foreground/40 bg-background",
                            )}
                          >
                            {selectedMessageIds.has(msg.idMessage) ? "✓" : ""}
                          </button>
                        ) : null}
                        <div
                          className={cn(
                            "group/msg flex min-w-0 items-end gap-1",
                            isMe ? "flex-row-reverse" : "flex-row",
                          )}
                        >
                          <div
                            className={cn(
                              "flex min-w-0 flex-col",
                              isMe ? "items-end" : "items-start",
                            )}
                          >
                            {showSenderName ? (
                              <p className="mb-1 px-1 text-xs font-medium text-slate-600">{senderName}</p>
                            ) : null}
                            {msg.replyToMessageId && !msg.recalled ? (
                              <div
                                role="button"
                                tabIndex={0}
                                onClick={() => focusReplyMessageFromSnippet(msg.replyToMessageId)}
                                onKeyDown={(event) => {
                                  if (event.key === "Enter" || event.key === " ") {
                                    event.preventDefault()
                                    focusReplyMessageFromSnippet(msg.replyToMessageId)
                                  }
                                }}
                                className={cn(
                                  "mb-1.5 max-w-full rounded-md border-l-2 border-primary/50 bg-black/[0.03] px-2 py-1 text-left text-xs text-muted-foreground transition-colors hover:bg-black/[0.06] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40 dark:bg-white/5 dark:hover:bg-white/10",
                                  selectedReplyTargetMessageId === msg.replyToMessageId && "ring-1 ring-primary/30 bg-primary/5",
                                  isMe ? "mr-0" : "ml-0",
                                )}
                              >
                                <span className="line-clamp-2">
                                  {replyParent
                                    ? messagePlainTextForCopy(replyParent)
                                    : "Tin nhắn"}
                                </span>
                              </div>
                            ) : null}
                            {msg.recalled ? (
                              <div
                                className={cn(
                                  "rounded-2xl px-4 py-2 text-sm italic text-muted-foreground",
                                  isMe ? "rounded-br-sm bg-primary/5" : "rounded-bl-sm border bg-muted/40",
                                )}
                              >
                                {normalizedMessageContent}
                              </div>
                            ) : msg.type === "TEXT" ? (
                              <div
                                className={cn(
                                  "rounded-2xl px-4 py-2 text-sm",
                                  isMe
                                    ? "rounded-br-sm bg-primary/10 text-foreground"
                                    : "rounded-bl-sm border bg-background text-foreground shadow-xs",
                                )}
                              >
                                {renderMessageRichText(normalizedMessageContent)}
                              </div>
                            ) : isCallMessage ? (
                              <div
                                className={cn(
                                  "w-52 rounded-xl border px-4 py-3 shadow-xs",
                                  callCard?.tone === "danger"
                                    ? "border-red-200 bg-red-50"
                                    : callCard?.tone === "success"
                                      ? "border-emerald-200 bg-emerald-50"
                                      : "border-slate-200 bg-slate-50"
                                )}
                              >
                                <p
                                  className={cn(
                                    "text-base font-semibold",
                                    callCard?.tone === "danger"
                                      ? "text-red-600"
                                      : callCard?.tone === "success"
                                        ? "text-emerald-700"
                                        : "text-slate-700"
                                  )}
                                >
                                  {callCard?.title}
                                </p>
                                <p className="mt-1 border-b pb-2 text-sm text-slate-600">{callCard?.subtitle}</p>
                                <button
                                  type="button"
                                  className="mt-2 text-sm font-semibold text-blue-600 hover:underline"
                                  disabled={!conversationCall.canStartAudioCall}
                                  onClick={() => {
                                    if (msg.callInfo?.audioOnly === false) {
                                      void conversationCall.startVideoCall()
                                      return
                                    }
                                    void conversationCall.startAudioCall()
                                  }}
                                >
                                  Gọi lại
                                </button>
                              </div>
                            ) : firstAttachment?.type === "STICKER" ? (
                              <div className="rounded-2xl bg-amber-50 p-2 shadow-xs ring-1 ring-amber-200">
                                <img src={firstAttachment.url} alt="sticker" className="h-20 w-20 object-contain" />
                              </div>
                            ) : firstAttachment?.type === "GIF" ? (
                              <div className="overflow-hidden rounded-2xl border bg-background shadow-xs">
                                <img src={firstAttachment.url} alt="gif" className="max-h-52 w-56 object-cover" />
                              </div>
                            ) : firstAttachment?.type === "IMAGE" ? (
                              <div className="overflow-hidden rounded-2xl border bg-background shadow-xs cursor-pointer">
                                <img 
                                  src={firstAttachment.url} 
                                  alt="image" 
                                  className="max-h-64 max-w-xs object-contain hover:opacity-90 transition-opacity" 
                                  onClick={() => setImagePreview({ url: firstAttachment.url, alt: 'Image' })}
                                />
                                {normalizedMessageContent && normalizedMessageContent.trim() && (
                                  <div className="px-3 py-2 text-sm text-foreground">
                                    {renderMessageRichText(normalizedMessageContent)}
                                  </div>
                                )}
                              </div>
                            ) : firstAttachment?.type === "VIDEO" ? (
                              <div className="overflow-hidden rounded-2xl border bg-background shadow-xs">
                                <video 
                                  src={firstAttachment.url} 
                                  controls
                                  className="max-h-64 max-w-xs bg-black"
                                  preload="metadata"
                                />
                                {normalizedMessageContent && normalizedMessageContent.trim() && (
                                  <div className="px-3 py-2 text-sm text-foreground">
                                    {renderMessageRichText(normalizedMessageContent)}
                                  </div>
                                )}
                              </div>
                            ) : firstAttachment?.type === "AUDIO" ? (
                              <div className="rounded-2xl border bg-background px-4 py-3 shadow-xs min-w-[280px]">
                                <p className="text-xs text-muted-foreground mb-2">File âm thanh</p>
                                <audio 
                                  src={firstAttachment.url} 
                                  controls
                                  className="w-full h-8"
                                  preload="metadata"
                                />
                                {normalizedMessageContent && normalizedMessageContent.trim() && (
                                  <div className="mt-2 text-sm text-foreground">
                                    {renderMessageRichText(normalizedMessageContent)}
                                  </div>
                                )}
                              </div>
                            ) : firstAttachment?.type === "LINK" ? (
                              <div className="rounded-2xl border bg-background px-3 py-2.5 shadow-xs max-w-[280px]">
                                <a
                                  href={firstAttachment.url}
                                  target="_blank"
                                  rel="noreferrer noopener"
                                  className="block break-all text-sm text-blue-600 underline hover:text-blue-700"
                                >
                                  {firstAttachment.url}
                                </a>
                                {normalizedMessageContent
                                  && normalizedMessageContent.trim()
                                  && normalizedMessageContent.trim() !== firstAttachment.url && (
                                  <div className="mt-2 border-t pt-2 text-sm text-foreground">
                                    {renderMessageRichText(normalizedMessageContent)}
                                  </div>
                                )}
                              </div>
                            ) : firstAttachment?.type === "FILE" ? (
                              (() => {
                                const fileNameFromUrl = getOriginalFileNameFromUrl(firstAttachment.url)
                                const displayFileName = fileNameFromMessage || fileNameFromUrl

                                return (
                              <a 
                                href={firstAttachment.url} 
                                download
                                className="block rounded-xl border bg-background px-3 py-2.5 shadow-xs hover:bg-muted/50 transition-colors max-w-[280px]"
                              >
                                <div className="flex items-start gap-2.5">
                                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-blue-500 text-white text-[10px] font-bold">
                                    {firstAttachment.url.split('.').pop()?.toUpperCase().substring(0, 4) || 'FILE'}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium text-foreground line-clamp-2 break-all">
                                      {displayFileName}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                      {firstAttachment.size || 'Unknown size'}
                                    </p>
                                  </div>
                                </div>
                                {normalizedMessageContent
                                  && normalizedMessageContent.trim()
                                  && normalizedMessageContent !== `Đã gửi file: ${displayFileName}` && (
                                  <div className="mt-2 text-sm text-foreground border-t pt-2">
                                    {renderMessageRichText(normalizedMessageContent)}
                                  </div>
                                )}
                              </a>
                                )
                              })()
                            ) : (
                              <div className="rounded-2xl border bg-background px-4 py-2 text-sm text-muted-foreground">
                                {renderMessageRichText(normalizedMessageContent)}
                              </div>
                            )}
                            {msg.pinned ? (
                              <span className="mt-1 flex items-center gap-1 text-[11px] text-amber-600">
                                <Pin className="size-3" />
                                Đã ghim
                              </span>
                            ) : null}
                            <span className="mt-1 text-[11px] text-muted-foreground">
                              {formatChatMessageTime(msg.timeSent)}
                            </span>
                          </div>

                          {!msg.recalled && !multiSelectActive && !isCallMessage ? (
                            <div
                              className={cn(
                                "mb-5 flex shrink-0 gap-0.5 opacity-0 transition-opacity duration-150 group-hover/msg:opacity-100",
                                "pointer-events-none group-hover/msg:pointer-events-auto",
                              )}
                            >
                              <Button
                                type="button"
                                variant="secondary"
                                size="icon"
                                className="h-7 w-7 rounded-full border-0 bg-muted/90 shadow-sm hover:bg-muted"
                                title="Trả lời (Rep)"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setReplyingTo(msg)
                                  setTimeout(() => textareaRef.current?.focus(), 0)
                                }}
                              >
                                <Quote className="size-3.5" />
                              </Button>
                              <Button
                                type="button"
                                variant="secondary"
                                size="icon"
                                className="h-7 w-7 rounded-full border-0 bg-muted/90 shadow-sm hover:bg-muted"
                                title="Chuyển tiếp"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setForwardTarget(msg)
                                }}
                              >
                                <Forward className="size-3.5" />
                              </Button>
                              <DropdownMenu modal={false}>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    type="button"
                                    variant="secondary"
                                    size="icon"
                                    className="h-7 w-7 rounded-full border-0 bg-muted/90 shadow-sm hover:bg-muted"
                                    title="Thêm"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <MoreHorizontal className="size-3.5" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align={isMe ? "end" : "start"} className="w-56">
                                  <DropdownMenuItem
                                    className="gap-2"
                                    onSelect={() => void copyMessageText(msg)}
                                  >
                                    <Copy className="size-4" />
                                    Copy tin nhắn
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="gap-2"
                                    onSelect={() => void handleTogglePinMessage(msg)}
                                  >
                                    <Pin className="size-4" />
                                    {msg.pinned ? "Bỏ ghim tin nhắn" : "Ghim tin nhắn"}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="gap-2"
                                    onSelect={() => {
                                      setMultiSelectActive(true)
                                      setSelectedMessageIds(new Set([msg.idMessage]))
                                    }}
                                  >
                                    <ListChecks className="size-4" />
                                    Chọn nhiều tin nhắn
                                  </DropdownMenuItem>
                                  {isMe && !msg.recalled ? (
                                    <>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem
                                        variant="destructive"
                                        className="gap-2"
                                        onSelect={() => void handleRecallMessage(msg)}
                                      >
                                        <Undo2 className="size-4" />
                                        Thu hồi
                                      </DropdownMenuItem>
                                    </>
                                  ) : null}
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    variant="destructive"
                                    className="gap-2"
                                    onSelect={() => void handleHideMessageForMe(msg)}
                                  >
                                    <Trash2 className="size-4" />
                                    Xóa chỉ ở phía tôi
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </>
            )}
            <div ref={bottomRef} />
          </div>
        </ScrollArea>
      </div>

      {multiSelectActive ? (
        <div className="flex shrink-0 items-center justify-between gap-2 border-b bg-muted/40 px-3 py-2 text-sm">
          <span className="text-muted-foreground">
            Đã chọn <strong className="text-foreground">{selectedMessageIds.size}</strong> tin nhắn
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setMultiSelectActive(false)
              setSelectedMessageIds(new Set())
            }}
          >
            Xong
          </Button>
        </div>
      ) : null}

      <div className="shrink-0 border-t bg-background p-3">
        {replyingTo ? (
          <div className="mb-2 flex items-start gap-2 rounded-lg border bg-muted/30 px-3 py-2 text-sm">
            <Quote className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-muted-foreground">Trả lời</p>
              <p className="truncate text-foreground">{messagePlainTextForCopy(replyingTo)}</p>
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              type="button"
              title="Bỏ trả lời"
              onClick={() => setReplyingTo(null)}
            >
              <X className="size-4" />
            </Button>
          </div>
        ) : null}
        <div className="mb-2 flex gap-1">
          <Popover open={stickerOpen} onOpenChange={setStickerOpen}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon-sm" title="Gửi sticker" type="button">
                <Sticker className="h-5 w-5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-3" align="start">
              <div className="mb-2 text-xs font-medium text-muted-foreground">Chọn sticker</div>
              <div className="grid grid-cols-3 gap-2">
                {STICKERS.map((stickerUrl) => (
                  <button
                    key={stickerUrl}
                    type="button"
                    className="rounded-md bg-amber-50 p-1 hover:bg-amber-100"
                    onClick={() => void sendSticker(stickerUrl)}
                  >
                    <img src={stickerUrl} alt="sticker" className="mx-auto h-12 w-12 object-contain" />
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
          <Popover open={gifOpen} onOpenChange={setGifOpen}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon-sm" title="Gửi GIF" type="button">
                <ImageIcon className="h-5 w-5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-3" align="start">
              <div className="mb-2 text-xs font-medium text-muted-foreground">Chọn GIF</div>
              <div className="grid grid-cols-2 gap-2">
                {GIFS.map((gifUrl) => (
                  <button
                    key={gifUrl}
                    type="button"
                    className="overflow-hidden rounded-md border hover:opacity-90"
                    onClick={() => void sendGif(gifUrl)}
                  >
                    <img src={gifUrl} alt="gif" className="h-20 w-full object-cover" />
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileSelect}
            accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar"
          />
          <Button
            variant="ghost"
            size="icon-sm"
            title="Đính kèm tệp"
            type="button"
            disabled={isUploadingFile}
            onClick={() => fileInputRef.current?.click()}
          >
            <Paperclip className={cn("h-5 w-5", isUploadingFile && "animate-spin")} />
          </Button>
        </div>

        <div className="flex items-end gap-2">
          <div className="flex flex-1 items-end rounded-lg border bg-background pr-1">
            <Textarea
              ref={textareaRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onSelect={syncDraftCaret}
              onClick={syncDraftCaret}
              onKeyUp={syncDraftCaret}
              onBlur={syncDraftCaret}
              onInput={handleInput}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  void sendText()
                }
              }}
              placeholder={`Nhập tin nhắn tới ${headerTitle}`}
              rows={1}
              disabled={isSending}
              className="custom-scrollbar max-h-32 min-h-[38px] resize-none border-0 bg-transparent shadow-none focus-visible:ring-0"
            />
            <Separator orientation="vertical" className="h-5 self-center" />
            <Popover open={emojiOpen} onOpenChange={handleEmojiOpenChange}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="mb-1 ml-1"
                  title="Biểu cảm"
                  type="button"
                >
                  <Smile className="h-5 w-5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-3" align="end">
                <div className="mb-2 text-xs font-medium text-muted-foreground">Biểu cảm</div>
                <div className="grid grid-cols-6 gap-2">
                  {EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      className="rounded-md py-1 text-2xl hover:bg-muted"
                      onClick={() => insertEmojiIntoDraft(emoji)}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          <Button
            size="icon"
            className="rounded-full bg-blue-600"
            title="Gửi"
            type="button"
            disabled={isSending || !draft.trim()}
            onClick={() => void sendText()}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Dialog open={forwardTarget != null} onOpenChange={(open) => !open && setForwardTarget(null)}>
        <DialogContent className="sm:max-w-md" showCloseButton>
          <DialogHeader>
            <DialogTitle>Chuyển tin nhắn</DialogTitle>
            <DialogDescription>Chọn cuộc trò chuyện để gửi bản sao nội dung này.</DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-72">
            <div className="flex flex-col gap-1 pr-3">
              {conversations.filter((c) => c.idConversation !== selectedConversationId).length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  Chưa có hội thoại khác để chuyển.
                </p>
              ) : (
                conversations
                  .filter((c) => c.idConversation !== selectedConversationId)
                  .map((c) => (
                    <Button
                      key={c.idConversation}
                      type="button"
                      variant="ghost"
                      className="h-auto justify-start px-3 py-2.5 font-normal"
                      onClick={() => void handleForwardTo(c.idConversation)}
                    >
                      {conversationTitle(c)}
                    </Button>
                  ))
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <Dialog open={imagePreview != null} onOpenChange={(open) => !open && setImagePreview(null)}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden bg-black/95" showCloseButton>
          <div className="relative flex items-center justify-center min-h-[400px] max-h-[85vh]">
            {imagePreview && (
              <img 
                src={imagePreview.url} 
                alt={imagePreview.alt}
                className="max-w-full max-h-[85vh] object-contain"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
