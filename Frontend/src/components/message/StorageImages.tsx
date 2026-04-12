import { CalendarIcon, ChevronDown, Search } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Spinner } from "@/components/ui/spinner"
import { useChatPage } from "@/contexts/ChatPageContext"
import { fileService, type AttachmentResponse } from "@/services/file/file.service"
import { userService } from "@/services/user/user.service"

type SenderOption = {
  id: string
  name: string
  avatar?: string
}

type SenderProfile = {
  displayName: string
  avatar?: string
}

const formatDateInputValue = (date: Date): string => {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, "0")
  const day = `${date.getDate()}`.padStart(2, "0")
  return `${year}-${month}-${day}`
}

const toDisplayName = (profile: { firstName?: string; lastName?: string }, fallback: string): string => {
  const fullName = `${profile.lastName ?? ""} ${profile.firstName ?? ""}`.trim()
  return fullName || fallback
}

export default function StorageImages() {
  const { selectedConversationId, selectedConversation, currentUserId } = useChatPage()
  const [attachments, setAttachments] = useState<AttachmentResponse[]>([])
  const [loadingAttachments, setLoadingAttachments] = useState(false)
  const [loadingSenders, setLoadingSenders] = useState(false)
  const [senderProfiles, setSenderProfiles] = useState<Record<string, SenderProfile>>({})
  const [senderSearch, setSenderSearch] = useState("")
  const [selectedSenderId, setSelectedSenderId] = useState("")
  const [fromDate, setFromDate] = useState("")
  const [toDate, setToDate] = useState("")
  const [imagePreview, setImagePreview] = useState<{ url: string; alt: string } | null>(null)
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

  const hasActiveFilter = !!selectedSenderId || !!fromDate || !!toDate

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

  useEffect(() => {
    setSelectedSenderId("")
    setSenderSearch("")
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
        if (!cancelled) {
          toast.error("Không thể tải bộ lọc người gửi")
        }
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
  }, [selectedConversationId, currentUserId, participantIds])

  useEffect(() => {
    if (!selectedConversationId) {
      setAttachments([])
      return
    }

    let cancelled = false

    const loadAttachments = async () => {
      setLoadingAttachments(true)
      try {
        const response = await fileService.getAttachments(selectedConversationId, {
          type: "images",
          senderId: selectedSenderId || undefined,
          fromDate: fromDate || undefined,
          toDate: toDate || undefined,
        })

        if (cancelled) {
          return
        }

        const items = (response.data ?? []).slice().sort((a, b) => {
          const right = new Date(b.timeSent ?? b.timeUpload).getTime()
          const left = new Date(a.timeSent ?? a.timeUpload).getTime()
          return right - left
        })
        setAttachments(items)
      } catch (error) {
        console.error("Failed to load filtered image attachments", error)
        if (!cancelled) {
          toast.error("Không thể tải ảnh/video")
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
  }, [selectedConversationId, selectedSenderId, fromDate, toDate])

  if (loadingAttachments && attachments.length === 0) {
    return (
      <div className="flex justify-center py-10">
        <Spinner className="size-6 text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      <div className="flex gap-2 p-3 pb-0">
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

      <div className="mt-4 px-3 pb-2">
        {attachments.length === 0 ? (
          <div className="flex aspect-square w-full items-center justify-center rounded border bg-muted text-xs text-muted-foreground">
            {hasActiveFilter ? "Không có ảnh/video phù hợp bộ lọc" : "Chưa có ảnh/video"}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-1">
            {attachments.map((attachment) => (
              <div
                key={attachment.idAttachment}
                className="aspect-square w-full overflow-hidden rounded"
              >
                {attachment.type === "VIDEO" ? (
                  <video
                    src={attachment.url}
                    controls
                    className="aspect-square w-full object-cover bg-black"
                    preload="metadata"
                  />
                ) : (
                  <img
                    src={attachment.url}
                    alt="attachment"
                    className="aspect-square w-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => setImagePreview({ url: attachment.url, alt: 'Image' })}
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </div>

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
