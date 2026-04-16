import {
  CalendarDays,
  ChevronDown,
  FileText,
  Image as ImageIcon,
  Link as LinkIcon,
  PlayCircle,
  Search,
  UserRound,
  X,
} from "lucide-react"
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react"
import { toast } from "sonner"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Spinner } from "@/components/ui/spinner"
import { useChatPage } from "@/contexts/ChatPageContext"
import { chatService } from "@/services/chat/chat.service"
import { fileService, type AttachmentResponse } from "@/services/file/file.service"
import { userService } from "@/services/user/user.service"
import type { ChatMessageResponse } from "@/types/chat"
import {
  getOriginalFileNameFromUrl,
  normalizeFileMessageContent,
  shortenFileNameForDisplay,
} from "@/utils/file-display.util"
import { getDomainFromUrl } from "@/utils/link-display.util"

const SEARCH_PAGE_SIZE = 12
const SEARCH_DEBOUNCE_MS = 500
const ATTACHMENT_PREVIEW_LIMIT = 8

type SenderOption = {
  id: string
  name: string
  avatar?: string
}

type SearchAttachments = {
  images: AttachmentResponse[]
  files: AttachmentResponse[]
  links: AttachmentResponse[]
}

const EMPTY_ATTACHMENTS: SearchAttachments = {
  images: [],
  files: [],
  links: [],
}

const toDisplayName = (profile: { firstName?: string; lastName?: string }, fallback: string): string => {
  const fullName = `${profile.lastName ?? ""} ${profile.firstName ?? ""}`.trim()
  return fullName || fallback
}

const formatFileBadge = (fileName: string): string => {
  const ext = fileName.split(".").pop()?.toUpperCase() ?? "FILE"
  if (ext === "DOC" || ext === "DOCX") {
    return "W"
  }
  if (ext === "XLS" || ext === "XLSX") {
    return "X"
  }
  if (ext === "PPT" || ext === "PPTX") {
    return "P"
  }
  return ext.slice(0, 3)
}

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

function messagePlainText(message: ChatMessageResponse): string {
  const normalizedContent = normalizeFileMessageContent(message.content)
  if (message.recalled) {
    return normalizedContent || "Tin nhắn đã thu hồi"
  }

  const attachment = message.attachments?.[0]
  if (attachment?.type === "IMAGE") {
    return normalizedContent || "[Ảnh]"
  }
  if (attachment?.type === "VIDEO") {
    return normalizedContent || "[Video]"
  }
  if (attachment?.type === "AUDIO") {
    return normalizedContent || "[Âm thanh]"
  }
  if (attachment?.type === "FILE") {
    return normalizedContent || "[File]"
  }
  if (attachment?.type === "LINK") {
    return attachment.url || normalizedContent || "[Link]"
  }
  if (attachment?.type === "GIF") {
    return "[GIF]"
  }
  if (attachment?.type === "STICKER") {
    return "[Sticker]"
  }

  return normalizedContent
}

function toTimestamp(value: string | undefined): number {
  if (!value) {
    return 0
  }
  const timestamp = new Date(value).getTime()
  return Number.isNaN(timestamp) ? 0 : timestamp
}

function formatSearchResultTime(iso?: string | null): string {
  if (!iso) {
    return "--"
  }

  try {
    const date = new Date(iso)
    if (Number.isNaN(date.getTime())) {
      return "--"
    }

    const now = Date.now()
    const diffMs = Math.max(0, now - date.getTime())
    const minute = 60 * 1000
    const hour = 60 * minute
    const day = 24 * hour

    if (diffMs < hour) {
      const mins = Math.max(1, Math.floor(diffMs / minute))
      return `${mins} phút`
    }

    if (diffMs < day) {
      const hours = Math.max(1, Math.floor(diffMs / hour))
      return `${hours} giờ`
    }

    if (diffMs < 7 * day) {
      const days = Math.max(1, Math.floor(diffMs / day))
      return `${days} ngày`
    }

    return date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })
  } catch {
    return "--"
  }
}

