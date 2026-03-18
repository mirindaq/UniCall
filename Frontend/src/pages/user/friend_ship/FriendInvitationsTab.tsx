import { useMemo, useState } from "react"
import { Inbox, MessageSquareMore } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { friendSuggestions, sentFriendInvitations } from "@/mock/friendship.data"
import {
  FriendshipCollapsibleTitle,
  FriendshipLoadMoreButton,
  SeedAvatar,
  SuggestionCard,
  ZeroDataState,
} from "@/components/friend_ship"

const INITIAL_VISIBLE = 5

export function FriendInvitationsTab() {
  const [showSentList, setShowSentList] = useState(true)
  const [showSuggestionList, setShowSuggestionList] = useState(true)
  const [visibleSentCount, setVisibleSentCount] = useState(INITIAL_VISIBLE)
  const [visibleSuggestionCount, setVisibleSuggestionCount] = useState(INITIAL_VISIBLE)

  const visibleSentInvitations = useMemo(
    () => sentFriendInvitations.slice(0, visibleSentCount),
    [visibleSentCount],
  )
  const visibleSuggestions = useMemo(
    () => friendSuggestions.slice(0, visibleSuggestionCount),
    [visibleSuggestionCount],
  )

  const hasAnyData = sentFriendInvitations.length > 0 || friendSuggestions.length > 0

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
      <div className="grid gap-6 overflow-auto px-3 py-3 lg:px-4 lg:py-4">
        {sentFriendInvitations.length === 0 ? (
          <div className="rounded-[28px] bg-slate-100 py-8">
            <Empty className="border-0 py-10">
              <EmptyHeader>
                <EmptyMedia className="flex size-28 items-center justify-center rounded-full bg-blue-50 text-blue-300">
                  <Inbox className="size-14" />
                </EmptyMedia>
                <EmptyTitle className="text-xl text-slate-700">
                  Bạn không có lời mời đã gửi nào
                </EmptyTitle>
              </EmptyHeader>
            </Empty>
          </div>
        ) : (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <FriendshipCollapsibleTitle
                title={`Lời mời đã gửi (${sentFriendInvitations.length})`}
                expanded={showSentList}
                onToggle={() => setShowSentList((value) => !value)}
              />
            </div>

            {showSentList ? (
              <>
                <div className="grid gap-4 xl:grid-cols-3">
                  {visibleSentInvitations.map((invitation) => (
                    <Card
                      key={invitation.id}
                      className="gap-4 rounded-2xl border-0 bg-white py-4 shadow-none ring-1 ring-slate-200"
                    >
                      <CardContent className="space-y-4 px-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <SeedAvatar fallback={invitation.fallback} tone={invitation.tone} />
                            <div className="min-w-0">
                              <p className="truncate text-xl font-semibold text-slate-900 lg:text-[18px]">
                                {invitation.name}
                              </p>
                              <p className="text-sm text-slate-500">{invitation.sentAt}</p>
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
                          className="h-11 w-full rounded-xl bg-slate-100 text-base font-semibold text-slate-800 hover:bg-slate-200"
                        >
                          Thu hồi lời mời
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {visibleSentCount < sentFriendInvitations.length ? (
                  <div className="flex justify-center pt-2">
                    <FriendshipLoadMoreButton
                      onClick={() =>
                        setVisibleSentCount((count) => count + INITIAL_VISIBLE)
                      }
                    />
                  </div>
                ) : null}
              </>
            ) : null}
          </section>
        )}

        {friendSuggestions.length === 0 ? (
          <ZeroDataState
            title="Không có gợi ý kết bạn"
            description="Hệ thống sẽ đề xuất thêm bạn mới khi tìm được người phù hợp với bạn."
          />
        ) : (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <FriendshipCollapsibleTitle
                title={`Gợi ý kết bạn (${friendSuggestions.length})`}
                expanded={showSuggestionList}
                onToggle={() => setShowSuggestionList((value) => !value)}
              />
            </div>

            {showSuggestionList ? (
              <>
                <div className="grid gap-4 xl:grid-cols-3">
                  {visibleSuggestions.map((suggestion) => (
                    <SuggestionCard
                      key={suggestion.id}
                      avatar={{ fallback: suggestion.fallback, tone: suggestion.tone }}
                      name={suggestion.name}
                      subtitle={`${suggestion.mutualGroups} nhóm chung`}
                    />
                  ))}
                </div>

                {visibleSuggestionCount < friendSuggestions.length ? (
                  <div className="flex justify-center pt-2">
                    <FriendshipLoadMoreButton
                      onClick={() =>
                        setVisibleSuggestionCount((count) => count + INITIAL_VISIBLE)
                      }
                    />
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
