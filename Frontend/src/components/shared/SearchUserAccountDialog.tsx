import { useMemo, useEffect, useState } from "react"

import { useQuery } from "@/hooks/useQuery"
import { useMutation } from "@/hooks/useMutation"
import { userService } from "@/services/user/user.service"
import { friendService, friendRequestService, type RelationshipStatus } from "@/services/friend/friend.service"
import type { UserSearchItem, UserProfile } from "@/types/user.type"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { formatDateVi } from "@/utils/date.util"
import { mapGenderToLabel } from "@/utils/gender.util"

export function SearchUserAccountDialog({
  open,
  onOpenChange,
  selectedUser,
  currentIdentityUserId,
  onStartChat,
  isStartingChat = false,
  myFirstName,
  myLastName,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedUser: UserSearchItem | null
  currentIdentityUserId: string | null
  onStartChat?: (user: UserSearchItem) => void | Promise<void>
  isStartingChat?: boolean
  myFirstName: string
  myLastName: string
}) {
  const [relationshipStatus, setRelationshipStatus] = useState<RelationshipStatus | null>(null)
  const [isCheckingRelationship, setIsCheckingRelationship] = useState(false)
  const [isEditingMessage, setIsEditingMessage] = useState(false)
  const [friendRequestMessage, setFriendRequestMessage] = useState("")
  const [meSent, setMeSent] = useState(false)
  const [friendRequestId, setFriendRequestId] = useState<string | null>(null)
  const [friendRequestNote, setFriendRequestNote] = useState<string>("")
  const identityUserId = selectedUser?.identityUserId ?? ""
  const isSelf = currentIdentityUserId != null && currentIdentityUserId === identityUserId
  const { data: profileResponse, isLoading } = useQuery(
    () => userService.getProfileByIdentityUserId(identityUserId),
    {
      enabled: open && identityUserId.length > 0,
      deps: [identityUserId, open],
      onError: () => undefined,
    },
  )

  // Check relationship status when dialog opens
  useEffect(() => {
    const checkRelationshipStatus = async () => {
      if (open && selectedUser?.identityUserId && currentIdentityUserId) {
        setIsCheckingRelationship(true)
        try {
          const response = await friendService.checkRelationship(
            currentIdentityUserId,
            selectedUser.identityUserId
          )
          const responseData = response.data as any

          if (responseData?.areFriends) {
            setRelationshipStatus("FRIEND")
            setMeSent(false)
            setFriendRequestId(null)
            setFriendRequestNote("")
          } else if (responseData?.note) {
            // If there's a note and meSent is true, I sent the request
            // If there's a note and meSent is false, they sent me a request
            if (responseData?.meSent) {
              setRelationshipStatus("SENT")
              setMeSent(true)
            } else {
              setRelationshipStatus("RECEIVED")
              setMeSent(false)
            }
            // Store request ID and note
            setFriendRequestId(responseData?.idRequest ?? null)
            setFriendRequestNote(responseData?.note ?? "")
          } else {
            setRelationshipStatus("NONE")
            setMeSent(false)
            setFriendRequestId(null)
            setFriendRequestNote("")
          }
        } catch (error) {
          console.error("Error checking relationship:", error)
          setRelationshipStatus("NONE")
          setMeSent(false)
          setFriendRequestId(null)
          setFriendRequestNote("")
        } finally {
          setIsCheckingRelationship(false)
        }
      }
    }

    checkRelationshipStatus()
  }, [open, selectedUser?.identityUserId, currentIdentityUserId])

  const profile = profileResponse?.data
  const fullName = useMemo(() => {
    if (!profile) {
      return selectedUser?.fullName ?? ""
    }
    return `${profile.firstName} ${profile.lastName}`.trim()
  }, [profile, selectedUser?.fullName])

  const memoizedRelationshipStatus = useMemo(
    () => relationshipStatus,
    [relationshipStatus, selectedUser?.identityUserId]
  )

  // Handle add friend
  const { mutate: createFriendRequest, isLoading: isAddingFriend } = useMutation(
    () =>
      friendRequestService.createFriendRequest({
        idAccountSent: currentIdentityUserId ?? "",
        idAccountReceive: selectedUser?.identityUserId ?? "",
        firstName: myFirstName ?? "",
        lastName: myLastName ?? "",
        content: friendRequestMessage,
      }),
    {
      onSuccess: () => {
        setRelationshipStatus("SENT")
      },
      onError: (error: unknown) => {
        console.error("Error adding friend:", error)
      },
    },
  )

  const handleAddFriend = () => {
    if (!selectedUser?.identityUserId || !currentIdentityUserId) return

    const defaultMessage = `Xin chào ${selectedUser?.firstName ?? "bạn"}. Mình là ${myFirstName} ${myLastName}. Mình tìm thấy bạn qua số điện thoại!`
    setFriendRequestMessage(defaultMessage)
    setIsEditingMessage(true)
  }

  // Handle accept friend request
  const { mutate: updateFriendRequest, isLoading: isAcceptingFriend } = useMutation(
    async () => {
      if (!friendRequestId) {
        throw new Error("Friend request ID not found")
      }
      return friendRequestService.updateFriendRequestStatus(friendRequestId, {
        status: "ACCEPTED",
      })
    },
    {
      onSuccess: () => {
        setRelationshipStatus("FRIEND")
        setFriendRequestId(null)
        setFriendRequestNote("")
      },
      onError: (error: unknown) => {
        console.error("Error accepting friend:", error)
      },
    },
  )

  const handleAcceptFriend = () => {
    if (!selectedUser?.identityUserId || !currentIdentityUserId) return
    updateFriendRequest(null)
  }

  // Handle reject friend request
  const { mutate: rejectFriendRequest, isLoading: isRejectingFriend } = useMutation(
    async () => {
      if (!friendRequestId) {
        throw new Error("Friend request ID not found")
      }
      return friendRequestService.updateFriendRequestStatus(friendRequestId, {
        status: "REJECTED",
      })
    },
    {
      onSuccess: () => {
        setRelationshipStatus("NONE")
        setFriendRequestId(null)
        setFriendRequestNote("")
      },
      onError: (error: unknown) => {
        console.error("Error rejecting friend:", error)
      },
    },
  )

  const handleRejectFriend = () => {
    if (!selectedUser?.identityUserId || !currentIdentityUserId) return
    rejectFriendRequest(null)
  }

  // Handle cancel friend request
  const { mutate: cancelFriendRequest, isLoading: isCancellingFriend } = useMutation(
    async () => {
      if (!friendRequestId) {
        throw new Error("Friend request ID not found")
      }
      return friendRequestService.updateFriendRequestStatus(friendRequestId, {
        status: "CANCELLED",
      })
    },
    {
      onSuccess: () => {
        setRelationshipStatus("NONE")
        setFriendRequestId(null)
        setFriendRequestNote("")
      },
      onError: (error: unknown) => {
        console.error("Error cancelling friend request:", error)
      },
    },
  )

  const handleCancelFriendRequest = () => {
    if (!selectedUser?.identityUserId || !currentIdentityUserId) return
    cancelFriendRequest(null)
  }

  // Handle call
  const handleCall = () => {
    // TODO: Implement call functionality
  }

  // Handle send message
  const handleSendMessage = async () => {
    if (!selectedUser || !onStartChat) return
    await onStartChat(selectedUser)
  }

  return (
    <>
      {/* Friend Request Message Dialog */}
      <Dialog open={isEditingMessage} onOpenChange={setIsEditingMessage}>
        <DialogContent className="min-w-[480px] gap-0 overflow-hidden bg-white p-0" showCloseButton>
          <DialogHeader className="border-b border-slate-200 px-5 py-4">
            <DialogTitle className="text-lg leading-none font-semibold text-slate-800">
              Gửi lời mời kết bạn
            </DialogTitle>
          </DialogHeader>

          <div className="px-5 py-4">
            <div className="mb-4">
              <p className="text-sm font-medium text-slate-700 mb-2">Người nhận:</p>
              <p className="text-sm text-slate-600">{fullName}</p>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">Lời nhắn:</label>
              <Textarea
                value={friendRequestMessage}
                onChange={(e) => setFriendRequestMessage(e.target.value)}
                placeholder="Viết lời mời kết bạn của bạn..."
                className="min-h-32 resize-none rounded-lg border border-slate-200 p-3 text-sm"
              />
              <p className="text-xs text-slate-400 mt-2">{friendRequestMessage.length}/150 ký tự</p>
            </div>
          </div>

          <div className="flex gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsEditingMessage(false)}
              className="flex-1 rounded-lg bg-slate-200 text-slate-700 hover:bg-slate-300"
            >
              Thông tin
            </Button>
            <Button
              type="button"
              onClick={() => {
                if (!selectedUser?.identityUserId || !currentIdentityUserId) return
                createFriendRequest(null)
                setIsEditingMessage(false)
              }}
              disabled={isAddingFriend || friendRequestMessage.length === 0}
              className="flex-1 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isAddingFriend ? "Đang gửi..." : "Kết bạn"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Main Account Info Dialog */}
      <Dialog open={open} onOpenChange={(newOpen) => {
        onOpenChange(newOpen)
        if (!newOpen) {
          // Reset request data when closing dialog
          setFriendRequestId(null)
          setFriendRequestNote("")
        }
      }}>
        <DialogContent className="min-w-[480px] gap-0 overflow-hidden bg-white p-0" showCloseButton>
          <DialogHeader className="border-b border-slate-200 px-5 py-4">
            <DialogTitle className="text-lg leading-none font-semibold text-slate-800">
              Thông tin tài khoản
            </DialogTitle>
          </DialogHeader>

          <div className="h-36 bg-gradient-to-r from-slate-300 via-slate-200 to-sky-100" />

          <div className="border-b border-slate-200 bg-white px-5 pb-4">
            <div className="-mt-10 flex items-end gap-3">
              <Avatar className="size-20 border border-slate-200 ring-2 ring-white">
                <AvatarImage src={profile?.avatar ?? undefined} alt={fullName} />
                <AvatarFallback>{toFallback(fullName)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 pb-1">
                <p className="truncate text-xl font-semibold text-slate-900">{fullName}</p>
              </div>
            </div>

            {!isSelf ? (
              <div className="mt-4 space-y-2">
                {memoizedRelationshipStatus === "RECEIVED" && friendRequestNote && (
                  <div className="mb-4 rounded-lg bg-slate-50 p-3 border border-slate-200">
                    <label className="text-xs font-medium text-slate-600 mb-2 block">Lời nhắn:</label>
                    <Textarea
                      value={friendRequestNote}
                      readOnly
                      className="min-h-20 resize-none rounded-lg border-0 bg-white p-2 text-sm text-slate-700"
                    />
                  </div>
                )}
                {memoizedRelationshipStatus === "NONE" && (
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={handleAddFriend}
                      disabled={isCheckingRelationship || isAddingFriend}
                      className="h-10 rounded-xl bg-slate-100 text-sm font-semibold text-slate-700 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isAddingFriend ? "Đang gửi..." : "Kết bạn"}
                    </Button>
                    <Button
                      type="button"
                      onClick={() => void handleSendMessage()}
                      disabled={isCheckingRelationship || isStartingChat}
                      className="h-10 rounded-xl bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isCheckingRelationship ? "Đang tải..." : isStartingChat ? "Đang mở..." : "Nhắn tin"}
                    </Button>
                  </div>
                )}
                {memoizedRelationshipStatus === "SENT" && (
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={handleCancelFriendRequest}
                      disabled={isCheckingRelationship || isCancellingFriend}
                      className="h-10 rounded-xl bg-red-100 text-sm font-semibold text-red-700 hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isCancellingFriend ? "Đang hủy..." : "Hủy lời mời"}
                    </Button>
                    <Button
                      type="button"
                      onClick={() => void handleSendMessage()}
                      disabled={isCheckingRelationship || isStartingChat}
                      className="h-10 rounded-xl bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isCheckingRelationship ? "Đang tải..." : isStartingChat ? "Đang mở..." : "Nhắn tin"}
                    </Button>
                  </div>
                )}
                {memoizedRelationshipStatus === "RECEIVED" && (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        type="button"
                        onClick={handleAcceptFriend}
                        disabled={isCheckingRelationship || isAcceptingFriend}
                        className="h-10 rounded-xl bg-green-600 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isAcceptingFriend ? "Đang xử lý..." : "Đồng ý"}
                      </Button>
                      <Button
                        type="button"
                        onClick={handleRejectFriend}
                        disabled={isCheckingRelationship || isRejectingFriend}
                        variant="secondary"
                        className="h-10 rounded-xl bg-red-100 text-sm font-semibold text-red-700 hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isRejectingFriend ? "Đang xử lý..." : "Từ chối"}
                      </Button>
                    </div>
                    <Button
                      type="button"
                      onClick={() => void handleSendMessage()}
                      disabled={isCheckingRelationship || isStartingChat}
                      className="h-10 w-full rounded-xl bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isCheckingRelationship ? "Đang tải..." : isStartingChat ? "Đang mở..." : "Nhắn tin"}
                    </Button>
                  </>
                )}
                {memoizedRelationshipStatus === "FRIEND" && (
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      onClick={handleCall}
                      disabled={isCheckingRelationship}
                      className="h-10 rounded-xl bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Gọi điện
                    </Button>
                    <Button
                      type="button"
                      onClick={() => void handleSendMessage()}
                      disabled={isCheckingRelationship || isStartingChat}
                      className="h-10 rounded-xl bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isCheckingRelationship ? "Đang tải..." : isStartingChat ? "Đang mở..." : "Nhắn tin"}
                    </Button>
                  </div>
                )}
              </div>
            ) : null}
          </div>

          <div className="bg-slate-50 px-5 py-4">
            <section className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
              <h4 className="text-base font-semibold text-slate-800">Thông tin cá nhân</h4>
              {isLoading ? (
                <p className="mt-3 text-sm text-slate-500">Đang tải thông tin...</p>
              ) : (
                <div className="mt-3 space-y-2 text-sm">
                  <InfoRow label="Giới tính" value={mapGenderToLabel(profile?.gender)} />
                  <InfoRow label="Ngày sinh" value={formatDateVi(profile?.dateOfBirth)} />
                  <InfoRow label="Điện thoại" value={profile?.phoneNumber ?? selectedUser?.phoneNumber ?? "--"} />
                </div>
              )}
            </section>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[96px_1fr] items-start gap-3">
      <span className="text-slate-500">{label}</span>
      <span className="text-slate-700">{value}</span>
    </div>
  )
}

function toFallback(fullName: string) {
  const words = fullName
    .trim()
    .split(/\s+/)
    .filter(Boolean)

  if (words.length === 0) {
    return "U"
  }

  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase()
  }

  return `${words[0][0] ?? ""}${words[words.length - 1][0] ?? ""}`.toUpperCase()
}
