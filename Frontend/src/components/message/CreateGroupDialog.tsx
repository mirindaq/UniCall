import { useEffect, useMemo, useState } from "react"
import { Camera, ChevronRight, Search, X } from "lucide-react"
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
import { friendList } from "@/mock/friendship.data"
import { chatService } from "@/services/chat/chat.service"
import { userService } from "@/services/user/user.service"
import type { PageResponse, ResponseSuccess } from "@/types/api-response"
import type { UserSearchItem } from "@/types/user.type"
import type { CreateGroupConversationResponse } from "@/types/chat"

type SelectedMembers = Record<string, MemberOption>

type MemberOption = {
  id: string
  displayName: string
  phoneNumber?: string
  avatar?: string | null
  fallback: string
  source: "search" | "recent"
}

const categoryTabs = [
  "Tất cả",
  "Khách hàng",
  "Gia đình",
  "Công việc",
  "Bạn bè",
  "Trả lời sau",
]

export function CreateGroupDialog({
  open,
  onOpenChange,
  currentIdentityUserId,
  onCreatedGroup,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentIdentityUserId: string | null
  onCreatedGroup?: (group: CreateGroupConversationResponse) => void
}) {
  const [groupName, setGroupName] = useState("")
  const [searchKeyword, setSearchKeyword] = useState("")
  const normalizedKeyword = useMemo(() => searchKeyword.trim(), [searchKeyword])
  const [debouncedKeyword, setDebouncedKeyword] = useState("")
  const [searchPage, setSearchPage] = useState(1)
  const [allSearchedUsers, setAllSearchedUsers] = useState<UserSearchItem[]>([])
  const [selectedMembers, setSelectedMembers] = useState<SelectedMembers>({})
  const [activeCategory, setActiveCategory] = useState("Tất cả")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [nameError, setNameError] = useState<string | null>(null)
  const [memberError, setMemberError] = useState<string | null>(null)

  const shouldSearch = open && debouncedKeyword.length > 0
  const selectedMemberList = useMemo(
    () => Object.values(selectedMembers),
    [selectedMembers]
  )
  const selectedIdentityUserIds = useMemo(
    () => selectedMemberList.map((member) => member.id.trim()),
    [selectedMemberList]
  )
  const hasGroupName = groupName.trim().length > 0
  const hasSelectedMembers = selectedIdentityUserIds.length > 0
  const hasDuplicateMembers =
    new Set(selectedIdentityUserIds).size !== selectedIdentityUserIds.length
  const canCreateGroup =
    hasGroupName && hasSelectedMembers && !hasDuplicateMembers && !isSubmitting

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
    }
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
      const appended = items.filter(
        (item) => !existingIds.has(item.identityUserId)
      )
      return [...prev, ...appended]
    })
  }, [open, searchPage, searchUsersResponse?.data?.items, shouldSearch])

  useEffect(() => {
    if (open) {
      return
    }

    setGroupName("")
    setSearchKeyword("")
    setDebouncedKeyword("")
    setSearchPage(1)
    setAllSearchedUsers([])
    setSelectedMembers({})
    setActiveCategory("Tất cả")
    setIsSubmitting(false)
    setNameError(null)
    setMemberError(null)
  }, [open])

  const recentMembers = useMemo<MemberOption[]>(() => {
    return friendList.slice(0, 14).map((friend) => ({
      id: `recent-${friend.id}`,
      displayName: friend.name,
      fallback: friend.fallback,
      source: "recent",
    }))
  }, [])

  const searchableMembers = useMemo<MemberOption[]>(() => {
    return allSearchedUsers
      .filter((user) => user.identityUserId !== currentIdentityUserId)
      .map((user) => ({
        id: user.identityUserId,
        displayName: user.fullName,
        phoneNumber: user.phoneNumber,
        avatar: user.avatar ?? undefined,
        fallback: toFallback(user.fullName),
        source: "search",
      }))
  }, [allSearchedUsers, currentIdentityUserId])

  const displayedMembers = shouldSearch ? searchableMembers : recentMembers

  const currentPage = searchUsersResponse?.data?.page ?? 1
  const totalPage = searchUsersResponse?.data?.totalPage ?? 1
  const hasMoreSearchResult = shouldSearch && currentPage < totalPage

  const toggleMember = (member: MemberOption) => {
    setSelectedMembers((prev) => {
      if (prev[member.id]) {
        const { [member.id]: _, ...rest } = prev
        return rest
      }

      return {
        ...prev,
        [member.id]: member,
      }
    })
  }

  const handleCreateGroup = async () => {
    const trimmedGroupName = groupName.trim()
    const uniqueMemberIds = Array.from(new Set(selectedIdentityUserIds))
    const isNameInvalid = trimmedGroupName.length === 0
    const isMemberInvalid = selectedIdentityUserIds.length === 0
    const hasDuplicatedMember =
      uniqueMemberIds.length !== selectedIdentityUserIds.length

    setNameError(isNameInvalid ? "Vui lòng nhập tên nhóm." : null)
    setMemberError(
      isMemberInvalid
        ? "Vui lòng chọn ít nhất 1 thành viên."
        : hasDuplicatedMember
          ? "Danh sách thành viên đang bị trùng, vui lòng chọn lại."
          : null
    )

    if (
      isNameInvalid ||
      isMemberInvalid ||
      hasDuplicatedMember ||
      isSubmitting
    ) {
      return
    }

    setIsSubmitting(true)

    try {
      const response = await chatService.createGroupConversation({
        name: trimmedGroupName,
        memberIdentityUserIds: uniqueMemberIds,
      })
      onCreatedGroup?.(response.data)
      toast.success("Tạo nhóm thành công.")
      onOpenChange(false)
    } catch {
      toast.error("Tạo nhóm thất bại, vui lòng thử lại.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        overlayClassName="bg-black/60"
        style={{ width: 520, maxWidth: "calc(100vw - 2rem)" }}
        className="gap-0 overflow-hidden rounded-lg border border-slate-300 bg-white p-0 shadow-xl"
      >
        <DialogHeader className="flex-row items-center justify-between border-b border-slate-300 px-3.5 py-2.5">
          <DialogTitle className="text-[28px] leading-none font-semibold text-slate-800">
            Tạo nhóm
          </DialogTitle>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="h-7 w-7 rounded-sm text-slate-600 hover:bg-slate-100"
            onClick={() => onOpenChange(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>

        <div className="space-y-2.5 px-3.5 pt-2.5 pb-2">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-slate-300 bg-slate-100 text-slate-500"
              title="Ảnh nhóm tạm thời chưa hỗ trợ"
            >
              <Camera className="h-3.5 w-3.5" />
            </button>
            <Input
              value={groupName}
              onChange={(event) => {
                setGroupName(event.target.value)
                if (nameError) {
                  setNameError(null)
                }
              }}
              placeholder="Nhập tên nhóm..."
              className="h-8 rounded-none border-x-0 border-t-0 border-b border-blue-500 px-0 pb-1 text-[14px] text-slate-700 shadow-none placeholder:text-slate-400 focus-visible:border-blue-500 focus-visible:ring-0"
            />
          </div>
          {nameError ? (
            <p className="-mt-1 text-[12px] text-red-500">{nameError}</p>
          ) : null}

          <div className="relative">
            <Search className="pointer-events-none absolute top-2.5 left-3 h-4 w-4 text-slate-400" />
            <Input
              value={searchKeyword}
              onChange={(event) => setSearchKeyword(event.target.value)}
              placeholder="Nhập tên, số điện thoại, hoặc danh sách số điện thoại"
              className="h-9 rounded-full border-slate-300 pr-3 pl-9 text-[13px] text-slate-700 placeholder:text-slate-400 focus-visible:ring-0"
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
                    className={`rounded-full px-2.5 py-1 text-[12px] leading-none font-semibold whitespace-nowrap transition ${
                      active
                        ? "bg-blue-600 text-white"
                        : "bg-slate-200 text-slate-700 hover:bg-slate-300"
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

        <div className="border-t border-slate-300">
          <div className="px-3.5 py-2 text-[25px] font-semibold text-slate-800">
            Trò chuyện gần đây
          </div>
          {memberError ? (
            <p className="px-3.5 pb-1 text-[12px] text-red-500">
              {memberError}
            </p>
          ) : null}

          <ScrollArea
            style={{ height: 392 }}
            className="border-t border-slate-300 **:data-[slot=scroll-area-scrollbar]:w-1.5 **:data-[slot=scroll-area-thumb]:rounded-full **:data-[slot=scroll-area-thumb]:bg-slate-300"
          >
            <div className="space-y-0.5 px-2.5 py-2">
              {!shouldSearch && displayedMembers.length === 0 ? (
                <p className="px-2 py-4 text-sm text-slate-500">
                  Không có dữ liệu gợi ý thành viên.
                </p>
              ) : shouldSearch && isSearchingUsers && searchPage === 1 ? (
                <p className="px-2 py-4 text-sm text-slate-500">
                  Đang tìm kiếm...
                </p>
              ) : shouldSearch && searchUsersError ? (
                <p className="px-2 py-4 text-sm text-red-500">
                  Không thể tìm người dùng lúc này.
                </p>
              ) : shouldSearch && displayedMembers.length === 0 ? (
                <p className="px-2 py-4 text-sm text-slate-500">
                  Không tìm thấy người dùng phù hợp.
                </p>
              ) : (
                <>
                  {displayedMembers.map((member, index) => {
                    const selected = Boolean(selectedMembers[member.id])
                    const showDivider = index === 5

                    return (
                      <div key={member.id}>
                        {showDivider ? (
                          <div className="px-2 py-0.5 text-[24px] leading-none font-semibold text-slate-600">
                            A
                          </div>
                        ) : null}
                        <div
                          className={`flex items-center gap-2 rounded-md px-1 py-0.5 ${selected ? "bg-slate-100" : "hover:bg-slate-50"}`}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              toggleMember(member)
                              if (memberError) {
                                setMemberError(null)
                              }
                            }}
                            className={`h-4.25 w-4.25 shrink-0 rounded-full border transition ${
                              selected
                                ? "border-blue-600 bg-blue-600"
                                : "border-slate-300 bg-white hover:border-slate-400"
                            }`}
                            title={selected ? "Bỏ chọn" : "Chọn"}
                          >
                            {selected ? (
                              <span className="mx-auto mt-0.75 block h-1.5 w-1.5 rounded-full bg-white" />
                            ) : null}
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              toggleMember(member)
                              if (memberError) {
                                setMemberError(null)
                              }
                            }}
                            className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-1.5 py-1.5 text-left"
                          >
                            <Avatar className="h-8 w-8">
                              <AvatarImage
                                src={member.avatar ?? undefined}
                                alt={member.displayName}
                              />
                              <AvatarFallback className="text-[12px]">
                                {member.fallback}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="truncate text-[14px] font-medium text-slate-700">
                                {member.displayName}
                              </p>
                              {member.phoneNumber ? (
                                <p className="truncate text-[11px] text-slate-500">
                                  {member.phoneNumber}
                                </p>
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
        </div>

        <DialogFooter className="flex-row flex-nowrap justify-end gap-2 border-t border-slate-300 bg-slate-100 px-3.5 py-2.5">
          <Button
            type="button"
            variant="secondary"
            className="h-8 min-w-21 shrink-0 rounded-lg border border-slate-300 bg-slate-200 px-3 text-sm font-medium text-slate-700 hover:bg-slate-300"
            onClick={() => onOpenChange(false)}
          >
            Hủy
          </Button>
          <Button
            type="button"
            className="h-8 min-w-21 shrink-0 rounded-lg bg-blue-300 px-3 text-sm font-medium text-white hover:bg-blue-400 disabled:bg-blue-200"
            disabled={!canCreateGroup}
            onClick={handleCreateGroup}
          >
            {isSubmitting ? "Đang tạo nhóm..." : "Tạo nhóm"}
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
