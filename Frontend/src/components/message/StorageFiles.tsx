import { CalendarIcon, ChevronDown, Download, Search } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Spinner } from "@/components/ui/spinner"
import { useChatPage } from "@/contexts/ChatPageContext"
import {
  fileService,
  type AttachmentResponse,
} from "@/services/file/file.service"
import { userService } from "@/services/user/user.service"
import { getOriginalFileNameFromUrl } from "@/utils/file-display.util"

type SenderProfile = {
  displayName: string
  avatar?: string
}

type SenderOption = {
  id: string
  name: string
  avatar?: string
}

type FileTypeFilter = "all" | "pdf" | "word" | "powerpoint" | "excel"

const FILE_TYPE_OPTIONS: Array<{
  value: FileTypeFilter
  label: string
  badge: string
}> = [
  { value: "all", label: "Tất cả", badge: "*" },
  { value: "pdf", label: "PDF", badge: "PDF" },
  { value: "word", label: "Word", badge: "W" },
  { value: "powerpoint", label: "PowerPoint", badge: "P" },
  { value: "excel", label: "Excel", badge: "X" },
]
const SEARCH_DEBOUNCE_MS = 1000

const toDisplayName = (
  profile: { firstName?: string; lastName?: string },
  fallback: string
): string => {
  const fullName = `${profile.lastName ?? ""} ${profile.firstName ?? ""}`.trim()
  return fullName || fallback
}

const formatDateInputValue = (date: Date): string => {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, "0")
  const day = `${date.getDate()}`.padStart(2, "0")
  return `${year}-${month}-${day}`
}

const matchesFileTypeFilter = (url: string, type: FileTypeFilter): boolean => {
  if (type === "all") {
    return true
  }

  const fileName = getOriginalFileNameFromUrl(url).toLowerCase()
  if (type === "pdf") {
    return fileName.endsWith(".pdf")
  }
  if (type === "word") {
    return fileName.endsWith(".doc") || fileName.endsWith(".docx")
  }
  if (type === "powerpoint") {
    return fileName.endsWith(".ppt") || fileName.endsWith(".pptx")
  }
  if (type === "excel") {
    return (
      fileName.endsWith(".xls") ||
      fileName.endsWith(".xlsx") ||
      fileName.endsWith(".csv")
    )
  }
  return true
}

