import {
  Image as ImageIcon,
  PanelRight,
  Paperclip,
  Phone,
  Search,
  Send,
  Smile,
  Sticker,
  Video,
} from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { useChatPage } from "@/contexts/ChatPageContext"
import { useChatSocket } from "@/hooks/useChatSocket"
import { cn } from "@/lib/utils"
import { chatApiService } from "@/services/chat/chat-api.service"
import { chatSocketService } from "@/services/chat/chat-socket.service"
import type { ChatMessageResponse } from "@/types/chat"
import { displayNameFromProfile, formatChatMessageTime } from "@/utils/chat-display.util"

const MESSAGE_PAGE_SIZE = 30
const LOAD_MORE_THRESHOLD_PX = 80

export default function ChatWindow() {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
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
        const res = await chatApiService.listMessages(selectedConversationId, 1, MESSAGE_PAGE_SIZE)
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
      const res = await chatApiService.listMessages(selectedConversationId, nextPage, MESSAGE_PAGE_SIZE)
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

  useChatSocket({
    autoConnect: Boolean(selectedConversationId),
    conversationId: selectedConversationId ?? undefined,
    onMessage: (msg) => {
      if (msg.idConversation !== selectedIdRef.current) {
        return
      }
      setSocketExtras((prev) => {
        if (prev.some((x) => x.idMessage === msg.idMessage)) {
          return prev
        }
        pendingScrollToBottomRef.current = true
        return [...prev, msg]
      })
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

  const [draft, setDraft] = useState("")
  const [isSending, setIsSending] = useState(false)

  const handleInput = () => {
    const textarea = textareaRef.current
    if (!textarea) {
      return
    }

    textarea.style.height = "auto"
    textarea.style.height = `${textarea.scrollHeight}px`
  }

  const sendText = async () => {
    const text = draft.trim()
    if (!text || !selectedConversationId || !currentUserId) {
      return
    }

    setIsSending(true)
    try {
      const client = chatSocketService.getClient()
      if (client?.connected) {
        chatSocketService.sendMessage(selectedConversationId, text)
      } else {
        const res = await chatApiService.sendMessageRest(selectedConversationId, text)
        setSocketExtras((prev) => {
          if (prev.some((x) => x.idMessage === res.data.idMessage)) {
            return prev
          }
          return [...prev, res.data]
        })
        pendingScrollToBottomRef.current = true
      }
      setDraft("")
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto"
      }
    } catch {
      toast.error("Gửi tin nhắn thất bại")
    } finally {
      setIsSending(false)
    }
  }

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

      <div className="shrink-0 border-t bg-background p-3">
        <div className="mb-2 flex gap-1">
          <Button variant="ghost" size="icon-sm" title="Gửi sticker" type="button">
            <Sticker className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon-sm" title="Gửi ảnh" type="button">
            <ImageIcon className="h-5 w-5" />
          </Button>
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
            <Button
              variant="ghost"
              size="icon-sm"
              className="mb-1 ml-1"
              title="Biểu cảm"
              type="button"
            >
              <Smile className="h-5 w-5" />
            </Button>
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
    </div>
  )
}
