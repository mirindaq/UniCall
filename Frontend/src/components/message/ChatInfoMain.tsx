import {
  AlertTriangle,
  BellOff,
  ChevronDown,
  Clock,
  Download,
  Edit2,
  EyeOff,
  HelpCircle,
  Link as LinkIcon,
  LogOut,
  Pin,
  Trash2,
  Users,
} from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Spinner } from "@/components/ui/spinner"
import { Switch } from "@/components/ui/switch"
import { useChatPage } from "@/contexts/ChatPageContext"
import { chatService } from "@/services/chat/chat.service"
import { fileService, type AttachmentResponse } from "@/services/file/file.service"
import { formatChatSidebarTime } from "@/utils/chat-display.util"
import { getOriginalFileNameFromUrl } from "@/utils/file-display.util"
import { extractUrlsFromText, getDomainFromUrl } from "@/utils/link-display.util"

import ImageGalleryViewer, { type ImageViewerItem } from "./ImageGalleryViewer"

interface ChatInfoMainProps {
  openStorage: (tab: "images" | "files" | "links") => void
  title: string
  avatarSrc?: string
  avatarFallback: string
  isGroup?: boolean
  canDissolveGroup?: boolean
  onLeaveGroup?: () => Promise<void>
  onDissolveGroup?: () => Promise<void>
}

interface SectionProps {
  title: string
  open: boolean
  onToggle: () => void
  children: React.ReactNode
  noBorder?: boolean
}

type LinkPreviewItem = {
  id: string
  url: string
  domain: string
  timeSent: string
}

const PREVIEW_LIMIT = 3
const LINK_PAGE_LIMIT = 100
const LINK_MAX_PAGES = 8

function CollapsibleSection({
  title,
  open,
  onToggle,
  children,
  noBorder = false,
}: SectionProps) {
  return (
    <div className="px-3 pb-2">
      {!noBorder && <Separator className="mb-2" />}

      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between py-1 text-left"
      >
        <h4 className="text-sm font-medium text-foreground">{title}</h4>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && <div className="pt-2">{children}</div>}
    </div>
  )
}

