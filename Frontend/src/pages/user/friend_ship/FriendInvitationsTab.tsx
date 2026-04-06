import { useMemo, useState } from "react"
import { Inbox, MessageSquareMore } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { useQuery } from "@/hooks/useQuery"
import { useMutation } from "@/hooks/useMutation"
import { userService } from "@/services/user/user.service"
import { friendRequestService } from "@/services/friend/friend.service"
import type { ResponseSuccess } from "@/types/api-response"
import {
  FriendshipCollapsibleTitle,
  SeedAvatar,
  ZeroDataState,
} from "@/components/friend_ship"

const INITIAL_VISIBLE = 5

export function FriendInvitationsTab() {
  const [showReceivedList, setShowReceivedList] = useState(true)
  const [showSentList, setShowSentList] = useState(true)

  // Get current user profile
  const { data: myProfileResponse } = useQuery(() => userService.getMyProfile(), {
    onError: () => undefined,
  })
  const currentUserId = myProfileResponse?.data?.identityUserId ?? ""

  // Get all friend requests
  const { data: friendRequestsResponse, refetch: refetchFriendRequests } = useQuery<
    ResponseSuccess<{
      items: Array<{
        idFriendRequest: string
        idAccountSent: string
        pathAvartar: string | null
        firstNameSender: string
        lastNameSender: string
        firstNameReceiver: string
        lastNameReceiver: string
        content: string
        timeRequest: string
        status: string
      }>
      page: number
      totalPage: number
      limit: number
      totalItem: number
    }>
  >(
    () => friendRequestService.getAllFriendRequests(currentUserId) as any,
    {
      enabled: currentUserId.length > 0,
      deps: [currentUserId],
      onError: () => undefined,
    },
  )

  const allFriendRequests = Array.isArray(friendRequestsResponse?.data?.items)
    ? friendRequestsResponse.data.items
    : []

  // Phân loại: người nhận (idAccountSent !== currentUserId) và người gửi (idAccountSent === currentUserId)
  const receivedInvitations = useMemo(
    () => allFriendRequests.filter((r) => r.idAccountSent !== currentUserId),
    [allFriendRequests, currentUserId],
  )

  const sentInvitations = useMemo(
    () => allFriendRequests.filter((r) => r.idAccountSent === currentUserId),
    [allFriendRequests, currentUserId],
  )

  const visibleReceivedInvitations = useMemo(
    () => receivedInvitations.slice(0, INITIAL_VISIBLE),
    [receivedInvitations],
  )

  const visibleSentInvitations = useMemo(
    () => sentInvitations.slice(0, INITIAL_VISIBLE),
    [sentInvitations],
  )

  const hasMoreReceived = INITIAL_VISIBLE < receivedInvitations.length
  const hasMoreSent = INITIAL_VISIBLE < sentInvitations.length

  const hasAnyData = allFriendRequests.length > 0

  // Handle accept friend request
  const { mutate: acceptFriend, isLoading: isAcceptingFriend } = useMutation(
    (friendRequestId: unknown) =>
      friendRequestService.updateFriendRequestStatus(friendRequestId as string, {
        status: "ACCEPTED",
      }),
    {
      onSuccess: () => {
        refetchFriendRequests()
      },
      onError: (error: unknown) => {
        console.error("Error accepting friend:", error)
      },
    },
  )

  // Handle reject friend request
  const { mutate: rejectFriend, isLoading: isRejectingFriend } = useMutation(
    (friendRequestId: unknown) =>
      friendRequestService.updateFriendRequestStatus(friendRequestId as string, {
        status: "REJECTED",
      }),
    {
      onSuccess: () => {
        refetchFriendRequests()
      },
      onError: (error: unknown) => {
        console.error("Error rejecting friend:", error)
      },
    },
  )

  // Handle cancel friend request
  const { mutate: cancelFriend, isLoading: isCancellingFriend } = useMutation(
    (friendRequestId: unknown) =>
      friendRequestService.updateFriendRequestStatus(friendRequestId as string, {
        status: "CANCELLED",
      }),
    {
      onSuccess: () => {
        refetchFriendRequests()
      },
      onError: (error: unknown) => {
        console.error("Error cancelling friend request:", error)
      },
    },
  )

  if (!hasAnyData) {
    return (
      <ZeroDataState
        title="Không có lời mời kết bạn"
        description="Khi có lời mời mới hoặc gợi ý phù hợp, bạn sẽ thấy chúng tại đây."
      />
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="grid flex-1 min-h-0 gap-6 overflow-auto p-4">

        {/* Lời mời đã nhận */}
        {receivedInvitations.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <FriendshipCollapsibleTitle
                title={`Lời mời đã nhận (${receivedInvitations.length})`}
                expanded={showReceivedList}
                onToggle={() => setShowReceivedList((v) => !v)}
              />
            </div>

            {showReceivedList && (
              <>
                <div className="grid gap-4 xl:grid-cols-3">
                  {visibleReceivedInvitations.map((invitation) => (
                    <Card
                      key={invitation.idFriendRequest}
                      className="gap-3 rounded-2xl border-0 bg-white py-3 shadow-none ring-1 ring-slate-200"
                    >
                      <CardContent className="space-y-3 px-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <SeedAvatar
                              fallback={`${invitation.firstNameSender[0] ?? "?"}${invitation.lastNameSender[0] ?? "?"}`}
                              tone="base"
                            />
                            <div className="min-w-0">
                              <p className="truncate text-base font-semibold text-slate-900">
                                {invitation.firstNameSender} {invitation.lastNameSender}
                              </p>
                              <p className="text-xs text-slate-500">
                                {new Date(invitation.timeRequest).toLocaleDateString("vi-VN")}
                              </p>
                            </div>
                          </div>

                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="rounded-full text-slate-400 hover:text-slate-700"
                          >
                            <MessageSquareMore className="size-4" />
                          </Button>
                        </div>

                        {invitation.content && (
                          <p className="text-sm text-slate-600 line-clamp-2">{invitation.content}</p>
                        )}

                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            className="h-10 flex-1 rounded-xl border-slate-300 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                            onClick={() => rejectFriend(invitation.idFriendRequest)}
                            disabled={isRejectingFriend}
                          >
                            {isRejectingFriend ? "Đang xử lý..." : "Từ chối"}
                          </Button>
                          <Button
                            className="h-10 flex-1 rounded-xl bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700"
                            onClick={() => acceptFriend(invitation.idFriendRequest)}
                            disabled={isAcceptingFriend}
                          >
                            {isAcceptingFriend ? "Đang xử lý..." : "Đồng ý"}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {hasMoreReceived && (
                  <div className="flex justify-center pt-2">
                    <Button
                      onClick={() => {
                        // TODO: Implement load more with pagination
                      }}
                      className="rounded-lg bg-slate-200 text-slate-700 hover:bg-slate-300"
                    >
                      Xem thêm
                    </Button>
                  </div>
                )}
              </>
            )}
          </section>
        )}

        {/* Lời mời đã gửi */}
        {sentInvitations.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <FriendshipCollapsibleTitle
                title={`Lời mời đã gửi (${sentInvitations.length})`}
                expanded={showSentList}
                onToggle={() => setShowSentList((v) => !v)}
              />
            </div>

            {showSentList && (
              <>
                <div className="grid gap-4 xl:grid-cols-3">
                  {visibleSentInvitations.map((invitation) => (
                    <Card
                      key={invitation.idFriendRequest}
                      className="gap-3 rounded-2xl border-0 bg-white py-3 shadow-none ring-1 ring-slate-200"
                    >
                      <CardContent className="space-y-3 px-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <SeedAvatar
                              fallback={`${invitation.firstNameReceiver[0] ?? "?"}${invitation.lastNameReceiver[0] ?? "?"}`}
                              tone="base"
                            />
                            <div className="min-w-0">
                              <p className="truncate text-base font-semibold text-slate-900">
                                {invitation.firstNameReceiver} {invitation.lastNameReceiver}
                              </p>
                              <p className="text-xs text-slate-500">
                                {new Date(invitation.timeRequest).toLocaleDateString("vi-VN")}
                              </p>
                              <p className="text-xs text-blue-500 font-medium">Bạn đã gửi lời mời</p>
                            </div>
                          </div>

                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="rounded-full text-slate-400 hover:text-slate-700"
                          >
                            <MessageSquareMore className="size-4" />
                          </Button>
                        </div>

                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            className="h-10 flex-1 rounded-xl border-slate-300 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                            onClick={() => cancelFriend(invitation.idFriendRequest)}
                            disabled={isCancellingFriend}
                          >
                            {isCancellingFriend ? "Đang xử lý..." : "Thu hồi lời mời"}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {hasMoreSent && (
                  <div className="flex justify-center pt-2">
                    <Button
                      onClick={() => {
                        // TODO: Implement load more with pagination
                      }}
                      className="rounded-lg bg-slate-200 text-slate-700 hover:bg-slate-300"
                    >
                      Xem thêm
                    </Button>
                  </div>
                )}
              </>
            )}
          </section>
        )}

      </div>
    </div>
  )
}
