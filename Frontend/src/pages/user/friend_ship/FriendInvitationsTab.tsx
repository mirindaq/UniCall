import { useMemo, useState } from "react"
import { Inbox, MessageSquareMore } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { useQuery } from "@/hooks/useQuery"
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
  const [showSentList, setShowSentList] = useState(true)

  // Get current user profile
  const { data: myProfileResponse } = useQuery(() => userService.getMyProfile(), {
    onError: () => undefined,
  })
  const currentUserId = myProfileResponse?.data?.identityUserId ?? ""

  // Get all friend requests
  const { data: friendRequestsResponse } = useQuery<
    ResponseSuccess<{
      items: Array<{
        idFriendRequest: string
        idAccountSent: string
        pathAvartar: string | null
        firstName: string
        lastName: string
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

  const visibleSentInvitations = useMemo(
    () => allFriendRequests.slice(0, INITIAL_VISIBLE),
    [allFriendRequests],
  )
  const hasMoreSentInvitations = INITIAL_VISIBLE < allFriendRequests.length

  const hasAnyData = allFriendRequests.length > 0

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
        {allFriendRequests.length === 0 ? (
          <div className="rounded-[28px] bg-slate-100 py-8">
            <Empty className="border-0 py-8">
              <EmptyHeader>
                <EmptyMedia className="flex size-20 items-center justify-center rounded-full bg-blue-50 text-blue-300">
                  <Inbox className="size-10" />
                </EmptyMedia>
                <EmptyTitle className="text-lg text-slate-700">
                  Bạn không có lời mời kết bạn nào
                </EmptyTitle>
              </EmptyHeader>
            </Empty>
          </div>
        ) : (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <FriendshipCollapsibleTitle
                title={`Lời mời kết bạn (${allFriendRequests.length})`}
                expanded={showSentList}
                onToggle={() => setShowSentList((value) => !value)}
              />
            </div>

            {showSentList ? (
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
                              fallback={`${invitation.firstName[0] ?? "?"}${invitation.lastName[0] ?? "?"}`}
                              tone="base"
                            />
                            <div className="min-w-0">
                              <p className="truncate text-base font-semibold text-slate-900">
                                {invitation.firstName} {invitation.lastName}
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

                        <Button
                          variant="secondary"
                          className="h-10 w-full rounded-xl bg-slate-100 text-sm font-semibold text-slate-800 hover:bg-slate-200"
                        >
                          {invitation.status === "SENT" ? "Đang chờ xác nhận" : invitation.status}
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {hasMoreSentInvitations ? (
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
                ) : null}
              </>
            ) : null}
          </section>
        )}
      </div>
    </div>
  )
}
