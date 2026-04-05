import { useEffect, useMemo, useState } from "react"
import { Clock3, UsersRound, X } from "lucide-react"
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
import { friendRequestService, friendService, type RelationshipStatus } from "@/services/friend/friend.service"
import { userService } from "@/services/user/user.service"
import type { UserSearchItem } from "@/types/user.type"

const RECENT_MAX = 8
const RECENT_STORAGE_KEY_PREFIX = "unicall:add-friend-recent-users"

type AddFriendDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentIdentityUserId: string | null
  myFirstName: string
  myLastName: string
  onOpenUserProfile: (user: UserSearchItem) => void
}

export function AddFriendDialog({
  open,
  onOpenChange,
  currentIdentityUserId,
  myFirstName,
  myLastName,
  onOpenUserProfile,
}: AddFriendDialogProps) {
  const [phoneKeyword, setPhoneKeyword] = useState("")
  const [searchedUsers, setSearchedUsers] = useState<UserSearchItem[]>([])
  const [recentUsers, setRecentUsers] = useState<UserSearchItem[]>([])
  const [relationshipMap, setRelationshipMap] = useState<Record<string, RelationshipStatus>>({})
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPage, setTotalPage] = useState(1)
  const [isSearching, setIsSearching] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [isSendingToId, setIsSendingToId] = useState<string | null>(null)

  const bestMatch = searchedUsers[0] ?? null
  const suggestedUsers = searchedUsers.slice(1, 4)

  const canSearch = useMemo(
    () => phoneKeyword.trim().length > 0 && !isSearching && !isLoadingMore,
    [phoneKeyword, isSearching, isLoadingMore],
  )
  const hasMore = currentPage < totalPage
  const recentStorageKey = useMemo(
    () => `${RECENT_STORAGE_KEY_PREFIX}:${currentIdentityUserId ?? "guest"}`,
    [currentIdentityUserId],
  )

  const loadRecentUsersFromStorage = () => {
    try {
      const raw = window.localStorage.getItem(recentStorageKey)
      if (!raw) {
        setRecentUsers([])
        return
      }
      const parsed = JSON.parse(raw) as UserSearchItem[]
      if (!Array.isArray(parsed)) {
        setRecentUsers([])
        return
      }
      const normalized = parsed.filter((item) => item?.identityUserId).slice(0, RECENT_MAX)
      setRecentUsers(normalized)
    } catch {
      setRecentUsers([])
    }
  }

  useEffect(() => {
    if (!open || recentUsers.length === 0) {
      return
    }
    void resolveRelationship(recentUsers)
  }, [open, recentUsers])

  useEffect(() => {
    loadRecentUsersFromStorage()
  }, [recentStorageKey])

  useEffect(() => {
    if (!open) {
      return
    }
    loadRecentUsersFromStorage()
  }, [open, recentStorageKey])

  const resolveRelationship = async (users: UserSearchItem[]) => {
    if (!currentIdentityUserId || users.length === 0) {
      return
    }
    const relationshipEntries = await Promise.all(
      users.map(async (user) => {
        if (user.identityUserId === currentIdentityUserId) {
          return [user.identityUserId, "NONE"] as const
        }
        try {
          const response = await friendService.checkRelationship(currentIdentityUserId, user.identityUserId)
          const payload = response.data as
            | { areFriends?: boolean; note?: string; meSent?: boolean }
            | RelationshipStatus

          if (typeof payload === "string") {
            return [user.identityUserId, payload] as const
          }
          if (payload?.areFriends) {
            return [user.identityUserId, "FRIEND"] as const
          }
          if (payload?.note) {
            return [user.identityUserId, payload.meSent ? "SENT" : "RECEIVED"] as const
          }
          return [user.identityUserId, "NONE"] as const
        } catch {
          return [user.identityUserId, "NONE"] as const
        }
      }),
    )
    setRelationshipMap((prev) => ({ ...prev, ...Object.fromEntries(relationshipEntries) }))
  }

  const pushRecent = (user: UserSearchItem) => {
    setRecentUsers((prev) => {
      const next = [user, ...prev.filter((item) => item.identityUserId !== user.identityUserId)]
      const trimmed = next.slice(0, RECENT_MAX)
      try {
        window.localStorage.setItem(recentStorageKey, JSON.stringify(trimmed))
      } catch {
        // ignore localStorage write errors
      }
      return trimmed
    })
  }

  const mergeRecentUsers = (users: UserSearchItem[]) => {
    if (users.length === 0) {
      return
    }
    setRecentUsers((prev) => {
      const map = new Map<string, UserSearchItem>()
      for (const item of prev) {
        map.set(item.identityUserId, item)
      }
      for (const item of users) {
        map.set(item.identityUserId, item)
      }
      const merged = Array.from(map.values())
      const ranked = [
        ...users,
        ...merged.filter((item) => !users.some((u) => u.identityUserId === item.identityUserId)),
      ]
      const trimmed = ranked.slice(0, RECENT_MAX)
      try {
        window.localStorage.setItem(recentStorageKey, JSON.stringify(trimmed))
      } catch {
        // ignore localStorage write errors
      }
      return trimmed
    })
  }

  const openProfileDialog = (user: UserSearchItem) => {
    pushRecent(user)
    handleDialogOpenChange(false)
    onOpenUserProfile(user)
  }

  const handleSearch = async () => {
    if (!currentIdentityUserId) {
      toast.error("Không xác định được tài khoản hiện tại.")
      return
    }

    const parsed = parseVietnamPhone(phoneKeyword)
    if (!parsed.valid || !parsed.normalized) {
      toast.error("Số điện thoại không hợp lệ.")
      return
    }

    setIsSearching(true)
    try {
      const response = await userService.searchUsers({
        keyword: parsed.normalized,
        page: 1,
        limit: 8,
      })
      const users = response.data.items ?? []
      setSearchedUsers(users)
      mergeRecentUsers(users)
      setCurrentPage(response.data.page ?? 1)
      setTotalPage(response.data.totalPage ?? 1)
      setRelationshipMap({})
      await resolveRelationship(users)

      if (users.length === 0) {
        toast.error("Không tìm thấy tài khoản với số điện thoại này.")
        return
      }

      openProfileDialog(users[0])
    } catch {
      toast.error("Tìm kiếm thất bại, vui lòng thử lại.")
      setSearchedUsers([])
      setRelationshipMap({})
      setCurrentPage(1)
      setTotalPage(1)
    } finally {
      setIsSearching(false)
    }
  }

  const handleLoadMore = async () => {
    if (!currentIdentityUserId || !hasMore || isLoadingMore || isSearching) {
      return
    }

    const parsed = parseVietnamPhone(phoneKeyword)
    if (!parsed.valid || !parsed.normalized) {
      toast.error("Số điện thoại không hợp lệ.")
      return
    }

    setIsLoadingMore(true)
    try {
      const nextPage = currentPage + 1
      const response = await userService.searchUsers({
        keyword: parsed.normalized,
        page: nextPage,
        limit: 8,
      })
      const incomingUsers = response.data.items ?? []
      const existingIds = new Set(searchedUsers.map((user) => user.identityUserId))
      const appended = incomingUsers.filter((user) => !existingIds.has(user.identityUserId))

      setSearchedUsers((prev) => [...prev, ...appended])
      setCurrentPage(response.data.page ?? nextPage)
      setTotalPage(response.data.totalPage ?? totalPage)
      await resolveRelationship(appended)
    } catch {
      toast.error("Tải thêm thất bại, vui lòng thử lại.")
    } finally {
      setIsLoadingMore(false)
    }
  }

  const handleAddFriend = async (user: UserSearchItem) => {
    if (!currentIdentityUserId || isSendingToId) {
      return
    }
    setIsSendingToId(user.identityUserId)
    const defaultMessage = `Xin chào ${user.firstName || "bạn"}. Mình là ${myFirstName} ${myLastName}. Mình tìm thấy bạn qua số điện thoại!`
    try {
      await friendRequestService.createFriendRequest({
        idAccountSent: currentIdentityUserId,
        idAccountReceive: user.identityUserId,
        firstName: myFirstName,
        lastName: myLastName,
        content: defaultMessage,
      })
      setRelationshipMap((prev) => ({ ...prev, [user.identityUserId]: "SENT" }))
      toast.success("Đã gửi lời mời kết bạn.")
    } catch {
      toast.error("Gửi lời mời kết bạn thất bại.")
    } finally {
      setIsSendingToId(null)
    }
  }

  const resetSearchState = () => {
    setPhoneKeyword("")
    setSearchedUsers([])
    setCurrentPage(1)
    setTotalPage(1)
    setIsSearching(false)
    setIsLoadingMore(false)
    setIsSendingToId(null)
  }

  const handleDialogOpenChange = (nextOpen: boolean) => {
    onOpenChange(nextOpen)
    if (!nextOpen) {
      resetSearchState()
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={handleDialogOpenChange}
    >
      <DialogContent
        showCloseButton={false}
        overlayClassName="bg-black/60"
        style={{ width: 540, maxWidth: "calc(100vw - 2rem)" }}
        className="gap-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-0 shadow-2xl"
      >
        <DialogHeader className="flex-row items-center justify-between border-b border-slate-200 bg-slate-50/80 px-4 py-3">
          <DialogTitle className="text-xl leading-none font-semibold text-slate-800">
            Thêm bạn
          </DialogTitle>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="h-8 w-8 rounded-md text-slate-600 hover:bg-slate-200"
            onClick={() => handleDialogOpenChange(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>

        <div className="space-y-4 px-5 py-4">
          <div className="flex items-end gap-4">

            <div className="flex-1">
              <Input
                value={phoneKeyword}
                onChange={(event) => setPhoneKeyword(event.target.value)}
                placeholder="Số điện thoại"
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault()
                    void handleSearch()
                  }
                }}
                className="h-10 rounded-xl border-slate-200 bg-slate-50 px-3 text-sm shadow-none placeholder:text-slate-400 focus-visible:ring-0"
              />
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold text-slate-600">Kết quả gần nhất</p>

            {isSearching ? (
              <p className="py-4 text-sm text-slate-500">Đang tìm kiếm...</p>
            ) : searchedUsers.length === 0 ? (
              recentUsers.length === 0 ? (
                <p className="py-4 text-sm text-slate-500">Nhập số điện thoại để tìm bạn bè.</p>
              ) : (
                <div className="space-y-2">
                    <p className="flex items-center gap-1 text-sm text-slate-500">
                      <Clock3 className="h-4 w-4" />
                      Đã tìm kiếm gần đây
                    </p>
                  {recentUsers.map((user) => (
                    <UserRow
                      key={user.identityUserId}
                      currentIdentityUserId={currentIdentityUserId}
                      user={user}
                      relationshipStatus={relationshipMap[user.identityUserId] ?? "NONE"}
                      isSending={isSendingToId === user.identityUserId}
                      onAddFriend={() => void handleAddFriend(user)}
                      onOpenProfile={() => openProfileDialog(user)}
                      showAddButton
                    />
                  ))}
                </div>
              )
            ) : (
              <div className="space-y-3">
                {bestMatch ? (
                  <UserRow
                    currentIdentityUserId={currentIdentityUserId}
                    user={bestMatch}
                    relationshipStatus={relationshipMap[bestMatch.identityUserId] ?? "NONE"}
                    isSending={isSendingToId === bestMatch.identityUserId}
                    onAddFriend={() => void handleAddFriend(bestMatch)}
                    onOpenProfile={() => openProfileDialog(bestMatch)}
                    showAddButton={false}
                  />
                ) : null}

                {suggestedUsers.length > 0 ? (
                  <>
                    <p className="flex items-center gap-1 text-sm text-slate-500">
                      <UsersRound className="h-4 w-4" />
                      Có thể bạn quen
                    </p>
                    {suggestedUsers.map((user) => (
                      <UserRow
                        key={user.identityUserId}
                        currentIdentityUserId={currentIdentityUserId}
                        user={user}
                        relationshipStatus={relationshipMap[user.identityUserId] ?? "NONE"}
                        isSending={isSendingToId === user.identityUserId}
                        onAddFriend={() => void handleAddFriend(user)}
                        onOpenProfile={() => openProfileDialog(user)}
                        showAddButton
                      />
                    ))}
                    {hasMore ? (
                      <button
                        type="button"
                        className="text-sm font-semibold text-blue-600 hover:underline disabled:text-slate-400"
                        onClick={() => void handleLoadMore()}
                        disabled={isLoadingMore}
                      >
                        {isLoadingMore ? "Đang tải..." : "Xem thêm"}
                      </button>
                    ) : null}
                  </>
                ) : null}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="flex-row flex-nowrap justify-end gap-2 border-t border-slate-200 bg-slate-50 px-4 py-3">
          <Button
            type="button"
            variant="secondary"
            className="h-9 min-w-21 shrink-0 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-100"
            onClick={() => handleDialogOpenChange(false)}
          >
            Hủy
          </Button>
          <Button
            type="button"
            className="h-9 min-w-21 shrink-0 rounded-lg bg-blue-600 px-3 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-blue-300"
            disabled={!canSearch}
            onClick={() => void handleSearch()}
          >
            Tìm kiếm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function UserRow({
  currentIdentityUserId,
  user,
  relationshipStatus,
  isSending,
  onAddFriend,
  onOpenProfile,
  showAddButton,
}: {
  currentIdentityUserId: string | null
  user: UserSearchItem
  relationshipStatus: RelationshipStatus
  isSending: boolean
  onAddFriend: () => void
  onOpenProfile: () => void
  showAddButton: boolean
}) {
  const fullName = user.fullName || `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim()
  const fallback = toFallback(fullName)
  const isSelf = currentIdentityUserId != null && user.identityUserId === currentIdentityUserId
  const actionLabel =
    isSelf
      ? "Bạn"
      : relationshipStatus === "FRIEND"
      ? "Bạn bè"
      : relationshipStatus === "SENT"
        ? "Đã gửi"
        : relationshipStatus === "RECEIVED"
          ? "Đã nhận"
          : isSending
            ? "Đang gửi..."
            : "Kết bạn"
  const canSend = !isSelf && relationshipStatus === "NONE" && !isSending

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        className="flex min-w-0 flex-1 items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-slate-50"
        onClick={onOpenProfile}
      >
        <Avatar className="h-12 w-12">
          <AvatarImage src={user.avatar ?? undefined} alt={fullName} />
          <AvatarFallback>{fallback}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-semibold text-slate-800">{fullName}</p>
          <p className="truncate text-[12px] text-slate-500">{normalizePhone(user.phoneNumber)}</p>
        </div>
      </button>
      {showAddButton ? (
        <Button
          type="button"
          variant="outline"
          className="h-8 min-w-22 rounded-lg border-blue-600 px-3 text-blue-600 hover:bg-blue-50 disabled:border-slate-300 disabled:text-slate-400"
          disabled={!canSend}
          onClick={onAddFriend}
        >
          {actionLabel}
        </Button>
      ) : null}
    </div>
  )
}

function parseVietnamPhone(input: string): { valid: boolean; normalized: string | null } {
  const digits = input.replace(/\D/g, "")
  if (/^0\d{9}$/.test(digits)) {
    return { valid: true, normalized: digits }
  }
  if (/^84\d{9}$/.test(digits)) {
    return { valid: true, normalized: `0${digits.slice(2)}` }
  }
  return { valid: false, normalized: null }
}

function normalizePhone(phone?: string) {
  if (!phone) {
    return "--"
  }
  return phone
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




