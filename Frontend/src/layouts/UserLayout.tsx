import { Link, NavLink, Outlet, useLocation } from "react-router"
import {
  Bell,
  BriefcaseBusiness,
  CloudUpload,
  FolderKanban,
  MessageCircle,
  Settings,
  Users,
} from "lucide-react"

import { USER_PATH } from "@/constants/user"

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
  const location = useLocation()
  const activeTab = userTabs.find((tab) => location.pathname.startsWith(tab.to))

  return (
    <div className="h-svh overflow-hidden bg-slate-100 p-1">
      <div className="flex h-[calc(100svh-0.5rem)] overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-sm">
        <aside className="flex w-16 flex-col items-center justify-between bg-blue-600 py-4 text-white shadow-lg">
          <div className="flex w-full flex-col items-center gap-4">
            <Link
              to={`${USER_PATH.ROOT}/${USER_PATH.CHAT}`}
              className="flex size-10 items-center justify-center overflow-hidden rounded-full bg-white/25 text-sm font-semibold"
            >
              <span className="flex size-full items-center justify-center bg-[radial-gradient(circle_at_30%_30%,#86efac,#15803d)] text-white">
                U
              </span>
            </Link>

            <nav className="flex w-full flex-col items-center gap-2 px-2">
              {userTabs.map((tab) => {
                const Icon = tab.icon

                return (
                  <NavLink
                    key={tab.to}
                    to={tab.to}
                    className={({ isActive }) =>
                      `group flex size-10 items-center justify-center rounded-xl transition ${
                        isActive ? "bg-white text-blue-600 shadow" : "text-white/90 hover:bg-white/20"
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
            {[CloudUpload, FolderKanban, BriefcaseBusiness, Settings].map((Icon, index) => (
              <button
                key={index}
                type="button"
                className="flex size-10 items-center justify-center rounded-xl text-white/90 transition hover:bg-white/20"
              >
                <Icon className="size-5" />
              </button>
            ))}
          </div>
        </aside>

        <main className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
          <div className="sr-only">{activeTab?.label ?? "User Layout"}</div>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