function shouldHideAttachmentPlaceholderMessage(message: ChatMessageResponse): boolean {
  if (!message.attachments || message.attachments.length === 0) {
    return false
  }

  const hasNonLinkAttachment = message.attachments.some((attachment) => attachment.type !== "LINK")
  if (!hasNonLinkAttachment) {
    return false
  }

  const normalizedContent = normalizeFileMessageContent(message.content).trim()
  if (!normalizedContent) {
    return true
  }

  return /^(?:Đã gửi (?:hình ảnh|video|file|file âm thanh|gif|sticker)|\[(?:Ảnh|Video|File|Âm thanh|GIF|Sticker)\])(?:\s*:.*)?$/i.test(
    normalizedContent,
  )
}

function normalizeKeyword(value: string): string {
  return value.trim().toLowerCase()
}

function stripQueryAndFragment(url: string): string {
  return url.split("?")[0].split("#")[0]
}

function matchesAttachmentKeyword(attachment: AttachmentResponse, rawKeyword: string): boolean {
  const keyword = normalizeKeyword(rawKeyword)
  if (!keyword) {
    return true
  }

  const originalFileName = (attachment.fileName || getOriginalFileNameFromUrl(attachment.url)).toLowerCase()
  const normalizedSize = (attachment.size ?? "").toLowerCase()

  if (attachment.type === "LINK") {
    const urlWithoutQuery = stripQueryAndFragment(attachment.url).toLowerCase()
    const domain = getDomainFromUrl(attachment.url).toLowerCase()
    return urlWithoutQuery.includes(keyword) || domain.includes(keyword)
  }

  return originalFileName.includes(keyword) || normalizedSize.includes(keyword)
}

