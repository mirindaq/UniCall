import {
  Bot,
  CalendarDays,
  Check,
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
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { toast } from "sonner"

import ImageGalleryViewer, {
  type ImageViewerItem,
} from "@/components/message/ImageGalleryViewer"
import IncomingCallPopup from "@/components/message/IncomingCallPopup"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Spinner } from "@/components/ui/spinner"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { useAuth } from "@/contexts/auth-context"
import { useChatPage } from "@/contexts/ChatPageContext"
import { useChatSocket } from "@/hooks/useChatSocket"
import { useConversationCall } from "@/hooks/useConversationCall"
import { cn } from "@/lib/utils"
import { chatSocketService } from "@/services/chat/chat-socket.service"
import { chatService } from "@/services/chat/chat.service"
import {
  fileService,
  type AttachmentResponse,
} from "@/services/file/file.service"
import { friendService } from "@/services/friend/friend.service"
import { userService } from "@/services/user/user.service"
import type {
  ChatAttachment,
  ChatMessageResponse,
  ConversationBlockStatusResponse,
  ConversationResponse,
  UserRealtimeEvent,
} from "@/types/chat"
import { UNICALL_AI_BOT_IDS } from "@/types/chat"
import {
  displayNameFromProfile,
  formatChatMessageTime,
  formatChatSidebarTime,
} from "@/utils/chat-display.util"
import {
  extractFileNameFromFileMessage,
  getOriginalFileNameFromUrl,
  normalizeFileMessageContent,
} from "@/utils/file-display.util"
import {
  extractUrlsFromText,
  splitTextWithUrls,
} from "@/utils/link-display.util"

const MESSAGE_PAGE_SIZE = 30
const LOAD_MORE_THRESHOLD_PX = 80
const EMOJIS = [
  "😀",
  "😂",
  "😍",
  "🥰",
  "😭",
  "😡",
  "👍",
  "🙏",
  "🎉",
  "❤️",
  "🔥",
  "🤝",
]
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
const MESSAGE_REACTIONS = ["👍", "❤️", "😆", "😮", "😭", "😡"] as const
const CHAT_BLOCK_STATUS_CHANGED_EVENT = "chat:block-status-changed"

type ForwardTab = "recent" | "groups" | "friends"

type ForwardTargetOption = {
  key: string
  mode: "conversation" | "user"
  conversationId?: string
  userId?: string
  label: string
  subtitle?: string
  avatar?: string
}

type PendingImageUpload = {
  id: string
  file: File
  previewUrl: string
}

type MentionCommand = {
  token: "@Unicall" | "@UnicallImage"
  description: string
}

type MentionSuggestionState = {
  replaceStart: number
  replaceEnd: number
  query: string
  highlightedIndex: number
}

const AI_MENTION_COMMANDS: MentionCommand[] = [
  {
    token: "@Unicall",
    description: "Hỏi UniCall AI trả lời văn bản.",
  },
  {
    token: "@UnicallImage",
    description: "Yêu cầu UniCall AI tạo hình ảnh.",
  },
]

