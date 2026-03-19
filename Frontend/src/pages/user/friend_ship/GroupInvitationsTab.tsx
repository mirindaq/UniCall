import { useMemo, useState } from "react"
import { BellRing } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { groupInvitations } from "@/mock/friendship.data"
import {
  FriendshipLoadMoreButton,
  FriendshipTabTitle,
  SeedAvatar,
  ZeroDataState,
} from "@/components/friend_ship"

const INITIAL_VISIBLE = 5

export function GroupInvitationsTab() {
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE)
  const visibleInvitations = useMemo(
    () => groupInvitations.slice(0, visibleCount),
    [visibleCount],
  )

  if (groupInvitations.length === 0) {
    return (
      <ZeroDataState
        title="Không có lời mời vào nhóm và cộng đồng"
        description="Khi có nhóm hoặc cộng đồng mời bạn tham gia, lời mời sẽ hiển thị tại đây."
      />
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <FriendshipTabTitle title={`Lời mời vào nhóm và cộng đồng (${groupInvitations.length})`} />

      <div className="min-h-0 flex-1 overflow-auto p-4">
        <div className="grid gap-4 xl:grid-cols-2">
          {visibleInvitations.map((invitation) => (
            <Card
              key={invitation.id}
              className="gap-3 rounded-2xl border-0 bg-white py-3 shadow-none ring-1 ring-slate-200"
            >
              <CardContent className="space-y-3 px-4">
                <div className="flex items-start gap-4">
                  <SeedAvatar fallback={invitation.fallback} tone={invitation.tone} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-base font-semibold text-slate-900">
                        {invitation.communityName}
                      </p>
                      <Badge className="rounded-md bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100">
                        {invitation.typeLabel}
                      </Badge>
                    </div>
                    <p className="mt-2 text-xs text-slate-500">
                      Được mời bởi{" "}
                      <span className="font-medium text-slate-700">
                        {invitation.invitedBy}
                      </span>
                    </p>
                    <p className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                      <BellRing className="size-4" />
                      {invitation.members} thành viên
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="secondary"
                    className="h-10 rounded-xl bg-slate-100 text-sm font-semibold text-slate-700 hover:bg-slate-200"
                  >
                    Từ chối
                  </Button>
                  <Button className="h-10 rounded-xl bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700">
                    Tham gia
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {visibleCount < groupInvitations.length ? (
          <div className="mt-4 flex justify-center">
            <FriendshipLoadMoreButton
              onClick={() => setVisibleCount((count) => count + INITIAL_VISIBLE)}
            />
          </div>
        ) : null}
      </div>
    </div>
  )
}
