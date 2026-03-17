import { useMemo, useState } from "react"
import { ArrowUpDown, Search, SlidersHorizontal } from "lucide-react"

import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { communityList } from "@/pages/user/friend_ship/friendship.data"
import {
  AvatarStack,
  FriendshipEmptyState,
  InlineMoreButton,
  ZeroDataState,
} from "@/pages/user/friend_ship/shared"

type CommunityFilter = "all" | "study" | "sports" | "technology" | "club"
type CommunitySort = "recent" | "members" | "name"

export function CommunitiesTab() {
  const [search, setSearch] = useState("")
  const [sortBy, setSortBy] = useState<CommunitySort>("recent")
  const [filterBy, setFilterBy] = useState<CommunityFilter>("all")

  const filteredCommunities = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase("vi")

    const result = communityList
      .filter((community) => filterBy === "all" || community.category === filterBy)
      .filter((community) =>
        community.name.toLocaleLowerCase("vi").includes(normalizedSearch),
      )

    if (sortBy === "members") {
      return result.toSorted((a, b) => b.members - a.members)
    }

    if (sortBy === "name") {
      return result.toSorted((a, b) => a.name.localeCompare(b.name, "vi"))
    }

    return result.toSorted((a, b) => a.activityOrder - b.activityOrder)
  }, [filterBy, search, sortBy])

  if (communityList.length === 0) {
    return (
      <ZeroDataState
        title="Chưa có nhóm và cộng đồng nào"
        description="Khi bạn tham gia nhóm hoặc cộng đồng, danh sách sẽ hiển thị tại đây."
      />
    )
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-slate-200 px-4 py-5 lg:px-6">
        <h3 className="text-2xl font-semibold text-slate-900">
          Nhóm và cộng đồng ({filteredCommunities.length})
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
                placeholder="Tìm kiếm..."
                className="h-11 rounded-xl border-slate-200 pl-10 shadow-none"
              />
            </div>

            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex -translate-y-[1px] items-center justify-center text-slate-500">
                <ArrowUpDown className="size-4" />
              </span>
              <Select
                value={sortBy}
                onValueChange={(value) => setSortBy(value as CommunitySort)}
              >
                <SelectTrigger className="h-11 w-full rounded-xl border-slate-200 bg-white pl-10 shadow-none">
                  <SelectValue placeholder="Hoạt động (mới đến cũ)" />
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
                    value="recent"
                    className="focus:bg-slate-50 focus:text-slate-700"
                  >
                    Hoạt động (mới đến cũ)
                  </SelectItem>
                  <SelectItem
                    value="members"
                    className="focus:bg-slate-50 focus:text-slate-700"
                  >
                    Thành viên nhiều nhất
                  </SelectItem>
                  <SelectItem
                    value="name"
                    className="focus:bg-slate-50 focus:text-slate-700"
                  >
                    Tên (A-Z)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex -translate-y-[1px] items-center justify-center text-slate-500">
                <SlidersHorizontal className="size-4" />
              </span>
              <Select
                value={filterBy}
                onValueChange={(value) => setFilterBy(value as CommunityFilter)}
              >
                <SelectTrigger className="h-11 w-full rounded-xl border-slate-200 bg-white pl-10 shadow-none">
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
                    value="study"
                    className="focus:bg-slate-50 focus:text-slate-700"
                  >
                    Học tập
                  </SelectItem>
                  <SelectItem
                    value="sports"
                    className="focus:bg-slate-50 focus:text-slate-700"
                  >
                    Thể thao
                  </SelectItem>
                  <SelectItem
                    value="technology"
                    className="focus:bg-slate-50 focus:text-slate-700"
                  >
                    Công nghệ
                  </SelectItem>
                  <SelectItem
                    value="club"
                    className="focus:bg-slate-50 focus:text-slate-700"
                  >
                    Câu lạc bộ
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-4 space-y-3 rounded-2xl bg-slate-50 p-3">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-medium text-slate-500">Sắp xếp:</span>
              {[
                { value: "recent", label: "Hoạt động mới" },
                { value: "members", label: "Nhiều thành viên" },
                { value: "name", label: "Tên (A-Z)" },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setSortBy(option.value as CommunitySort)}
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
                { value: "study", label: "Học tập" },
                { value: "sports", label: "Thể thao" },
                { value: "technology", label: "Công nghệ" },
                { value: "club", label: "Câu lạc bộ" },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setFilterBy(option.value as CommunityFilter)}
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

          {filteredCommunities.length === 0 ? (
            <FriendshipEmptyState
              title="Không tìm thấy nhóm hoặc cộng đồng"
              description="Hãy thử thay đổi bộ lọc hoặc tìm kiếm bằng từ khóa khác."
            />
          ) : (
            <div className="mt-5 space-y-2">
              {filteredCommunities.map((community) => (
                <div
                  key={community.id}
                  className="flex items-center justify-between rounded-2xl px-2 py-3 transition hover:bg-slate-50"
                >
                  <div className="flex min-w-0 items-center gap-4">
                    <AvatarStack
                      avatars={community.avatars}
                      extraMembers={community.extraMembers}
                    />
                    <div className="min-w-0">
                      <p className="truncate text-[28px] font-semibold tracking-tight text-slate-900 lg:text-[18px]">
                        {community.name}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        {community.members} thành viên
                        <span className="mx-2 text-slate-300">•</span>
                        {community.activityLabel}
                      </p>
                    </div>
                  </div>
                  <InlineMoreButton />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
