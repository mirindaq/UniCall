import {
  ChevronDown,
  MessageCircle,
  MoreHorizontal,
} from "lucide-react"
import { useEffect, useMemo, useState } from "react"

import { AddFriendDialog } from "@/components/message/AddFriendDialog"
import { CreateGroupDialog } from "@/components/message/CreateGroupDialog"
import { SearchUserAccountDialog } from "@/components/shared/SearchUserAccountDialog"
import { TopSidebarSearch } from "@/components/shared/TopSidebarSearch"
import { UserSearchResultList } from "@/components/shared/UserSearchResultList"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Spinner } from "@/components/ui/spinner"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useChatPage } from "@/contexts/ChatPageContext"
import { useQuery } from "@/hooks/useQuery"
import { cn } from "@/lib/utils"
import { userService } from "@/services/user/user.service"
import type { PageResponse, ResponseSuccess } from "@/types/api-response"
import type { CreateGroupConversationResponse } from "@/types/chat"
import type { UserSearchItem } from "@/types/user.type"
import { formatChatSidebarTime } from "@/utils/chat-display.util"

export default function ChatSidebar() {
  const {
    conversations,
    conversationsLoading,
    refetchConversations,
    selectConversation,
    selectedConversationId,
    conversationTitle,
    conversationAvatar,
    startChatWithUser,
    isStartingChat,
  } = useChatPage()

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

  /* User search list reset / append — cùng pattern TopSidebarSearch + FriendshipSidebar */
  /* eslint-disable react-hooks/set-state-in-effect */
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
  /* eslint-enable react-hooks/set-state-in-effect */

  const searchedUsers = shouldSearch ? allSearchedUsers : []
  const currentPage = searchUsersResponse?.data?.page ?? 1
  const totalPage = searchUsersResponse?.data?.totalPage ?? 1
  const hasMoreSearchResult = shouldSearch && currentPage < totalPage

  /** Tab "Chưa đọc": chờ API unread; hiện danh sách rỗng kèm empty state. */
  const listForTab = tab === "unread" ? [] : conversations

  const isSearchMode = searchKeyword.trim().length > 0
  const [isAccountDialogOpen, setIsAccountDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<UserSearchItem | null>(null)
  const [isCreateGroupDialogOpen, setIsCreateGroupDialogOpen] = useState(false)
  const [isAddFriendDialogOpen, setIsAddFriendDialogOpen] = useState(false)

  const handleGroupCreated = async (createdGroup: CreateGroupConversationResponse) => {
    await refetchConversations()
    selectConversation(createdGroup.idConversation)
    setTab("all")
    setSearchKeyword("")
  }

  return (
    <div className="flex w-full shrink-0 flex-col border-b border-slate-200 bg-white lg:w-[340px] lg:border-r lg:border-b-0">
      <div className="border-b border-slate-100 px-4 py-4">
        <TopSidebarSearch
          value={searchKeyword}
          onChange={setSearchKeyword}
          placeholder="Tìm kiếm"
          onAddFriend={() => setIsAddFriendDialogOpen(true)}
          onCreateGroup={() => setIsCreateGroupDialogOpen(true)}
        />
        {!isSearchMode ? (
          <div className="mt-4 flex items-center justify-between gap-2">
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
        ) : conversationsLoading ? (
          <div className="flex justify-center py-16">
            <Spinner className="size-8 text-muted-foreground" />
          </div>
        ) : listForTab.length === 0 ? (
          <div className="p-4">
            <Empty className="border-0 bg-transparent py-10">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <MessageCircle />
                </EmptyMedia>
                <EmptyTitle>
                  {tab === "unread" ? "Không có hội thoại chưa đọc" : "Chưa có cuộc trò chuyện"}
                </EmptyTitle>
                <EmptyDescription>
                  {tab === "unread"
                    ? "Các tin mới sẽ hiển thị ở đây khi backend hỗ trợ trạng thái đã đọc."
                    : "Tìm người để nhắn, hoặc đợi tin nhắn mới."}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          </div>
        ) : (
          <div className="space-y-1 p-2">
            {listForTab.map((chat) => {
              const title = conversationTitle(chat)
              const avatar = conversationAvatar(chat)
              const last = chat.lastMessageContent ?? ""
              const timeLabel = formatChatSidebarTime(chat.dateUpdateMessage)
              const isActive = chat.idConversation === selectedConversationId

              return (
                <button
                  key={chat.idConversation}
                  type="button"
                  onClick={() => selectConversation(chat.idConversation)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-md p-3 text-left transition-colors hover:bg-muted",
                    isActive && "bg-muted"
                  )}
                >
                  <Avatar size="lg">
                    <AvatarImage src={avatar} alt={title} />
                    <AvatarFallback>{title.slice(0, 2)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-baseline justify-between">
                      <h3 className="truncate text-sm font-medium text-foreground">{title}</h3>
                      <span className="ml-2 whitespace-nowrap text-xs text-muted-foreground">{timeLabel}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="truncate text-xs text-muted-foreground">{last || " "}</p>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </ScrollArea>

      <SearchUserAccountDialog
        open={isAccountDialogOpen}
        onOpenChange={setIsAccountDialogOpen}
        selectedUser={selectedUser}
        currentIdentityUserId={currentIdentityUserId}
        onStartChat={async (user) => {
          setIsAccountDialogOpen(false)
          setSearchKeyword("")
          await startChatWithUser(user)
        }}
        isStartingChat={isStartingChat}
        myFirstName={myFirstName}
        myLastName={myLastName}
      />

      <CreateGroupDialog
        open={isCreateGroupDialogOpen}
        onOpenChange={setIsCreateGroupDialogOpen}
        currentIdentityUserId={currentIdentityUserId}
        onCreatedGroup={handleGroupCreated}
      />

      <AddFriendDialog
        open={isAddFriendDialogOpen}
        onOpenChange={setIsAddFriendDialogOpen}
        currentIdentityUserId={currentIdentityUserId}
        myFirstName={myFirstName}
        myLastName={myLastName}
        onOpenUserProfile={(user) => {
          setSelectedUser(user)
          setIsAccountDialogOpen(true)
        }}
      />
    </div>
  )
}
