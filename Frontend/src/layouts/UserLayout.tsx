import {
  Bell,
  BriefcaseBusiness,
  ChevronRight,
  CircleHelp,
  CloudUpload,
  Database,
  FolderKanban,
  Globe,
  LogOut,
  MessageCircle,
  Settings,
  User,
  Users,
} from "lucide-react"
import { useEffect, useState } from "react"
import { NavLink, Outlet, useLocation, useNavigate } from "react-router"
import { toast } from "sonner"

import IncomingCallPopup from "@/components/message/IncomingCallPopup"
import { UserProfileDialog } from "@/components/profile/UserProfileDialog"
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { AUTH_PATH } from "@/constants/auth"
import { useAuth } from "@/contexts/auth-context"
import { useConversationCall } from "@/hooks/useConversationCall"
import { USER_PATH } from "@/constants/user"
import { authService } from "@/services/auth/auth.service"
import { userService } from "@/services/user/user.service"
import type { UserProfile } from "@/types/user.type"

const userTabs = [
  {
    to: `${USER_PATH.ROOT}/${USER_PATH.CHAT}`,
    label: "Tin nhan",
    icon: MessageCircle,
  },
  {
    to: `${USER_PATH.ROOT}/${USER_PATH.FRIENDS}`,
    label: "Ban be",
    icon: Users,
  },
  {
    to: `${USER_PATH.ROOT}/${USER_PATH.NOTIFICATIONS}`,
    label: "Thong bao",
    icon: Bell,
  },
]

