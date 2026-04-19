import { useState } from "react"
import { Link, Outlet, useLocation, useNavigate } from "react-router"
import { BellIcon, ChevronUpIcon, LogOutIcon, UserIcon } from "lucide-react"
import { toast } from "sonner"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { AUTH_PATH } from "@/constants/auth"
import { useAuth } from "@/contexts/auth-context"
import { adminNavGroups, isAdminNavItemActive, type AdminNavItem } from "@/constants/admin-navigation"
import { authService } from "@/services/auth/auth.service"

function SidebarLogo() {
  const { state } = useSidebar()
  const isCollapsed = state === "collapsed"

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton size="lg" asChild>
          <Link
            to="/admin"
            className={isCollapsed ? "flex items-center justify-center" : "flex items-center justify-center gap-2"}
          >
            {isCollapsed ? (
              <div className="flex size-10 items-center justify-center rounded-xl bg-sky-600 text-sm font-bold text-white">U</div>
            ) : (
              <div className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white">UniCall Quản trị</div>
            )}
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}

export function AdminLayout() {
  const { clearAuthenticated } = useAuth()
  const [isBusy, setIsBusy] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const userName = "Quản trị viên"
  const userRole = "System Admin"

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const handleLogout = async () => {
    setIsBusy(true)
    try {
      await authService.logout()
    } catch {
      // ignore and clear local session
    } finally {
      clearAuthenticated()
      toast.success("Đăng xuất thành công")
      navigate(AUTH_PATH.LOGIN, { replace: true })
      setIsBusy(false)
    }
  }

  const renderMenuItems = (items: AdminNavItem[]) => {
    return items.map((item) => {
      const Icon = item.icon
      const isActive = isAdminNavItemActive(location.pathname, item)

      return (
        <SidebarMenuItem key={item.url}>
          <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
            <Link to={item.url}>
              <Icon />
              <span>{item.title}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      )
    })
  }

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader className="py-3">
          <SidebarLogo />
        </SidebarHeader>

        <SidebarContent>
          {adminNavGroups.map((group) => (
            <SidebarGroup key={group.label}>
              <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>{renderMenuItems(group.items)}</SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </SidebarContent>
      </Sidebar>

      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-16 items-center gap-2 border-b bg-background/95 px-6 backdrop-blur supports-backdrop-filter:bg-background/70">
          <SidebarTrigger className="-ml-1" />
          <div className="ml-2">
            <p className="text-sm font-semibold text-slate-900">Trang quản trị UniCall</p>
            <p className="text-xs text-slate-500">Mock template theo kiến trúc admin layout</p>
          </div>

          <div className="ml-auto flex items-center gap-3">
            <Button variant="ghost" size="icon" className="relative">
              <BellIcon className="size-5" />
              <Badge className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full p-0 text-[10px]">
                3
              </Badge>
            </Button>

            <Separator orientation="vertical" className="h-6" />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <Avatar className="size-8 rounded-lg">
                    <AvatarImage src="/avatars/admin.png" alt={userName} />
                    <AvatarFallback className="rounded-lg">{getInitials(userName)}</AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">{userName}</span>
                    <span className="truncate text-xs">{userRole}</span>
                  </div>
                  <ChevronUpIcon className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>

              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                side="top"
                align="end"
                sideOffset={4}
              >
                <DropdownMenuLabel className="p-0 font-normal">
                  <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                    <Avatar className="size-8 rounded-lg">
                      <AvatarImage src="/avatars/admin.png" alt={userName} />
                      <AvatarFallback className="rounded-lg">{getInitials(userName)}</AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold">{userName}</span>
                      <span className="truncate text-xs">{userRole}</span>
                    </div>
                  </div>
                </DropdownMenuLabel>

                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <UserIcon className="mr-2 size-4" />
                  Thông tin cá nhân
                </DropdownMenuItem>

                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive" onClick={handleLogout} disabled={isBusy}>
                  <LogOutIcon className="mr-2 size-4" />
                  Đăng xuất
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <div className="flex flex-1 flex-col bg-slate-50 p-4">
          <div className="flex flex-1 flex-col rounded-lg bg-white p-6 shadow-sm">
            <Outlet />
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