export default function ChatSearchSidebar() {
  const {
    selectedConversationId,
    selectedConversation,
    currentUserId,
    setDetailsView,
    requestMessageFocus,
  } = useChatPage()

  const [keyword, setKeyword] = useState("")
  const [keywordDebounced, setKeywordDebounced] = useState("")
  const [searchSenderId, setSearchSenderId] = useState("")
  const [searchFromDate, setSearchFromDate] = useState("")
  const [searchToDate, setSearchToDate] = useState("")
  const [isSenderPopoverOpen, setIsSenderPopoverOpen] = useState(false)
  const [isDatePopoverOpen, setIsDatePopoverOpen] = useState(false)

  const [senderProfiles, setSenderProfiles] = useState<Record<string, { displayName: string; avatar?: string }>>({})
  const [loadingSenderProfiles, setLoadingSenderProfiles] = useState(false)

  const [messageResults, setMessageResults] = useState<ChatMessageResponse[]>([])
  const [messagePage, setMessagePage] = useState(1)
  const [messageHasMore, setMessageHasMore] = useState(false)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [loadingMoreMessages, setLoadingMoreMessages] = useState(false)

  const [attachments, setAttachments] = useState<SearchAttachments>(EMPTY_ATTACHMENTS)
  const [loadingAttachments, setLoadingAttachments] = useState(false)
  const [failedPreviewAttachmentIds, setFailedPreviewAttachmentIds] = useState<Set<string>>(() => new Set())

  const participantIds = useMemo(() => {
    const ids = (selectedConversation?.participantInfos ?? [])
      .map((participant) => participant.idAccount)
      .filter((id): id is string => !!id)

    return Array.from(new Set(ids))
  }, [selectedConversation?.idConversation, selectedConversation?.participantInfos])

  const senderOptions = useMemo<SenderOption[]>(() => {
    if (!selectedConversation) {
      return []
    }

    return participantIds
      .map((id) => {
        if (id === currentUserId) {
          return { id, name: "Bạn" }
        }

        return {
          id,
          name: senderProfiles[id]?.displayName ?? id,
          avatar: senderProfiles[id]?.avatar,
        }
      })
      .sort((a, b) => a.name.localeCompare(b.name, "vi"))
  }, [currentUserId, participantIds, selectedConversation, senderProfiles])

  const selectedSenderLabel = useMemo(() => {
    if (!searchSenderId) {
      return "Người gửi"
    }

    return senderOptions.find((option) => option.id === searchSenderId)?.name ?? "Người gửi"
  }, [searchSenderId, senderOptions])

  const matchesSearchFilters = useCallback(
    (message: ChatMessageResponse) => {
      if (searchSenderId && message.idAccountSent !== searchSenderId) {
        return false
      }

      const sentAt = toTimestamp(message.timeSent)
      if (sentAt === 0) {
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
    [searchFromDate, searchSenderId, searchToDate],
  )

  const fetchMessages = useCallback(
    async (targetPage: number, append: boolean) => {
      if (!selectedConversationId || !keywordDebounced) {
        setMessageResults([])
        setMessagePage(1)
        setMessageHasMore(false)
        setLoadingMessages(false)
        setLoadingMoreMessages(false)
        return
      }

      if (append) {
        setLoadingMoreMessages(true)
      } else {
        setLoadingMessages(true)
      }

      try {
        const response = await chatService.searchMessages(
          selectedConversationId,
          keywordDebounced,
          targetPage,
          SEARCH_PAGE_SIZE,
        )
        const rawItems = response.data.items ?? []
        const filteredItems = rawItems
          .filter(matchesSearchFilters)
          .filter((message) => !shouldHideAttachmentPlaceholderMessage(message))

        setMessageResults((prev) => {
          if (!append) {
            return filteredItems
          }

          const existingIds = new Set(prev.map((item) => item.idMessage))
          const nextItems = filteredItems.filter((item) => !existingIds.has(item.idMessage))
          return [...prev, ...nextItems]
        })

        const currentPage = response.data.page ?? targetPage
        const totalPage = response.data.totalPage ?? targetPage
        setMessagePage(targetPage)
        setMessageHasMore(currentPage < totalPage)
      } catch {
        if (!append) {
          toast.error("Không tìm kiếm được tin nhắn")
        }
      } finally {
        setLoadingMessages(false)
        setLoadingMoreMessages(false)
      }
    },
    [keywordDebounced, matchesSearchFilters, selectedConversationId],
  )

  const loadMoreMessages = useCallback(() => {
    if (!keywordDebounced || !messageHasMore || loadingMessages || loadingMoreMessages) {
      return
    }
    void fetchMessages(messagePage + 1, true)
  }, [fetchMessages, keywordDebounced, loadingMessages, loadingMoreMessages, messageHasMore, messagePage])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setKeywordDebounced(keyword.trim())
    }, SEARCH_DEBOUNCE_MS)

    return () => {
      window.clearTimeout(timer)
    }
  }, [keyword])

  useEffect(() => {
    setKeyword("")
    setKeywordDebounced("")
    setSearchSenderId("")
    setSearchFromDate("")
    setSearchToDate("")
    setIsSenderPopoverOpen(false)
    setIsDatePopoverOpen(false)
    setMessageResults([])
    setMessagePage(1)
    setMessageHasMore(false)
    setAttachments(EMPTY_ATTACHMENTS)
  }, [selectedConversationId])

  useEffect(() => {
    if (!selectedConversationId || participantIds.length === 0) {
      setSenderProfiles({})
      return
    }

    let cancelled = false
    setLoadingSenderProfiles(true)

    void Promise.all(
      participantIds.map(async (identityUserId) => {
        try {
          const response = await userService.getProfileByIdentityUserId(identityUserId)
          const profile = response.data
          return [
            identityUserId,
            {
              displayName: toDisplayName(profile, identityUserId === currentUserId ? "Bạn" : identityUserId),
              avatar: profile.avatar ?? undefined,
            },
          ] as const
        } catch {
          return [
            identityUserId,
            {
              displayName: identityUserId === currentUserId ? "Bạn" : identityUserId,
            },
          ] as const
        }
      }),
    )
      .then((entries) => {
        if (cancelled) {
          return
        }
        setSenderProfiles(Object.fromEntries(entries))
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingSenderProfiles(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [currentUserId, participantIds, selectedConversationId])

  useEffect(() => {
    void fetchMessages(1, false)
  }, [fetchMessages, searchFromDate, searchSenderId, searchToDate])

  useEffect(() => {
    if (!selectedConversationId || !keywordDebounced) {
      setAttachments(EMPTY_ATTACHMENTS)
      setFailedPreviewAttachmentIds(new Set())
      setLoadingAttachments(false)
      return
    }

    let cancelled = false
    setLoadingAttachments(true)

    void Promise.all([
      fileService.getAttachments(selectedConversationId, {
        type: "images",
        search: keywordDebounced || undefined,
        senderId: searchSenderId || undefined,
        fromDate: searchFromDate || undefined,
        toDate: searchToDate || undefined,
      }),
      fileService.getAttachments(selectedConversationId, {
        type: "files",
        search: keywordDebounced || undefined,
        senderId: searchSenderId || undefined,
        fromDate: searchFromDate || undefined,
        toDate: searchToDate || undefined,
      }),
      fileService.getAttachments(selectedConversationId, {
        type: "links",
        search: keywordDebounced || undefined,
        senderId: searchSenderId || undefined,
        fromDate: searchFromDate || undefined,
        toDate: searchToDate || undefined,
      }),
    ])
      .then(([imagesRes, filesRes, linksRes]) => {
        if (cancelled) {
          return
        }

        const sortByLatest = (items: AttachmentResponse[]) => {
          return items
            .filter((item) => matchesAttachmentKeyword(item, keywordDebounced))
            .slice()
            .sort((a, b) => toTimestamp(b.timeSent ?? b.timeUpload) - toTimestamp(a.timeSent ?? a.timeUpload))
            .slice(0, ATTACHMENT_PREVIEW_LIMIT)
        }

        setAttachments({
          images: sortByLatest(imagesRes.data ?? []),
          files: sortByLatest(filesRes.data ?? []),
          links: sortByLatest(linksRes.data ?? []),
        })
        setFailedPreviewAttachmentIds(new Set())
      })
      .catch(() => {
        if (!cancelled) {
          setAttachments(EMPTY_ATTACHMENTS)
          setFailedPreviewAttachmentIds(new Set())
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingAttachments(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [keywordDebounced, searchFromDate, searchSenderId, searchToDate, selectedConversationId])

  const hasAttachmentResults =
    attachments.images.length > 0 || attachments.files.length > 0 || attachments.links.length > 0
  const hasMessageResults = messageResults.length > 0
  const hasAnyResults = hasMessageResults || hasAttachmentResults
  const showEmptyState = !keywordDebounced
  const showNoResultState = keywordDebounced && !loadingMessages && !loadingAttachments && !hasAnyResults

  return (
    <div className="flex h-full w-full max-w-[340px] shrink-0 flex-col border-l bg-background">
      <div className="shrink-0 border-b bg-background px-4 pb-3 pt-3">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">Tìm kiếm trong trò chuyện</h3>
          <Button
            variant="ghost"
            size="icon-sm"
            className="rounded-full text-muted-foreground hover:text-foreground"
            onClick={() => setDetailsView("main")}
            title="Đóng tìm kiếm"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <Input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="Nhập từ khóa để tìm kiếm"
            className="h-10 rounded-md border-border bg-background pl-9 pr-12 shadow-none"
          />
          {keyword ? (
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground hover:text-foreground"
              onClick={() => setKeyword("")}
            >
              Xóa
            </button>
          ) : null}
        </div>

        <div className="mt-2.5 flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Lọc theo:</span>
          <Popover open={isSenderPopoverOpen} onOpenChange={setIsSenderPopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="h-8 rounded-md border-border bg-muted/40 px-2 text-foreground hover:bg-muted"
              >
                <UserRound className="mr-1.5 h-3.5 w-3.5" />
                <span className="max-w-[98px] truncate text-sm">{selectedSenderLabel}</span>
                <ChevronDown className="ml-1 h-3.5 w-3.5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-2" align="start">
              <button
                type="button"
                className="flex w-full items-center rounded-md px-2 py-2 text-left text-sm hover:bg-muted"
                onClick={() => {
                  setSearchSenderId("")
                  setIsSenderPopoverOpen(false)
                }}
              >
                Tất cả
              </button>
              <div className="max-h-56 space-y-0.5 overflow-y-auto">
                {loadingSenderProfiles ? (
                  <div className="flex justify-center py-3">
                    <Spinner className="size-4 text-muted-foreground" />
                  </div>
                ) : null}
                {senderOptions.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-muted"
                    onClick={() => {
                      setSearchSenderId(option.id)
                      setIsSenderPopoverOpen(false)
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

          <Popover open={isDatePopoverOpen} onOpenChange={setIsDatePopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="h-8 rounded-md border-border bg-muted/40 px-2 text-foreground hover:bg-muted"
              >
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
                  <Input
                    type="date"
                    value={searchFromDate}
                    onChange={(event) => setSearchFromDate(event.target.value)}
                  />
                  <Input
                    type="date"
                    value={searchToDate}
                    onChange={(event) => setSearchToDate(event.target.value)}
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
        {showEmptyState ? (
          <div className="flex min-h-[420px] flex-col items-center justify-center px-6 text-center">
            <div className="mb-5 flex h-28 w-28 items-center justify-center rounded-full bg-primary/10">
              <Search className="h-12 w-12 text-primary/70" />
            </div>
            <p className="max-w-[260px] text-sm leading-6 text-muted-foreground">
              Hãy nhập từ khóa để bắt đầu tìm kiếm tin nhắn và file trong trò chuyện
            </p>
          </div>
        ) : (
          <>
            <div className="px-4 pb-2 pt-3">
              <p className="text-2xl font-semibold text-foreground">Tin nhắn</p>

              {loadingMessages && !hasMessageResults ? (
                <div className="flex justify-center py-4">
                  <Spinner className="size-5 text-muted-foreground" />
                </div>
              ) : null}

              {hasMessageResults ? (
                <div className="mt-2 space-y-0 border-b border-border/80">
                  {messageResults.map((message) => {
                    const sender = senderOptions.find((option) => option.id === message.idAccountSent)
                    const senderName = sender?.name ?? message.idAccountSent
                    const senderAvatar = sender?.avatar
                    const plainText = messagePlainText(message)
                    const messageTime = formatSearchResultTime(message.timeSent)

                    return (
                      <button
                        key={message.idMessage}
                        type="button"
                        className="w-full border-t border-border/80 px-1 py-2.5 text-left hover:bg-muted/50"
                        onClick={() => requestMessageFocus(message.idMessage)}
                      >
                        <div className="flex items-start gap-2.5">
                          <Avatar size="default" className="shrink-0">
                            <AvatarImage src={senderAvatar} alt={senderName} />
                            <AvatarFallback>{senderName.slice(0, 2)}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <p className="truncate text-sm font-medium text-muted-foreground">{senderName}</p>
                              <span className="w-14 shrink-0 text-right text-xs text-muted-foreground">{messageTime}</span>
                            </div>
                            <p className="mt-0.5 line-clamp-2 text-sm text-foreground">
                              {renderHighlightedSearchText(plainText, keywordDebounced)}
                            </p>
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              ) : null}

              {messageHasMore ? (
                <Button
                  type="button"
                  variant="outline"
                  className="mt-2 h-8 w-full border-border bg-muted/30 text-sm font-semibold text-foreground hover:bg-muted/70"
                  disabled={loadingMoreMessages}
                  onClick={loadMoreMessages}
                >
                  <span>{loadingMoreMessages ? "Đang tải..." : "Xem thêm"}</span>
                </Button>
              ) : null}
            </div>

            <Separator className="bg-border" />

            <div className="px-4 py-3">
              <p className="text-2xl font-semibold text-foreground">Đính kèm</p>

              {loadingAttachments && !hasAttachmentResults ? (
                <div className="flex justify-center py-4">
                  <Spinner className="size-5 text-muted-foreground" />
                </div>
              ) : null}

              {attachments.files.length > 0 ? (
                <div className="mt-3 space-y-1.5">
                  <p className="text-lg font-semibold text-foreground">File</p>
                  {attachments.files.map((file) => {
                    const fileName = file.fileName || getOriginalFileNameFromUrl(file.url)
                    const displayFileName = shortenFileNameForDisplay(fileName, 30)
                    const senderName =
                      senderOptions.find((option) => option.id === file.senderId)?.name ?? file.senderId ?? "Người gửi"
                    const fileTime = formatSearchResultTime(file.timeSent ?? file.timeUpload)

                    return (
                      <button
                        key={file.idAttachment}
                        type="button"
                        className="flex w-full items-start gap-2.5 rounded-md px-1 py-1.5 text-left hover:bg-muted/50"
                        onClick={() => requestMessageFocus(file.messageId)}
                      >
                        <div className="flex h-11 w-10 shrink-0 items-center justify-center rounded-md bg-blue-500 text-xs font-semibold text-white">
                          {formatFileBadge(fileName)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-base font-medium text-foreground">
                            {renderHighlightedSearchText(displayFileName, keywordDebounced)}
                          </p>
                          <p className="truncate text-sm text-muted-foreground">
                            {file.size || "Unknown size"} - {senderName}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center text-xs text-muted-foreground">
                          <FileText className="mr-1 h-3.5 w-3.5" />
                          {fileTime}
                        </div>
                      </button>
                    )
                  })}
                </div>
              ) : null}

              {attachments.images.length > 0 ? (
                <div className="mt-3">
                  <p className="mb-1 text-lg font-semibold text-foreground">Ảnh/Video</p>
                  <div className="grid grid-cols-2 gap-2">
                    {attachments.images.map((item) => (
                      <button
                        key={item.idAttachment}
                        type="button"
                        className="group relative overflow-hidden rounded-md border border-border bg-background"
                        onClick={() => requestMessageFocus(item.messageId)}
                        title="Đi đến tin nhắn"
                      >
                        {item.type === "VIDEO" && !failedPreviewAttachmentIds.has(item.idAttachment) ? (
                          <video
                            src={item.url}
                            muted
                            playsInline
                            preload="metadata"
                            className="h-20 w-full object-cover"
                            onError={() => {
                              setFailedPreviewAttachmentIds((prev) => {
                                if (prev.has(item.idAttachment)) {
                                  return prev
                                }
                                const next = new Set(prev)
                                next.add(item.idAttachment)
                                return next
                              })
                            }}
                          />
                        ) : failedPreviewAttachmentIds.has(item.idAttachment) ? (
                          <div className="flex h-20 w-full items-center justify-center bg-muted text-muted-foreground">
                            {item.type === "VIDEO" ? <PlayCircle className="h-6 w-6" /> : <ImageIcon className="h-6 w-6" />}
                          </div>
                        ) : (
                          <img
                            src={item.url}
                            alt="attachment"
                            className="h-20 w-full object-cover"
                            onError={() => {
                              setFailedPreviewAttachmentIds((prev) => {
                                if (prev.has(item.idAttachment)) {
                                  return prev
                                }
                                const next = new Set(prev)
                                next.add(item.idAttachment)
                                return next
                              })
                            }}
                          />
                        )}
                        <span className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-center bg-black/55 py-0.5 text-[11px] text-white opacity-0 transition-opacity group-hover:opacity-100">
                          <ImageIcon className="mr-1 h-3 w-3" />
                          Xem tin nhắn
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {attachments.links.length > 0 ? (
                <div className="mt-3 space-y-1.5">
                  <p className="text-lg font-semibold text-foreground">Link</p>
                  {attachments.links.map((item) => {
                    const domain = getDomainFromUrl(item.url)
                    const linkTime = formatSearchResultTime(item.timeSent ?? item.timeUpload)

                    return (
                      <button
                        key={item.idAttachment}
                        type="button"
                        className="flex w-full items-start gap-2.5 rounded-md px-1 py-1.5 text-left hover:bg-muted/50"
                        onClick={() => requestMessageFocus(item.messageId)}
                      >
                        <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                          <LinkIcon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-base font-medium text-foreground">
                            {renderHighlightedSearchText(item.url, keywordDebounced)}
                          </p>
                          <p className="truncate text-sm text-muted-foreground">{domain}</p>
                        </div>
                        <span className="shrink-0 text-xs text-muted-foreground">{linkTime}</span>
                      </button>
                    )
                  })}
                </div>
              ) : null}

              {showNoResultState ? (
                <p className="mt-3 text-center text-sm text-muted-foreground">Không có kết quả phù hợp.</p>
              ) : null}
            </div>
          </>
        )}
      </ScrollArea>
    </div>
  )
}