export function UserLayout() {
  const { clearAuthenticated, setIdentityUserId, identityUserId } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [isConfirmLogoutOpen, setIsConfirmLogoutOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [me, setMe] = useState<UserProfile | null>(null)
  const [globalCallPeer, setGlobalCallPeer] = useState<{ name: string; avatar?: string } | null>(null)

  const isOnChatRoute = location.pathname.startsWith(`${USER_PATH.ROOT}/${USER_PATH.CHAT}`)
  const globalCall = useConversationCall({
    currentUserId: isOnChatRoute ? null : identityUserId,
  })

  useEffect(() => {
    if (isOnChatRoute) {
      setGlobalCallPeer(null)
      return
    }
    const peerId = globalCall.activeCall?.peerUserId
    if (!peerId) {
      setGlobalCallPeer(null)
      return
    }

    let cancelled = false
    void userService
      .getProfileByIdentityUserId(peerId)
      .then((response) => {
        if (cancelled) {
          return
        }
        const profile = response.data
        const name = `${profile.lastName ?? ""} ${profile.firstName ?? ""}`.trim() || peerId
        setGlobalCallPeer({
          name,
          avatar: profile.avatar ?? undefined,
        })
      })
      .catch(() => {
        if (cancelled) {
          return
        }
        setGlobalCallPeer({
          name: peerId,
          avatar: undefined,
        })
      })

    return () => {
      cancelled = true
    }
  }, [globalCall.activeCall?.peerUserId, isOnChatRoute])

  useEffect(() => {
    let mounted = true
    const loadMe = async () => {
      try {
        const response = await userService.getMyProfile()
        if (mounted) {
          setMe(response.data)
          setIdentityUserId(response.data.identityUserId)
        }
      } catch {
        // ignore profile load failures in layout shell
      }
    }
    void loadMe()
    return () => {
      mounted = false
    }
  }, [])

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      await authService.logout()
    } catch {
      // ignore and clear local session
    } finally {
      clearAuthenticated()
      toast.success("Đăng xuất thành công")
      navigate(AUTH_PATH.LOGIN, { replace: true })
      setIsLoggingOut(false)
      setIsConfirmLogoutOpen(false)
    }
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-100">
      <aside className="flex w-16 shrink-0 flex-col items-center justify-between bg-blue-600 py-4 text-white shadow-lg">
        <div className="flex w-full flex-col items-center gap-4">
          <button
            type="button"
            className="flex size-10 items-center justify-center rounded-full bg-white/25"
            onClick={() => setIsProfileOpen(true)}
          >
            <Avatar className="size-10 border border-white/40">
              <AvatarImage src={me?.avatar ?? undefined} alt="my-avatar" />
              <AvatarFallback className="bg-white/20 text-sm font-semibold text-white">
                {`${me?.firstName?.[0] ?? "U"}${me?.lastName?.[0] ?? ""}`.toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </button>

          <nav className="flex w-full flex-col items-center gap-2 px-2">
            {userTabs.map((tab) => {
              const Icon = tab.icon
              return (
                <NavLink
                  key={tab.to}
                  to={tab.to}
                  className={({ isActive }) =>
                    `group flex size-10 items-center justify-center rounded-xl transition ${
                      isActive
                        ? "bg-white text-blue-600 shadow"
                        : "text-white/90 hover:bg-white/20"
                    }`
                  }
                  title={tab.label}
                >
                  <Icon className="size-5" />
                </NavLink>
              )
            })}
          </nav>
        </div>

        <div className="flex w-full flex-col items-center gap-2 px-2">
          {[CloudUpload, FolderKanban, BriefcaseBusiness].map((Icon, index) => (
            <button
              key={index}
              type="button"
              className="flex size-10 items-center justify-center rounded-xl text-white/90 transition hover:bg-white/20"
            >
              <Icon className="size-5" />
            </button>
          ))}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex size-10 items-center justify-center rounded-xl text-white/90 transition hover:bg-white/20"
                title="Cài đặt"
              >
                <Settings className="size-5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              side="right"
              align="end"
              sideOffset={10}
              className="w-56 rounded-xl border border-slate-200 p-1.5 shadow-lg"
            >
              <DropdownMenuItem
                className="h-10 rounded-md px-2.5"
                onSelect={() => setIsProfileOpen(true)}
              >
                <User className="mr-2 size-4.5 text-slate-700" />
                <span className="text-sm text-slate-800">Thông tin tài khoản</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="h-10 rounded-md px-2.5">
                <Settings className="mr-2 size-4.5 text-slate-700" />
                <span className="text-sm text-slate-800">Cài đặt</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="h-10 rounded-md px-2.5">
                <Database className="mr-2 size-4.5 text-slate-700" />
                <span className="text-sm text-slate-800">Dữ liệu</span>
                <ChevronRight className="ml-auto size-3.5 text-slate-500" />
              </DropdownMenuItem>
              <DropdownMenuItem className="h-10 rounded-md px-2.5">
                <Globe className="mr-2 size-4.5 text-slate-700" />
                <span className="text-sm text-slate-800">Ngôn ngữ</span>
                <ChevronRight className="ml-auto size-3.5 text-slate-500" />
              </DropdownMenuItem>
              <DropdownMenuItem className="h-10 rounded-md px-2.5">
                <CircleHelp className="mr-2 size-4.5 text-slate-700" />
                <span className="text-sm text-slate-800">Hỗ trợ</span>
                <ChevronRight className="ml-auto size-3.5 text-slate-500" />
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="h-10 rounded-md px-2.5 text-red-600 focus:bg-red-50 focus:text-red-600"
                onClick={() => setIsConfirmLogoutOpen(true)}
              >
                <LogOut className="mr-2 size-4.5" />
                <span className="text-sm">Đăng xuất</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col">
        <section className="flex-1 overflow-hidden bg-white">
          <Outlet />
        </section>
      </main>

      <AlertDialog open={isConfirmLogoutOpen} onOpenChange={setIsConfirmLogoutOpen}>
        <AlertDialogContent size="sm" className="max-w-md rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl">Đăng xuất</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có muốn đăng xuất khỏi Unicall không?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoggingOut}>Không</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              disabled={isLoggingOut}
              onClick={handleLogout}
            >
              {isLoggingOut ? "Đang đăng xuất..." : "Đăng xuất"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <UserProfileDialog
        open={isProfileOpen}
        onOpenChange={setIsProfileOpen}
        onProfileChanged={(profile) => setMe(profile)}
      />

      {!isOnChatRoute ? (
        <>
          <IncomingCallPopup
            open={globalCall.phase !== "idle"}
            phase={globalCall.phase === "idle" ? "outgoing" : globalCall.phase}
            callerName={globalCallPeer?.name ?? "Người dùng"}
            callerAvatar={globalCallPeer?.avatar}
            startedAt={globalCall.activeCall?.startedAt}
            ringDeadlineAt={globalCall.ringDeadlineAt}
            ringDurationMs={globalCall.ringDurationMs}
            statusMessage={globalCall.statusMessage}
            onAccept={globalCall.acceptIncomingCall}
            onReject={globalCall.rejectIncomingCall}
            onEnd={globalCall.endCurrentCall}
          />
          <audio ref={globalCall.remoteAudioRef} autoPlay playsInline className="hidden" />
        </>
      ) : null}
    </div>
  )
}
