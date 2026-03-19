import { SeedAvatar } from "@/components/friend_ship/SeedAvatar"
import type { UserSearchItem } from "@/types/user.type"

export function UserSearchResultList({
  title,
  users,
  isLoading,
  isLoadingMore,
  error,
  hasMore,
  onLoadMore,
  onSelectUser,
}: {
  title: string
  users: UserSearchItem[]
  isLoading: boolean
  isLoadingMore?: boolean
  error: unknown
  hasMore?: boolean
  onLoadMore?: () => void
  onSelectUser: (user: UserSearchItem) => void
}) {
  return (
    <div className="space-y-2">
      <h4 className="px-1 text-xs font-semibold text-slate-600">{title}</h4>
      {isLoading ? (
        <p className="px-1 text-xs text-slate-500">Đang tìm...</p>
      ) : error ? (
        <p className="px-1 text-xs text-red-500">Không thể tìm người dùng lúc này</p>
      ) : users.length === 0 ? (
        <p className="px-1 text-xs text-slate-500">Không tìm thấy người dùng</p>
      ) : (
        <div className="space-y-1">
          {users.map((user) => (
            <button
              key={user.identityUserId}
              type="button"
              onClick={() => onSelectUser(user)}
              className="flex w-full items-center gap-3 rounded-xl border border-transparent bg-white px-3 py-3 text-left transition hover:border-slate-200 hover:bg-slate-50"
            >
              <SeedAvatar
                fallback={toFallback(user.fullName || `${user.firstName} ${user.lastName}`)}
                tone="bg-sky-100 text-sky-700"
                className="ring-1 ring-slate-200"
              />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900">{user.fullName}</p>
                <p className="text-xs text-slate-500">{user.phoneNumber}</p>
              </div>
            </button>
          ))}

          {hasMore ? (
            <div className="pt-1">
              <button
                type="button"
                onClick={onLoadMore}
                disabled={isLoadingMore}
                className="h-9 w-full rounded-xl bg-slate-100 text-xs font-semibold text-slate-700 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoadingMore ? "Đang tải..." : "Xem thêm"}
              </button>
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}

function toFallback(fullName: string) {
  const words = fullName
    .trim()
    .split(/\s+/)
    .filter(Boolean)

  if (words.length === 0) {
    return "U"
  }

  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase()
  }

  return `${words[0][0] ?? ""}${words[words.length - 1][0] ?? ""}`.toUpperCase()
}