export default function ChatInfoMain({
  openStorage,
  title,
  avatarSrc,
  avatarFallback,
  isGroup = false,
  canDissolveGroup = false,
  onLeaveGroup,
  onDissolveGroup,
}: ChatInfoMainProps) {
  const [openSections, setOpenSections] = useState({
    images: true,
    files: true,
    links: true,
    security: true,
  })
  const [isLeaveDialogOpen, setIsLeaveDialogOpen] = useState(false)
  const [isDissolveDialogOpen, setIsDissolveDialogOpen] = useState(false)
  const [isLeavingGroup, setIsLeavingGroup] = useState(false)
  const [isDissolvingGroup, setIsDissolvingGroup] = useState(false)
  const [imagesPreview, setImagesPreview] = useState<AttachmentResponse[]>([])
  const [filesPreview, setFilesPreview] = useState<AttachmentResponse[]>([])
  const [linksPreview, setLinksPreview] = useState<LinkPreviewItem[]>([])
  const [previewLoading, setPreviewLoading] = useState(false)
  const [allImageAttachments, setAllImageAttachments] = useState<AttachmentResponse[]>([])
  const [imagePreview, setImagePreview] = useState<{ images: ImageViewerItem[]; initialIndex: number } | null>(null)

  const { selectedConversationId } = useChatPage()

  useEffect(() => {
    if (!selectedConversationId) {
      setImagesPreview([])
      setAllImageAttachments([])
      setFilesPreview([])
      setLinksPreview([])
      return
    }

    let cancelled = false

    const loadPreviews = async () => {
      setPreviewLoading(true)
      try {
        const [imagesRes, filesRes, linksRes] = await Promise.all([
          fileService.getAttachments(selectedConversationId, "images"),
          fileService.getAttachments(selectedConversationId, "files"),
          fileService.getAttachments(selectedConversationId, "links"),
        ])

        let linksCollected: LinkPreviewItem[] = (linksRes.data ?? [])
          .filter((attachment) => attachment.type === "LINK" && !!attachment.url)
          .map((attachment) => ({
            id: attachment.idAttachment,
            url: attachment.url,
            domain: getDomainFromUrl(attachment.url),
            timeSent: attachment.timeUpload,
          }))

        if (linksCollected.length === 0) {
          linksCollected = []
          let page = 1
          let totalPage = 1

          do {
            const messagesRes = await chatService.listMessages(selectedConversationId, page, LINK_PAGE_LIMIT)
            const paged = messagesRes.data
            const items = paged.items ?? []
            totalPage = paged.totalPage ?? page

            for (const message of items) {
              if (message.recalled) {
                continue
              }
              const urls = extractUrlsFromText(message.content)
              urls.forEach((url, index) => {
                linksCollected.push({
                  id: `${message.idMessage}-${index}`,
                  url,
                  domain: getDomainFromUrl(url),
                  timeSent: message.timeSent,
                })
              })
            }

            page += 1
          } while (page <= totalPage && page <= LINK_MAX_PAGES)
        }

        if (cancelled) {
          return
        }

        linksCollected.sort((a, b) => new Date(b.timeSent).getTime() - new Date(a.timeSent).getTime())

        const sortedImages = (imagesRes.data ?? []).slice().sort((a, b) => {
          const right = new Date(b.timeSent ?? b.timeUpload).getTime()
          const left = new Date(a.timeSent ?? a.timeUpload).getTime()
          return right - left
        })
        const onlyImages = sortedImages.filter((item) => item.type === "IMAGE")

        setAllImageAttachments(onlyImages)
        setImagesPreview(sortedImages.slice(0, PREVIEW_LIMIT))
        setFilesPreview((filesRes.data ?? []).slice(0, PREVIEW_LIMIT))
        setLinksPreview(linksCollected.slice(0, PREVIEW_LIMIT))
      } catch (error) {
        console.error("Failed to load chat info previews", error)
        if (!cancelled) {
          toast.error("Không thể tải dữ liệu kho lưu trữ")
        }
      } finally {
        if (!cancelled) {
          setPreviewLoading(false)
        }
      }
    }

    void loadPreviews()
    return () => {
      cancelled = true
    }
  }, [selectedConversationId])

  const imageIndexById = useMemo(
    () => new Map(allImageAttachments.map((item, index) => [item.idAttachment, index])),
    [allImageAttachments],
  )

  const getFileExtension = useMemo(() => {
    return (url: string): string => {
      const parts = url.split(".")
      const ext = parts[parts.length - 1]?.toLowerCase() || "file"
      return ext.substring(0, 4).toUpperCase()
    }
  }, [])

  const getExtensionColor = useMemo(() => {
    return (ext: string): string => {
      const lowerExt = ext.toLowerCase()
      if (lowerExt.includes("pdf")) return "bg-red-500"
      if (lowerExt.includes("doc")) return "bg-blue-500"
      if (lowerExt.includes("xls")) return "bg-green-500"
      if (lowerExt.includes("ppt")) return "bg-orange-500"
      if (lowerExt.includes("zip") || lowerExt.includes("rar")) return "bg-yellow-600"
      if (lowerExt.includes("mp3") || lowerExt.includes("wav")) return "bg-purple-500"
      return "bg-gray-500"
    }
  }, [])

  const toggleSection = (key: keyof typeof openSections) => {
    setOpenSections((prev) => ({
      ...prev,
      [key]: !prev[key],
    }))
  }

  const handleConfirmLeaveGroup = async () => {
    if (!onLeaveGroup || isLeavingGroup) {
      return
    }
    setIsLeavingGroup(true)
    try {
      await onLeaveGroup()
      setIsLeaveDialogOpen(false)
    } finally {
      setIsLeavingGroup(false)
    }
  }

  const handleConfirmDissolveGroup = async () => {
    if (!onDissolveGroup || isDissolvingGroup) {
      return
    }
    setIsDissolvingGroup(true)
    try {
      await onDissolveGroup()
      setIsDissolveDialogOpen(false)
    } finally {
      setIsDissolvingGroup(false)
    }
  }

  return (
    <div className="flex h-full w-full max-w-[340px] shrink-0 flex-col overflow-hidden border-l bg-background">
      <div className="flex shrink-0 items-center justify-center border-b px-4 py-5">
        <h2 className="text-base font-semibold text-foreground">
          Thông tin hội thoại
        </h2>
      </div>

      <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto">
        <div className="flex w-full flex-col">
          <div className="flex flex-col items-center border-b p-4">
            <Avatar className="mb-2 h-16 w-16">
              <AvatarImage src={avatarSrc} alt={title} />
              <AvatarFallback>{avatarFallback}</AvatarFallback>
            </Avatar>

            <div className="flex w-full min-w-0 items-center justify-center gap-2">
              <h4 className="ml-6 max-w-[220px] truncate text-base font-medium">
                {title}
              </h4>
              <Button variant="secondary" size="icon-xs" title="Sửa biệt danh">
                <Edit2 className="h-3.5 w-3.5" />
              </Button>
            </div>

            <div className="mt-4 grid w-full min-w-0 grid-cols-3 gap-2">
              <div className="flex min-w-0 cursor-pointer flex-col items-center gap-1">
                <Button variant="secondary" size="icon">
                  <BellOff className="h-4 w-4" />
                </Button>
                <span className="w-full text-center text-xs leading-tight text-muted-foreground">
                  Tắt thông báo
                </span>
              </div>

              <div className="flex min-w-0 cursor-pointer flex-col items-center gap-1">
                <Button variant="secondary" size="icon">
                  <Pin className="h-4 w-4" />
                </Button>
                <span className="w-full text-center text-xs leading-tight text-muted-foreground">
                  Ghim hội thoại
                </span>
              </div>

              <div className="flex min-w-0 cursor-pointer flex-col items-center gap-1">
                <Button variant="secondary" size="icon">
                  <Users className="h-4 w-4" />
                </Button>
                <span className="w-full text-center text-xs leading-tight text-muted-foreground">
                  Tạo nhóm
                </span>
              </div>
            </div>
          </div>

          <div className="mt-2">
            <CollapsibleSection
              title="Ảnh/Video"
              open={openSections.images}
              onToggle={() => toggleSection("images")}
              noBorder
            >
              <div className="mb-3">
                {previewLoading ? (
                  <div className="flex justify-center py-4">
                    <Spinner className="size-4 text-muted-foreground" />
                  </div>
                ) : imagesPreview.length === 0 ? (
                  <div className="flex aspect-[3/1] w-full items-center justify-center rounded border bg-muted text-xs text-muted-foreground">
                    Chưa có ảnh/video
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-1">
                    {imagesPreview.map((item) => (
                      <div key={item.idAttachment} className="aspect-square w-full overflow-hidden rounded">
                        {item.type === "VIDEO" ? (
                          <video
                            src={item.url}
                            className="aspect-square h-full w-full object-cover bg-black"
                            preload="metadata"
                            muted
                          />
                        ) : (
                          <img
                            src={item.url}
                            alt="attachment"
                            className="aspect-square h-full w-full cursor-pointer object-cover"
                            onClick={() => {
                              const index = imageIndexById.get(item.idAttachment) ?? 0
                              setImagePreview({
                                images: allImageAttachments.map((attachment) => ({ url: attachment.url, alt: "Image" })),
                                initialIndex: index,
                              })
                            }}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Button
                onClick={() => openStorage("images")}
                variant="secondary"
                className="w-full"
              >
                Xem tất cả
              </Button>
            </CollapsibleSection>

            <CollapsibleSection
              title="File"
              open={openSections.files}
              onToggle={() => toggleSection("files")}
            >
              <div className="mb-3">
                {previewLoading ? (
                  <div className="flex justify-center py-4">
                    <Spinner className="size-4 text-muted-foreground" />
                  </div>
                ) : filesPreview.length === 0 ? (
                  <div className="text-center text-xs text-muted-foreground">Chưa có file</div>
                ) : (
                  filesPreview.map((file) => {
                    const ext = getFileExtension(file.url)
                    const color = getExtensionColor(ext)
                    return (
                      <div key={file.idAttachment} className="flex items-center gap-3 py-2">
                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded p-2 text-[10px] font-bold text-white ${color}`}
                        >
                          {ext}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm text-foreground">
                            {getOriginalFileNameFromUrl(file.url)}
                          </p>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <span>{file.size || "Unknown size"}</span>
                            <Download className="h-3 w-3 text-blue-500" />
                          </div>
                        </div>

                        <span className="ml-2 w-[62px] shrink-0 truncate text-right text-xs text-muted-foreground">
                          {formatChatSidebarTime(file.timeUpload)}
                        </span>
                      </div>
                    )
                  })
                )}
              </div>

              <Button
                onClick={() => openStorage("files")}
                variant="secondary"
                className="w-full"
              >
                Xem tất cả
              </Button>
            </CollapsibleSection>

            <CollapsibleSection
              title="Link"
              open={openSections.links}
              onToggle={() => toggleSection("links")}
            >
              <div className="mb-3">
                {previewLoading ? (
                  <div className="flex justify-center py-4">
                    <Spinner className="size-4 text-muted-foreground" />
                  </div>
                ) : linksPreview.length === 0 ? (
                  <div className="text-center text-xs text-muted-foreground">Chưa có link</div>
                ) : (
                  linksPreview.map((link) => (
                    <a
                      key={link.id}
                      href={link.url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="flex min-w-0 items-center gap-3 rounded py-2 hover:bg-muted/40"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
                        <LinkIcon className="h-4 w-4 text-muted-foreground" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-foreground">{link.url}</p>
                        <p className="truncate text-xs text-muted-foreground">{link.domain}</p>
                      </div>

                      <span className="ml-2 w-[56px] shrink-0 truncate text-right text-xs text-muted-foreground">
                        {formatChatSidebarTime(link.timeSent)}
                      </span>
                    </a>
                  ))
                )}
              </div>

              <Button
                onClick={() => openStorage("links")}
                variant="secondary"
                className="w-full"
              >
                Xem tất cả
              </Button>
            </CollapsibleSection>

            <CollapsibleSection
              title="Thiết lập bảo mật"
              open={openSections.security}
              onToggle={() => toggleSection("security")}
            >
              <div className="space-y-1">
                <div className="flex items-start gap-3 py-2">
                  <Clock className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1">
                      <p className="text-sm text-foreground">Tin nhắn tự xóa</p>
                      <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Không bao giờ
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-3">
                    <EyeOff className="h-5 w-5 shrink-0 text-muted-foreground" />
                    <p className="text-sm text-foreground">
                      Ẩn cuộc trò chuyện
                    </p>
                  </div>
                  <Switch />
                </div>
              </div>
            </CollapsibleSection>
          </div>

          <Separator className="mt-2" />

          <div className="space-y-2 p-2">
            <Button variant="ghost" className="w-full justify-start">
              <AlertTriangle className="h-5 w-5" />
              Báo xấu
            </Button>

            <Button
              variant="ghost"
              className="w-full justify-start bg-transparent text-red-600"
            >
              <Trash2 className="h-5 w-5" />
              Xóa lịch sử trò chuyện
            </Button>

            {isGroup ? (
              <Button
                variant="ghost"
                className="w-full justify-start bg-transparent text-amber-600 hover:text-amber-700"
                onClick={() => setIsLeaveDialogOpen(true)}
              >
                <LogOut className="h-5 w-5" />
                Rời nhóm
              </Button>
            ) : null}

            {isGroup && canDissolveGroup ? (
              <Button
                variant="ghost"
                className="w-full justify-start bg-transparent text-red-600 hover:text-red-700"
                onClick={() => setIsDissolveDialogOpen(true)}
              >
                <Trash2 className="h-5 w-5" />
                Giải tán nhóm
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      <AlertDialog open={isLeaveDialogOpen} onOpenChange={setIsLeaveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận rời nhóm</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc muốn rời nhóm này không?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLeavingGroup}>Hủy</AlertDialogCancel>
            <AlertDialogAction disabled={isLeavingGroup} onClick={() => void handleConfirmLeaveGroup()}>
              {isLeavingGroup ? "Đang xử lý..." : "Rời nhóm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isDissolveDialogOpen} onOpenChange={setIsDissolveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận giải tán nhóm</AlertDialogTitle>
            <AlertDialogDescription>
              Sau khi giải tán, nhóm sẽ bị xóa và không thể khôi phục.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDissolvingGroup}>Hủy</AlertDialogCancel>
            <AlertDialogAction
              disabled={isDissolvingGroup}
              className="bg-red-600 hover:bg-red-700"
              onClick={() => void handleConfirmDissolveGroup()}
            >
              {isDissolvingGroup ? "Đang xử lý..." : "Giải tán nhóm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
