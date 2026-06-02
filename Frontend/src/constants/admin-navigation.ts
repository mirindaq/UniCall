import {
  FileTextIcon,
  LayoutDashboardIcon,
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
      {
        title: "Bảng điều khiển",
        url: `${ADMIN_PATH.ROOT}/${ADMIN_PATH.DASHBOARD}`,
        icon: LayoutDashboardIcon,
      },
      {
        title: "Quản lý người dùng",
        url: `${ADMIN_PATH.ROOT}/${ADMIN_PATH.USERS}`,
        icon: UsersIcon,
      },
    ],
  },
  {
    label: "Quản lý",
    items: [
      {
        title: "Quản lý bài viết",
        url: `${ADMIN_PATH.ROOT}/${ADMIN_PATH.POSTS}`,
        icon: FileTextIcon,
      },
      {
        title: "Quản lý hội nhóm",
        url: `${ADMIN_PATH.ROOT}/${ADMIN_PATH.GROUPS}`,
        icon: UsersRoundIcon,
      },
    ],
  },
]

export function isAdminNavItemActive(pathname: string, item: AdminNavItem) {
  return pathname === item.url || pathname.startsWith(`${item.url}/`)
}
