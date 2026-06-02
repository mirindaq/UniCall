import { useMemo, useState } from "react"
import {
  Bell,
  BellRing,
  CheckCheck,
  CheckCircle2,
  Clock3,
  Loader2,
  MailOpen,
  RefreshCcw,
  Sparkles,
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { useMutation } from "@/hooks/useMutation"
import { useQuery } from "@/hooks/useQuery"
import { notificationService } from "@/services/notification/notification.service"
import type { PageResponse } from "@/types/api-response"
import type { NotificationItem } from "@/types/notification"

const NOTIFICATIONS_PAGE_SIZE = 10

export function UserNotificationsPage() {
  const [items, setItems] = useState<NotificationItem[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [pageInfo, setPageInfo] = useState<PageResponse<NotificationItem> | null>(null)

  const unreadCount = useMemo(() => items.filter((item) => !item.read).length, [items])
  const totalItems = pageInfo?.totalItem ?? items.length
  const totalPages = Math.max(pageInfo?.totalPage ?? 1, 1)
  const pageStart = totalItems === 0 ? 0 : (currentPage - 1) * NOTIFICATIONS_PAGE_SIZE + 1
  const pageEnd = Math.min(currentPage * NOTIFICATIONS_PAGE_SIZE, totalItems)

  const {
    isLoading,
    isRefetching,
    refetch: refetchNotifications,
  } = useQuery(() => notificationService.listMyNotifications(currentPage, NOTIFICATIONS_PAGE_SIZE), {
    enabled: true,
    deps: [currentPage],
    onSuccess: (response) => {
      setItems(response.data.items)
      setPageInfo(response.data)
    },
    onError: () => {
      toast.error("Không thể tải thông báo")
    },
  })

  const loading = isLoading || isRefetching

  const { mutate: markAsRead } = useMutation(
    (variables) => notificationService.markAsRead(Number(variables)),
    {
      onError: () => {
        toast.error("Không thể đánh dấu đã đọc")
      },
    }
  )

  const { mutate: markAllAsRead, isLoading: markingAll } = useMutation(
    () => notificationService.markAllAsRead(),
    {
      onSuccess: () => {
        setItems((prev) => prev.map((item) => ({ ...item, read: true })))
        toast.success("Đã đánh dấu tất cả thông báo là đã đọc")
      },
      onError: () => {
        toast.error("Không thể đánh dấu tất cả")
      },
    }
  )

  const handleMarkAsRead = async (notificationId: number) => {
    try {
      await markAsRead(notificationId)
      setItems((prev) => prev.map((item) => (item.id === notificationId ? { ...item, read: true } : item)))
    } catch {
      // useMutation already shows the user-facing error toast.
    }
  }

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead(undefined)
    } catch {
      // useMutation already shows the user-facing error toast.
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-background">
      <header className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4">
        <div className="flex min-w-0 items-center gap-3">
          <Bell className="size-5 shrink-0 text-slate-800" />
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold text-slate-900">Thông báo</h2>
            <p className="hidden text-xs text-slate-500 sm:block">
              Cập nhật mới nhất từ tin nhắn, lời mời và hoạt động của bạn
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Làm mới thông báo"
            onClick={() => void refetchNotifications()}
            disabled={loading}
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : <RefreshCcw className="size-4" />}
          </Button>
          <Button
            size="sm"
            className="hidden bg-blue-600 hover:bg-blue-700 sm:inline-flex"
            onClick={() => void handleMarkAllAsRead()}
            disabled={markingAll || unreadCount === 0}
          >
            {markingAll ? <Loader2 className="size-4 animate-spin" /> : <CheckCheck className="size-4" />}
            Đánh dấu tất cả
          </Button>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full flex-col gap-4 p-3 sm:p-4 lg:p-6">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <SummaryCard
              icon={BellRing}
              label="Chưa đọc"
              value={unreadCount}
              tone="bg-blue-50 text-blue-700 ring-blue-100"
            />
            <SummaryCard
              icon={MailOpen}
              label="Đã đọc"
              value={Math.max(0, items.length - unreadCount)}
              tone="bg-emerald-50 text-emerald-700 ring-emerald-100"
            />
            <SummaryCard
              icon={Sparkles}
              label="Tổng cộng"
              value={totalItems}
              tone="bg-slate-100 text-slate-700 ring-slate-200"
            />
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900">Gần đây</p>
              <p className="text-xs text-slate-500">
                {totalItems > 0
                  ? `Hiển thị ${pageStart}-${pageEnd} trong ${totalItems} thông báo`
                  : "Tất cả thông báo đã được đọc"}
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="sm:hidden"
              onClick={() => void handleMarkAllAsRead()}
              disabled={markingAll || unreadCount === 0}
            >
              {markingAll ? <Loader2 className="size-4 animate-spin" /> : <CheckCheck className="size-4" />}
              Đọc hết
            </Button>
          </div>

          {loading ? <NotificationsLoading /> : null}

          {!loading && items.length === 0 ? <NotificationsEmpty /> : null}

          {!loading && items.length > 0 ? (
            <div className="space-y-3">
              {items.map((item) => (
                <NotificationRow
                  key={item.id}
                  item={item}
                  onMarkAsRead={() => void handleMarkAsRead(item.id)}
                />
              ))}
            </div>
          ) : null}

          {!loading && totalPages > 1 ? (
            <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
              <p className="text-center text-xs font-medium text-slate-500 sm:text-left">
                Trang {currentPage} / {totalPages}
              </p>
              <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  disabled={currentPage <= 1}
                >
                  Trước
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                  disabled={currentPage >= totalPages}
                >
                  Sau
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Bell
  label: string
  value: number
  tone: string
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-slate-500">{label}</p>
          <p className="mt-1 text-2xl font-semibold leading-none text-slate-900">{value}</p>
        </div>
        <div className={`flex size-10 items-center justify-center rounded-full ring-1 ${tone}`}>
          <Icon className="size-5" />
        </div>
      </div>
    </div>
  )
}

function NotificationRow({
  item,
  onMarkAsRead,
}: {
  item: NotificationItem
  onMarkAsRead: () => void
}) {
  return (
    <article
      className={`group relative overflow-hidden rounded-xl border bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
        item.read ? "border-slate-200" : "border-blue-200 ring-1 ring-blue-100"
      }`}
    >
      {!item.read ? <div className="absolute inset-y-0 left-0 w-1 bg-blue-600" /> : null}
      <div className="flex gap-3">
        <div
          className={`mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full ${
            item.read ? "bg-slate-100 text-slate-500" : "bg-blue-50 text-blue-700"
          }`}
        >
          {item.read ? <CheckCircle2 className="size-5" /> : <BellRing className="size-5" />}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <h3 className="min-w-0 break-words text-sm font-semibold text-slate-900">{item.title}</h3>
                {!item.read ? (
                  <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
                    Mới
                  </span>
                ) : null}
              </div>
              <p className="mt-1 break-words text-sm leading-6 text-slate-600">{item.content}</p>
            </div>

            {!item.read ? (
              <Button
                size="sm"
                variant="secondary"
                className="w-full bg-slate-100 text-slate-700 hover:bg-slate-200 sm:w-auto"
                onClick={onMarkAsRead}
              >
                <CheckCheck className="size-4" />
                Đã đọc
              </Button>
            ) : null}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1">
              <Clock3 className="size-3.5" />
              {formatNotificationTime(item.createdAt)}
            </span>
            {item.conversationName ? (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-600">
                {item.conversationName}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  )
}

function NotificationsLoading() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex gap-3">
            <div className="size-10 animate-pulse rounded-full bg-slate-100" />
            <div className="flex-1 space-y-3">
              <div className="h-4 w-1/3 animate-pulse rounded bg-slate-100" />
              <div className="h-3 w-full animate-pulse rounded bg-slate-100" />
              <div className="h-3 w-2/3 animate-pulse rounded bg-slate-100" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function NotificationsEmpty() {
  return (
    <div className="flex min-h-[360px] items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
      <div className="max-w-sm">
        <div className="mx-auto flex size-20 items-center justify-center rounded-full bg-blue-50 text-blue-300">
          <Bell className="size-10" />
        </div>
        <h3 className="mt-4 text-lg font-semibold text-slate-900">Chưa có thông báo</h3>
        <p className="mt-1 text-sm text-slate-500">
          Khi có tin nhắn, lời mời hoặc cập nhật mới, chúng sẽ xuất hiện tại đây.
        </p>
      </div>
    </div>
  )
}

function formatNotificationTime(value?: string | null) {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "-"
  return date.toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}
