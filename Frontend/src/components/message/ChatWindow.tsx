import {
  Copy,
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
  Users,
  Video,
  X,
} from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"

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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { useChatPage } from "@/contexts/ChatPageContext"
import { useChatSocket } from "@/hooks/useChatSocket"
import { cn } from "@/lib/utils"
import { chatService } from "@/services/chat/chat.service"
import { chatSocketService } from "@/services/chat/chat-socket.service"
import { userService } from "@/services/user/user.service"
import type { ChatAttachment, ChatMessageResponse } from "@/types/chat"
import { displayNameFromProfile, formatChatMessageTime } from "@/utils/chat-display.util"

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

function messagePlainTextForCopy(msg: ChatMessageResponse): string {
  if (msg.recalled) {
    return msg.content ?? ""
  }
  if (msg.type === "TEXT") {
    return msg.content ?? ""
  }
  const a = msg.attachments?.[0]
  if (a?.type === "STICKER") {
    return "[Sticker]"
  }
  if (a?.type === "GIF") {
    return "[GIF]"
  }
  return msg.content ?? ""
}

export default function ChatWindow() {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const draftCaretRef = useRef({ start: 0, end: 0 })
  const bottomRef = useRef<HTMLDivElement>(null)
  const selectedIdRef = useRef<string | null>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const viewportRef = useRef<HTMLElement | null>(null)
  const prependAnchorRef = useRef<{ prevTop: number; prevHeight: number } | null>(null)
  const pendingScrollToBottomRef = useRef(false)

  const {
    selectedConversationId,
    selectedConversation,
    currentUserId,
    conversationTitle,
    conversationAvatar,
    selectedPeerProfile,
    setDetailsView,
    conversations,
  } = useChatPage()

  selectedIdRef.current = selectedConversationId

  const headerTitle = selectedConversation ? conversationTitle(selectedConversation) : ""
  const headerAvatar = selectedConversation ? conversationAvatar(selectedConversation) : undefined
  const peerFallback = displayNameFromProfile(selectedPeerProfile)

  const [apiMessages, setApiMessages] = useState<ChatMessageResponse[]>([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)

  const [socketExtras, setSocketExtras] = useState<ChatMessageResponse[]>([])
  const [senderProfiles, setSenderProfiles] = useState<Record<string, { displayName: string; avatar?: string }>>({})

  const [draft, setDraft] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [emojiOpen, setEmojiOpen] = useState(false)
  const [stickerOpen, setStickerOpen] = useState(false)
  const [gifOpen, setGifOpen] = useState(false)
  const [forwardTarget, setForwardTarget] = useState<ChatMessageResponse | null>(null)
  const [replyingTo, setReplyingTo] = useState<ChatMessageResponse | null>(null)
  const [multiSelectActive, setMultiSelectActive] = useState(false)
  const [selectedMessageIds, setSelectedMessageIds] = useState<Set<string>>(() => new Set())

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
  }, [])

  useChatSocket({
    autoConnect: Boolean(selectedConversationId),
    conversationId: selectedConversationId ?? undefined,
    onMessage: mergeIncomingOrUpdatedMessage,
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

  useEffect(() => {
    setMultiSelectActive(false)
    setSelectedMessageIds(new Set())
    setReplyingTo(null)
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
    await sendMessage(draft, "TEXT", undefined, replyingTo?.idMessage)
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
      <div className="flex h-full min-w-0 flex-1 flex-col items-center justify-center bg-muted/20 px-6 text-center">
        <p className="text-sm text-muted-foreground">
          Chọn một cuộc trò chuyện ở cột bên trái để xem tin nhắn, hoặc tìm người để bắt đầu nhắn tin.
        </p>
      </div>
    )
  }

  return (
    <div className="flex h-full min-w-0 flex-1 flex-col bg-muted/20">
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
                onClick={() => setDetailsView("group-members")}
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
            onClick={() => setDetailsView("main")}
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

                  const replyParent = msg.replyToMessageId
                    ? messageById.get(msg.replyToMessageId)
                    : undefined

                  return (
                    <div
                      key={msg.idMessage}
                      className={cn("flex gap-2", isMe ? "justify-end" : "justify-start")}
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
                                className={cn(
                                  "mb-1.5 max-w-full rounded-md border-l-2 border-primary/50 bg-black/[0.03] px-2 py-1 text-left text-xs text-muted-foreground dark:bg-white/5",
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
                                {msg.content}
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

                          {!msg.recalled && !multiSelectActive ? (
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
                                    onSelect={() => toast.info("Tính năng ghim tin đang được phát triển")}
                                  >
                                    <Pin className="size-4" />
                                    Ghim tin nhắn
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
    </div>
  )
}
