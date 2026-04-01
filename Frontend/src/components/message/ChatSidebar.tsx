import {
  ChevronDown,
  MoreHorizontal,
} from "lucide-react"
import { useEffect, useMemo, useState } from "react"

import { SearchUserAccountDialog } from "@/components/shared/SearchUserAccountDialog"
import { TopSidebarSearch } from "@/components/shared/TopSidebarSearch"
import { UserSearchResultList } from "@/components/shared/UserSearchResultList"
import { useQuery } from "@/hooks/useQuery"
import { userService } from "@/services/user/user.service"
import type { PageResponse, ResponseSuccess } from "@/types/api-response"
import type { UserSearchItem } from "@/types/user.type"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import { messageSidebarChats } from "@/mock/message-data"

export default function ChatSidebar() {
  const [tab, setTab] = useState<"all" | "unread">("all")
  const [searchKeyword, setSearchKeyword] = useState("")
  const normalizedKeyword = useMemo(() => searchKeyword.trim(), [searchKeyword])
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
  const myFirstName = myProfileResponse?.data?.firstName ?? ""
  const myLastName = myProfileResponse?.data?.lastName ?? ""

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

  const chats =
    tab === "unread"
      ? messageSidebarChats.filter((chat) => chat.unread > 0)
      : messageSidebarChats
  const isSearchMode = searchKeyword.trim().length > 0
  const [isAccountDialogOpen, setIsAccountDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<UserSearchItem | null>(null)

  return (
    <div className="flex w-full shrink-0 flex-col border-b border-slate-200 bg-white lg:w-[340px] lg:border-r lg:border-b-0">

      <div className="border-b border-slate-100 px-4 py-4">
        <TopSidebarSearch
          value={searchKeyword}
          onChange={setSearchKeyword}
          placeholder="Tìm kiếm"
        />
        {!isSearchMode ? (
          <div className="flex items-center justify-between gap-2  mt-4">
            <Tabs
              value={tab}
              onValueChange={(value) => setTab(value as "all" | "unread")}
              className="w-full"
            >
              <TabsList variant="line" className="h-9 p-0">
                <TabsTrigger value="all" className="px-2">
                  Tất cả
                </TabsTrigger>
                <TabsTrigger value="unread" className="px-2">
                  Chưa đọc
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="flex items-center gap-1 text-xs">
              <Button variant="ghost" size="sm" className="h-8">
                Phân loại
                <ChevronDown className="h-3.5 w-3.5 text-gray-500" />
              </Button>
              <Button variant="ghost" size="icon-sm">
                <MoreHorizontal className="h-4 w-4 text-gray-500" />
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      <ScrollArea className="h-full">
        {isSearchMode ? (
          <div className="p-2">
            <UserSearchResultList
              title="Kết quả tìm kiếm"
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
          <div className="space-y-1 p-2">
            {chats.map((chat) => (
              <button
                key={chat.id}
                type="button"
                className={cn(
                  "flex w-full items-center gap-3 rounded-md p-3 text-left transition-colors hover:bg-muted",
                  chat.id === 1 && "bg-muted"
                )}
              >
                <Avatar size="lg">
                  <AvatarImage src={chat.avatar} alt={chat.name} />
                  <AvatarFallback>{chat.name.slice(0, 2)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-baseline justify-between">
                    <h3 className="truncate text-sm font-medium text-foreground">
                      {chat.name}
                    </h3>
                    <span className="ml-2 text-xs whitespace-nowrap text-muted-foreground">
                      {chat.time}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="truncate text-xs text-muted-foreground">
                      {chat.lastMessage}
                    </p>
                    {chat.unread > 0 && (
                      <Badge className="min-w-[18px] justify-center rounded-full bg-red-600 px-1.5 py-0.5 text-[10px]">
                        {chat.unread > 5 ? "5+" : chat.unread}
                      </Badge>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </ScrollArea>

      <SearchUserAccountDialog
        open={isAccountDialogOpen}
        onOpenChange={setIsAccountDialogOpen}
        selectedUser={selectedUser}
        currentIdentityUserId={currentIdentityUserId}
        myFirstName={myFirstName}
        myLastName={myLastName}
      />
    </div>
  )
}
