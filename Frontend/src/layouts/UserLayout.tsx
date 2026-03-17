import { Link, NavLink, Outlet, useLocation } from "react-router"
import { Bell, MessageCircle, Settings, Users } from "lucide-react"

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
    <div className="flex min-h-svh bg-slate-100">
      <aside className="flex w-16 flex-col items-center justify-between bg-blue-600 py-4 text-white shadow-lg">
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

        <button
          type="button"
          className="flex size-10 items-center justify-center rounded-xl text-white/90 transition hover:bg-white/20"
          title="Cai dat"
        >
          <Settings className="size-5" />
        </button>
      </aside>

      <main className="flex flex-1 flex-col">
        <header className="border-b bg-white px-6 py-4">
          <h1 className="text-lg font-semibold text-slate-800">{activeTab?.label ?? "User Layout"}</h1>
          <p className="text-sm text-slate-500">Mock giao dien tab ben trai theo yeu cau</p>
        </header>

        <section className="flex-1 p-6">
          <div className="h-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <Outlet />
          </div>
        </section>
      </main>
    </div>
  )
}
