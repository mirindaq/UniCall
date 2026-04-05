import {
  AlertTriangle,
  BellOff,
  ChevronDown,
  Clock,
  Edit2,
  EyeOff,
  HelpCircle,
  Link as LinkIcon,
  LogOut,
  Pin,
  Trash2,
  Users,
} from "lucide-react"
import { useState } from "react"

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
import { Switch } from "@/components/ui/switch"
import {
  messageInfoPreviewFiles,
  messageInfoPreviewLinks,
} from "@/mock/message-data"

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
    </div>
  )
}
