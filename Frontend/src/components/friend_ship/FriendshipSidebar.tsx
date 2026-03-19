import { useEffect, useMemo, useState } from "react"
import type { LucideIcon } from "lucide-react"

import { SearchUserAccountDialog } from "@/components/shared/SearchUserAccountDialog"
import { TopSidebarSearch } from "@/components/shared/TopSidebarSearch"
import { UserSearchResultList } from "@/components/shared/UserSearchResultList"
import { useQuery } from "@/hooks/useQuery"
import { cn } from "@/lib/utils"
import { userService } from "@/services/user/user.service"
import type { PageResponse, ResponseSuccess } from "@/types/api-response"
import type { UserSearchItem } from "@/types/user.type"

export type FriendshipTabItem<T extends string> = {
  value: T
  label: string
  icon: LucideIcon
}

export function FriendshipSidebar<T extends string>({
  tabs,
  activeTab,
  onChangeTab,
}: {
  tabs: FriendshipTabItem<T>[]
  activeTab: T
  onChangeTab: (tab: T) => void
}) {
  const [searchValue, setSearchValue] = useState("")
  const normalizedKeyword = useMemo(() => searchValue.trim(), [searchValue])
  const [debouncedKeyword, setDebouncedKeyword] = useState("")
  const [searchPage, setSearchPage] = useState(1)
  const [allSearchedUsers, setAllSearchedUsers] = useState<UserSearchItem[]>([])
  const shouldSearch = debouncedKeyword.length > 0

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedKeyword(normalizedKeyword)
    }, 500)

    return () => window.clearTimeout(timer)
  }, [normalizedKeyword])

  const { data: myProfileResponse } = useQuery(() => userService.getMyProfile(), {
    onError: () => undefined,
  })
  const currentIdentityUserId = myProfileResponse?.data?.identityUserId ?? null

  const {
    data: searchUsersResponse,
    isLoading: isSearchingUsers,
    error: searchUsersError,
  } = useQuery<ResponseSuccess<PageResponse<UserSearchItem>>>(
    () =>
      userService.searchUsers({
        keyword: debouncedKeyword,
        page: searchPage,
        limit: 5,
      }),
    {
      enabled: shouldSearch,
      deps: [debouncedKeyword, searchPage],
      onError: () => undefined,
    },
  )

  useEffect(() => {
    if (!shouldSearch) {
      setSearchPage(1)
      setAllSearchedUsers([])
      return
    }

    setSearchPage(1)
    setAllSearchedUsers([])
  }, [debouncedKeyword, shouldSearch])

  useEffect(() => {
    const items = searchUsersResponse?.data?.items ?? []
    if (!shouldSearch || items.length === 0) {
      return
    }

    setAllSearchedUsers((prev) => {
      if (searchPage === 1) {
        return items
      }

      const existingIds = new Set(prev.map((item) => item.identityUserId))
      const appended = items.filter((item) => !existingIds.has(item.identityUserId))
      return [...prev, ...appended]
    })
  }, [searchPage, searchUsersResponse?.data?.items, shouldSearch])

  const searchedUsers = shouldSearch ? allSearchedUsers : []
  const currentPage = searchUsersResponse?.data?.page ?? 1
  const totalPage = searchUsersResponse?.data?.totalPage ?? 1
  const hasMoreSearchResult = shouldSearch && currentPage < totalPage
  const isSearchMode = searchValue.trim().length > 0
  const [isAccountDialogOpen, setIsAccountDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<UserSearchItem | null>(null)

  return (
    <aside className="flex w-full shrink-0 flex-col border-b border-slate-200 bg-white lg:w-[340px] lg:border-r lg:border-b-0">
      <div className="border-b border-slate-100 px-4 py-4">
        <TopSidebarSearch value={searchValue} onChange={setSearchValue} placeholder="Tìm kiếm" />
      </div>

      {isSearchMode ? (
        <div className="flex-1 overflow-auto p-3">
          <UserSearchResultList
            title="Tìm bạn theo tên hoặc số điện thoại"
            users={searchedUsers}
            isLoading={isSearchingUsers && searchPage === 1}
            isLoadingMore={isSearchingUsers && searchPage > 1}
            error={searchUsersError}
            hasMore={hasMoreSearchResult}
            onLoadMore={() => {
              if (!isSearchingUsers && hasMoreSearchResult) {
                setSearchPage((prev) => prev + 1)
              }
            }}
            onSelectUser={(user) => {
              setSelectedUser(user)
              setIsAccountDialogOpen(true)
            }}
          />
        </div>
      ) : (
        <div className="flex flex-col gap-2 px-3 py-0">
          {tabs.map((tab) => {
            const TabIcon = tab.icon

            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => onChangeTab(tab.value)}
                className={cn(
                  "flex min-h-12 w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium transition",
                  activeTab === tab.value
                    ? "bg-blue-50 text-blue-700"
                    : "text-slate-700 hover:bg-slate-50",
                )}
              >
                <TabIcon className="size-5 shrink-0" />
                <span className="line-clamp-2">{tab.label}</span>
              </button>
            )
          })}
        </div>
      )}

      <SearchUserAccountDialog
        open={isAccountDialogOpen}
        onOpenChange={setIsAccountDialogOpen}
        selectedUser={selectedUser}
        currentIdentityUserId={currentIdentityUserId}
      />
    </aside>
  )
}