function renderHighlightedSearchText(
  content: string,
  keyword: string
): ReactNode {
  const normalizedKeyword = keyword.trim()
  if (!normalizedKeyword) {
    return content
  }

  const escapedKeyword = normalizedKeyword.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  )
  const regex = new RegExp(`(${escapedKeyword})`, "ig")
  const chunks = content.split(regex)

  return chunks.map((chunk, index) => {
    if (!chunk) {
      return null
    }
    if (chunk.toLowerCase() === normalizedKeyword.toLowerCase()) {
      return (
        <span
          key={`highlight-${index}-${chunk}`}
          className="font-semibold text-blue-600"
        >
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

function getDirectPeerId(
  conversation: ConversationResponse,
  currentUserId: string | null
): string | null {
  if (conversation.type !== "DOUBLE" || !currentUserId) {
    return null
  }

  return (
    conversation.participantInfos.find(
      (participant) => participant.idAccount !== currentUserId
    )?.idAccount ?? null
  )
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
  const prependAnchorRef = useRef<{
    prevTop: number
    prevHeight: number
  } | null>(null)
  const pendingScrollToBottomRef = useRef(false)
  const messageElementRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const highlightTimeoutRef = useRef<number | null>(null)
  const loadingMissingMessageIdsRef = useRef<Set<string>>(new Set())
  const failedMissingMessageIdsRef = useRef<Set<string>>(new Set())
  const pendingFocusMessageIdRef = useRef<string | null>(null)
  const suppressAutoLoadMoreUntilRef = useRef(0)
  const pendingImageUploadsRef = useRef<PendingImageUpload[]>([])

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
    refetchConversations,
  } = useChatPage()

  selectedIdRef.current = selectedConversationId

  const headerTitle = selectedConversation
    ? conversationTitle(selectedConversation)
    : ""
  const headerAvatar = selectedConversation
    ? conversationAvatar(selectedConversation)
    : undefined
  const peerFallback = displayNameFromProfile(selectedPeerProfile)
  const peerUserId = useMemo(() => {
    if (
      !selectedConversation ||
      selectedConversation.type !== "DOUBLE" ||
      !currentUserId
    ) {
      return null
    }
    return (
      selectedConversation.participantInfos.find(
        (participant) => participant.idAccount !== currentUserId
      )?.idAccount ?? null
    )
  }, [currentUserId, selectedConversation])

  const [apiMessages, setApiMessages] = useState<ChatMessageResponse[]>([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)

  const [socketExtras, setSocketExtras] = useState<ChatMessageResponse[]>([])
  const [replyTargetCache, setReplyTargetCache] = useState<
    Record<string, ChatMessageResponse>
  >({})
  const [senderProfiles, setSenderProfiles] = useState<
    Record<string, { displayName: string; avatar?: string }>
  >({})
  const [callPeerProfile, setCallPeerProfile] = useState<{
    displayName: string
    avatar?: string
  } | null>(null)

  const [draft, setDraft] = useState("")
  const [mentionSuggestion, setMentionSuggestion] =
    useState<MentionSuggestionState | null>(null)
  const [isSending, setIsSending] = useState(false)
  const [blockStatus, setBlockStatus] =
    useState<ConversationBlockStatusResponse | null>(null)
  const [isLoadingBlockStatus, setIsLoadingBlockStatus] = useState(false)
  const [isTogglingBlockFromComposer, setIsTogglingBlockFromComposer] =
    useState(false)
  const [isUploadingFile, setIsUploadingFile] = useState(false)
  const [emojiOpen, setEmojiOpen] = useState(false)
  const [stickerOpen, setStickerOpen] = useState(false)
  const [gifOpen, setGifOpen] = useState(false)
  const [forwardTarget, setForwardTarget] =
    useState<ChatMessageResponse | null>(null)
  const [forwardSourceMessageIds, setForwardSourceMessageIds] = useState<
    string[]
  >([])
  const [forwardKeyword, setForwardKeyword] = useState("")
  const [forwardTab, setForwardTab] = useState<ForwardTab>("recent")
  const [forwardSelectedTargets, setForwardSelectedTargets] = useState<
    Set<string>
  >(() => new Set())
  const [forwardNote, setForwardNote] = useState("")
  const [forwardFriendOptions, setForwardFriendOptions] = useState<
    ForwardTargetOption[]
  >([])
  const [isLoadingForwardFriends, setIsLoadingForwardFriends] = useState(false)
  const [isSubmittingForward, setIsSubmittingForward] = useState(false)
  const [replyingTo, setReplyingTo] = useState<ChatMessageResponse | null>(null)
  const [multiSelectActive, setMultiSelectActive] = useState(false)
  const [selectedMessageIds, setSelectedMessageIds] = useState<Set<string>>(
    () => new Set()
  )
  const [isRecallingSelectedMessages, setIsRecallingSelectedMessages] =
    useState(false)
  const [isDeletingSelectedMessages, setIsDeletingSelectedMessages] =
    useState(false)
  const [selectedPinnedMessageId, setSelectedPinnedMessageId] = useState<
    string | null
  >(null)
  const [selectedReplyTargetMessageId, setSelectedReplyTargetMessageId] =
    useState<string | null>(null)
  const [imagePreview, setImagePreview] = useState<{
    images: ImageViewerItem[]
    initialIndex: number
  } | null>(null)
  const [highlightedMessageId, setHighlightedMessageId] = useState<
    string | null
  >(null)
  const [isMessageSearchOpen, setIsMessageSearchOpen] = useState(false)
  const [messageSearchKeyword, setMessageSearchKeyword] = useState("")
  const [searchKeywordDebounced, setSearchKeywordDebounced] = useState("")
  const [searchSenderId, setSearchSenderId] = useState("")
  const [searchFromDate, setSearchFromDate] = useState("")
  const [searchToDate, setSearchToDate] = useState("")
  const [isSearchSenderPopoverOpen, setIsSearchSenderPopoverOpen] =
    useState(false)
  const [isSearchDatePopoverOpen, setIsSearchDatePopoverOpen] = useState(false)
  const [searchMatchMessages, setSearchMatchMessages] = useState<
    ChatMessageResponse[]
  >([])
  const [searchMessagePage, setSearchMessagePage] = useState(1)
  const [searchMessageHasMore, setSearchMessageHasMore] = useState(false)
  const [isLoadingMoreSearchMessages, setIsLoadingMoreSearchMessages] =
    useState(false)
  const [isSearchingMessages, setIsSearchingMessages] = useState(false)
  const [searchMatchedFiles, setSearchMatchedFiles] = useState<
    AttachmentResponse[]
  >([])
  const [isSearchingFiles, setIsSearchingFiles] = useState(false)
  const [pendingImageUploads, setPendingImageUploads] = useState<
    PendingImageUpload[]
  >([])
  const [allConversationImages, setAllConversationImages] = useState<
    ImageViewerItem[]
  >([])
  const isDirectConversation = selectedConversation?.type === "DOUBLE"
  const isMessageBlocked = isDirectConversation && Boolean(blockStatus?.blocked)
  const blockedReasonText = blockStatus?.blockedByMe
    ? "Bạn đã chặn người này. Hãy bỏ chặn để tiếp tục nhắn tin."
    : "Hiện không thể nhắn tin vì người này đã chặn bạn."
  const conversationCall = useConversationCall({
    conversationId: selectedConversationId ?? undefined,
    conversationType: selectedConversation?.type,
    currentUserId,
    peerUserId,
    isBlocked: isMessageBlocked,
  })
  const refreshBlockStatus = useCallback(async () => {
    if (!selectedConversationId || selectedConversation?.type !== "DOUBLE") {
      setBlockStatus(null)
      setIsLoadingBlockStatus(false)
      return
    }
    setIsLoadingBlockStatus(true)
    try {
      const response = await chatService.getConversationBlockStatus(
        selectedConversationId
      )
      setBlockStatus(response.data)
    } catch {
      setBlockStatus(null)
    } finally {
      setIsLoadingBlockStatus(false)
    }
  }, [selectedConversation?.type, selectedConversationId])

  useEffect(() => {
    pendingImageUploadsRef.current = pendingImageUploads
  }, [pendingImageUploads])

  useEffect(() => {
    return () => {
      pendingImageUploadsRef.current.forEach((item) =>
        URL.revokeObjectURL(item.previewUrl)
      )
    }
  }, [])

  useEffect(() => {
    setPendingImageUploads((prev) => {
      if (prev.length === 0) {
        return prev
      }
      prev.forEach((item) => URL.revokeObjectURL(item.previewUrl))
      return []
    })
  }, [selectedConversationId])

  useEffect(() => {
    void refreshBlockStatus()
  }, [refreshBlockStatus])

  useEffect(() => {
    const handleBlockStatusChanged = (event: Event) => {
      const customEvent = event as CustomEvent<{ conversationId?: string }>
      const changedConversationId = customEvent.detail?.conversationId
      if (
        !changedConversationId ||
        changedConversationId !== selectedConversationId
      ) {
        return
      }
      void refreshBlockStatus()
    }

    window.addEventListener(
      CHAT_BLOCK_STATUS_CHANGED_EVENT,
      handleBlockStatusChanged
    )
    return () => {
      window.removeEventListener(
        CHAT_BLOCK_STATUS_CHANGED_EVENT,
        handleBlockStatusChanged
      )
    }
  }, [refreshBlockStatus, selectedConversationId])

  useEffect(() => {
    if (!selectedConversationId) {
      setAllConversationImages([])
      return
    }

    let cancelled = false

    const loadAllConversationImages = async () => {
      try {
        const response = await fileService.getAttachments(
          selectedConversationId,
          { type: "images" }
        )
        if (cancelled) {
          return
        }
        const items = (response.data ?? [])
          .filter((attachment) => attachment.type === "IMAGE")
          .slice()
          .sort((a, b) => {
            const right = new Date(b.timeSent ?? b.timeUpload).getTime()
            const left = new Date(a.timeSent ?? a.timeUpload).getTime()
            return right - left
          })
          .map((attachment) => ({ url: attachment.url, alt: "Image" }))

        setAllConversationImages(items)
      } catch (error) {
        console.error("Failed to load all conversation images", error)
        if (!cancelled) {
          setAllConversationImages([])
        }
      }
    }

    void loadAllConversationImages()
    return () => {
      cancelled = true
    }
  }, [selectedConversationId])

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
        const res = await chatService.listMessages(
          selectedConversationId,
          1,
          MESSAGE_PAGE_SIZE
        )
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
    if (
      !selectedConversationId ||
      !hasMore ||
      messagesLoading ||
      isLoadingMore
    ) {
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
      const res = await chatService.listMessages(
        selectedConversationId,
        nextPage,
        MESSAGE_PAGE_SIZE
      )
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
    const viewport = root.querySelector(
      '[data-slot="scroll-area-viewport"]'
    ) as HTMLElement | null
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

  const mergeIncomingOrUpdatedMessage = useCallback(
    (msg: ChatMessageResponse) => {
      onRealtimeMessage(msg)
      if (msg.idConversation !== selectedIdRef.current) {
        return
      }
      const existsInApi = apiMessages.some(
        (item) => item.idMessage === msg.idMessage
      )

      setApiMessages((prev) => {
        const i = prev.findIndex((x) => x.idMessage === msg.idMessage)
        if (i < 0) {
          return prev
        }
        const next = [...prev]
        next[i] = msg
        return next
      })

      setSocketExtras((prev) => {
        const i = prev.findIndex((x) => x.idMessage === msg.idMessage)
        if (i >= 0) {
          const next = [...prev]
          next[i] = msg
          return next
        }
        if (existsInApi) {
          return prev
        }
        pendingScrollToBottomRef.current = true
        return [...prev, msg]
      })
    },
    [apiMessages, onRealtimeMessage]
  )

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
      (a, b) => new Date(a.timeSent).getTime() - new Date(b.timeSent).getTime()
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

    const stillPinned = pinnedMessagesSorted.some(
      (message) => message.idMessage === selectedPinnedMessageId
    )
    if (!stillPinned) {
      setSelectedPinnedMessageId(null)
    }
  }, [pinnedMessagesSorted, selectedPinnedMessageId])

  useEffect(() => {
    if (!selectedReplyTargetMessageId) {
      return
    }

    const stillExistsInView = displayMessages.some(
      (message) => message.idMessage === selectedReplyTargetMessageId
    )
    if (
      !stillExistsInView &&
      pendingFocusMessageIdRef.current !== selectedReplyTargetMessageId
    ) {
      setSelectedReplyTargetMessageId(null)
    }
  }, [displayMessages, selectedReplyTargetMessageId])

  const normalizedForwardKeyword = useMemo(
    () => forwardKeyword.trim().toLowerCase(),
    [forwardKeyword]
  )

  const directConversationIdByPeerId = useMemo(() => {
    const directMap = new Map<string, string>()
    if (!currentUserId) {
      return directMap
    }

    for (const conversation of conversations) {
      if (conversation.type !== "DOUBLE") {
        continue
      }

      const peerId = getDirectPeerId(conversation, currentUserId)
      if (!peerId) {
        continue
      }
      directMap.set(peerId, conversation.idConversation)
    }

    return directMap
  }, [conversations, currentUserId])

  const recentForwardOptions = useMemo<ForwardTargetOption[]>(() => {
    return conversations
      .filter(
        (conversation) => conversation.idConversation !== selectedConversationId
      )
      .map((conversation) => ({
        key: `conversation:${conversation.idConversation}`,
        mode: "conversation",
        conversationId: conversation.idConversation,
        label: conversationTitle(conversation),
        subtitle:
          conversation.type === "GROUP"
            ? `${conversation.numberMember} thành viên`
            : conversation.lastMessageContent || "Trò chuyện trực tiếp",
        avatar: conversationAvatar(conversation),
      }))
  }, [
    conversationAvatar,
    conversationTitle,
    conversations,
    selectedConversationId,
  ])

  const groupForwardOptions = useMemo<ForwardTargetOption[]>(() => {
    return recentForwardOptions.filter((option) => {
      const conversation = conversations.find(
        (item) => item.idConversation === option.conversationId
      )
      return conversation?.type === "GROUP"
    })
  }, [conversations, recentForwardOptions])

  useEffect(() => {
    if (!forwardTarget || !currentUserId) {
      setForwardFriendOptions([])
      setIsLoadingForwardFriends(false)
      return
    }

    let cancelled = false
    setIsLoadingForwardFriends(true)

    void friendService
      .getAllFriends(currentUserId)
      .then(async (response) => {
        if (cancelled) {
          return
        }

        const peers = Array.from(
          new Set(
            (response.data ?? [])
              .map((friend) =>
                friend.idAccountSent === currentUserId
                  ? friend.idAccountReceive
                  : friend.idAccountSent
              )
              .filter(
                (peerId): peerId is string =>
                  !!peerId && peerId.trim().length > 0
              )
          )
        )

        if (peers.length === 0) {
          setForwardFriendOptions([])
          return
        }

        const profiles = await Promise.all(
          peers.map(async (peerId) => {
            try {
              const profileResponse =
                await userService.getProfileByIdentityUserId(peerId)
              const profile = profileResponse.data
              const displayName =
                `${profile.firstName ?? ""} ${profile.lastName ?? ""}`.trim() ||
                peerId
              return {
                userId: peerId,
                label: displayName,
                avatar: profile.avatar ?? undefined,
              }
            } catch {
              return {
                userId: peerId,
                label: peerId,
                avatar: undefined,
              }
            }
          })
        )

        if (cancelled) {
          return
        }

        const options = profiles
          .map<ForwardTargetOption | null>((profile) => {
            const existingDirectConversationId =
              directConversationIdByPeerId.get(profile.userId)
            if (
              existingDirectConversationId &&
              existingDirectConversationId === selectedConversationId
            ) {
              return null
            }

            if (existingDirectConversationId) {
              return {
                key: `conversation:${existingDirectConversationId}`,
                mode: "conversation",
                conversationId: existingDirectConversationId,
                userId: profile.userId,
                label: profile.label,
                subtitle: "Bạn bè",
                avatar: profile.avatar,
              }
            }

            return {
              key: `user:${profile.userId}`,
              mode: "user",
              userId: profile.userId,
              label: profile.label,
              subtitle: "Bạn bè",
              avatar: profile.avatar,
            }
          })
          .filter((item): item is ForwardTargetOption => item != null)
          .sort((left, right) => left.label.localeCompare(right.label, "vi"))

        setForwardFriendOptions(options)
      })
      .catch(() => {
        if (!cancelled) {
          setForwardFriendOptions([])
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingForwardFriends(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [
    currentUserId,
    directConversationIdByPeerId,
    forwardTarget,
    selectedConversationId,
  ])

  const allForwardTargetsByKey = useMemo(() => {
    const targetMap = new Map<string, ForwardTargetOption>()
    for (const option of [
      ...recentForwardOptions,
      ...groupForwardOptions,
      ...forwardFriendOptions,
    ]) {
      targetMap.set(option.key, option)
    }
    return targetMap
  }, [forwardFriendOptions, groupForwardOptions, recentForwardOptions])

  const visibleForwardOptions = useMemo(() => {
    const source =
      forwardTab === "groups"
        ? groupForwardOptions
        : forwardTab === "friends"
          ? forwardFriendOptions
          : recentForwardOptions

    if (!normalizedForwardKeyword) {
      return source
    }

    return source.filter((option) => {
      const haystack = `${option.label} ${option.subtitle ?? ""}`.toLowerCase()
      return haystack.includes(normalizedForwardKeyword)
    })
  }, [
    forwardFriendOptions,
    forwardTab,
    groupForwardOptions,
    normalizedForwardKeyword,
    recentForwardOptions,
  ])

  const selectedMessages = useMemo(() => {
    if (selectedMessageIds.size === 0) {
      return [] as ChatMessageResponse[]
    }
    return displayMessages.filter((message) =>
      selectedMessageIds.has(message.idMessage)
    )
  }, [displayMessages, selectedMessageIds])

  const canRecallSelectedMessages = useMemo(() => {
    if (!currentUserId || selectedMessages.length === 0) {
      return false
    }

    return selectedMessages.every(
      (message) =>
        message.idAccountSent === currentUserId &&
        !message.recalled &&
        message.type !== "CALL"
    )
  }, [currentUserId, selectedMessages])

  const canForwardSelectedMessages = useMemo(() => {
    if (selectedMessages.length === 0) {
      return false
    }

    return selectedMessages.every(
      (message) => !message.recalled && message.type !== "CALL"
    )
  }, [selectedMessages])

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
          .filter((id): id is string => !!id)
      )
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
  }, [
    currentUserId,
    headerAvatar,
    headerTitle,
    selectedConversation,
    senderProfiles,
  ])

  const selectedSearchSenderLabel = useMemo(() => {
    if (!searchSenderId) {
      return "Người gửi"
    }
    return (
      searchSenderOptions.find((option) => option.id === searchSenderId)
        ?.name ?? "Người gửi"
    )
  }, [searchSenderId, searchSenderOptions])

  const matchesSearchFilters = useCallback(
    (message: ChatMessageResponse) => {
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
    },
    [searchFromDate, searchSenderId, searchToDate]
  )

  const loadMissingMessageById = useCallback(
    (
      messageId: string,
      options?: {
        silentIfMissing?: boolean
        focusAfterLoad?: boolean
        forceRetry?: boolean
      }
    ) => {
      if (!selectedConversationId || !messageId) {
        return
      }

      if (
        !options?.forceRetry &&
        failedMissingMessageIdsRef.current.has(messageId)
      ) {
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
            const index = prev.findIndex(
              (message) => message.idMessage === fetchedMessage.idMessage
            )
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
    },
    [selectedConversationId]
  )

  const focusReplyTargetMessage = useCallback(
    (
      messageId?: string,
      options?: {
        silentIfMissing?: boolean
        tryFetchWhenMissing?: boolean
        forceRetryWhenMissing?: boolean
      }
    ) => {
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
              const index = prev.findIndex(
                (message) => message.idMessage === cachedTargetMessage.idMessage
              )
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
        setHighlightedMessageId((current) =>
          current === messageId ? null : current
        )
        highlightTimeoutRef.current = null
      }, 1600)
      return true
    },
    [loadMissingMessageById, replyTargetCache, selectedConversationId]
  )

  const focusPinnedMessage = useCallback(
    (messageId: string) => {
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
    },
    [focusReplyTargetMessage, selectedPinnedMessageId]
  )

  const focusReplyMessageFromSnippet = useCallback(
    (messageId?: string) => {
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
    },
    [focusReplyTargetMessage, selectedReplyTargetMessageId]
  )

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
          .filter((id): id is string => !!id)
      )
    ).filter(
      (id) =>
        !messageById.has(id) &&
        !replyTargetCache[id] &&
        !loadingMissingMessageIdsRef.current.has(id)
    )

    for (const missingReplyId of missingReplyIds.slice(0, 8)) {
      loadMissingMessageById(missingReplyId, {
        silentIfMissing: true,
        focusAfterLoad: false,
      })
    }
  }, [
    displayMessages,
    loadMissingMessageById,
    messageById,
    replyTargetCache,
    selectedConversationId,
  ])

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

  const fetchSearchMessages = useCallback(
    async (targetPage: number, append: boolean) => {
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
        const response = await chatService.searchMessages(
          selectedConversationId,
          searchKeywordDebounced,
          targetPage,
          SEARCH_PAGE_SIZE
        )
        const rawItems = response.data.items ?? []
        const filteredItems = rawItems.filter(matchesSearchFilters)

        setSearchMatchMessages((prev) => {
          if (!append) {
            return filteredItems
          }

          const existingIds = new Set(prev.map((message) => message.idMessage))
          const nextItems = filteredItems.filter(
            (message) => !existingIds.has(message.idMessage)
          )
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
    },
    [
      isMessageSearchOpen,
      matchesSearchFilters,
      searchKeywordDebounced,
      selectedConversationId,
    ]
  )

  useEffect(() => {
    void fetchSearchMessages(1, false)
  }, [fetchSearchMessages, searchSenderId, searchFromDate, searchToDate])

  const loadMoreSearchMessages = useCallback(() => {
    if (
      !searchKeywordDebounced ||
      !searchMessageHasMore ||
      isSearchingMessages ||
      isLoadingMoreSearchMessages
    ) {
      return
    }
    void fetchSearchMessages(searchMessagePage + 1, true)
  }, [
    fetchSearchMessages,
    isLoadingMoreSearchMessages,
    isSearchingMessages,
    searchKeywordDebounced,
    searchMessageHasMore,
    searchMessagePage,
  ])

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
  }, [
    isMessageSearchOpen,
    searchFromDate,
    searchKeywordDebounced,
    searchSenderId,
    searchToDate,
    selectedConversationId,
  ])

  useEffect(() => {
    setMultiSelectActive(false)
    setSelectedMessageIds(new Set())
    setIsRecallingSelectedMessages(false)
    setIsDeletingSelectedMessages(false)
    setSelectedPinnedMessageId(null)
    setSelectedReplyTargetMessageId(null)
    setForwardTarget(null)
    setForwardSourceMessageIds([])
    setForwardKeyword("")
    setForwardTab("recent")
    setForwardSelectedTargets(new Set())
    setForwardNote("")
    setIsSubmittingForward(false)
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
          .filter((id) => id && id !== currentUserId)
      )
    )
    const missingIds = senderIds.filter((id) => !senderProfiles[id])
    if (missingIds.length === 0) {
      return
    }

    const botEntries = missingIds
      .filter((id) =>
        UNICALL_AI_BOT_IDS.includes(id as (typeof UNICALL_AI_BOT_IDS)[number])
      )
      .map(
        (id) =>
          [
            id,
            {
              displayName: "UniCall AI",
              avatar: undefined,
            },
          ] as const
      )
    if (botEntries.length > 0) {
      setSenderProfiles((prev) => ({
        ...prev,
        ...Object.fromEntries(botEntries),
      }))
    }

    const userMissingIds = missingIds.filter(
      (id) =>
        !UNICALL_AI_BOT_IDS.includes(id as (typeof UNICALL_AI_BOT_IDS)[number])
    )
    if (userMissingIds.length === 0) {
      return
    }

    let cancelled = false
    void Promise.all(
      userMissingIds.map(async (identityUserId) => {
        try {
          const response =
            await userService.getProfileByIdentityUserId(identityUserId)
          const profile = response.data
          const displayName =
            `${profile.lastName ?? ""} ${profile.firstName ?? ""}`.trim() ||
            identityUserId
          return [
            identityUserId,
            { displayName, avatar: profile.avatar ?? undefined },
          ] as const
        } catch {
          return [identityUserId, { displayName: identityUserId }] as const
        }
      })
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
        const displayName =
          `${data.lastName ?? ""} ${data.firstName ?? ""}`.trim() || peerId
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
  }, [
    conversationCall.activeCall?.peerUserId,
    headerAvatar,
    headerTitle,
    isAuthenticated,
    peerUserId,
  ])

  const isCallModalOpen = useMemo(
    () => conversationCall.phase !== "idle",
    [conversationCall.phase]
  )
  const callModalPeerId = conversationCall.activeCall?.peerUserId ?? null
  const callModalAvatarFallback =
    peerUserId && callModalPeerId && peerUserId === callModalPeerId
      ? headerAvatar
      : undefined
  const callModalName =
    callPeerProfile?.displayName ??
    (peerUserId && callModalPeerId && peerUserId === callModalPeerId
      ? headerTitle
      : callModalPeerId) ??
    "Người dùng"
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

  const updateMentionSuggestion = useCallback(
    (nextDraft: string, caret: number) => {
      const safeCaret = Math.min(Math.max(caret, 0), nextDraft.length)
      const leftText = nextDraft.slice(0, safeCaret)
      const matched = leftText.match(/(?:^|\s)@([^\s@]*)$/)
      if (!matched) {
        setMentionSuggestion(null)
        return
      }

      const rawQuery = matched[1] ?? ""
      const atIndex = leftText.lastIndexOf("@")
      if (atIndex < 0) {
        setMentionSuggestion(null)
        return
      }

      const hasCandidate = AI_MENTION_COMMANDS.some((command) =>
        command.token.toLowerCase().slice(1).startsWith(rawQuery.toLowerCase())
      )
      if (!hasCandidate) {
        setMentionSuggestion(null)
        return
      }

      setMentionSuggestion((prev) => ({
        replaceStart: atIndex,
        replaceEnd: safeCaret,
        query: rawQuery,
        highlightedIndex: prev
          ? Math.min(prev.highlightedIndex, AI_MENTION_COMMANDS.length - 1)
          : 0,
      }))
    },
    []
  )

  const handleDraftChange = (value: string, caret?: number) => {
    setDraft(value)
    const resolvedCaret = Math.min(
      Math.max(caret ?? draftCaretRef.current.start, 0),
      value.length
    )
    draftCaretRef.current = { start: resolvedCaret, end: resolvedCaret }
    updateMentionSuggestion(value, resolvedCaret)
  }

  const applyMentionCommand = useCallback(
    (command: MentionCommand) => {
      const suggestion = mentionSuggestion
      if (!suggestion) {
        return
      }
      const nextDraft = `${draft.slice(0, suggestion.replaceStart)}${command.token} ${draft.slice(suggestion.replaceEnd)}`
      const caretAfter = suggestion.replaceStart + command.token.length + 1
      setDraft(nextDraft)
      setMentionSuggestion(null)
      draftCaretRef.current = { start: caretAfter, end: caretAfter }
      window.setTimeout(() => {
        const textarea = textareaRef.current
        if (!textarea) {
          return
        }
        textarea.focus()
        textarea.setSelectionRange(caretAfter, caretAfter)
        handleInput()
      }, 0)
    },
    [draft, mentionSuggestion]
  )

  const visibleMentionCommands = useMemo(() => {
    if (!mentionSuggestion) {
      return []
    }
    const query = mentionSuggestion.query.trim().toLowerCase()
    if (!query) {
      return AI_MENTION_COMMANDS
    }
    return AI_MENTION_COMMANDS.filter((command) =>
      command.token.toLowerCase().slice(1).startsWith(query)
    )
  }, [mentionSuggestion])

  useEffect(() => {
    if (!mentionSuggestion) {
      return
    }
    if (visibleMentionCommands.length === 0) {
      setMentionSuggestion(null)
      return
    }
    if (mentionSuggestion.highlightedIndex >= visibleMentionCommands.length) {
      setMentionSuggestion((prev) =>
        prev
          ? { ...prev, highlightedIndex: visibleMentionCommands.length - 1 }
          : prev
      )
    }
  }, [mentionSuggestion, visibleMentionCommands.length])

  const conversationImageItems = useMemo<ImageViewerItem[]>(() => {
    if (allConversationImages.length > 0) {
      return allConversationImages
    }
    return displayMessages.flatMap((message) =>
      (message.attachments ?? [])
        .filter((attachment) => attachment.type === "IMAGE")
        .map((attachment) => ({ url: attachment.url, alt: "Image" }))
    )
  }, [allConversationImages, displayMessages])

  const openImagePreview = useCallback(
    (images: ImageViewerItem[], startIndex = 0) => {
      if (images.length === 0) {
        return
      }
      const boundedIndex = Math.min(Math.max(startIndex, 0), images.length - 1)
      setImagePreview({
        images,
        initialIndex: boundedIndex,
      })
    },
    []
  )

  const openConversationImagePreview = useCallback(
    (targetUrl: string) => {
      if (conversationImageItems.length === 0) {
        return
      }
      const targetIndex = conversationImageItems.findIndex(
        (item) => item.url === targetUrl
      )
      openImagePreview(
        conversationImageItems,
        targetIndex >= 0 ? targetIndex : 0
      )
    },
    [conversationImageItems, openImagePreview]
  )

  const handleUnblockFromComposer = async () => {
    if (
      !selectedConversationId ||
      !blockStatus?.blockedByMe ||
      isTogglingBlockFromComposer
    ) {
      return
    }
    setIsTogglingBlockFromComposer(true)
    try {
      const response = await chatService.unblockConversation(
        selectedConversationId
      )
      setBlockStatus(response.data)
      window.dispatchEvent(
        new CustomEvent(CHAT_BLOCK_STATUS_CHANGED_EVENT, {
          detail: { conversationId: selectedConversationId },
        })
      )
      toast.success("Đã bỏ chặn nhắn tin.")
    } catch (error) {
      const backendMessage = (
        error as { response?: { data?: { message?: string } } }
      )?.response?.data?.message
      toast.error(backendMessage || "Bỏ chặn nhắn tin thất bại.")
    } finally {
      setIsTogglingBlockFromComposer(false)
    }
  }

  const sendMessage = async (
    content: string,
    type: ChatMessageResponse["type"] = "TEXT",
    attachments?: Array<
      Pick<ChatAttachment, "type" | "url" | "size" | "order">
    >,
    replyToMessageId?: string | null
  ) => {
    const normalized = content.trim()
    const hasAttachments = (attachments?.length ?? 0) > 0
    if (
      (!normalized && !hasAttachments) ||
      !selectedConversationId ||
      !currentUserId ||
      isMessageBlocked
    ) {
      if (isMessageBlocked) {
        toast.error(blockedReasonText)
      }
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
          replyToMessageId
        )
      } else {
        const res = await chatService.sendMessageRest(
          selectedConversationId,
          normalized,
          type,
          attachments,
          replyToMessageId
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
    } catch (error) {
      const backendMessage = (
        error as { response?: { data?: { message?: string } } }
      )?.response?.data?.message
      if (backendMessage && /chặn/i.test(backendMessage)) {
        void refreshBlockStatus()
      }
      toast.error(backendMessage || "Gửi tin nhắn thất bại")
    } finally {
      setIsSending(false)
    }
  }

  const sendText = async () => {
    const normalizedDraft = draft.trim()
    if (!normalizedDraft && pendingImageUploads.length === 0) {
      return
    }

    if (pendingImageUploads.length > 0) {
      const result = await handleAttachmentUpload(
        pendingImageUploads.map((item) => item.file)
      )
      const retainedFiles = new Set<File>([
        ...result.failedFiles,
        ...result.oversizedFiles,
      ])
      setPendingImageUploads((prev) => {
        const next = prev.filter((item) => retainedFiles.has(item.file))
        prev
          .filter((item) => !retainedFiles.has(item.file))
          .forEach((item) => URL.revokeObjectURL(item.previewUrl))
        return next
      })
      return
    }

    const linkAttachments = extractUrlsFromText(normalizedDraft).map(
      (url, index) => ({
        type: "LINK" as const,
        url,
        order: index,
      })
    )

    await sendMessage(
      draft,
      "TEXT",
      linkAttachments.length > 0 ? linkAttachments : undefined,
      replyingTo?.idMessage
    )
    setDraft("")
    setMentionSuggestion(null)
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
      replyingTo?.idMessage
    )
    setStickerOpen(false)
  }

  const sendGif = async (gifUrl: string) => {
    await sendMessage(
      "Đã gửi GIF",
      "NONTEXT",
      [{ type: "GIF", url: gifUrl, order: 0 }],
      replyingTo?.idMessage
    )
    setGifOpen(false)
  }

  const uploadSingleAttachment = async (file: File, mixedText: string) => {
    const hasMixedText = mixedText.trim().length > 0
    const uploadResult = await fileService.uploadFile(file)
    const { url, fileSize, type: attachmentType } = uploadResult.data

    // Determine message content based on file type
    let messageContent = ""
    let messageType: ChatMessageResponse["type"] = "NONTEXT"

    if (attachmentType === "IMAGE") {
      messageContent = ""
    } else if (attachmentType === "VIDEO") {
      messageContent = ""
    } else if (attachmentType === "GIF") {
      messageContent = ""
    } else if (attachmentType === "AUDIO") {
      messageContent = ""
    } else {
      // Lấy tên file từ URL đã upload (đã bỏ UUID)
      messageContent = ""
    }

    // If there's text in the draft, use MIX type
    if (hasMixedText) {
      messageContent = mixedText.trim()
      messageType = "MIX"
    }

    await sendMessage(
      messageContent,
      messageType,
      [{ type: attachmentType, url, size: formatFileSize(fileSize), order: 0 }],
      replyingTo?.idMessage
    )
  }

  const handleAttachmentUpload = async (rawFiles: File[]) => {
    if (rawFiles.length === 0) {
      return {
        successCount: 0,
        failedFiles: [] as File[],
        oversizedFiles: [] as File[],
      }
    }

    const files = rawFiles.map((rawFile, index) =>
      rawFile.name
        ? rawFile
        : new File([rawFile], `pasted-image-${Date.now()}-${index + 1}.png`, {
            type: rawFile.type || "image/png",
          })
    )

    const maxSize = 25 * 1024 * 1024
    const draftText = draft.trim()
    let hasUsedDraftText = false
    let successCount = 0
    let failedCount = 0
    let oversizedCount = 0
    const failedFiles: File[] = []
    const oversizedFiles: File[] = []

    setIsUploadingFile(true)
    try {
      const validFiles = files.filter((file) => {
        if (file.size <= maxSize) {
          return true
        }
        oversizedCount += 1
        oversizedFiles.push(file)
        return false
      })

      const allAreImages =
        validFiles.length > 0 &&
        validFiles.every((file) => file.type.startsWith("image/"))
      if (allAreImages && validFiles.length > 1) {
        try {
          const uploadedAttachments: Array<
            Pick<ChatAttachment, "type" | "url" | "size" | "order">
          > = []
          for (let index = 0; index < validFiles.length; index += 1) {
            const uploadResult = await fileService.uploadFile(validFiles[index])
            const { url, fileSize, type: attachmentType } = uploadResult.data
            uploadedAttachments.push({
              type: attachmentType,
              url,
              size: formatFileSize(fileSize),
              order: index,
            })
          }

          const mixedText = draftText.trim()
          const hasMixedText = mixedText.length > 0
          await sendMessage(
            hasMixedText ? mixedText : "",
            hasMixedText ? "MIX" : "NONTEXT",
            uploadedAttachments,
            replyingTo?.idMessage
          )
          hasUsedDraftText = hasMixedText
          successCount = uploadedAttachments.length
        } catch (error) {
          console.error("Multi image upload error:", error)
          failedCount = validFiles.length
          failedFiles.push(...validFiles)
        }
      } else {
        for (const file of validFiles) {
          try {
            const mixedText = !hasUsedDraftText ? draftText : ""
            await uploadSingleAttachment(file, mixedText)
            if (mixedText) {
              hasUsedDraftText = true
            }
            successCount += 1
          } catch (error) {
            failedCount += 1
            failedFiles.push(file)
            console.error("File upload error:", error)
          }
        }
      }
    } finally {
      setIsUploadingFile(false)
    }

    if (hasUsedDraftText) {
      setDraft("")
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto"
      }
    }

    if (oversizedCount > 0) {
      toast.error(
        oversizedCount === 1
          ? "Có 1 file vượt quá 25MB nên không gửi được"
          : `Có ${oversizedCount} file vượt quá 25MB nên không gửi được`
      )
    }

    if (failedCount > 0) {
      toast.error(
        failedCount === 1
          ? "Có 1 file upload thất bại"
          : `Có ${failedCount} file upload thất bại`
      )
    }

    return { successCount, failedFiles, oversizedFiles }
  }

  const appendPendingImages = useCallback((rawFiles: File[]) => {
    if (rawFiles.length === 0) {
      return
    }

    const files = rawFiles.map((rawFile, index) =>
      rawFile.name
        ? rawFile
        : new File([rawFile], `pasted-image-${Date.now()}-${index + 1}.png`, {
            type: rawFile.type || "image/png",
          })
    )

    const nextItems = files.map((file, index) => ({
      id: `${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`,
      file,
      previewUrl: URL.createObjectURL(file),
    }))

    setPendingImageUploads((prev) => [...prev, ...nextItems])
  }, [])

  const removePendingImage = useCallback((id: string) => {
    setPendingImageUploads((prev) => {
      const target = prev.find((item) => item.id === id)
      if (target) {
        URL.revokeObjectURL(target.previewUrl)
      }
      return prev.filter((item) => item.id !== id)
    })
  }, [])

  const clearPendingImages = useCallback(() => {
    setPendingImageUploads((prev) => {
      prev.forEach((item) => URL.revokeObjectURL(item.previewUrl))
      return []
    })
  }, [])

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = Array.from(event.target.files ?? [])
    if (files.length === 0) {
      return
    }

    // Reset input value to allow selecting the same file again
    event.target.value = ""

    await handleAttachmentUpload(files)
  }

  const handlePaste = (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
    if (isUploadingFile) {
      return
    }

    const imageFiles = Array.from(event.clipboardData.items)
      .filter((item) => item.type.startsWith("image/"))
      .map((item) => item.getAsFile())
      .filter((file): file is File => file !== null)

    if (imageFiles.length === 0) {
      return
    }

    event.preventDefault()
    appendPendingImages(imageFiles)
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
        const res = await chatService.recallMessage(
          selectedConversationId,
          msg.idMessage
        )
        mergeIncomingOrUpdatedMessage(res.data)
        toast.success("Đã thu hồi tin nhắn")
      } catch {
        toast.error("Không thu hồi được tin nhắn")
      }
    },
    [mergeIncomingOrUpdatedMessage, selectedConversationId]
  )

  const handleHideMessageForMe = useCallback(
    async (msg: ChatMessageResponse) => {
      if (!selectedConversationId) {
        return
      }
      try {
        await chatService.hideMessageForMe(
          selectedConversationId,
          msg.idMessage
        )
        removeMessageLocally(msg.idMessage)
        toast.success("Đã xóa tin nhắn ở phía bạn")
      } catch {
        toast.error("Không xóa được tin nhắn")
      }
    },
    [removeMessageLocally, selectedConversationId]
  )

  const handleCopySelectedMessages = useCallback(async () => {
    if (selectedMessages.length === 0) {
      return
    }

    const copiedContent = selectedMessages
      .map((message) => messagePlainTextForCopy(message))
      .filter((content) => content.trim().length > 0)
      .join("\n")

    if (!copiedContent) {
      toast.error("Không có nội dung để sao chép")
      return
    }

    try {
      await navigator.clipboard.writeText(copiedContent)
      toast.success(
        selectedMessages.length === 1
          ? "Đã sao chép tin nhắn"
          : `Đã sao chép ${selectedMessages.length} tin nhắn`
      )
    } catch {
      toast.error("Không sao chép được")
    }
  }, [selectedMessages])

  const handleForwardSelectedMessages = useCallback(() => {
    if (selectedMessages.length === 0) {
      toast.error("Vui lòng chọn ít nhất 1 tin nhắn để chia sẻ")
      return
    }

    if (!canForwardSelectedMessages) {
      toast.error(
        "Chỉ có thể chia sẻ các tin nhắn chưa thu hồi và không phải cuộc gọi"
      )
      return
    }

    setForwardTarget(selectedMessages[0])
    setForwardSourceMessageIds(
      selectedMessages.map((message) => message.idMessage)
    )
    setForwardKeyword("")
    setForwardTab("recent")
    setForwardSelectedTargets(new Set())
    setForwardNote("")
    setIsSubmittingForward(false)
  }, [canForwardSelectedMessages, selectedMessages])

  const handleRecallSelectedMessages = useCallback(async () => {
    if (
      !selectedConversationId ||
      selectedMessages.length === 0 ||
      !canRecallSelectedMessages
    ) {
      return
    }

    setIsRecallingSelectedMessages(true)
    try {
      const results = await Promise.allSettled(
        selectedMessages.map((message) =>
          chatService.recallMessage(selectedConversationId, message.idMessage)
        )
      )

      let successCount = 0
      const failedMessageIds = new Set<string>()

      results.forEach((result, index) => {
        const message = selectedMessages[index]
        if (result.status === "fulfilled") {
          mergeIncomingOrUpdatedMessage(result.value.data)
          successCount += 1
          return
        }
        failedMessageIds.add(message.idMessage)
      })

      if (successCount > 0) {
        toast.success(
          successCount === 1
            ? "Đã thu hồi 1 tin nhắn"
            : `Đã thu hồi ${successCount} tin nhắn`
        )
      }

      if (failedMessageIds.size > 0) {
        toast.error(
          failedMessageIds.size === 1
            ? "Không thu hồi được 1 tin nhắn"
            : `Không thu hồi được ${failedMessageIds.size} tin nhắn`
        )
        setSelectedMessageIds(failedMessageIds)
      } else {
        setMultiSelectActive(false)
        setSelectedMessageIds(new Set())
      }
    } finally {
      setIsRecallingSelectedMessages(false)
    }
  }, [
    canRecallSelectedMessages,
    mergeIncomingOrUpdatedMessage,
    selectedConversationId,
    selectedMessages,
  ])

  const handleHideSelectedMessages = useCallback(async () => {
    if (!selectedConversationId || selectedMessages.length === 0) {
      return
    }

    setIsDeletingSelectedMessages(true)
    try {
      const results = await Promise.allSettled(
        selectedMessages.map((message) =>
          chatService.hideMessageForMe(
            selectedConversationId,
            message.idMessage
          )
        )
      )

      let successCount = 0
      const failedMessageIds = new Set<string>()

      results.forEach((result, index) => {
        const message = selectedMessages[index]
        if (result.status === "fulfilled") {
          removeMessageLocally(message.idMessage)
          successCount += 1
          return
        }
        failedMessageIds.add(message.idMessage)
      })

      if (successCount > 0) {
        toast.success(
          successCount === 1
            ? "Đã xóa 1 tin nhắn ở phía bạn"
            : `Đã xóa ${successCount} tin nhắn ở phía bạn`
        )
      }

      if (failedMessageIds.size > 0) {
        toast.error(
          failedMessageIds.size === 1
            ? "Không xóa được 1 tin nhắn"
            : `Không xóa được ${failedMessageIds.size} tin nhắn`
        )
        setSelectedMessageIds(failedMessageIds)
      } else {
        setMultiSelectActive(false)
        setSelectedMessageIds(new Set())
      }
    } finally {
      setIsDeletingSelectedMessages(false)
    }
  }, [removeMessageLocally, selectedConversationId, selectedMessages])

  const handleTogglePinMessage = useCallback(
    async (msg: ChatMessageResponse) => {
      if (!selectedConversationId) {
        return
      }
      try {
        const response = msg.pinned
          ? await chatService.unpinMessage(
              selectedConversationId,
              msg.idMessage
            )
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
        toast.error(
          msg.pinned
            ? "Không bỏ ghim được tin nhắn"
            : "Không ghim được tin nhắn"
        )
      }
    },
    [
      mergeIncomingOrUpdatedMessage,
      selectedConversationId,
      selectedPinnedMessageId,
      selectedReplyTargetMessageId,
    ]
  )

  const handleReactMessage = useCallback(
    async (msg: ChatMessageResponse, reaction: string | null) => {
      if (!selectedConversationId || !currentUserId) {
        return
      }
      try {
        const shouldClear = reaction == null
        const response = shouldClear
          ? await chatService.clearReaction(
              selectedConversationId,
              msg.idMessage
            )
          : await chatService.reactMessage(
              selectedConversationId,
              msg.idMessage,
              reaction
            )
        mergeIncomingOrUpdatedMessage(response.data)
      } catch {
        toast.error("Không cập nhật được cảm xúc")
      }
    },
    [currentUserId, mergeIncomingOrUpdatedMessage, selectedConversationId]
  )

  const closeForwardDialog = useCallback(() => {
    setForwardTarget(null)
    setForwardSourceMessageIds([])
    setForwardKeyword("")
    setForwardTab("recent")
    setForwardSelectedTargets(new Set())
    setForwardNote("")
    setIsSubmittingForward(false)
  }, [])

  const openForwardDialog = useCallback((message: ChatMessageResponse) => {
    setForwardTarget(message)
    setForwardSourceMessageIds([message.idMessage])
    setForwardKeyword("")
    setForwardTab("recent")
    setForwardSelectedTargets(new Set())
    setForwardNote("")
    setIsSubmittingForward(false)
  }, [])

  const toggleForwardTargetSelection = useCallback((targetKey: string) => {
    setForwardSelectedTargets((prev) => {
      const next = new Set(prev)
      if (next.has(targetKey)) {
        next.delete(targetKey)
      } else {
        next.add(targetKey)
      }
      return next
    })
  }, [])

  const handleSubmitForward = useCallback(async () => {
    if (!selectedConversationId) {
      return
    }

    const sourceMessageIds =
      forwardSourceMessageIds.length > 0
        ? forwardSourceMessageIds
        : forwardTarget
          ? [forwardTarget.idMessage]
          : []

    if (sourceMessageIds.length === 0) {
      return
    }

    const selectedOptions = [...forwardSelectedTargets]
      .map((targetKey) => allForwardTargetsByKey.get(targetKey))
      .filter((option): option is ForwardTargetOption => option != null)

    if (selectedOptions.length === 0) {
      toast.error("Vui lòng chọn ít nhất một nơi nhận")
      return
    }

    const targetConversationIds = Array.from(
      new Set(
        selectedOptions
          .filter(
            (option) =>
              option.mode === "conversation" && !!option.conversationId
          )
          .map((option) => option.conversationId as string)
      )
    )
    const targetUserIds = Array.from(
      new Set(
        selectedOptions
          .filter((option) => option.mode === "user" && !!option.userId)
          .map((option) => option.userId as string)
      )
    )

    if (targetConversationIds.length === 0 && targetUserIds.length === 0) {
      toast.error("Vui lòng chọn ít nhất một nơi nhận")
      return
    }

    setIsSubmittingForward(true)
    try {
      const trimmedNote = forwardNote.trim()
      let successCount = 0
      let forwardedConversationCount = 0

      for (let index = 0; index < sourceMessageIds.length; index += 1) {
        const sourceMessageId = sourceMessageIds[index]
        const response = await chatService.forwardMessage(
          selectedConversationId,
          sourceMessageId,
          {
            targetConversationIds,
            targetUserIds,
            note: index === 0 && trimmedNote ? trimmedNote : undefined,
          }
        )

        successCount += 1
        if (forwardedConversationCount === 0) {
          forwardedConversationCount =
            response.data.forwardedConversationCount ?? 0
        }
      }

      if (sourceMessageIds.length === 1) {
        toast.success(
          forwardedConversationCount > 0
            ? `Đã chia sẻ tới ${forwardedConversationCount} cuộc trò chuyện`
            : "Đã chia sẻ tin nhắn"
        )
      } else {
        toast.success(
          forwardedConversationCount > 0
            ? `Đã chia sẻ ${successCount} tin nhắn tới ${forwardedConversationCount} cuộc trò chuyện`
            : `Đã chia sẻ ${successCount} tin nhắn`
        )
      }

      closeForwardDialog()
      if (multiSelectActive) {
        setMultiSelectActive(false)
        setSelectedMessageIds(new Set())
      }
      void refetchConversations()
    } catch {
      toast.error("Chia sẻ tin nhắn thất bại")
    } finally {
      setIsSubmittingForward(false)
    }
  }, [
    allForwardTargetsByKey,
    closeForwardDialog,
    forwardSourceMessageIds,
    forwardNote,
    forwardSelectedTargets,
    forwardTarget,
    multiSelectActive,
    refetchConversations,
    selectedConversationId,
  ])

  if (!selectedConversationId || !selectedConversation) {
    return (
      <div className="relative flex h-full min-w-0 flex-1 flex-col items-center justify-center bg-muted/20 px-6 text-center">
        <p className="text-sm text-muted-foreground">
          Chọn một cuộc trò chuyện ở cột bên trái để xem tin nhắn, hoặc tìm
          người để bắt đầu nhắn tin.
        </p>
        <IncomingCallPopup
          open={isCallModalOpen}
          phase={
            conversationCall.phase === "idle"
              ? "outgoing"
              : conversationCall.phase
          }
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
          onAcceptWithoutCamera={
            conversationCall.acceptIncomingCallWithoutCamera
          }
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
            <AvatarFallback>
              {(peerFallback || headerTitle).slice(0, 2)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold text-foreground">
              {headerTitle}
            </h2>
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
              isDetailsPanelOpen && detailsView === "search"
                ? "bg-blue-50 text-blue-700"
                : undefined
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
            className={cn(
              "text-primary",
              isDetailsPanelOpen ? "bg-blue-50" : undefined
            )}
            onClick={() => {
              if (!isDetailsPanelOpen) {
                setDetailsView("main")
              }
              toggleDetailsPanel()
            }}
            title={
              isDetailsPanelOpen ? "Đóng thanh thông tin" : "Mở thanh thông tin"
            }
          >
            <PanelRight
              className={cn(
                "h-5 w-5",
                isDetailsPanelOpen ? "text-blue-700" : "text-blue-600"
              )}
            />
          </Button>
        </div>
      </div>

      {pinnedMessagesSorted.length > 0 ? (
        <div className="flex shrink-0 items-center gap-2 border-b bg-amber-50/70 px-3 py-1.5 text-xs">
          <div className="flex shrink-0 items-center gap-1 text-amber-800">
            <Pin className="size-3.5" />
            <span className="font-medium">
              {pinnedMessagesSorted.length} tin ghim
            </span>
          </div>

          <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto pb-0.5">
            {pinnedMessagesSorted.map((pinnedMessage) => (
              <div
                key={pinnedMessage.idMessage}
                className={cn(
                  "flex max-w-xs min-w-0 shrink-0 items-center gap-1 rounded-md border px-2 py-1",
                  selectedPinnedMessageId === pinnedMessage.idMessage
                    ? "border-amber-400 bg-amber-200/80 ring-1 ring-amber-300"
                    : "border-amber-200 bg-amber-100/70"
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
        <div className="absolute top-16 right-0 bottom-0 z-30 w-[380px] border-l bg-slate-100 shadow-[-8px_0_24px_rgba(15,23,42,0.08)]">
          <div className="flex h-full flex-col">
            <div className="border-b bg-white px-4 pt-3 pb-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-2xl font-semibold text-slate-800">
                  Tìm kiếm trong trò chuyện
                </h3>
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
                <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <Input
                  ref={searchInputRef}
                  value={messageSearchKeyword}
                  onChange={(event) =>
                    setMessageSearchKeyword(event.target.value)
                  }
                  placeholder="Tìm kiếm"
                  className="h-11 rounded-md border-slate-300 bg-white pr-12 pl-9"
                />
                {messageSearchKeyword ? (
                  <button
                    type="button"
                    className="absolute top-1/2 right-3 -translate-y-1/2 text-sm text-slate-500 hover:text-slate-700"
                    onClick={() => setMessageSearchKeyword("")}
                  >
                    Xóa
                  </button>
                ) : null}
              </div>

              <div className="mt-3 flex items-center gap-2">
                <span className="text-sm text-slate-500">Lọc theo:</span>
                <Popover
                  open={isSearchSenderPopoverOpen}
                  onOpenChange={setIsSearchSenderPopoverOpen}
                >
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="h-8 rounded-md border-slate-300 bg-slate-50 px-2 text-slate-700"
                    >
                      <UserRound className="mr-1.5 h-3.5 w-3.5" />
                      <span className="max-w-[100px] truncate text-sm">
                        {selectedSearchSenderLabel}
                      </span>
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
                            <AvatarImage
                              src={option.avatar}
                              alt={option.name}
                            />
                            <AvatarFallback>
                              {option.name.slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="truncate">{option.name}</span>
                        </button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>

                <Popover
                  open={isSearchDatePopoverOpen}
                  onOpenChange={setIsSearchDatePopoverOpen}
                >
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="h-8 rounded-md border-slate-300 bg-slate-50 px-2 text-slate-700"
                    >
                      <CalendarDays className="mr-1.5 h-3.5 w-3.5" />
                      <span className="max-w-[90px] truncate text-sm">
                        {searchFromDate || searchToDate
                          ? "Đang lọc ngày"
                          : "Ngày gửi"}
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
                            setSearchFromDate(
                              fromDate.toISOString().slice(0, 10)
                            )
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
                            setSearchFromDate(
                              fromDate.toISOString().slice(0, 10)
                            )
                            setSearchToDate(toDate.toISOString().slice(0, 10))
                          }}
                        >
                          30 ngày
                        </Button>
                      </div>
                    </div>
                    <div className="px-4 py-3">
                      <p className="mb-2 text-sm font-medium">
                        Khoảng thời gian
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          type="date"
                          value={searchFromDate}
                          onChange={(event) =>
                            setSearchFromDate(event.target.value)
                          }
                        />
                        <Input
                          type="date"
                          value={searchToDate}
                          onChange={(event) =>
                            setSearchToDate(event.target.value)
                          }
                        />
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
                <p className="text-[22px] font-semibold text-slate-800">
                  Tin nhắn
                </p>

                {!searchKeywordDebounced ? (
                  <p className="mt-3 text-sm text-slate-500">
                    Nhập từ khóa để tìm tin nhắn trong cuộc trò chuyện.
                  </p>
                ) : null}

                {isSearchingMessages ? (
                  <div className="flex justify-center py-4">
                    <Spinner className="size-5 text-muted-foreground" />
                  </div>
                ) : null}

                {searchKeywordDebounced &&
                !isSearchingMessages &&
                searchMatchMessages.length === 0 ? (
                  <p className="mt-3 text-sm text-slate-500">
                    Không tìm thấy tin nhắn phù hợp.
                  </p>
                ) : null}

                <div className="mt-2 space-y-1">
                  {searchMatchMessages.map((message) => {
                    const sender = searchSenderOptions.find(
                      (option) => option.id === message.idAccountSent
                    )
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
                            <AvatarFallback>
                              {senderName.slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <p className="truncate text-sm font-medium text-slate-700">
                                {senderName}
                              </p>
                              <span className="shrink-0 text-xs text-slate-500">
                                {formatChatSidebarTime(message.timeSent)}
                              </span>
                            </div>
                            <p className="mt-0.5 line-clamp-2 text-sm text-slate-700">
                              {renderHighlightedSearchText(
                                plainText,
                                searchKeywordDebounced
                              )}
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
                  <p className="mt-2 text-sm text-slate-500">
                    Không có file phù hợp.
                  </p>
                ) : null}

                <div className="mt-2 space-y-1.5">
                  {searchMatchedFiles.map((file) => {
                    const fileName = getOriginalFileNameFromUrl(file.url)
                    const ext =
                      fileName.split(".").pop()?.toUpperCase().slice(0, 3) ??
                      "FILE"
                    const senderName =
                      searchSenderOptions.find(
                        (option) => option.id === file.senderId
                      )?.name ??
                      file.senderId ??
                      "Người gửi"
                    const fileDate = new Date(
                      file.timeSent ?? file.timeUpload
                    ).toLocaleDateString("vi-VN", {
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
                          {ext === "DOC" || ext === "DOCX"
                            ? "W"
                            : ext === "XLS" || ext === "XLSX"
                              ? "X"
                              : ext}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-base text-slate-800">
                            {renderHighlightedSearchText(
                              fileName,
                              searchKeywordDebounced
                            )}
                          </p>
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
        phase={
          conversationCall.phase === "idle"
            ? "outgoing"
            : conversationCall.phase
        }
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
                  const isAiMessage = UNICALL_AI_BOT_IDS.includes(
                    msg.idAccountSent as (typeof UNICALL_AI_BOT_IDS)[number]
                  )
                  const showAvatar = !isMe
                  const showSenderName =
                    (!isMe && selectedConversation.type === "GROUP") ||
                    isAiMessage
                  const senderInfo = senderProfiles[msg.idAccountSent]
                  const aiDisplayName = "UniCall AI"
                  const senderName = isAiMessage
                    ? aiDisplayName
                    : selectedConversation.type === "GROUP"
                      ? (senderInfo?.displayName ?? msg.idAccountSent)
                      : !isMe
                        ? (senderInfo?.displayName ?? headerTitle)
                        : headerTitle
                  const senderAvatar = isAiMessage
                    ? undefined
                    : selectedConversation.type === "GROUP"
                      ? senderInfo?.avatar
                      : headerAvatar
                  const firstAttachment = msg.attachments?.[0]
                  const imageAttachments = (msg.attachments ?? []).filter(
                    (attachment) => attachment.type === "IMAGE"
                  )
                  const hasMultiImageAttachments = imageAttachments.length > 1
                  const isCallMessage =
                    msg.type === "CALL" && msg.callInfo != null
                  const callCard = isCallMessage
                    ? buildCallMessageCard(msg, currentUserId)
                    : null
                  const reactionStacks = msg.reactionStacks ?? {}
                  const hasReactionStacks =
                    Object.keys(reactionStacks).length > 0
                  const flattenedReactions = hasReactionStacks
                    ? Object.values(reactionStacks)
                        .flat()
                        .filter(
                          (reaction) =>
                            typeof reaction === "string" &&
                            reaction.trim().length > 0
                        )
                    : Object.values(msg.reactions ?? {})
                  const reactionCounts = flattenedReactions.reduce<
                    Record<string, number>
                  >((acc, reaction) => {
                    acc[reaction] = (acc[reaction] ?? 0) + 1
                    return acc
                  }, {})
                  const reactionSummary = Object.entries(reactionCounts)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 3)
                  const totalReactionCount = flattenedReactions.length

                  const replyParent = msg.replyToMessageId
                    ? (messageById.get(msg.replyToMessageId) ??
                      replyTargetCache[msg.replyToMessageId])
                    : undefined
                  const normalizedMessageContent = normalizeFileMessageContent(
                    msg.content
                  )
                  const fileNameFromMessage = extractFileNameFromFileMessage(
                    normalizedMessageContent
                  )

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
                        searchMatchIdSet.has(msg.idMessage) &&
                          "bg-amber-50/70 ring-1 ring-amber-200",
                        selectedPinnedMessageId === msg.idMessage &&
                          "bg-amber-100/50 ring-1 ring-amber-300",
                        selectedReplyTargetMessageId === msg.idMessage &&
                          "bg-primary/10 ring-1 ring-primary/40",
                        highlightedMessageId === msg.idMessage &&
                          "bg-primary/10",
                        isMe ? "justify-end" : "justify-start"
                      )}
                    >
                      {showAvatar && (
                        <Avatar
                          size="sm"
                          className={cn(
                            "shrink-0",
                            showSenderName ? "mt-5 self-start" : "mb-1 self-end"
                          )}
                        >
                          <AvatarImage src={senderAvatar} alt={senderName} />
                          <AvatarFallback
                            className={cn(
                              isAiMessage && "bg-cyan-100 text-cyan-700"
                            )}
                          >
                            {isAiMessage ? (
                              <Bot className="size-3.5" />
                            ) : (
                              senderName.slice(0, 2)
                            )}
                          </AvatarFallback>
                        </Avatar>
                      )}
                      <div
                        className={cn(
                          "flex max-w-[min(78%,36rem)] items-end gap-2",
                          isMe ? "flex-row-reverse" : "flex-row"
                        )}
                      >
                        {multiSelectActive ? (
                          <button
                            type="button"
                            aria-label="Chọn tin nhắn"
                            onClick={() =>
                              toggleMessageSelection(msg.idMessage)
                            }
                            className={cn(
                              "mb-5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2",
                              selectedMessageIds.has(msg.idMessage)
                                ? "border-blue-600 bg-blue-600 text-white"
                                : "border-muted-foreground/40 bg-background"
                            )}
                          >
                            {selectedMessageIds.has(msg.idMessage) ? "✓" : ""}
                          </button>
                        ) : null}
                        <div
                          className={cn(
                            "group/msg flex min-w-0 items-end gap-1",
                            isMe ? "flex-row-reverse" : "flex-row"
                          )}
                        >
                          <div
                            className={cn(
                              "flex min-w-0 flex-col",
                              isMe ? "items-end" : "items-start"
                            )}
                          >
                            {showSenderName ? (
                              <p
                                className={cn(
                                  "mb-1 px-1 text-xs font-medium",
                                  isAiMessage
                                    ? "text-cyan-700"
                                    : "text-slate-600"
                                )}
                              >
                                <span className="inline-flex items-center gap-1">
                                  {isAiMessage ? (
                                    <Bot className="size-3.5" />
                                  ) : null}
                                  {senderName}
                                </span>
                              </p>
                            ) : null}
                            {msg.replyToMessageId && !msg.recalled ? (
                              <div
                                role="button"
                                tabIndex={0}
                                onClick={() =>
                                  focusReplyMessageFromSnippet(
                                    msg.replyToMessageId
                                  )
                                }
                                onKeyDown={(event) => {
                                  if (
                                    event.key === "Enter" ||
                                    event.key === " "
                                  ) {
                                    event.preventDefault()
                                    focusReplyMessageFromSnippet(
                                      msg.replyToMessageId
                                    )
                                  }
                                }}
                                className={cn(
                                  "mb-1.5 max-w-full rounded-md border-l-2 border-primary/50 bg-black/[0.03] px-2 py-1 text-left text-xs text-muted-foreground transition-colors hover:bg-black/[0.06] focus-visible:ring-1 focus-visible:ring-primary/40 focus-visible:outline-none dark:bg-white/5 dark:hover:bg-white/10",
                                  selectedReplyTargetMessageId ===
                                    msg.replyToMessageId &&
                                    "bg-primary/5 ring-1 ring-primary/30",
                                  isMe ? "mr-0" : "ml-0"
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
                                  "rounded-2xl px-4 py-2 text-sm break-all whitespace-pre-wrap text-muted-foreground italic",
                                  isMe
                                    ? "rounded-br-sm bg-primary/5"
                                    : "rounded-bl-sm border bg-muted/40"
                                )}
                              >
                                {normalizedMessageContent}
                              </div>
                            ) : msg.type === "TEXT" ? (
                              <div
                                className={cn(
                                  "rounded-2xl px-4 py-2 text-sm break-all whitespace-pre-wrap",
                                  isAiMessage
                                    ? "rounded-bl-sm border border-cyan-200 bg-cyan-50 text-slate-800"
                                    : isMe
                                      ? "rounded-br-sm bg-primary/10 text-foreground"
                                      : "rounded-bl-sm border bg-background text-foreground shadow-xs"
                                )}
                              >
                                {renderMessageRichText(
                                  normalizedMessageContent
                                )}
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
                                <p className="mt-1 border-b pb-2 text-sm text-slate-600">
                                  {callCard?.subtitle}
                                </p>
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
                                <img
                                  src={firstAttachment.url}
                                  alt="sticker"
                                  className="h-20 w-20 object-contain"
                                />
                              </div>
                            ) : firstAttachment?.type === "GIF" ? (
                              <div className="overflow-hidden rounded-2xl border bg-background shadow-xs">
                                <img
                                  src={firstAttachment.url}
                                  alt="gif"
                                  className="max-h-52 w-56 object-cover"
                                />
                              </div>
                            ) : hasMultiImageAttachments ? (
                              <div className="max-w-xs">
                                <div className="grid grid-cols-2 gap-1 overflow-hidden rounded-2xl border bg-background p-1 shadow-xs">
                                  {imageAttachments
                                    .slice(0, 4)
                                    .map((attachment, index) => {
                                      const isThreeImagesFirst =
                                        imageAttachments.length === 3 &&
                                        index === 0
                                      const isOverflowTile =
                                        index === 3 &&
                                        imageAttachments.length > 4
                                      return (
                                        <button
                                          key={`${attachment.url}-${index}`}
                                          type="button"
                                          className={cn(
                                            "relative overflow-hidden rounded-md bg-muted",
                                            isThreeImagesFirst
                                              ? "col-span-2 aspect-[2/1]"
                                              : "aspect-square"
                                          )}
                                          onClick={() =>
                                            openConversationImagePreview(
                                              attachment.url
                                            )
                                          }
                                        >
                                          <img
                                            src={attachment.url}
                                            alt={`image-${index + 1}`}
                                            className="h-full w-full object-cover transition-opacity hover:opacity-90"
                                          />
                                          {isOverflowTile ? (
                                            <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-xl font-semibold text-white">
                                              +{imageAttachments.length - 4}
                                            </div>
                                          ) : null}
                                        </button>
                                      )
                                    })}
                                </div>
                                {normalizedMessageContent &&
                                  normalizedMessageContent.trim() && (
                                    <div className="px-3 py-2 text-sm break-all whitespace-pre-wrap text-foreground">
                                      {renderMessageRichText(
                                        normalizedMessageContent
                                      )}
                                    </div>
                                  )}
                              </div>
                            ) : firstAttachment?.type === "IMAGE" ? (
                              <div className="cursor-pointer overflow-hidden rounded-2xl border bg-background shadow-xs">
                                <img
                                  src={firstAttachment.url}
                                  alt="image"
                                  className="max-h-64 max-w-xs object-contain transition-opacity hover:opacity-90"
                                  onClick={() =>
                                    openConversationImagePreview(
                                      firstAttachment.url
                                    )
                                  }
                                />
                                {normalizedMessageContent &&
                                  normalizedMessageContent.trim() && (
                                    <div className="px-3 py-2 text-sm break-all whitespace-pre-wrap text-foreground">
                                      {renderMessageRichText(
                                        normalizedMessageContent
                                      )}
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
                                {normalizedMessageContent &&
                                  normalizedMessageContent.trim() && (
                                    <div className="px-3 py-2 text-sm break-all whitespace-pre-wrap text-foreground">
                                      {renderMessageRichText(
                                        normalizedMessageContent
                                      )}
                                    </div>
                                  )}
                              </div>
                            ) : firstAttachment?.type === "AUDIO" ? (
                              <div className="min-w-[280px] rounded-2xl border bg-background px-4 py-3 shadow-xs">
                                <p className="mb-2 text-xs text-muted-foreground">
                                  File âm thanh
                                </p>
                                <audio
                                  src={firstAttachment.url}
                                  controls
                                  className="h-8 w-full"
                                  preload="metadata"
                                />
                                {normalizedMessageContent &&
                                  normalizedMessageContent.trim() && (
                                    <div className="mt-2 text-sm break-all whitespace-pre-wrap text-foreground">
                                      {renderMessageRichText(
                                        normalizedMessageContent
                                      )}
                                    </div>
                                  )}
                              </div>
                            ) : firstAttachment?.type === "LINK" ? (
                              <div className="max-w-[280px] rounded-2xl border bg-background px-3 py-2.5 shadow-xs">
                                <a
                                  href={firstAttachment.url}
                                  target="_blank"
                                  rel="noreferrer noopener"
                                  className="block text-sm break-all text-blue-600 underline hover:text-blue-700"
                                >
                                  {firstAttachment.url}
                                </a>
                                {normalizedMessageContent &&
                                  normalizedMessageContent.trim() &&
                                  normalizedMessageContent.trim() !==
                                    firstAttachment.url && (
                                    <div className="mt-2 border-t pt-2 text-sm break-all whitespace-pre-wrap text-foreground">
                                      {renderMessageRichText(
                                        normalizedMessageContent
                                      )}
                                    </div>
                                  )}
                              </div>
                            ) : firstAttachment?.type === "FILE" ? (
                              (() => {
                                const fileNameFromUrl =
                                  getOriginalFileNameFromUrl(
                                    firstAttachment.url
                                  )
                                const displayFileName =
                                  fileNameFromMessage || fileNameFromUrl

                                return (
                                  <a
                                    href={firstAttachment.url}
                                    download
                                    className="block max-w-[280px] rounded-xl border bg-background px-3 py-2.5 shadow-xs transition-colors hover:bg-muted/50"
                                  >
                                    <div className="flex items-start gap-2.5">
                                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-blue-500 text-[10px] font-bold text-white">
                                        {firstAttachment.url
                                          .split(".")
                                          .pop()
                                          ?.toUpperCase()
                                          .substring(0, 4) || "FILE"}
                                      </div>
                                      <div className="min-w-0 flex-1">
                                        <p className="line-clamp-2 text-sm font-medium break-all text-foreground">
                                          {displayFileName}
                                        </p>
                                        <p className="mt-0.5 text-xs text-muted-foreground">
                                          {firstAttachment.size ||
                                            "Unknown size"}
                                        </p>
                                      </div>
                                    </div>
                                    {normalizedMessageContent &&
                                      normalizedMessageContent.trim() &&
                                      normalizedMessageContent !==
                                        `Đã gửi file: ${displayFileName}` && (
                                        <div className="mt-2 border-t pt-2 text-sm break-all whitespace-pre-wrap text-foreground">
                                          {renderMessageRichText(
                                            normalizedMessageContent
                                          )}
                                        </div>
                                      )}
                                  </a>
                                )
                              })()
                            ) : (
                              <div className="rounded-2xl border bg-background px-4 py-2 text-sm break-all whitespace-pre-wrap text-muted-foreground">
                                {renderMessageRichText(
                                  normalizedMessageContent
                                )}
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
                            {totalReactionCount > 0 ? (
                              <div className="mt-1 inline-flex items-center gap-1 rounded-full border bg-background px-2 py-0.5 text-[11px] text-muted-foreground">
                                <span>
                                  {reactionSummary
                                    .map(([emoji]) => emoji)
                                    .join(" ")}
                                </span>
                                <span>{totalReactionCount}</span>
                              </div>
                            ) : null}
                          </div>

                          {!msg.recalled &&
                          !multiSelectActive &&
                          !isCallMessage ? (
                            <div
                              className={cn(
                                "mb-5 flex shrink-0 gap-0.5 opacity-0 transition-opacity duration-150 group-hover/msg:opacity-100",
                                "pointer-events-none group-hover/msg:pointer-events-auto"
                              )}
                            >
                              <div className="mr-1 flex items-center rounded-full border bg-background px-1 py-0.5 shadow-sm">
                                {MESSAGE_REACTIONS.map((emoji) => (
                                  <button
                                    key={`quick-react-${msg.idMessage}-${emoji}`}
                                    type="button"
                                    className="flex h-7 w-7 items-center justify-center rounded-full text-base hover:bg-muted"
                                    onClick={(event) => {
                                      event.stopPropagation()
                                      void handleReactMessage(msg, emoji)
                                    }}
                                    title={`Thả cảm xúc ${emoji}`}
                                  >
                                    {emoji}
                                  </button>
                                ))}
                                <button
                                  type="button"
                                  className="ml-0.5 flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
                                  onClick={(event) => {
                                    event.stopPropagation()
                                    void handleReactMessage(msg, null)
                                  }}
                                  title="Gỡ cảm xúc"
                                >
                                  <X className="size-4" />
                                </button>
                              </div>
                              <Button
                                type="button"
                                variant="secondary"
                                size="icon"
                                className="h-7 w-7 rounded-full border-0 bg-muted/90 shadow-sm hover:bg-muted"
                                title="Trả lời (Rep)"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setReplyingTo(msg)
                                  setTimeout(
                                    () => textareaRef.current?.focus(),
                                    0
                                  )
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
                                  openForwardDialog(msg)
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
                                <DropdownMenuContent
                                  align={isMe ? "end" : "start"}
                                  className="w-56"
                                >
                                  <DropdownMenuItem
                                    className="gap-2"
                                    onSelect={() => void copyMessageText(msg)}
                                  >
                                    <Copy className="size-4" />
                                    Copy tin nhắn
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="gap-2"
                                    onSelect={() =>
                                      void handleTogglePinMessage(msg)
                                    }
                                  >
                                    <Pin className="size-4" />
                                    {msg.pinned
                                      ? "Bỏ ghim tin nhắn"
                                      : "Ghim tin nhắn"}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="gap-2"
                                    onSelect={() => {
                                      setMultiSelectActive(true)
                                      setSelectedMessageIds(
                                        new Set([msg.idMessage])
                                      )
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
                                        onSelect={() =>
                                          void handleRecallMessage(msg)
                                        }
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
                                    onSelect={() =>
                                      void handleHideMessageForMe(msg)
                                    }
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
            <strong className="text-foreground">
              {selectedMessageIds.size}
            </strong>{" "}
            Đã chọn
          </span>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 rounded-full"
              disabled={selectedMessages.length === 0}
              onClick={() => void handleCopySelectedMessages()}
            >
              <Copy className="mr-1.5 size-3.5" />
              Sao chép
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 rounded-full"
              disabled={
                !canForwardSelectedMessages ||
                isRecallingSelectedMessages ||
                isDeletingSelectedMessages
              }
              onClick={handleForwardSelectedMessages}
            >
              <Forward className="mr-1.5 size-3.5" />
              Chia sẻ
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              title={
                canRecallSelectedMessages
                  ? "Thu hồi các tin nhắn đã chọn"
                  : "Chỉ thu hồi được khi tất cả tin đã chọn là tin nhắn của bạn"
              }
              className={cn(
                "h-8 rounded-full",
                canRecallSelectedMessages &&
                  "border-red-200 bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700"
              )}
              disabled={
                !canRecallSelectedMessages ||
                isRecallingSelectedMessages ||
                isDeletingSelectedMessages
              }
              onClick={() => void handleRecallSelectedMessages()}
            >
              <Undo2 className="mr-1.5 size-3.5" />
              {isRecallingSelectedMessages ? "Đang thu hồi..." : "Thu hồi"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 rounded-full text-red-600 hover:text-red-700"
              disabled={
                selectedMessages.length === 0 ||
                isDeletingSelectedMessages ||
                isRecallingSelectedMessages
              }
              onClick={() => void handleHideSelectedMessages()}
            >
              <Trash2 className="mr-1.5 size-3.5" />
              {isDeletingSelectedMessages ? "Đang xóa..." : "Xóa"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 rounded-full"
              disabled={
                isRecallingSelectedMessages || isDeletingSelectedMessages
              }
              onClick={() => {
                setMultiSelectActive(false)
                setSelectedMessageIds(new Set())
              }}
            >
              Hủy
            </Button>
          </div>
        </div>
      ) : null}

      <div className="shrink-0 border-t bg-background p-3">
        {replyingTo ? (
          <div className="mb-2 flex items-start gap-2 rounded-lg border bg-muted/30 px-3 py-2 text-sm">
            <Quote className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-muted-foreground">
                Trả lời
              </p>
              <p className="truncate text-foreground">
                {messagePlainTextForCopy(replyingTo)}
              </p>
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
        {pendingImageUploads.length > 0 ? (
          <div className="mb-2 rounded-lg border bg-muted/20 p-2">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-medium text-foreground">
                {pendingImageUploads.length} ảnh
              </p>
              <Button
                variant="ghost"
                size="sm"
                type="button"
                className="h-7 px-2 text-xs"
                onClick={clearPendingImages}
              >
                Xóa tất cả
              </Button>
            </div>
            <div className="custom-scrollbar flex gap-2 overflow-x-auto pb-1">
              {pendingImageUploads.map((item) => (
                <div
                  key={item.id}
                  className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md border bg-background"
                >
                  <img
                    src={item.previewUrl}
                    alt="preview"
                    className="h-full w-full object-cover"
                  />
                  <button
                    type="button"
                    className="absolute top-1 right-1 rounded-full bg-black/60 p-0.5 text-white hover:bg-black/80"
                    onClick={() => removePendingImage(item.id)}
                    aria-label="Xóa ảnh khỏi danh sách chờ"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : null}
        {isMessageBlocked ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            <p>
              {isLoadingBlockStatus
                ? "Đang kiểm tra quyền nhắn tin..."
                : blockedReasonText}
            </p>
            {blockStatus?.blockedByMe ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="mt-2"
                disabled={isTogglingBlockFromComposer}
                onClick={() => void handleUnblockFromComposer()}
              >
                {isTogglingBlockFromComposer
                  ? "Đang xử lý..."
                  : "Bỏ chặn để nhắn tin"}
              </Button>
            ) : null}
          </div>
        ) : (
          <>
            <div className="mb-2 flex gap-1">
              <Popover open={stickerOpen} onOpenChange={setStickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    title="Gửi sticker"
                    type="button"
                  >
                    <Sticker className="h-5 w-5" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-3" align="start">
                  <div className="mb-2 text-xs font-medium text-muted-foreground">
                    Chọn sticker
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {STICKERS.map((stickerUrl) => (
                      <button
                        key={stickerUrl}
                        type="button"
                        className="rounded-md bg-amber-50 p-1 hover:bg-amber-100"
                        onClick={() => void sendSticker(stickerUrl)}
                      >
                        <img
                          src={stickerUrl}
                          alt="sticker"
                          className="mx-auto h-12 w-12 object-contain"
                        />
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
              <Popover open={gifOpen} onOpenChange={setGifOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    title="Gửi GIF"
                    type="button"
                  >
                    <ImageIcon className="h-5 w-5" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-3" align="start">
                  <div className="mb-2 text-xs font-medium text-muted-foreground">
                    Chọn GIF
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {GIFS.map((gifUrl) => (
                      <button
                        key={gifUrl}
                        type="button"
                        className="overflow-hidden rounded-md border hover:opacity-90"
                        onClick={() => void sendGif(gifUrl)}
                      >
                        <img
                          src={gifUrl}
                          alt="gif"
                          className="h-20 w-full object-cover"
                        />
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
                multiple
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
                <Paperclip
                  className={cn("h-5 w-5", isUploadingFile && "animate-spin")}
                />
              </Button>
            </div>

            <div className="flex items-end gap-2">
              <div className="relative flex min-w-0 flex-1 items-end rounded-lg border bg-background pr-1">
                {mentionSuggestion && visibleMentionCommands.length > 0 ? (
                  <div className="absolute bottom-full left-0 z-20 mb-2 w-[320px] max-w-[90vw] overflow-hidden rounded-xl border bg-popover shadow-lg">
                    <div className="border-b px-3 py-2 text-xs font-medium text-muted-foreground">
                      Gợi ý lệnh AI
                    </div>
                    <div className="p-1">
                      {visibleMentionCommands.map((command, index) => (
                        <button
                          key={command.token}
                          type="button"
                          className={cn(
                            "flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm hover:bg-muted/70",
                            mentionSuggestion.highlightedIndex === index &&
                              "bg-muted"
                          )}
                          onMouseDown={(event) => {
                            event.preventDefault()
                          }}
                          onClick={() => applyMentionCommand(command)}
                        >
                          <Bot className="h-4 w-4 text-blue-600" />
                          <span className="min-w-0 flex-1">
                            <span className="block font-medium text-foreground">
                              {command.token}
                            </span>
                            <span className="block truncate text-xs text-muted-foreground">
                              {command.description}
                            </span>
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
                <Textarea
                  ref={textareaRef}
                  value={draft}
                  onChange={(event) => {
                    handleDraftChange(
                      event.target.value,
                      event.target.selectionStart
                    )
                  }}
                  onSelect={syncDraftCaret}
                  onClick={syncDraftCaret}
                  onKeyUp={syncDraftCaret}
                  onBlur={() => {
                    syncDraftCaret()
                    window.setTimeout(() => {
                      setMentionSuggestion(null)
                    }, 100)
                  }}
                  onInput={handleInput}
                  onPaste={(event) => {
                    void handlePaste(event)
                  }}
                  onKeyDown={(event) => {
                    if (
                      mentionSuggestion &&
                      visibleMentionCommands.length > 0
                    ) {
                      if (event.key === "ArrowDown") {
                        event.preventDefault()
                        setMentionSuggestion((prev) => {
                          if (!prev) {
                            return prev
                          }
                          return {
                            ...prev,
                            highlightedIndex:
                              (prev.highlightedIndex + 1) %
                              visibleMentionCommands.length,
                          }
                        })
                        return
                      }
                      if (event.key === "ArrowUp") {
                        event.preventDefault()
                        setMentionSuggestion((prev) => {
                          if (!prev) {
                            return prev
                          }
                          return {
                            ...prev,
                            highlightedIndex:
                              (prev.highlightedIndex -
                                1 +
                                visibleMentionCommands.length) %
                              visibleMentionCommands.length,
                          }
                        })
                        return
                      }
                      if (
                        event.key === "Tab" ||
                        (event.key === "Enter" && !event.shiftKey)
                      ) {
                        event.preventDefault()
                        const selectedCommand =
                          visibleMentionCommands[
                            Math.min(
                              mentionSuggestion.highlightedIndex,
                              visibleMentionCommands.length - 1
                            )
                          ]
                        if (selectedCommand) {
                          applyMentionCommand(selectedCommand)
                        }
                        return
                      }
                      if (event.key === "Escape") {
                        event.preventDefault()
                        setMentionSuggestion(null)
                        return
                      }
                    }

                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault()
                      void sendText()
                    }
                  }}
                  placeholder={`Nhập tin nhắn tới ${headerTitle}`}
                  rows={1}
                  disabled={isSending}
                  className="custom-scrollbar max-h-32 min-h-[38px] w-full min-w-0 resize-none overflow-x-hidden border-0 bg-transparent [overflow-wrap:anywhere] break-words whitespace-pre-wrap shadow-none focus-visible:ring-0"
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
                    <div className="mb-2 text-xs font-medium text-muted-foreground">
                      Biểu cảm
                    </div>
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
                disabled={
                  isSending ||
                  (!draft.trim() && pendingImageUploads.length === 0)
                }
                onClick={() => void sendText()}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </>
        )}
      </div>

      <Dialog
        open={forwardTarget != null || forwardSourceMessageIds.length > 0}
        onOpenChange={(open) => !open && closeForwardDialog()}
      >
        <DialogContent className="p-0 sm:max-w-xl" showCloseButton>
          <DialogHeader className="border-b px-4 py-3">
            <DialogTitle>Chia sẻ</DialogTitle>
            <DialogDescription>
              Chọn cuộc trò chuyện hoặc bạn bè để chia sẻ tin nhắn.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 border-b px-4 py-3">
            <Input
              value={forwardKeyword}
              onChange={(event) => setForwardKeyword(event.target.value)}
              placeholder="Tìm kiếm..."
            />

            <Tabs
              value={forwardTab}
              onValueChange={(value) => setForwardTab(value as ForwardTab)}
            >
              <TabsList variant="line" className="h-9 p-0">
                <TabsTrigger value="recent" className="px-2">
                  Gần đây
                </TabsTrigger>
                <TabsTrigger value="groups" className="px-2">
                  Nhóm trò chuyện
                </TabsTrigger>
                <TabsTrigger value="friends" className="px-2">
                  Bạn bè
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <ScrollArea className="h-[280px] px-2">
            <div className="space-y-1 py-2">
              {forwardTab === "friends" && isLoadingForwardFriends ? (
                <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                  <Spinner className="mr-2 size-4" />
                  Đang tải danh sách bạn bè...
                </div>
              ) : null}

              {(forwardTab !== "friends" || !isLoadingForwardFriends) &&
              visibleForwardOptions.length === 0 ? (
                <p className="px-2 py-8 text-center text-sm text-muted-foreground">
                  Không có nơi nhận phù hợp để chia sẻ.
                </p>
              ) : null}

              {(forwardTab !== "friends" || !isLoadingForwardFriends) &&
                visibleForwardOptions.map((option) => {
                  const selected = forwardSelectedTargets.has(option.key)

                  return (
                    <button
                      key={option.key}
                      type="button"
                      className={cn(
                        "flex w-full items-center gap-3 rounded-md px-2 py-2 text-left hover:bg-muted/70",
                        selected && "bg-blue-50"
                      )}
                      onClick={() => toggleForwardTargetSelection(option.key)}
                    >
                      <span
                        className={cn(
                          "flex h-5 w-5 shrink-0 items-center justify-center rounded border",
                          selected
                            ? "border-blue-600 bg-blue-600 text-white"
                            : "border-muted-foreground/40 bg-background"
                        )}
                      >
                        {selected ? <Check className="size-3.5" /> : null}
                      </span>
                      <Avatar size="default">
                        <AvatarImage src={option.avatar} alt={option.label} />
                        <AvatarFallback>
                          {option.label.slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-foreground">
                          {option.label}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {option.subtitle ?? ""}
                        </span>
                      </span>
                    </button>
                  )
                })}
            </div>
          </ScrollArea>

          <div className="space-y-2 border-t bg-muted/20 px-4 py-3">
            <div className="rounded-md border bg-background px-3 py-2">
              <p className="text-xs font-medium text-muted-foreground">
                Chia sẻ tin nhắn
              </p>
              <p className="mt-1 line-clamp-2 text-sm text-foreground">
                {forwardSourceMessageIds.length > 1
                  ? `Đã chọn ${forwardSourceMessageIds.length} tin nhắn để chia sẻ`
                  : forwardTarget
                    ? messagePlainTextForCopy(forwardTarget)
                    : ""}
              </p>
            </div>

            <Input
              value={forwardNote}
              onChange={(event) => setForwardNote(event.target.value)}
              placeholder="Nhập tin nhắn..."
              maxLength={300}
            />
          </div>

          <div className="flex items-center justify-between border-t px-4 py-3">
            <span className="text-xs text-muted-foreground">
              Đã chọn {forwardSelectedTargets.size} nơi nhận
            </span>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={closeForwardDialog}
              >
                Hủy
              </Button>
              <Button
                type="button"
                className="bg-blue-600 hover:bg-blue-700"
                disabled={
                  isSubmittingForward || forwardSelectedTargets.size === 0
                }
                onClick={() => void handleSubmitForward()}
              >
                {isSubmittingForward ? "Đang chia sẻ..." : "Chia sẻ"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ImageGalleryViewer
        open={imagePreview != null}
        onOpenChange={(open) => {
          if (!open) {
            setImagePreview(null)
          }
        }}
        images={imagePreview?.images ?? []}
        initialIndex={imagePreview?.initialIndex ?? 0}
      />
    </div>
  )
}
