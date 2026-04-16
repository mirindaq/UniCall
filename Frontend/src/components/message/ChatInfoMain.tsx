import {
  AlertTriangle,
  Ban,
  BellOff,
  ChevronDown,
  Clock,
  Download,
  Edit2,
  EyeOff,
  HelpCircle,
  Link as LinkIcon,
  Lock,
  Pin,
  Trash2,
  Users,
  Eye,
} from "lucide-react"
import { useState, useCallback, useEffect } from "react"
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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Spinner } from "@/components/ui/spinner"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"
import {
  messageInfoPreviewFiles,
  messageInfoPreviewLinks,
} from "@/mock/message-data"
import { relationshipService } from "@/services/relationship/relationship.service"
import { userService } from "@/services/user/user.service"

interface ChatInfoMainProps {
  openStorage: (tab: "images" | "files" | "links") => void
  title: string
  avatarSrc?: string
  avatarFallback: string
  peerId?: string
  onBlockStatusChange?: (isBlocked: boolean) => void
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
const CHAT_BLOCK_STATUS_CHANGED_EVENT = "chat:block-status-changed"

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
          className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""
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
  peerId,
  onBlockStatusChange,
}: ChatInfoMainProps) {
  const [openSections, setOpenSections] = useState({
    images: true,
    files: true,
    links: true,
    security: true,
    management: false,
  })
  const [relationshipTypes, setRelationshipTypes] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  // Load current user ID on mount
  useEffect(() => {
    const loadCurrentUser = async () => {
      try {
        const res = await userService.getMyProfile()
        setCurrentUserId(res.data.identityUserId)
      } catch (error) {
        console.error("Error loading current user:", error)
      }
    }
    void loadCurrentUser()
  }, [])

  const toggleSection = (key: keyof typeof openSections) => {
    setOpenSections((prev) => ({
      ...prev,
      [key]: !prev[key],
    }))
  }

  const updateRelationship = useCallback(
    async (newTypes: string[]) => {
      if (!currentUserId || !peerId) {
        toast.error("Không thể cập nhật")
        return
      }

      setIsLoading(true)
      try {
        let res = await relationshipService.updateRelationship({
          actorId: currentUserId,
          targetId: peerId,
          relationshipType: newTypes,
        })
        console.log('res update: ', res);

        setRelationshipTypes(newTypes)

        // Check if blocked
        const isBlocked = newTypes.includes("BLOCK_ALL") || newTypes.includes("BLOCK_MESSAGE")
        onBlockStatusChange?.(isBlocked)
      } catch (error) {
        console.error("Error updating relationship:", error)
        toast.error("Lỗi cập nhật")
      } finally {
        setIsLoading(false)
      }
    },
    [currentUserId, peerId, onBlockStatusChange],
  )

  const handleTogglePin = useCallback(() => {
    const newTypes = relationshipTypes.includes("PIN")
      ? relationshipTypes.filter((t) => t !== "PIN")
      : [...relationshipTypes, "PIN"]
    void updateRelationship(newTypes)
    const pinned = newTypes.includes("PIN")
    toast.success(pinned ? "Đã ghim cuộc trò chuyện" : "Bỏ ghim cuộc trò chuyện")
  }, [relationshipTypes, updateRelationship])

  const handleToggleHide = useCallback(() => {
    const newTypes = relationshipTypes.includes("HIDE")
      ? relationshipTypes.filter((t) => t !== "HIDE")
      : [...relationshipTypes, "HIDE"]
    void updateRelationship(newTypes)
    const hidden = newTypes.includes("HIDE")
    toast.success(hidden ? "Đã ẩn cuộc trò chuyện" : "Bỏ ẩn cuộc trò chuyện")
  }, [relationshipTypes, updateRelationship])

  const handleToggleBlock = useCallback(() => {
    const isCurrentlyBlocked = relationshipTypes.includes("BLOCK_ALL") || relationshipTypes.includes("BLOCK_MESSAGE")
    const newTypes = isCurrentlyBlocked
      ? relationshipTypes.filter((t) => t !== "BLOCK_ALL" && t !== "BLOCK_MESSAGE")
      : [...relationshipTypes, "BLOCK_ALL"]
    void updateRelationship(newTypes)
    const blocked = newTypes.includes("BLOCK_ALL") || newTypes.includes("BLOCK_MESSAGE")
    toast.success(blocked ? "Đã chặn người này" : "Đã bỏ chặn người này")
  }, [relationshipTypes, updateRelationship])

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
              {directPeer ? (
                <Button
                  variant="secondary"
                  size="icon-xs"
                  title="Sửa biệt danh"
                  onClick={() => setIsNicknameDialogOpen(true)}
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </Button>
              ) : null}
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
                <Button
                  variant={selectedConversation?.pinned ? "default" : "secondary"}
                  size="icon"
                  disabled={isPinningConversation || !selectedConversationId}
                  onClick={() => void handleToggleConversationPin()}
                >
                  <Pin className="h-4 w-4" />
                </Button>
                <span className="w-full text-center text-xs leading-tight text-muted-foreground">
                  {selectedConversation?.pinned ? "Bỏ ghim hội thoại" : "Ghim hội thoại"}
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
              title="Quản lý cuộc trò chuyện"
              open={openSections.management}
              onToggle={() => toggleSection("management")}
            >
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={handleTogglePin}
                  disabled={isLoading}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-muted disabled:opacity-50"
                >
                  <Pin className="h-5 w-5 shrink-0 text-muted-foreground" />
                  <span className="flex-1 text-sm text-foreground">
                    {relationshipTypes.includes("PIN") ? "Bỏ ghim" : "Ghim cuộc trò chuyện"}
                  </span>
                  {relationshipTypes.includes("PIN") && (
                    <div className="h-2 w-2 rounded-full bg-blue-500" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleToggleHide}
                  disabled={isLoading}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-muted disabled:opacity-50"
                >
                  <Eye className="h-5 w-5 shrink-0 text-muted-foreground" />
                  <span className="flex-1 text-sm text-foreground">
                    {relationshipTypes.includes("HIDE") ? "Bỏ ẩn" : "Ẩn cuộc trò chuyện"}
                  </span>
                  {relationshipTypes.includes("HIDE") && (
                    <div className="h-2 w-2 rounded-full bg-blue-500" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleToggleBlock}
                  disabled={isLoading}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-red-50 disabled:opacity-50"
                >
                  <Lock className="h-5 w-5 shrink-0 text-red-500" />
                  <span className={`flex-1 text-sm ${relationshipTypes.includes("BLOCK_ALL") || relationshipTypes.includes("BLOCK_MESSAGE")
                    ? "text-red-600 font-medium"
                    : "text-foreground"
                    }`}>
                    {relationshipTypes.includes("BLOCK_ALL") || relationshipTypes.includes("BLOCK_MESSAGE")
                      ? "Bỏ chặn"
                      : "Chặn người này"}
                  </span>
                  {(relationshipTypes.includes("BLOCK_ALL") || relationshipTypes.includes("BLOCK_MESSAGE")) && (
                    <div className="h-2 w-2 rounded-full bg-red-500" />
                  )}
                </button>
              </div>
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

                {selectedConversation?.type === "DOUBLE" ? (
                  <div className="flex items-center justify-between gap-3 py-2">
                    <div className="flex min-w-0 items-start gap-3">
                      <Ban className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                      <div className="min-w-0">
                        <p className="text-sm text-foreground">
                          {blockStatus?.blockedByMe ? "Đã chặn nhắn tin" : "Chặn nhắn tin"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {blockStatus?.blockedByMe
                            ? "Bạn đã chặn người này trong hội thoại 1-1."
                            : blockStatus?.blockedByOther
                              ? "Bạn đang bị người này chặn nhắn tin."
                              : "Chặn người này nhắn tin cho bạn trong hội thoại này."}
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant={blockStatus?.blockedByMe ? "outline" : "destructive"}
                      size="sm"
                      disabled={isLoadingBlockStatus || isTogglingBlock}
                      onClick={() => void handleToggleBlockMessaging()}
                    >
                      {isTogglingBlock ? "Đang xử lý..." : blockStatus?.blockedByMe ? "Bỏ chặn" : "Chặn"}
                    </Button>
                  </div>
                ) : null}
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

      <Dialog open={isNicknameDialogOpen} onOpenChange={setIsNicknameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Đổi biệt danh</DialogTitle>
            <DialogDescription>
              Biệt danh sẽ được dùng để hiển thị hội thoại 1-1 này.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Nhập biệt danh"
              value={nicknameDraft}
              maxLength={50}
              onChange={(event) => setNicknameDraft(event.target.value)}
            />
            <div className="flex items-center justify-end gap-2">
              <Button
                variant="outline"
                disabled={isSavingNickname}
                onClick={() => setIsNicknameDialogOpen(false)}
              >
                Hủy
              </Button>
              <Button disabled={isSavingNickname} onClick={() => void handleSaveNickname()}>
                {isSavingNickname ? "Đang lưu..." : "Lưu"}
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
