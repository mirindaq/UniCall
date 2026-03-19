import { useMemo, useState } from "react"
import { ArrowUpDown, SlidersHorizontal } from "lucide-react"

import { communityList } from "@/mock/friendship.data"
import {
  AvatarStack,
  FriendshipEmptyState,
  FriendshipFilterChips,
  FriendshipIconSelect,
  FriendshipTabTitle,
  InlineMoreButton,
  type SelectOption,
  ZeroDataState,
} from "@/components/friend_ship"

type CommunityFilter = "all" | "study" | "sports" | "technology" | "club"
type CommunitySort = "recent" | "members" | "name"

const communitySortOptions: SelectOption[] = [
  { value: "recent", label: "Hoạt động (mới đến cũ)" },
  { value: "members", label: "Thành viên nhiều nhất" },
  { value: "name", label: "Tên (A-Z)" },
]

const communityFilterOptions: SelectOption[] = [
  { value: "all", label: "Tất cả" },
  { value: "study", label: "Học tập" },
  { value: "sports", label: "Thể thao" },
  { value: "technology", label: "Công nghệ" },
  { value: "club", label: "Câu lạc bộ" },
]

export function CommunitiesTab() {
  const [sortBy, setSortBy] = useState<CommunitySort>("recent")
  const [filterBy, setFilterBy] = useState<CommunityFilter>("all")

  const filteredCommunities = useMemo(() => {
    const result = communityList.filter(
      (community) => filterBy === "all" || community.category === filterBy,
    )

    if (sortBy === "members") {
      return [...result].sort((a, b) => b.members - a.members)
    }

    if (sortBy === "name") {
      return [...result].sort((a, b) => a.name.localeCompare(b.name, "vi"))
    }

    return [...result].sort((a, b) => a.activityOrder - b.activityOrder)
  }, [filterBy, sortBy])

  if (communityList.length === 0) {
    return (
      <ZeroDataState
        title="Chưa có nhóm và cộng đồng nào"
        description="Khi bạn tham gia nhóm hoặc cộng đồng, danh sách sẽ hiển thị tại đây."
      />
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <FriendshipTabTitle title={`Nhóm và cộng đồng (${filteredCommunities.length})`} />

      <div className="flex min-h-0 flex-1 p-4">
        <div className="flex h-full min-h-0 w-full flex-col rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <div className="grid gap-3 lg:grid-cols-[320px_320px]">
            <FriendshipIconSelect
              icon={ArrowUpDown}
              value={sortBy}
              onValueChange={(value) => setSortBy(value as CommunitySort)}
              placeholder="Hoạt động (mới đến cũ)"
              options={communitySortOptions}
            />

            <FriendshipIconSelect
              icon={SlidersHorizontal}
              value={filterBy}
              onValueChange={(value) => setFilterBy(value as CommunityFilter)}
              placeholder="Tất cả"
              options={communityFilterOptions}
            />
          </div>

          <div className="mt-3 space-y-3 rounded-xl bg-slate-50 p-3">
            <FriendshipFilterChips
              title="Sắp xếp:"
              value={sortBy}
              onValueChange={(value) => setSortBy(value as CommunitySort)}
              options={communitySortOptions}
              activeClassName="bg-blue-600 text-white"
            />
            <FriendshipFilterChips
              title="Lọc:"
              value={filterBy}
              onValueChange={(value) => setFilterBy(value as CommunityFilter)}
              options={communityFilterOptions}
              activeClassName="bg-slate-900 text-white"
            />
          </div>

          {filteredCommunities.length === 0 ? (
            <FriendshipEmptyState
              title="Không tìm thấy nhóm hoặc cộng đồng"
              description="Hãy thử thay đổi bộ lọc hoặc tìm kiếm bằng từ khóa khác."
            />
          ) : (
            <div className="mt-4 flex-1 min-h-0 space-y-2 overflow-auto pr-1">
              {filteredCommunities.map((community) => (
                <div
                  key={community.id}
                  className="flex items-center justify-between rounded-xl px-2 py-2.5 transition hover:bg-slate-50"
                >
                  <div className="flex min-w-0 items-center gap-4">
                    <AvatarStack
                      avatars={community.avatars}
                      extraMembers={community.extraMembers}
                    />
                    <div className="min-w-0">
                      <p className="truncate text-base font-semibold tracking-tight text-slate-900">
                        {community.name}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
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
