import {
  Bot,
  Check,
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
  Tag,
} from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { toast } from "sonner"

import IncomingCallPopup from "@/components/message/IncomingCallPopup"
import ImageGalleryViewer, { type ImageViewerItem } from "@/components/message/ImageGalleryViewer"
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { useAuth } from "@/contexts/auth-context"
import { useChatPage } from "@/contexts/ChatPageContext"
import { useConversationCall } from "@/hooks/useConversationCall"
import { useChatSocket } from "@/hooks/useChatSocket"
import { cn } from "@/lib/utils"
import { chatService } from "@/services/chat/chat.service"
import { chatSocketService } from "@/services/chat/chat-socket.service"
import type { ChatAttachment, ChatMessageResponse } from "@/types/chat"
import { displayNameFromProfile, formatChatMessageTime } from "@/utils/chat-display.util"
import { relationshipService, tagService } from "@/services/relationship/relationship.service"
import TagManagementModal from "./TagManagementModal"

const MESSAGE_PAGE_SIZE = 30
const LOAD_MORE_THRESHOLD_PX = 80
const EMOJIS = ["😀", "😂", "😍", "🥰", "😭", "😡", "👍", "🙏", "🎉", "❤️", "🔥", "🤝"]
const TAG_TYPES = [
  { value: "CUSTOMER", label: "Khách hàng", color: "bg-red-500" },
  { value: "FAMILY", label: "Gia đình", color: "bg-pink-500" },
  { value: "WORK", label: "Công việc", color: "bg-orange-500" },
  { value: "FRIEND", label: "Bạn bè", color: "bg-yellow-500" },
  { value: "LATER", label: "Trả lời sau", color: "bg-green-500" },
  { value: "COLLEAGUE", label: "Đồng nghiệp", color: "bg-blue-600" },
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

function getDirectPeerId(conversation: ConversationResponse, currentUserId: string | null): string | null {
  if (conversation.type !== "DOUBLE" || !currentUserId) {
    return null
  }

  return (
    conversation.participantInfos.find((participant) => participant.idAccount !== currentUserId)?.idAccount ?? null
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
  const prependAnchorRef = useRef<{ prevTop: number; prevHeight: number } | null>(null)
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
  const [relationshipTypes, setRelationshipTypes] = useState<string[]>([])
  const [isBlocked, setIsBlocked] = useState(false)
  const [isBlockedByPeer, setIsBlockedByPeer] = useState(false)
  const [currentTag, setCurrentTag] = useState<string | null>(null)

  useEffect(() => {
    const checkStatusRelationship = async () => {
      const peerId = selectedPeerProfile?.identityUserId

      if (!currentUserId || !peerId) {
        setRelationshipTypes([])
        setIsBlocked(false)
        setIsBlockedByPeer(false)
        return
      }

      try {
        // Check if current user blocked peer
        const resMe = await relationshipService.getRelationshipBetweenUsers(currentUserId, peerId)
        const types = (resMe?.data?.relationshipTypes ?? []) as unknown as string[]
        setRelationshipTypes(types)
        console.log('This is me. CurrentUserId: ', currentUserId, '. Relationship res: ', resMe?.data);

        // Check if current user blocked the peer (BLOCK_ALL or BLOCK_MESSAGE)
        const blocked = types.includes("BLOCK_ALL") || types.includes("BLOCK_MESSAGE")
        setIsBlocked(blocked)

        // Check if peer blocked current user
        const resPeer = await relationshipService.getRelationshipBetweenUsers(peerId, currentUserId)
        const reverseTypes = (resPeer?.data?.relationshipTypes ?? []) as unknown as string[]
        console.log('This is peer. peerId: ', peerId, '. Relationship res: ', resPeer?.data);

        const blockedByPeer = reverseTypes.includes("BLOCK_ALL") || reverseTypes.includes("BLOCK_MESSAGE")
        setIsBlockedByPeer(blockedByPeer)

        // Load current tag for this peer
        if (currentUserId && peerId) {
          try {
            const peerTagsRes = await tagService.getTagsByUserId(peerId)
            console.log("peerTagsRes:", peerTagsRes)
            const tagsArray = Array.isArray(peerTagsRes.data) ? peerTagsRes.data : [peerTagsRes.data]
            const peerTag = tagsArray?.find((t: any) => t.taggerId === currentUserId)
            setCurrentTag(peerTag?.tagType ?? null)
          } catch (error) {
            console.error("Error loading tags:", error)
            setCurrentTag(null)
          }
        }
      } catch (error) {
        console.error("Error checking relationship:", error)
        setRelationshipTypes([])
        setIsBlocked(false)
        setIsBlockedByPeer(false)
      }
    }

    void checkStatusRelationship()

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

  const updateRelationship = async () => {
    const peerId = selectedPeerProfile?.identityUserId
    if (!currentUserId || !peerId) {
      toast.error("Không thể lấy id")
      return
    }

    try {
      // Remove BLOCK types from relationshipTypes
      const filteredTypes = relationshipTypes.filter(
        (type) => type !== "BLOCK_ALL" && type !== "BLOCK_MESSAGE"
      )

      await relationshipService.updateRelationship({
        actorId: currentUserId,
        targetId: peerId,
        relationshipType: filteredTypes,
      })

      // Update state after successful unblock
      setRelationshipTypes(filteredTypes)
      setIsBlocked(false)
      toast.success("Đã bỏ chặn người này")
    } catch (error) {
      console.error("Error unblocking user:", error)
      toast.error("Không thể bỏ chặn người này")
    }
  }

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
    const existsInApi = apiMessages.some((item) => item.idMessage === msg.idMessage)

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
  }, [apiMessages, onRealtimeMessage])

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
  }, [displayMessages])

  const [draft, setDraft] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [emojiOpen, setEmojiOpen] = useState(false)
  const [stickerOpen, setStickerOpen] = useState(false)
  const [gifOpen, setGifOpen] = useState(false)
  const [tagOpen, setTagOpen] = useState(false)
  const [isLoadingTag, setIsLoadingTag] = useState(false)
  const [tagManagementOpen, setTagManagementOpen] = useState(false)

  const handleSelectTag = async (tagValue: string, tagLabel: string) => {
    const peerId = selectedPeerProfile?.identityUserId
    if (!currentUserId || !peerId) {
      toast.error("Không thể gắn tag")
      return
    }

    setIsLoadingTag(true)
    try {
      await tagService.createTag({
        taggerId: currentUserId,
        taggedId: peerId,
        tagType: tagValue,
      })
      setCurrentTag(tagValue)
      setTagOpen(false)
      toast.success(`Đã gắn tag "${tagLabel}"`)
    } catch (error) {
      console.error("Error creating tag:", error)
      toast.error("Không thể gắn tag")
    } finally {
      setIsLoadingTag(false)
    }
  }

  const getTagColor = (tagValue: string) => {
    return TAG_TYPES.find((t) => t.value === tagValue)?.color || "bg-blue-600"
  }

  const currentTagColor = currentTag ? getTagColor(currentTag) : "bg-blue-600"

  useEffect(() => {
    if (!selectedReplyTargetMessageId) {
      return
    }

    const stillExistsInView = displayMessages.some((message) => message.idMessage === selectedReplyTargetMessageId)
    if (!stillExistsInView && pendingFocusMessageIdRef.current !== selectedReplyTargetMessageId) {
      setSelectedReplyTargetMessageId(null)
    }
  }, [displayMessages, selectedReplyTargetMessageId])

  const normalizedForwardKeyword = useMemo(() => forwardKeyword.trim().toLowerCase(), [forwardKeyword])

  const directConversationIdByPeerId = useMemo(() => {
    const directMap = new Map<string, string>()
    if (!currentUserId) {
      return directMap
    }

    // Check if blocked by peer
    if (isBlockedByPeer) {
      toast.error("Đã chặn tin nhắn")
      return
    }

    setIsSending(true)
    try {
      const client = chatSocketService.getClient()
      if (client?.connected) {
        chatSocketService.sendMessage(selectedConversationId, normalized, type, attachments)
      } else {
        const res = await chatApiService.sendMessageRest(selectedConversationId, normalized, type, attachments)
        setSocketExtras((prev) => {
          if (prev.some((x) => x.idMessage === res.data.idMessage)) {
            return prev
          }
          return [...prev, res.data]
        })
        pendingScrollToBottomRef.current = true
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
      .filter((conversation) => conversation.idConversation !== selectedConversationId)
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
  }, [conversationAvatar, conversationTitle, conversations, selectedConversationId])

  const groupForwardOptions = useMemo<ForwardTargetOption[]>(() => {
    return recentForwardOptions.filter((option) => {
      const conversation = conversations.find((item) => item.idConversation === option.conversationId)
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
                friend.idAccountSent === currentUserId ? friend.idAccountReceive : friend.idAccountSent,
              )
              .filter((peerId): peerId is string => !!peerId && peerId.trim().length > 0),
          ),
        )

        if (peers.length === 0) {
          setForwardFriendOptions([])
          return
        }

  return (
    <div className="flex h-full min-w-0 flex-1 flex-col bg-muted/20">
      <div className="flex h-16 shrink-0 items-center justify-between border-b bg-background px-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="relative flex-shrink-0">
            <Avatar size="lg">
              <AvatarImage src={headerAvatar} alt={headerTitle} />
              <AvatarFallback>{(peerFallback || headerTitle).slice(0, 2)}</AvatarFallback>
            </Avatar>
            <Popover open={tagOpen} onOpenChange={setTagOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  className={`absolute -bottom-1 -right-1 h-6 w-6 rounded-full border-2 border-white p-0 shadow-sm ${currentTagColor} hover:opacity-80`}
                  title="Gắn tag"
                  type="button"
                >
                  <Tag className="h-3 w-3 text-white" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-3" align="start">
                <div className="space-y-2">
                  {TAG_TYPES.map((tag) => (
                    <button
                      key={tag.value}
                      type="button"
                      disabled={isLoadingTag}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-slate-100 disabled:opacity-50"
                      onClick={() => void handleSelectTag(tag.value, tag.label)}
                    >
                      <div className={`h-3 w-3 rounded-full ${tag.color}`} />
                      <span className="flex-1 text-slate-700">{tag.label}</span>
                      {currentTag === tag.value && (
                        <div className="h-2 w-2 rounded-full bg-slate-400" />
                      )}
                    </button>
                  ))}
                  <div className="border-t pt-2">
                    <button
                      type="button"
                      onClick={() => setTagManagementOpen(true)}
                      className="w-full px-3 py-2 text-center text-xs text-slate-500 hover:bg-slate-100 rounded-lg"
                    >
                      Quản lý thẻ phân loại
                    </button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold text-foreground">{headerTitle}</h2>
            <p className="text-xs text-green-600">Trực tuyến</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button variant="ghost" size="icon-sm" title="Tìm kiếm">
            <Search className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon-sm" title="Cuộc gọi thoại">
            <Phone className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon-sm" title="Cuộc gọi video">
            <Video className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-primary"
            title="Thông tin hội thoại"
          >
            <PanelRight className="h-5 w-5 text-blue-600" />
          </Button>
        </div>
      </div>

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
                  const showAvatar = !isMe && selectedConversation.type === "DOUBLE"
                  const firstAttachment = msg.attachments?.[0]

                  return (
                    <div
                      key={msg.idMessage}
                      className={cn("flex gap-2", isMe ? "justify-end" : "justify-start")}
                    >
                      {showAvatar && (
                        <Avatar size="sm" className="mb-1 self-end">
                          <AvatarImage src={headerAvatar} alt={headerTitle} />
                          <AvatarFallback>{headerTitle.slice(0, 2)}</AvatarFallback>
                        </Avatar>
                      )}
                      <div
                        className={cn(
                          "flex max-w-[70%] flex-col",
                          isMe ? "items-end" : "items-start",
                        )}
                      >
                        {msg.type === "TEXT" ? (
                          <div
                            className={cn(
                              "rounded-2xl px-4 py-2 text-sm",
                              isMe
                                ? "rounded-br-sm bg-primary/10 text-foreground"
                                : "rounded-bl-sm border bg-background text-foreground shadow-xs",
                            )}
                          >
                            {msg.content}
                          </div>
                        ) : firstAttachment?.type === "STICKER" ? (
                          <div className="rounded-2xl bg-amber-50 p-2 shadow-xs ring-1 ring-amber-200">
                            <img src={firstAttachment.url} alt="sticker" className="h-20 w-20 object-contain" />
                          </div>
                        ) : firstAttachment?.type === "GIF" ? (
                          <div className="overflow-hidden rounded-2xl border bg-background shadow-xs">
                            <img src={firstAttachment.url} alt="gif" className="max-h-52 w-56 object-cover" />
                          </div>
                        ) : (
                          <div className="rounded-2xl border bg-background px-4 py-2 text-sm text-muted-foreground">
                            {msg.content}
                          </div>
                        )}
                        <span className="mt-1 text-[11px] text-muted-foreground">
                          {formatChatMessageTime(msg.timeSent)}
                        </span>
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
            <strong className="text-foreground">{selectedMessageIds.size}</strong> Đã chọn
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
              disabled={!canForwardSelectedMessages || isRecallingSelectedMessages || isDeletingSelectedMessages}
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
                canRecallSelectedMessages && "border-red-200 bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700",
              )}
              disabled={!canRecallSelectedMessages || isRecallingSelectedMessages || isDeletingSelectedMessages}
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
              disabled={selectedMessages.length === 0 || isDeletingSelectedMessages || isRecallingSelectedMessages}
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
              disabled={isRecallingSelectedMessages || isDeletingSelectedMessages}
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
        {isBlocked ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-red-100">
                <svg
                  className="h-5 w-5 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-red-900">Bạn đã chặn người này</h3>
                <p className="text-xs text-red-700">
                  {relationshipTypes.includes("BLOCK_ALL")
                    ? "Bạn không thể xem tin nhắn, gọi điện hoặc nhìn thấy hoạt động của người này."
                    : "Bạn không thể gửi hoặc nhận tin nhắn từ người này."}
                </p>
                <button
                  onClick={() => void updateRelationship()}
                  className="mt-2 inline-flex items-center justify-center rounded-md bg-red-600 px-3 py-1 text-xs font-medium text-white hover:bg-red-700"
                >
                  Bỏ chặn
                </button>
              </div>
            </div>
          </div>
        ) : isBlockedByPeer ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-amber-100">
                <svg
                  className="h-5 w-5 text-amber-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-amber-900">Đã chặn tin nhắn</h3>
                <p className="text-xs text-amber-700">
                  Người này đã chặn bạn. Bạn không thể gửi tin nhắn cho họ.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <>
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
              <Button variant="ghost" size="icon-sm" title="Đính kèm tệp" type="button">
                <Paperclip className="h-5 w-5" />
              </Button>
            </div>

            <div className="flex items-end gap-2">
              <div className="flex flex-1 items-end rounded-lg border bg-background pr-1">
                <Textarea
                  ref={textareaRef}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
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
                <Popover open={emojiOpen} onOpenChange={setEmojiOpen}>
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
                          onClick={() => void sendEmoji(emoji)}
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
          </>
        )}
      </div>

      <TagManagementModal
        open={tagManagementOpen}
        onOpenChange={setTagManagementOpen}
        currentUserId={currentUserId ?? undefined}
      />
    </div>
  )
}
