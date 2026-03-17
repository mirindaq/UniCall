import {
  FlagIcon,
  HeadsetIcon,
  LayoutDashboardIcon,
  MegaphoneIcon,
  MessageCircleMoreIcon,
  ShieldAlertIcon,
  UsersIcon,
  UsersRoundIcon,
  type LucideIcon,
} from "lucide-react"

import { ADMIN_PATH } from "@/constants/admin"

export interface AdminNavItem {
  title: string
  url: string
  icon: LucideIcon
}

export interface AdminNavGroup {
  label: string
  items: AdminNavItem[]
}

export const adminNavGroups: AdminNavGroup[] = [
  {
    label: "Tổng quan",
    items: [
      { title: "Bảng điều khiển", url: `${ADMIN_PATH.ROOT}/${ADMIN_PATH.DASHBOARD}`, icon: LayoutDashboardIcon },
      { title: "Quản lý người dùng", url: `${ADMIN_PATH.ROOT}/${ADMIN_PATH.USERS}`, icon: UsersIcon },
      { title: "Hội thoại", url: `${ADMIN_PATH.ROOT}/${ADMIN_PATH.CONVERSATIONS}`, icon: MessageCircleMoreIcon },
      { title: "Nhóm", url: `${ADMIN_PATH.ROOT}/${ADMIN_PATH.GROUPS}`, icon: UsersRoundIcon },
    ],
  },
  {
    label: "Kiểm duyệt",
    items: [
      { title: "Hàng chờ kiểm duyệt", url: `${ADMIN_PATH.ROOT}/${ADMIN_PATH.MODERATION}`, icon: ShieldAlertIcon },
      { title: "Báo cáo vi phạm", url: `${ADMIN_PATH.ROOT}/${ADMIN_PATH.REPORTS}`, icon: FlagIcon },
      { title: "Thông báo hệ thống", url: `${ADMIN_PATH.ROOT}/${ADMIN_PATH.BROADCASTS}`, icon: MegaphoneIcon },
      { title: "Hỗ trợ khách hàng", url: `${ADMIN_PATH.ROOT}/${ADMIN_PATH.SUPPORT}`, icon: HeadsetIcon },
    ],
  },
]

export function isAdminNavItemActive(pathname: string, item: AdminNavItem) {
  return pathname === item.url || pathname.startsWith(`${item.url}/`)
}
