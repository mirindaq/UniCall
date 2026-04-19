import { ChevronDown, MessageCircle, MoreHorizontal, Pin } from "lucide-react"
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
import { normalizeFileMessageContent } from "@/utils/file-display.util"

const truncateWithEllipsis = (value: string, maxLength = 52): string => {
  const normalized = value.replace(/\s+/g, " ").trim()
  if (normalized.length <= maxLength) {
    return normalized
  }
  return `${normalized.slice(0, maxLength).trimEnd()}...`
}

const formatUnreadBadge = (count: number): string => {
  return count > 5 ? "5+" : `${count}`
}

export default function ChatSidebar() {
  const {
    conversations,
    unreadCountByConversationId,
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

  const totalUnreadCount = useMemo(() => {
    return conversations.reduce((total, conversation) => {
      return total + (unreadCountByConversationId[conversation.idConversation] ?? 0)
    }, 0)
  }, [conversations, unreadCountByConversationId])

  const unreadConversations = useMemo(() => {
    return conversations.filter((conversation) => {
      return (unreadCountByConversationId[conversation.idConversation] ?? 0) > 0
    })
  }, [conversations, unreadCountByConversationId])

  const listForTab = tab === "unread" ? unreadConversations : conversations

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
                  {totalUnreadCount > 0 ? (
                    <span className="ml-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-semibold text-white">
                      {formatUnreadBadge(totalUnreadCount)}
                    </span>
                  ) : null}
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
                    ? "Các cuộc trò chuyện có tin nhắn mới chưa đọc sẽ hiển thị ở đây."
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
              const normalizedLast = normalizeFileMessageContent(chat.lastMessageContent)
              const shouldShowYouPrefix =
                !!currentIdentityUserId && chat.lastMessageSenderId === currentIdentityUserId
              const last = shouldShowYouPrefix && normalizedLast && !normalizedLast.startsWith("Bạn:")
                ? `Bạn: ${normalizedLast}`
                : normalizedLast
              const lastPreview = truncateWithEllipsis(last)
              const timeLabel = formatChatSidebarTime(chat.dateUpdateMessage)
              const isActive = chat.idConversation === selectedConversationId
              const unreadCount = unreadCountByConversationId[chat.idConversation] ?? 0
              const hasUnread = unreadCount > 0

              return (
                <button
                  key={chat.idConversation}
                  type="button"
                  onClick={() => selectConversation(chat.idConversation)}
                  className={cn(
                    "flex w-full items-center gap-3 overflow-hidden rounded-md p-3 text-left transition-colors hover:bg-muted",
                    isActive && "bg-muted"
                  )}
                >
                  <Avatar size="lg">
                    <AvatarImage src={avatar} alt={title} />
                    <AvatarFallback>{title.slice(0, 2)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1 overflow-hidden">
                    <div className="mb-1 grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-baseline gap-2">
                      <h3
                        className={cn(
                          "min-w-0 flex-1 truncate text-sm text-foreground",
                          hasUnread && !isActive ? "font-semibold" : "font-medium",
                        )}
                      >
                        {title}
                      </h3>
                      <span
                        className={cn(
                          "ml-2 max-w-[84px] shrink-0 truncate text-right whitespace-nowrap text-xs",
                          hasUnread && !isActive ? "font-semibold text-blue-600" : "text-muted-foreground",
                        )}
                        title={timeLabel}
                      >
                        {timeLabel}
                      </span>
                    </div>
                    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                      <p
                        className={cn(
                          "min-w-0 truncate text-xs",
                          hasUnread && !isActive ? "font-medium text-slate-700" : "text-muted-foreground",
                        )}
                      >
                        {lastPreview || " "}
                      </p>
                      <div className="ml-2 flex shrink-0 items-center gap-1">
                        {hasUnread ? (
                          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-600 px-1.5 text-[11px] font-semibold text-white">
                            {formatUnreadBadge(unreadCount)}
                          </span>
                        ) : null}
                        {chat.pinned ? <Pin className="size-3 text-slate-500" /> : null}
                      </div>
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



