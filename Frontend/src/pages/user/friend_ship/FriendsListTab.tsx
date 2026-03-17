import { useMemo, useState } from "react"
import { ArrowUpDown, Search } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { friendList } from "@/pages/user/friend_ship/friendship.data"
import {
  FriendshipEmptyState,
  InlineMoreButton,
  SeedAvatar,
  ZeroDataState,
} from "@/pages/user/friend_ship/shared"

type FriendFilter = "all" | "close" | "business"
type FriendSort = "name" | "recent" | "business"

export function FriendsListTab() {
  const [search, setSearch] = useState("")
  const [sortBy, setSortBy] = useState<FriendSort>("name")
  const [filterBy, setFilterBy] = useState<FriendFilter>("all")

  const filteredFriends = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase("vi")

    const result = friendList
      .filter((friend) => filterBy === "all" || friend.status === filterBy)
      .filter((friend) =>
        friend.name.toLocaleLowerCase("vi").includes(normalizedSearch),
      )

    if (sortBy === "recent") {
      return result.toSorted((a, b) => a.recentOrder - b.recentOrder)
    }

    if (sortBy === "business") {
      return result.toSorted((a, b) => {
        if (a.status === "business" && b.status !== "business") return -1
        if (a.status !== "business" && b.status === "business") return 1
        return a.name.localeCompare(b.name, "vi")
      })
    }

    return result.toSorted((a, b) => a.name.localeCompare(b.name, "vi"))
  }, [filterBy, search, sortBy])

  const groupedFriends = useMemo(
    () =>
      Object.entries(
        filteredFriends.reduce<Record<string, typeof filteredFriends>>(
          (acc, friend) => {
            const firstLetter =
              friend.name[0]
                ?.normalize("NFD")
                .replace(/\p{Diacritic}/gu, "")
                .toUpperCase() ?? "#"
            const groupKey = /[A-Z]/.test(firstLetter) ? firstLetter : "#"
            acc[groupKey] ??= []
            acc[groupKey].push(friend)
            return acc
          },
          {},
        ),
      ).sort(([a], [b]) => a.localeCompare(b, "vi")),
    [filteredFriends],
  )

  if (friendList.length === 0) {
    return (
      <ZeroDataState
        title="Chưa có bạn bè nào"
        description="Danh sách bạn bè sẽ xuất hiện ở đây khi bạn bắt đầu kết nối với mọi người."
      />
    )
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-slate-200 px-4 py-5 lg:px-6">
        <h3 className="text-2xl font-semibold text-slate-900">
          Bạn bè ({filteredFriends.length})
        </h3>
      </div>

      <div className="flex-1 overflow-auto px-4 py-4 lg:px-6">
        <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_320px_320px]">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Tìm bạn"
                className="h-11 rounded-xl border-slate-200 pl-10 shadow-none"
              />
            </div>

            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex -translate-y-[1px] items-center justify-center text-slate-500">
                <ArrowUpDown className="size-4" />
              </span>
              <Select
                value={sortBy}
                onValueChange={(value) => setSortBy(value as FriendSort)}
              >
                <SelectTrigger className="h-11 w-full rounded-xl border-slate-200 bg-white pl-10 shadow-none">
                  <SelectValue placeholder="Tên (A-Z)" />
                </SelectTrigger>
                <SelectContent
                  position="popper"
                  side="bottom"
                  sideOffset={6}
                  avoidCollisions={false}
                  align="start"
                  className="min-w-[var(--radix-select-trigger-width)]"
                >
                  <SelectItem
                    value="name"
                    className="focus:bg-slate-50 focus:text-slate-700"
                  >
                    Tên (A-Z)
                  </SelectItem>
                  <SelectItem
                    value="recent"
                    className="focus:bg-slate-50 focus:text-slate-700"
                  >
                    Tương tác gần đây
                  </SelectItem>
                  <SelectItem
                    value="business"
                    className="focus:bg-slate-50 focus:text-slate-700"
                  >
                    Ưu tiên Business
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Select
              value={filterBy}
              onValueChange={(value) => setFilterBy(value as FriendFilter)}
            >
              <SelectTrigger className="h-11 w-full rounded-xl border-slate-200 bg-white shadow-none">
                <SelectValue placeholder="Tất cả" />
              </SelectTrigger>
              <SelectContent
                position="popper"
                side="bottom"
                sideOffset={6}
                avoidCollisions={false}
                align="start"
                className="min-w-[var(--radix-select-trigger-width)]"
              >
                <SelectItem
                  value="all"
                  className="focus:bg-slate-50 focus:text-slate-700"
                >
                  Tất cả
                </SelectItem>
                <SelectItem
                  value="close"
                  className="focus:bg-slate-50 focus:text-slate-700"
                >
                  Bạn thân
                </SelectItem>
                <SelectItem
                  value="business"
                  className="focus:bg-slate-50 focus:text-slate-700"
                >
                  Business
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="mt-4 space-y-3 rounded-2xl bg-slate-50 p-3">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-medium text-slate-500">Sắp xếp:</span>
              {[
                { value: "name", label: "Tên (A-Z)" },
                { value: "recent", label: "Tương tác gần đây" },
                { value: "business", label: "Ưu tiên Business" },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setSortBy(option.value as FriendSort)}
                  className={`rounded-full px-3 py-1.5 text-sm transition ${
                    sortBy === option.value
                      ? "bg-blue-600 text-white"
                      : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50 hover:text-slate-700"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-medium text-slate-500">Lọc:</span>
              {[
                { value: "all", label: "Tất cả" },
                { value: "close", label: "Bạn thân" },
                { value: "business", label: "Business" },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setFilterBy(option.value as FriendFilter)}
                  className={`rounded-full px-3 py-1.5 text-sm transition ${
                    filterBy === option.value
                      ? "bg-slate-900 text-white"
                      : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50 hover:text-slate-700"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {groupedFriends.length === 0 ? (
            <FriendshipEmptyState
              title="Không tìm thấy bạn bè phù hợp"
              description="Hãy thử thay đổi từ khóa tìm kiếm hoặc bộ lọc để xem nhiều kết quả hơn."
            />
          ) : (
            <div className="mt-5 space-y-8">
              {groupedFriends.map(([letter, items]) => (
                <section key={letter} className="space-y-4">
                  <h4 className="text-3xl font-semibold tracking-tight text-slate-800">
                    {letter}
                  </h4>
                  <div className="space-y-1">
                    {items.map((friend) => (
                      <div
                        key={friend.id}
                        className="flex items-center justify-between rounded-2xl px-2 py-3 transition hover:bg-slate-50"
                      >
                        <div className="flex min-w-0 items-center gap-4">
                          <SeedAvatar
                            fallback={friend.fallback}
                            tone={friend.tone}
                          />
                          <div className="min-w-0 space-y-1">
                            <p className="truncate text-[28px] font-semibold tracking-tight text-slate-900 lg:text-[18px]">
                              {friend.name}
                            </p>
                          </div>
                          {friend.label ? (
                            <Badge className="rounded-md bg-sky-100 px-2 py-1 text-xs font-semibold text-sky-700 hover:bg-sky-100">
                              {friend.label}
                            </Badge>
                          ) : null}
                        </div>
                        <InlineMoreButton />
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
