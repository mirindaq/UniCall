import {
  CalendarIcon,
  ChevronDown,
  Link as LinkIcon,
  Search,
} from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Spinner } from "@/components/ui/spinner"
import { useChatPage } from "@/contexts/ChatPageContext"
import { chatService } from "@/services/chat/chat.service"
import { fileService } from "@/services/file/file.service"
import { userService } from "@/services/user/user.service"
import { formatChatSidebarTime } from "@/utils/chat-display.util"
import { extractUrlsFromText, getDomainFromUrl } from "@/utils/link-display.util"

type LinkItem = {
  id: string
  title: string
  url: string
  domain: string
  timeSent: string
}

const LINK_PAGE_LIMIT = 100
const LINK_MAX_PAGES = 8
const SEARCH_DEBOUNCE_MS = 1000

type SenderProfile = {
  displayName: string
  avatar?: string
}

type SenderOption = {
  id: string
  name: string
  avatar?: string
}

const toDisplayName = (profile: { firstName?: string; lastName?: string }, fallback: string): string => {
  const fullName = `${profile.lastName ?? ""} ${profile.firstName ?? ""}`.trim()
  return fullName || fallback
}

const formatDateInputValue = (date: Date): string => {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, "0")
  const day = `${date.getDate()}`.padStart(2, "0")
  return `${year}-${month}-${day}`
}

const isWithinDateRange = (value: string, fromDate: string, toDate: string): boolean => {
  const timestamp = new Date(value).getTime()
  if (Number.isNaN(timestamp)) {
    return true
  }

  if (fromDate) {
    const from = new Date(fromDate)
    from.setHours(0, 0, 0, 0)
    if (timestamp < from.getTime()) {
      return false
    }
  }

  if (toDate) {
    const to = new Date(toDate)
    to.setHours(23, 59, 59, 999)
    if (timestamp > to.getTime()) {
      return false
    }
  }

  return true
}

