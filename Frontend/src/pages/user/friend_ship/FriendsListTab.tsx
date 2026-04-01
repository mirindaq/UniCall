import { useMemo, useState, useEffect } from "react"
import { ArrowUpDown } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { useQuery } from "@/hooks/useQuery"
import { friendService } from "@/services/friend/friend.service"
import { userService } from "@/services/user/user.service"
import {
  FriendshipEmptyState,
  FriendshipFilterChips,
  FriendshipIconSelect,
  FriendshipTabTitle,
  InlineMoreButton,
  SeedAvatar,
  type SelectOption,
  ZeroDataState,
} from "@/components/friend_ship"

type FriendFilter = "all" | "NORMAL_FRIEND" | "CLOSE_FRIEND" | "FAMILY"
type FriendSort = "name" | "recent" | "business"

const friendSortOptions: SelectOption[] = [
  { value: "name", label: "Tên (A-Z)" },
  { value: "recent", label: "Tương tác gần đây" },
  { value: "business", label: "Ưu tiên Business" },
]

const friendFilterOptions: SelectOption[] = [
  { value: "all", label: "Tất cả" },
  { value: "NORMAL_FRIEND", label: "Bạn thường" },
  { value: "CLOSE_FRIEND", label: "Bạn thân" },
  { value: "FAMILY", label: "Gia đình" },
]

export function FriendsListTab() {
  const [sortBy, setSortBy] = useState<FriendSort>("name")
  const [filterBy, setFilterBy] = useState<FriendFilter>("all")

  const { data: myProfileResponse } = useQuery(
    () => userService.getMyProfile(),
    {}
  )

  const currentUserId = (myProfileResponse as any)?.data?.identityUserId

  const [friendsData, setFriendsData] = useState<any[]>([])

  useEffect(() => {
    if (currentUserId) {
      friendService
        .getAllFriends(currentUserId)
        .then((response: any) => {
          setFriendsData(response?.data || [])
        })
        .catch((error) => {
          console.error("Error fetching friends:", error)
          setFriendsData([])
        })
    }
  }, [currentUserId])

  const friends = friendsData.map((friend: any) => ({
    id: friend.idFriend,
    name: `${friend.firstName} ${friend.lastName}`.trim(),
    firstName: friend.firstName,
    lastName: friend.lastName,
    fallback: `${friend.firstName?.[0] ?? ""}${friend.lastName?.[0] ?? ""}`.toUpperCase(),
    tone: "base",
    avatar: friend.pathAvartar,
    label: null,
    friendType: "NORMAL_FRIEND",
    recentOrder: 0,
  }))

  const filteredFriends = useMemo(() => {
    let result: any[] = friends

    // Apply filter
    if (filterBy !== "all") {
      result = result.filter((f: any) => f.friendType === filterBy)
    }

    // Apply sort
    switch (sortBy) {
      case "recent":
        result = result.sort((a: any, b: any) => (b.recentOrder ?? 0) - (a.recentOrder ?? 0))
        break
      case "business":
        result = result.sort((a: any, b: any) => {
          if (a.friendType === "NORMAL_FRIEND" && b.friendType !== "NORMAL_FRIEND") return 1
          if (a.friendType !== "NORMAL_FRIEND" && b.friendType === "NORMAL_FRIEND") return -1
          return a.name.localeCompare(b.name, "vi")
        })
        break
      default: // "name"
        result = result.sort((a: any, b: any) => a.name.localeCompare(b.name, "vi"))
    }

    return result
  }, [friends, filterBy, sortBy])

  const groupedFriends = useMemo(
    () =>
      Object.entries(
        filteredFriends.reduce<Record<string, any[]>>(
          (acc: any, friend: any) => {
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

  if (friends.length === 0) {
    return (
      <ZeroDataState
        title="Chưa có bạn bè nào"
        description="Danh sách bạn bè sẽ xuất hiện ở đây khi bạn bắt đầu kết nối với mọi người."
      />
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <FriendshipTabTitle title={`Bạn bè (${filteredFriends.length})`} />

      <div className="flex min-h-0 flex-1 p-4">
        <div className="flex h-full min-h-0 w-full flex-col rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <div className="grid gap-3 lg:grid-cols-[320px_320px]">
            <FriendshipIconSelect
              icon={ArrowUpDown}
              value={sortBy}
              onValueChange={(value) => setSortBy(value as FriendSort)}
              placeholder="Tên (A-Z)"
              options={friendSortOptions}
            />

            <FriendshipIconSelect
              value={filterBy}
              onValueChange={(value) => setFilterBy(value as FriendFilter)}
              placeholder="Tất cả"
              options={friendFilterOptions}
            />
          </div>

          <div className="mt-3 space-y-3 rounded-xl bg-slate-50 p-3">
            <FriendshipFilterChips
              title="Sắp xếp:"
              value={sortBy}
              onValueChange={(value) => setSortBy(value as FriendSort)}
              options={friendSortOptions}
              activeClassName="bg-blue-600 text-white"
            />
            <FriendshipFilterChips
              title="Lọc:"
              value={filterBy}
              onValueChange={(value) => setFilterBy(value as FriendFilter)}
              options={friendFilterOptions}
              activeClassName="bg-slate-900 text-white"
            />
          </div>

          {groupedFriends.length === 0 ? (
            <FriendshipEmptyState
              title="Không tìm thấy bạn bè phù hợp"
              description="Hãy thử thay đổi từ khóa tìm kiếm hoặc bộ lọc để xem nhiều kết quả hơn."
            />
          ) : (
            <div className="mt-4 flex-1 min-h-0 space-y-6 overflow-auto pr-1">
              {groupedFriends.map(([letter, items]: [string, any[]]) => (
                <section key={letter} className="space-y-4">
                  <h4 className="text-xl font-semibold tracking-tight text-slate-800">
                    {letter}
                  </h4>
                  <div className="space-y-1">
                    {items.map((friend: any) => (
                      <div
                        key={friend.id}
                        className="flex items-center justify-between rounded-xl px-2 py-2.5 transition hover:bg-slate-50"
                      >
                        <div className="flex min-w-0 items-center gap-4">
                          <SeedAvatar fallback={friend.fallback} tone={friend.tone} />
                          <div className="min-w-0 space-y-1">
                            <p className="truncate text-base font-semibold tracking-tight text-slate-900">
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
