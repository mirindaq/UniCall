import { useEffect, useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import { notificationService } from "@/services/notification/notification.service"
import type { NotificationItem } from "@/types/notification"

export function UserNotificationsPage() {
  const [items, setItems] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [markingAll, setMarkingAll] = useState(false)

  const unreadCount = useMemo(() => items.filter((item) => !item.read).length, [items])

  const loadNotifications = async () => {
    setLoading(true)
    try {
      const response = await notificationService.listMyNotifications(1, 30)
      setItems(response.data.items)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadNotifications()
  }, [])

  const handleMarkAsRead = async (notificationId: number) => {
    await notificationService.markAsRead(notificationId)
    setItems((prev) => prev.map((item) => (item.id === notificationId ? { ...item, read: true } : item)))
  }

  const handleMarkAllAsRead = async () => {
    setMarkingAll(true)
    try {
      await notificationService.markAllAsRead()
      setItems((prev) => prev.map((item) => ({ ...item, read: true })))
    } finally {
      setMarkingAll(false)
    }
  }

  return (
    <div className="h-full overflow-auto bg-slate-50 p-3 sm:p-6">
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-xl font-semibold text-slate-800">Thong bao</h2>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
              Chua doc: {unreadCount}
            </span>
            <Button variant="outline" onClick={() => void loadNotifications()} disabled={loading}>
              Lam moi
            </Button>
            <Button onClick={() => void handleMarkAllAsRead()} disabled={markingAll || unreadCount === 0}>
              Danh dau da doc tat ca
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
            Dang tai thong bao...
          </div>
        ) : null}

        {!loading && items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
            Chua co thong bao nao.
          </div>
        ) : null}

        {!loading
          ? items.map((item) => (
              <div
                key={item.id}
                className={`rounded-xl border p-4 shadow-sm transition ${
                  item.read ? "border-slate-200 bg-white" : "border-blue-200 bg-blue-50/60"
                }`}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{item.title}</p>
                    <p className="mt-1 text-sm text-slate-600">{item.content}</p>
                    <p className="mt-2 text-xs text-slate-400">{new Date(item.createdAt).toLocaleString()}</p>
                  </div>
                  {!item.read ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      className="w-full sm:w-auto"
                      onClick={() => void handleMarkAsRead(item.id)}
                    >
                      Da doc
                    </Button>
                  ) : null}
                </div>
              </div>
            ))
          : null}
      </div>
    </div>
  )
}