export default function StorageLinks() {
  const { selectedConversationId, selectedConversation, currentUserId } = useChatPage()
  const [loadingLinks, setLoadingLinks] = useState(false)
  const [loadingSenders, setLoadingSenders] = useState(false)
  const [senderProfiles, setSenderProfiles] = useState<Record<string, SenderProfile>>({})

  const [searchKeyword, setSearchKeyword] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [senderSearch, setSenderSearch] = useState("")
  const [selectedSenderId, setSelectedSenderId] = useState("")
  const [fromDate, setFromDate] = useState("")
  const [toDate, setToDate] = useState("")
  const [links, setLinks] = useState<LinkItem[]>([])
  const [senderPopoverOpen, setSenderPopoverOpen] = useState(false)

  const participantIds = useMemo(() => {
    const ids = (selectedConversation?.participantInfos ?? [])
      .map((participant) => participant.idAccount)
      .filter((id): id is string => !!id)
    return Array.from(new Set(ids))
  }, [selectedConversation?.idConversation, selectedConversation?.participantInfos])

  const senderOptions = useMemo<SenderOption[]>(() => {
    return participantIds
      .map((id) => ({
        id,
        name: senderProfiles[id]?.displayName ?? (id === currentUserId ? "Bạn" : id),
        avatar: senderProfiles[id]?.avatar,
      }))
      .sort((a, b) => a.name.localeCompare(b.name, "vi"))
  }, [participantIds, senderProfiles, currentUserId])

  const selectedSenderLabel = useMemo(() => {
    if (!selectedSenderId) {
      return "Người gửi"
    }
    return senderOptions.find((option) => option.id === selectedSenderId)?.name ?? "Người gửi"
  }, [selectedSenderId, senderOptions])

  const filteredSenderOptions = useMemo(() => {
    const keyword = senderSearch.trim().toLowerCase()
    if (!keyword) {
      return senderOptions
    }
    return senderOptions.filter((option) => option.name.toLowerCase().includes(keyword))
  }, [senderOptions, senderSearch])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(searchKeyword.trim())
    }, SEARCH_DEBOUNCE_MS)

    return () => {
      window.clearTimeout(timer)
    }
  }, [searchKeyword])

  useEffect(() => {
    setSearchKeyword("")
    setDebouncedSearch("")
    setSenderSearch("")
    setSelectedSenderId("")
    setFromDate("")
    setToDate("")
    setSenderPopoverOpen(false)
  }, [selectedConversationId])

  useEffect(() => {
    if (!selectedConversationId || participantIds.length === 0) {
      setSenderProfiles({})
      return
    }

    let cancelled = false

    const loadSenderOptions = async () => {
      setLoadingSenders(true)
      try {
        const senderProfileMap: Record<string, SenderProfile> = {}
        await Promise.all(
          participantIds.map(async (senderId) => {
            try {
              const profileRes = await userService.getProfileByIdentityUserId(senderId)
              const profile = profileRes.data
              senderProfileMap[senderId] = {
                displayName: toDisplayName(profile, senderId === currentUserId ? "Bạn" : senderId),
                avatar: profile.avatar ?? undefined,
              }
            } catch {
              senderProfileMap[senderId] = {
                displayName: senderId === currentUserId ? "Bạn" : senderId,
              }
            }
          }),
        )

        if (!cancelled) {
          setSenderProfiles(senderProfileMap)
        }
      } catch (error) {
        console.error("Failed to load sender options", error)
      } finally {
        if (!cancelled) {
          setLoadingSenders(false)
        }
      }
    }

    void loadSenderOptions()
    return () => {
      cancelled = true
    }
  }, [selectedConversationId, participantIds, currentUserId])

  useEffect(() => {
    if (!selectedConversationId) {
      setLinks([])
      return
    }

    let cancelled = false

    const loadLinks = async () => {
      setLoadingLinks(true)
      try {
        const linksRes = await fileService.getAttachments(selectedConversationId, {
          type: "links",
          senderId: selectedSenderId || undefined,
          fromDate: fromDate || undefined,
          toDate: toDate || undefined,
          search: debouncedSearch || undefined,
        })
        const linkAttachments = (linksRes.data ?? [])
          .filter((attachment) => attachment.type === "LINK" && !!attachment.url)
          .map((attachment) => ({
            id: attachment.idAttachment,
            title: attachment.url,
            url: attachment.url,
            domain: getDomainFromUrl(attachment.url),
            timeSent: attachment.timeSent ?? attachment.timeUpload,
          }))

        if (linkAttachments.length > 0) {
          if (cancelled) {
            return
          }
          linkAttachments.sort((a, b) => new Date(b.timeSent).getTime() - new Date(a.timeSent).getTime())
          setLinks(linkAttachments)
          return
        }

        const collected: LinkItem[] = []
        let page = 1
        let totalPage = 1

        do {
          const response = await chatService.listMessages(selectedConversationId, page, LINK_PAGE_LIMIT)
          const paged = response.data
          const items = paged.items ?? []
          totalPage = paged.totalPage ?? page

          for (const message of items) {
            if (message.recalled) {
              continue
            }

            if (selectedSenderId && message.idAccountSent !== selectedSenderId) {
              continue
            }

            if (!isWithinDateRange(message.timeSent, fromDate, toDate)) {
              continue
            }

            const urls = extractUrlsFromText(message.content)
            urls.forEach((url, index) => {
              collected.push({
                id: `${message.idMessage}-${index}`,
                title: url,
                url,
                domain: getDomainFromUrl(url),
                timeSent: message.timeSent,
              })
            })
          }

          page += 1
        } while (page <= totalPage && page <= LINK_MAX_PAGES)

        if (debouncedSearch) {
          const normalized = debouncedSearch.toLowerCase()
          const filtered = collected.filter((item) =>
            item.url.toLowerCase().includes(normalized) || item.domain.toLowerCase().includes(normalized),
          )
          collected.splice(0, collected.length, ...filtered)
        }

        if (cancelled) {
          return
        }

        collected.sort((a, b) => new Date(b.timeSent).getTime() - new Date(a.timeSent).getTime())
        setLinks(collected)
      } catch (error) {
        console.error("Failed to load links", error)
        if (!cancelled) {
          toast.error("Không thể tải link")
        }
      } finally {
        if (!cancelled) {
          setLoadingLinks(false)
        }
      }
    }

    void loadLinks()
    return () => {
      cancelled = true
    }
  }, [selectedConversationId, debouncedSearch, selectedSenderId, fromDate, toDate])

  const applyRecentDays = (days: number) => {
    const end = new Date()
    const start = new Date()
    start.setDate(end.getDate() - (days - 1))
    setFromDate(formatDateInputValue(start))
    setToDate(formatDateInputValue(end))
  }

  const clearDateFilter = () => {
    setFromDate("")
    setToDate("")
  }

  if (loadingLinks && links.length === 0) {
    return (
      <div className="flex justify-center py-10">
        <Spinner className="size-6 text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex w-full min-w-0 flex-col overflow-x-hidden">
      <div className="p-3 pb-2">
        <div className="relative mb-3 flex items-center">
          <Search className="absolute left-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tìm kiếm link"
            className="rounded-full pl-9"
            value={searchKeyword}
            onChange={(event) => setSearchKeyword(event.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Popover open={senderPopoverOpen} onOpenChange={setSenderPopoverOpen}>
            <PopoverTrigger asChild>
              <Button variant="secondary" className="h-8 flex-1 justify-between rounded-full">
                <span className="truncate">{selectedSenderLabel}</span>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[280px] rounded-xl p-2" align="start">
              <div className="relative mb-2 flex items-center">
                <Search className="absolute left-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Tìm kiếm"
                  className="h-9 rounded-full border-none bg-muted pl-9"
                  value={senderSearch}
                  onChange={(event) => setSenderSearch(event.target.value)}
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedSenderId("")
                  setSenderPopoverOpen(false)
                }}
                className="mb-1 flex w-full items-center rounded-md px-2 py-2 text-left text-sm hover:bg-muted"
              >
                Tất cả
              </button>
              <div className="max-h-52 space-y-0.5 overflow-y-auto">
                {loadingSenders ? (
                  <div className="flex justify-center py-3">
                    <Spinner className="size-4 text-muted-foreground" />
                  </div>
                ) : null}
                {filteredSenderOptions.map((sender) => (
                  <button
                    key={sender.id}
                    type="button"
                    onClick={() => {
                      setSelectedSenderId(sender.id)
                      setSenderPopoverOpen(false)
                    }}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-muted"
                  >
                    <Avatar size="sm">
                      <AvatarImage src={sender.avatar} alt={sender.name} />
                      <AvatarFallback>{sender.name.slice(0, 2)}</AvatarFallback>
                    </Avatar>
                    <span className="truncate">{sender.name}</span>
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="secondary" className="h-8 flex-1 justify-between rounded-full">
                <span className="truncate">{fromDate || toDate ? "Đang lọc ngày" : "Ngày gửi"}</span>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[320px] rounded-xl p-0" align="start">
              <div className="border-b px-4 py-3">
                <p className="text-sm font-medium">Gợi ý thời gian</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => applyRecentDays(7)}>
                    7 ngày
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => applyRecentDays(30)}>
                    30 ngày
                  </Button>
                </div>
              </div>
              <div className="px-4 py-3">
                <p className="mb-2 text-sm font-medium">Chọn khoảng thời gian</p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="relative">
                    <Input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} />
                    <CalendarIcon className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  </div>
                  <div className="relative">
                    <Input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} />
                    <CalendarIcon className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  </div>
                </div>
                <div className="mt-2 flex justify-end">
                  <Button type="button" variant="ghost" size="sm" onClick={clearDateFilter}>
                    Xóa lọc
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {links.length === 0 ? (
        <div className="py-10 text-center text-sm text-muted-foreground">
          {searchKeyword.trim() ? "Không tìm thấy link" : "Chưa có link nào được chia sẻ trong hội thoại này"}
        </div>
      ) : (
        links.map((link) => (
          <a
            key={link.id}
            href={link.url}
            target="_blank"
            rel="noreferrer noopener"
            className="mt-2 flex min-w-0 items-center gap-3 rounded px-3 py-2 hover:bg-muted/50"
            title={link.url}
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
                <LinkIcon className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-foreground">{link.title}</p>
              <p className="truncate text-xs text-muted-foreground">{link.domain}</p>
            </div>
            <span className="ml-2 shrink-0 text-xs text-muted-foreground">
              {formatChatSidebarTime(link.timeSent)}
            </span>
          </a>
        ))
      )}
    </div>
  )
}
