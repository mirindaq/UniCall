import {
  Bell,
  BriefcaseBusiness,
  CloudUpload,
  FolderKanban,
  MessageCircle,
  Settings,
  Users,
} from "lucide-react"
import { Link, NavLink, Outlet } from "react-router"

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
  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-100">
      <aside className="flex w-16 shrink-0 flex-col items-center justify-between bg-blue-600 py-4 text-white shadow-lg">
        <div className="flex w-full flex-col items-center gap-4">
          <Link
            to={`${USER_PATH.ROOT}/${USER_PATH.CHAT}`}
            className="flex size-10 items-center justify-center rounded-full bg-white/25 text-sm font-semibold"
          >
            U
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

      <main className="flex min-w-0 flex-1 flex-col">
        <section className="flex-1 overflow-hidden bg-white">
          <Outlet />
        </section>
      </main>
    </div>
  )
}
