import { useEffect, useMemo, useState } from "react"
import { Check, Inbox, X } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useQuery } from "@/hooks/useQuery"
import { useMutation } from "@/hooks/useMutation"
import { userService } from "@/services/user/user.service"
import { FriendshipCollapsibleTitle, ZeroDataState } from "@/components/friend_ship"

type RequestCardItem = {
  idFriendRequest: string
  peerId: string
  displayName: string
  avatar?: string | null
  fallback: string
  content: string
  timeRequest?: string
}

export function FriendInvitationsTab() {
  const [showReceivedList, setShowReceivedList] = useState(true)
  const [showSentList, setShowSentList] = useState(true)
  const [processingMap, setProcessingMap] = useState<Record<string, boolean>>({})
  const [profileMap, setProfileMap] = useState<Record<string, { fullName: string; avatar?: string | null }>>({})

  const { data: myProfileResponse, refetch: refetchMyProfile } = useQuery(() => userService.getMyProfile(), {
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
      onError: () => {
        toast.error("Không tải được danh sách lời mời kết bạn.")
      },
    },
  )

  const allRequests = useMemo(
    () => (Array.isArray(friendRequestsResponse?.data?.items) ? friendRequestsResponse.data.items : []),
    [friendRequestsResponse?.data?.items],
  )

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

  const sentRequests = useMemo(
    () =>
      allRequests.filter(
        (item) => item.status === "SENT" && item.idAccountSent === currentUserId,
      ),
    [allRequests, currentUserId],
  )

  useEffect(() => {
    const peerIds = new Set<string>()
    receivedRequests.forEach((item) => {
      if (item.idAccountSent) {
        peerIds.add(item.idAccountSent)
      }
    })
    sentRequests.forEach((item) => {
      if (item.idAccountReceive) {
        peerIds.add(item.idAccountReceive)
      }
    })

    if (peerIds.size === 0) {
      setProfileMap({})
      return
    }

    let cancelled = false
    void Promise.all(
      [...peerIds].map(async (identityUserId) => {
        try {
          const response = await userService.getProfileByIdentityUserId(identityUserId)
          const profile = response.data
          const fullName = `${profile.lastName ?? ""} ${profile.firstName ?? ""}`.trim() || identityUserId
          return [identityUserId, { fullName, avatar: profile.avatar ?? null }] as const
        } catch {
          return [identityUserId, { fullName: identityUserId, avatar: null }] as const
        }
      }),
    ).then((entries) => {
      if (cancelled) {
        return
      }
      const next: Record<string, { fullName: string; avatar?: string | null }> = {}
      entries.forEach(([id, value]) => {
        next[id] = value
      })
      setProfileMap(next)
    })

    return () => {
      cancelled = true
    }
  }, [receivedRequests, sentRequests])

  const mapToCard = (request: FriendRequestItem, peerId: string): RequestCardItem => {
    const profile = profileMap[peerId]
    const displayName =
      profile?.fullName
      || `${request.firstName ?? ""} ${request.lastName ?? ""}`.trim()
      || peerId
    const fallback = toFallback(displayName)
    return {
      idFriendRequest: request.idFriendRequest,
      peerId,
      displayName,
      avatar: profile?.avatar ?? request.pathAvartar ?? null,
      fallback,
      content: request.content?.trim() || "Không có lời nhắn.",
      timeRequest: request.timeRequest,
    }
  }

  const receivedCards = useMemo(
    () => receivedRequests.map((item) => mapToCard(item, item.idAccountSent)),
    [receivedRequests, profileMap],
  )

  const sentCards = useMemo(
    () => sentRequests.map((item) => mapToCard(item, item.idAccountReceive)),
    [sentRequests, profileMap],
  )

  const hasAnyData = receivedCards.length > 0 || sentCards.length > 0

  const updateRequestStatus = async (idFriendRequest: string, status: FriendRequestStatus) => {
    if (!idFriendRequest || processingMap[idFriendRequest]) {
      return
    }
    setProcessingMap((prev) => ({ ...prev, [idFriendRequest]: true }))
    try {
      await friendRequestService.updateFriendRequestStatus(idFriendRequest, { status })
      await Promise.all([refetchRequests(), refetchMyProfile()])
      if (status === "ACCEPTED") {
        toast.success("Đã đồng ý kết bạn.")
      } else if (status === "REJECTED") {
        toast.success("Đã từ chối lời mời kết bạn.")
      } else {
        toast.success("Đã thu hồi lời mời kết bạn.")
      }
    } catch (error) {
      const backendMessage = (error as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(backendMessage || "Cập nhật lời mời kết bạn thất bại.")
    } finally {
      setProcessingMap((prev) => ({ ...prev, [idFriendRequest]: false }))
    }
  }

  if (isLoadingRequests) {
    return (
      <div className="flex h-full min-h-0 flex-col p-4">
        <div className="grid flex-1 place-items-center rounded-2xl bg-slate-100">
          <p className="text-sm text-slate-500">Đang tải lời mời kết bạn...</p>
        </div>
      </div>
    )
  }

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
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            variant="secondary"
                            disabled={isProcessing}
                            className="h-10 rounded-xl bg-slate-100 text-sm font-semibold text-slate-700 hover:bg-slate-200"
                            onClick={() => void updateRequestStatus(card.idFriendRequest, "REJECTED")}
                          >
                            <X className="mr-1 size-4" />
                            Từ chối
                          </Button>
                          <Button
                            disabled={isProcessing}
                            className="h-10 rounded-xl bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700"
                            onClick={() => void updateRequestStatus(card.idFriendRequest, "ACCEPTED")}
                          >
                            <Check className="mr-1 size-4" />
                            Đồng ý
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )
          ) : null}
        </section>

        <section className="space-y-4">
          <FriendshipCollapsibleTitle
            title={`Lời mời đã gửi (${sentCards.length})`}
            expanded={showSentList}
            onToggle={() => setShowSentList((value) => !value)}
          />

          {showSentList ? (
            sentCards.length === 0 ? (
              <div className="rounded-2xl bg-slate-100 py-6">
                <Empty className="border-0 py-2">
                  <EmptyHeader>
                    <EmptyMedia className="flex size-14 items-center justify-center rounded-full bg-blue-50 text-blue-300">
                      <Inbox className="size-7" />
                    </EmptyMedia>
                    <EmptyTitle className="text-sm text-slate-700">Bạn chưa gửi lời mời kết bạn nào</EmptyTitle>
                  </EmptyHeader>
                </Empty>
              </div>
            ) : (
              <div className="grid gap-4 xl:grid-cols-2">
                {sentCards.map((card) => {
                  const isProcessing = Boolean(processingMap[card.idFriendRequest])
                  return (
                    <Card key={card.idFriendRequest} className="gap-3 rounded-2xl border-0 bg-slate-50 py-3 shadow-none ring-1 ring-slate-200">
                      <CardContent className="space-y-3 px-4">
                        <div className="flex items-start gap-3">
                          <Avatar size="lg">
                            <AvatarImage src={card.avatar ?? undefined} alt={card.displayName} />
                            <AvatarFallback className="font-semibold">{card.fallback}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-base font-semibold text-slate-900">{card.displayName}</p>
                            <p className="text-xs text-slate-500">
                              {card.timeRequest ? new Date(card.timeRequest).toLocaleString("vi-VN") : ""}
                            </p>
                            <p className="mt-2 line-clamp-2 text-sm text-slate-700">{card.content}</p>
                          </div>
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
