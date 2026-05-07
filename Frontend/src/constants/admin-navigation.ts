import {
  LayoutDashboardIcon,
  UsersIcon,
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
    ],
  },
]

export function isAdminNavItemActive(pathname: string, item: AdminNavItem) {
  return pathname === item.url || pathname.startsWith(`${item.url}/`)
}