export default function StorageFiles() {
  const { selectedConversationId, selectedConversation, currentUserId } =
    useChatPage()
  const [attachments, setAttachments] = useState<AttachmentResponse[]>([])
  const [loadingAttachments, setLoadingAttachments] = useState(false)
  const [loadingSenders, setLoadingSenders] = useState(false)
  const [senderProfiles, setSenderProfiles] = useState<
    Record<string, SenderProfile>
  >({})

  const [searchKeyword, setSearchKeyword] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [senderSearch, setSenderSearch] = useState("")
  const [selectedSenderId, setSelectedSenderId] = useState("")
  const [fromDate, setFromDate] = useState("")
  const [toDate, setToDate] = useState("")
  const [selectedType, setSelectedType] = useState<FileTypeFilter>("all")
  const [typePopoverOpen, setTypePopoverOpen] = useState(false)
  const [senderPopoverOpen, setSenderPopoverOpen] = useState(false)

  const participantIds = useMemo(() => {
    const ids = (selectedConversation?.participantInfos ?? [])
      .map((participant) => participant.idAccount)
      .filter((id): id is string => !!id)
    return Array.from(new Set(ids))
  }, [
    selectedConversation?.idConversation,
    selectedConversation?.participantInfos,
  ])

  const senderOptions = useMemo<SenderOption[]>(() => {
    return participantIds
      .map((id) => ({
        id,
        name:
          senderProfiles[id]?.displayName ??
          (id === currentUserId ? "Bạn" : id),
        avatar: senderProfiles[id]?.avatar,
      }))
      .sort((a, b) => a.name.localeCompare(b.name, "vi"))
  }, [participantIds, senderProfiles, currentUserId])

  const selectedSenderLabel = useMemo(() => {
    if (!selectedSenderId) {
      return "Người gửi"
    }
    return (
      senderOptions.find((option) => option.id === selectedSenderId)?.name ??
      "Người gửi"
    )
  }, [selectedSenderId, senderOptions])

  const selectedTypeLabel = useMemo(() => {
    return (
      FILE_TYPE_OPTIONS.find((option) => option.value === selectedType)
        ?.label ?? "Loại"
    )
  }, [selectedType])

  const filteredSenderOptions = useMemo(() => {
    const keyword = senderSearch.trim().toLowerCase()
    if (!keyword) {
      return senderOptions
    }
    return senderOptions.filter((option) =>
      option.name.toLowerCase().includes(keyword)
    )
  }, [senderOptions, senderSearch])

  const filteredAttachments = useMemo(() => {
    return attachments.filter((attachment) =>
      matchesFileTypeFilter(attachment.url, selectedType)
    )
  }, [attachments, selectedType])

  const hasActiveFilter =
    !!selectedSenderId || !!fromDate || !!toDate || selectedType !== "all"

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
    setSelectedType("all")
    setTypePopoverOpen(false)
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
              const profileRes =
                await userService.getProfileByIdentityUserId(senderId)
              const profile = profileRes.data
              senderProfileMap[senderId] = {
                displayName: toDisplayName(
                  profile,
                  senderId === currentUserId ? "Bạn" : senderId
                ),
                avatar: profile.avatar ?? undefined,
              }
            } catch {
              senderProfileMap[senderId] = {
                displayName: senderId === currentUserId ? "Bạn" : senderId,
              }
            }
          })
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
      setAttachments([])
      return
    }

    let cancelled = false

    const loadAttachments = async () => {
      setLoadingAttachments(true)
      try {
        const response = await fileService.getAttachments(
          selectedConversationId,
          {
            type: "files",
            senderId: selectedSenderId || undefined,
            fromDate: fromDate || undefined,
            toDate: toDate || undefined,
            search: debouncedSearch || undefined,
          }
        )
        if (!cancelled) {
          const items = (response.data ?? []).slice().sort((a, b) => {
            const right = new Date(b.timeSent ?? b.timeUpload).getTime()
            const left = new Date(a.timeSent ?? a.timeUpload).getTime()
            return right - left
          })
          setAttachments(items)
        }
      } catch (error) {
        console.error("Failed to load attachments", error)
        if (!cancelled) {
          toast.error("Không thể tải files")
        }
      } finally {
        if (!cancelled) {
          setLoadingAttachments(false)
        }
      }
    }

    void loadAttachments()
    return () => {
      cancelled = true
    }
  }, [
    selectedConversationId,
    debouncedSearch,
    selectedSenderId,
    fromDate,
    toDate,
  ])

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

  const getFileExtension = (url: string): string => {
    const parts = url.split(".")
    const ext = parts[parts.length - 1]?.toLowerCase() || "FILE"
    return ext.substring(0, 4).toUpperCase()
  }

  const getExtensionColor = (ext: string): string => {
    const lowerExt = ext.toLowerCase()
    if (lowerExt.includes("pdf")) return "bg-red-500"
    if (lowerExt.includes("doc")) return "bg-blue-500"
    if (lowerExt.includes("xls")) return "bg-green-500"
    if (lowerExt.includes("ppt")) return "bg-orange-500"
    if (lowerExt.includes("zip") || lowerExt.includes("rar"))
      return "bg-yellow-600"
    if (lowerExt.includes("mp3") || lowerExt.includes("wav"))
      return "bg-purple-500"
    return "bg-gray-500"
  }

  const handleOpenInNewTab = (url: string) => {
    const opened = window.open(url, "_blank", "noopener,noreferrer")
    // if (!opened) {
    // }
  }

  if (loadingAttachments && attachments.length === 0) {
    return (
      <div className="flex justify-center py-10">
        <Spinner className="size-6 text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex w-full min-w-0 flex-col">
      <div className="p-3 pb-2">
        <div className="relative mb-3 flex items-center">
          <Search className="absolute left-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tìm kiếm file"
            className="rounded-full pl-9"
            value={searchKeyword}
            onChange={(event) => setSearchKeyword(event.target.value)}
          />
        </div>
        <div className="custom-scrollbar flex gap-2 overflow-x-auto pb-1 whitespace-nowrap">
          <Popover open={typePopoverOpen} onOpenChange={setTypePopoverOpen}>
            <PopoverTrigger asChild>
              <Button variant="secondary" className="h-8 rounded-full">
                {selectedTypeLabel} <ChevronDown className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 rounded-xl p-2" align="start">
              {FILE_TYPE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    setSelectedType(option.value)
                    setTypePopoverOpen(false)
                  }}
                  className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left text-sm hover:bg-muted"
                >
                  <span className="inline-flex h-6 min-w-6 items-center justify-center rounded bg-muted px-1.5 text-[10px] font-semibold">
                    {option.badge}
                  </span>
                  <span>{option.label}</span>
                </button>
              ))}
            </PopoverContent>
          </Popover>

          <Popover open={senderPopoverOpen} onOpenChange={setSenderPopoverOpen}>
            <PopoverTrigger asChild>
              <Button variant="secondary" className="h-8 rounded-full">
                <span className="max-w-[96px] truncate">
                  {selectedSenderLabel}
                </span>
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
              <Button variant="secondary" className="h-8 rounded-full">
                <span className="max-w-[96px] truncate">
                  {fromDate || toDate ? "Đang lọc ngày" : "Ngày gửi"}
                </span>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[320px] rounded-xl p-0" align="start">
              <div className="border-b px-4 py-3">
                <p className="text-sm font-medium">Gợi ý thời gian</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => applyRecentDays(7)}
                  >
                    7 ngày
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => applyRecentDays(30)}
                  >
                    30 ngày
                  </Button>
                </div>
              </div>
              <div className="px-4 py-3">
                <p className="mb-2 text-sm font-medium">
                  Chọn khoảng thời gian
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="relative">
                    <Input
                      type="date"
                      value={fromDate}
                      onChange={(event) => setFromDate(event.target.value)}
                    />
                    <CalendarIcon className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  </div>
                  <div className="relative">
                    <Input
                      type="date"
                      value={toDate}
                      onChange={(event) => setToDate(event.target.value)}
                    />
                    <CalendarIcon className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  </div>
                </div>
                <div className="mt-2 flex justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={clearDateFilter}
                  >
                    Xóa lọc
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {filteredAttachments.length === 0 ? (
        <div className="py-10 text-center text-sm text-muted-foreground">
          {searchKeyword.trim() || hasActiveFilter
            ? "Không tìm thấy file"
            : "Chưa có file nào"}
        </div>
      ) : (
        <div className="mt-2 px-3 pb-2">
          {filteredAttachments.map((file) => {
            const extension = getFileExtension(file.url)
            const extensionColor = getExtensionColor(extension)
            const fileName = getOriginalFileNameFromUrl(file.url)
            const isAudio = file.type === "AUDIO"

            return (
              <div
                key={file.idAttachment}
                className="group -mx-2 flex items-center gap-3 rounded px-2 py-2 hover:bg-muted/50"
              >
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded p-2 text-[10px] font-bold text-white ${extensionColor}`}
                >
                  {extension}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-foreground">{fileName}</p>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <span>{file.size || "Unknown size"}</span>
                  </div>
                  {isAudio && (
                    <audio
                      src={file.url}
                      controls
                      className="mt-2 h-8 w-full"
                      preload="metadata"
                    />
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="shrink-0 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100"
                  onClick={() => handleOpenInNewTab(file.url)}
                  title="Mo tab moi"
                >
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
