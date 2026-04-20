import { useEffect, useMemo, useState } from "react"
import { Check, ChevronRight, Search, X } from "lucide-react"
import { toast } from "sonner"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useQuery } from "@/hooks/useQuery"
import { chatService } from "@/services/chat/chat.service"
import { friendService, type FriendApiItem } from "@/services/friend/friend.service"
import { userService } from "@/services/user/user.service"
import type { PageResponse, ResponseSuccess } from "@/types/api-response"
import type { UserSearchItem } from "@/types/user.type"

type MemberOption = {
  id: string
  displayName: string
  phoneNumber?: string
  avatar?: string | null
  fallback: string
}

const categoryTabs = [
  "Tất cả",
  "Khách hàng",
  "Gia đình",
  "Công việc",
  "Bạn bè",
  "Trả lời sau",
]

type AddGroupMembersDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  conversationId: string
  currentIdentityUserId: string | null
  existingMemberIds: string[]
  onMembersAdded: () => Promise<void>
}

export function AddGroupMembersDialog({
  open,
  onOpenChange,
  conversationId,
  currentIdentityUserId,
  existingMemberIds,
  onMembersAdded,
}: AddGroupMembersDialogProps) {
  const [searchKeyword, setSearchKeyword] = useState("")
  const normalizedKeyword = useMemo(() => searchKeyword.trim(), [searchKeyword])
  const [debouncedKeyword, setDebouncedKeyword] = useState("")
  const [searchPage, setSearchPage] = useState(1)
  const [allSearchedUsers, setAllSearchedUsers] = useState<UserSearchItem[]>([])
  const [activeCategory, setActiveCategory] = useState("Tất cả")
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({})
  const [recentProfileMap, setRecentProfileMap] = useState<
    Record<string, { displayName: string; avatar?: string }>
  >({})
  const [isResolvingRecentProfiles, setIsResolvingRecentProfiles] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const existingMemberIdSet = useMemo(
    () => new Set(existingMemberIds.map((id) => id.trim())),
    [existingMemberIds],
  )
  const shouldSearch = open && debouncedKeyword.length > 0

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedKeyword(normalizedKeyword)
    }, 500)
    return () => window.clearTimeout(timer)
  }, [normalizedKeyword])

  const {
    data: searchUsersResponse,
    isLoading: isSearchingUsers,
    error: searchUsersError,
  } = useQuery<ResponseSuccess<PageResponse<UserSearchItem>>>(
    () =>
      userService.searchUsers({
        keyword: debouncedKeyword,
        page: searchPage,
        limit: 9,
      }),
    {
      enabled: shouldSearch,
      deps: [debouncedKeyword, searchPage, open],
      onError: () => undefined,
    },
  )

  const {
    data: recentFriendsResponse,
    isLoading: isLoadingRecentMembers,
    error: recentMembersError,
  } = useQuery<ResponseSuccess<FriendApiItem[]>>(
    () => friendService.getAllFriends(currentIdentityUserId as string),
    {
      enabled: open && Boolean(currentIdentityUserId),
      deps: [open, currentIdentityUserId],
      onError: () => undefined,
    },
  )

  useEffect(() => {
    if (!open || !shouldSearch) {
      setSearchPage(1)
      setAllSearchedUsers([])
      return
    }
    setSearchPage(1)
    setAllSearchedUsers([])
  }, [debouncedKeyword, open, shouldSearch])

  useEffect(() => {
    const items = searchUsersResponse?.data?.items ?? []
    if (!open || !shouldSearch || items.length === 0) {
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
  }, [open, searchPage, searchUsersResponse?.data?.items, shouldSearch])

  useEffect(() => {
    if (open) {
      return
    }
    setSearchKeyword("")
    setDebouncedKeyword("")
    setSearchPage(1)
    setAllSearchedUsers([])
    setActiveCategory("Tất cả")
    setSelectedIds({})
    setRecentProfileMap({})
    setIsResolvingRecentProfiles(false)
    setIsSubmitting(false)
  }, [open])

  useEffect(() => {
    if (!open || !currentIdentityUserId) {
      return
    }

    const items = recentFriendsResponse?.data ?? []
    const peerIds = Array.from(
      new Set(
        items
          .map((friend) =>
            friend.idAccountSent === currentIdentityUserId ? friend.idAccountReceive : friend.idAccountSent,
          )
          .filter((id): id is string => Boolean(id && id.trim())),
      ),
    )

    if (peerIds.length === 0) {
      setRecentProfileMap({})
      return
    }

    let cancelled = false
    setIsResolvingRecentProfiles(true)

    void Promise.all(
      peerIds.map(async (peerId) => {
        try {
          const response = await userService.getProfileByIdentityUserId(peerId)
          const profile = response.data
          const displayName = `${profile.firstName ?? ""} ${profile.lastName ?? ""}`.trim()
          return {
            id: peerId,
            displayName: displayName || peerId,
            avatar: profile.avatar ?? undefined,
          }
        } catch {
          return {
            id: peerId,
            displayName: peerId,
            avatar: undefined,
          }
        }
      }),
    )
      .then((profiles) => {
        if (cancelled) {
          return
        }
        const nextMap: Record<string, { displayName: string; avatar?: string }> = {}
        for (const profile of profiles) {
          nextMap[profile.id] = {
            displayName: profile.displayName,
            avatar: profile.avatar,
          }
        }
        setRecentProfileMap(nextMap)
      })
      .finally(() => {
        if (!cancelled) {
          setIsResolvingRecentProfiles(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [open, currentIdentityUserId, recentFriendsResponse?.data])

  const recentMembers = useMemo<MemberOption[]>(() => {
    if (!currentIdentityUserId) {
      return []
    }
    const items = recentFriendsResponse?.data ?? []
    const mapped = items.reduce<MemberOption[]>((acc, friend) => {
        const peerIdentityUserId =
          (friend.idAccountSent === currentIdentityUserId ? friend.idAccountReceive : friend.idAccountSent)
        const displayName = `${friend.firstName ?? ""} ${friend.lastName ?? ""}`.trim()
        const resolvedProfile = recentProfileMap[peerIdentityUserId ?? ""]
        const resolvedName = resolvedProfile?.displayName || displayName
        if (!peerIdentityUserId || !resolvedName) {
          return acc
        }
        acc.push({
          id: peerIdentityUserId,
          displayName: resolvedName,
          avatar: resolvedProfile?.avatar || friend.pathAvartar || friend.avatar,
          fallback: toFallback(resolvedName),
        })
        return acc
      }, [])

    const unique = new Map<string, MemberOption>()
    for (const member of mapped) {
      if (!unique.has(member.id)) {
        unique.set(member.id, member)
      }
    }
    return Array.from(unique.values()).slice(0, 40)
  }, [currentIdentityUserId, recentFriendsResponse?.data, recentProfileMap])

  const searchableMembers = useMemo<MemberOption[]>(() => {
    return allSearchedUsers
      .filter((user) => user.identityUserId !== currentIdentityUserId)
      .map((user) => ({
        id: user.identityUserId,
        displayName: user.fullName,
        phoneNumber: user.phoneNumber,
        avatar: user.avatar ?? undefined,
        fallback: toFallback(user.fullName),
      }))
  }, [allSearchedUsers, currentIdentityUserId])

  const displayedMembers = shouldSearch ? searchableMembers : recentMembers
  const currentPage = searchUsersResponse?.data?.page ?? 1
  const totalPage = searchUsersResponse?.data?.totalPage ?? 1
  const hasMoreSearchResult = shouldSearch && currentPage < totalPage
  const selectedCount = Object.keys(selectedIds).length

  const toggleSelected = (memberId: string) => {
    if (existingMemberIdSet.has(memberId)) {
      return
    }
    setSelectedIds((prev) => {
      if (prev[memberId]) {
        const rest = { ...prev }
        delete rest[memberId]
        return rest
      }
      return { ...prev, [memberId]: true }
    })
  }

  const handleConfirm = async () => {
    const ids = Object.keys(selectedIds)
    if (ids.length === 0 || isSubmitting) {
      return
    }
    setIsSubmitting(true)
    try {
      const response = await chatService.addGroupMembers(conversationId, {
        memberIdentityUserIds: ids,
      })
      await onMembersAdded()
      const addedCount = response.data.addedMemberCount ?? 0
      const createdRequestCount = response.data.createdMemberRequestCount ?? 0
      if (createdRequestCount > 0 && addedCount === 0) {
        toast.success("Đã gửi yêu cầu thêm thành viên để trưởng/phó nhóm duyệt.")
      } else if (createdRequestCount > 0) {
        toast.success(`Đã thêm ${addedCount} thành viên và gửi ${createdRequestCount} yêu cầu duyệt.`)
      } else {
        toast.success("Thêm thành viên thành công.")
      }
      onOpenChange(false)
    } catch {
      toast.error("Thêm thành viên thất bại, vui lòng thử lại.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        overlayClassName="bg-black/60"
        style={{ width: 560, maxWidth: "calc(100vw - 2rem)" }}
        className="gap-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-0 shadow-2xl"
      >
        <DialogHeader className="flex-row items-center justify-between border-b border-slate-200 bg-slate-50/80 px-4 py-3">
          <DialogTitle className="text-xl leading-none font-semibold text-slate-800">
            Thêm thành viên
          </DialogTitle>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="h-8 w-8 rounded-md text-slate-600 hover:bg-slate-200"
            onClick={() => onOpenChange(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>

        <div className="space-y-3 border-b border-slate-200 px-4 pt-4 pb-3">
          <div className="relative">
            <Search className="pointer-events-none absolute top-2.5 left-3 h-4 w-4 text-slate-400" />
            <Input
              value={searchKeyword}
              onChange={(event) => setSearchKeyword(event.target.value)}
              placeholder="Nhập tên, số điện thoại, hoặc danh sách số điện thoại"
              className="h-10 rounded-xl border-slate-200 bg-slate-50 pr-3 pl-9 text-sm text-slate-700 placeholder:text-slate-400 focus-visible:ring-0"
            />
          </div>

          <div className="flex items-center gap-0.5">
            <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto pb-1.5">
              {categoryTabs.map((item) => {
                const active = item === activeCategory
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setActiveCategory(item)}
                    className={`rounded-full px-2.5 py-1 text-xs leading-none font-medium whitespace-nowrap transition ${
                      active ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {item}
                  </button>
                )
              })}
            </div>
            <button
              type="button"
              className="mb-1 flex h-5 w-5 shrink-0 items-center justify-center text-slate-500"
              title="Xem thêm"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div className="px-4 py-2.5 text-base font-semibold text-slate-800">Trò chuyện gần đây</div>

        <ScrollArea
          className="h-[500px] border-t border-slate-200 **:data-[slot=scroll-area-scrollbar]:w-1.5 **:data-[slot=scroll-area-thumb]:rounded-full **:data-[slot=scroll-area-thumb]:bg-slate-300"
        >
          <div className="space-y-0.5 px-2.5 py-2">
            {!shouldSearch && displayedMembers.length === 0 ? (
              isLoadingRecentMembers || isResolvingRecentProfiles ? (
                <p className="px-2 py-4 text-sm text-slate-500">Đang tải danh sách bạn bè...</p>
              ) : recentMembersError ? (
                <p className="px-2 py-4 text-sm text-red-500">Không thể tải danh sách bạn bè lúc này.</p>
              ) : (
                <p className="px-2 py-4 text-sm text-slate-500">Không có dữ liệu gợi ý thành viên.</p>
              )
            ) : shouldSearch && isSearchingUsers && searchPage === 1 ? (
              <p className="px-2 py-4 text-sm text-slate-500">Đang tìm kiếm...</p>
            ) : shouldSearch && searchUsersError ? (
              <p className="px-2 py-4 text-sm text-red-500">Không thể tìm người dùng lúc này.</p>
            ) : shouldSearch && displayedMembers.length === 0 ? (
              <p className="px-2 py-4 text-sm text-slate-500">Không tìm thấy người dùng phù hợp.</p>
            ) : (
              <>
                {displayedMembers.map((member, index) => {
                  const isExistingMember = existingMemberIdSet.has(member.id)
                  const selected = Boolean(selectedIds[member.id])
                  const showDivider = index === 5

                  return (
                    <div key={member.id}>
                      {showDivider ? (
                        <div className="px-2 py-0.5 text-[24px] leading-none font-semibold text-slate-600">A</div>
                      ) : null}
                      <div className={`flex items-center gap-2 rounded-lg px-1.5 py-1 ${
                        isExistingMember || selected ? "bg-blue-50" : "hover:bg-slate-50"
                      }`}>
                        <button
                          type="button"
                          onClick={() => toggleSelected(member.id)}
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition ${
                            isExistingMember || selected
                              ? "border-blue-600 bg-blue-600"
                              : "border-slate-300 bg-white hover:border-slate-400"
                          }`}
                          title={isExistingMember ? "Đã tham gia" : selected ? "Bỏ chọn" : "Chọn"}
                        >
                          {isExistingMember || selected ? <Check className="h-3 w-3 text-white" /> : null}
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleSelected(member.id)}
                          disabled={isExistingMember}
                          className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-1.5 py-1.5 text-left disabled:cursor-default"
                        >
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={member.avatar ?? undefined} alt={member.displayName} />
                            <AvatarFallback className="text-[12px]">{member.fallback}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-slate-700">{member.displayName}</p>
                            {isExistingMember ? (
                              <p className="truncate text-[11px] text-slate-500">Đã tham gia</p>
                            ) : member.phoneNumber ? (
                              <p className="truncate text-[11px] text-slate-500">{member.phoneNumber}</p>
                            ) : null}
                          </div>
                        </button>
                      </div>
                    </div>
                  )
                })}

                {hasMoreSearchResult ? (
                  <div className="pt-2 pb-1">
                    <Button
                      type="button"
                      variant="secondary"
                      className="h-8 w-full text-[13px]"
                      onClick={() => {
                        if (!isSearchingUsers) {
                          setSearchPage((prev) => prev + 1)
                        }
                      }}
                      disabled={isSearchingUsers}
                    >
                      {isSearchingUsers ? "Đang tải..." : "Xem thêm"}
                    </Button>
                  </div>
                ) : null}
              </>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="flex-row flex-nowrap justify-end gap-2 border-t border-slate-200 bg-slate-50 px-4 py-3">
          <Button
            type="button"
            variant="secondary"
            className="h-9 min-w-21 shrink-0 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-100"
            onClick={() => onOpenChange(false)}
          >
            Hủy
          </Button>
          <Button
            type="button"
            className="h-9 min-w-21 shrink-0 rounded-lg bg-blue-600 px-3 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-blue-300"
            disabled={selectedCount === 0 || isSubmitting}
            onClick={handleConfirm}
          >
            {isSubmitting ? "Đang thêm..." : "Xác nhận"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function toFallback(fullName: string) {
  const words = fullName.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) {
    return "U"
  }
  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase()
  }
  return `${words[0][0] ?? ""}${words[words.length - 1][0] ?? ""}`.toUpperCase()
}
