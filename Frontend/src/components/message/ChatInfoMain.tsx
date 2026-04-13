import {
  AlertTriangle,
  BellOff,
  ChevronDown,
  Clock,
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

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
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
              <div className="mb-3 grid grid-cols-3 gap-1">
                <img
                  src="https://images.unsplash.com/photo-1542204165-65bf26472b9b?w=150&h=150&fit=crop"
                  alt="Hình 1"
                  className="aspect-square w-full rounded object-cover"
                />
                <img
                  src="https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=150&h=150&fit=crop"
                  alt="Hình 2"
                  className="aspect-square w-full rounded object-cover"
                />
                <img
                  src="https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=150&h=150&fit=crop"
                  alt="Hình 3"
                  className="aspect-square w-full rounded object-cover"
                />
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
                {messageInfoPreviewFiles.map((file) => (
                  <div key={file.name} className="flex items-center gap-3 py-2">
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded p-2 text-[10px] font-bold text-white ${file.color}`}
                    >
                      {file.icon}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-foreground">
                        {file.name}
                      </p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <span>{file.size}</span>
                        <Clock className="h-3 w-3 text-blue-500" />
                      </div>
                    </div>

                    <span className="ml-2 w-[62px] shrink-0 truncate text-right text-xs text-muted-foreground">
                      {file.time}
                    </span>
                  </div>
                ))}
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
                {messageInfoPreviewLinks.map((link) => (
                  <div
                    key={link.title}
                    className="flex min-w-0 items-center gap-3 py-2"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
                      {link.icon === "link" ? (
                        <LinkIcon className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <div className="h-4 w-4 rounded-sm bg-green-500" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-foreground">
                        {link.title}
                      </p>
                      <a
                        href="#"
                        className="block truncate text-xs text-primary hover:underline"
                      >
                        {link.sub}
                      </a>
                    </div>

                    <span className="ml-2 w-[48px] shrink-0 truncate text-right text-xs text-muted-foreground">
                      {link.time}
                    </span>
                  </div>
                ))}
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
          </div>
        </div>
      </div>
    </div>
  )
}
