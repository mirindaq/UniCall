import { useMemo } from "react"
import { MessageCircleMore, RefreshCcw, UsersRound } from "lucide-react"
import { useNavigate } from "react-router"
import { toast } from "sonner"

import {
  FriendshipEmptyState,
  FriendshipTabTitle,
  SeedAvatar,
  ZeroDataState,
} from "@/components/friend_ship"
import { Button } from "@/components/ui/button"
import { useQuery } from "@/hooks/useQuery"
import { USER_PATH } from "@/constants/user"
import { chatService } from "@/services/chat/chat.service"
import type { ConversationResponse } from "@/types/chat"

function formatGroupFallback(name?: string) {
  const normalized = (name ?? "Nhóm").trim()
  if (!normalized) {
    return "NH"
  }

  const parts = normalized.split(/\s+/).filter(Boolean)
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase()
  }

  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase()
}

function formatActivityLabel(conversation: ConversationResponse) {
  if (!conversation.dateUpdateMessage) {
    return "Chưa có hoạt động gần đây"
  }

  const updatedAt = new Date(conversation.dateUpdateMessage)
  if (Number.isNaN(updatedAt.getTime())) {
    return "Vừa cập nhật"
  }

  return `Cập nhật ${updatedAt.toLocaleString("vi-VN")}`
}

export function CommunitiesTab() {
  const navigate = useNavigate()
  const {
    data: conversationsResponse,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery(() => chatService.listConversations(), {
    onError: () => {
      toast.error("Khong the tai danh sach nhom")
    },
  })

  const groupConversations = useMemo(() => {
    const items = conversationsResponse?.data ?? []
    return items
      .filter((conversation) => conversation.type === "GROUP")
      .sort((left, right) => {
        const leftTime = left.dateUpdateMessage ? new Date(left.dateUpdateMessage).getTime() : 0
        const rightTime = right.dateUpdateMessage ? new Date(right.dateUpdateMessage).getTime() : 0
        return rightTime - leftTime
      })
  }, [conversationsResponse?.data])

  const openGroupConversation = (conversationId: string) => {
    navigate(`${USER_PATH.ROOT}/${USER_PATH.CHAT}?conversationId=${encodeURIComponent(conversationId)}`)
  }

  if (!isLoading && groupConversations.length === 0) {
    return (
      <ZeroDataState
        title="Chưa có nhóm nào"
        description="Khi bạn tham gia nhóm chat, danh sách nhóm sẽ hiển thị tại đây."
      />
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <FriendshipTabTitle title={`Danh sách nhóm (${groupConversations.length})`} />

      <div className="flex min-h-0 flex-1 p-4">
        <div className="flex h-full min-h-0 w-full flex-col rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">Nhóm của bạn</p>
              <p className="mt-1 text-xs text-slate-500">
                Chọn một nhóm để mở thẳng cuộc trò chuyện tương ứng.
              </p>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => void refetch()}
              disabled={isLoading || isRefetching}
            >
              <RefreshCcw className={`mr-2 size-4 ${isRefetching ? "animate-spin" : ""}`} />
              {isLoading || isRefetching ? "Dang tai..." : "Lam moi"}
            </Button>
          </div>

          {isLoading ? (
            <div className="mt-4 space-y-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="h-20 animate-pulse rounded-xl bg-slate-100"
                />
              ))}
            </div>
          ) : groupConversations.length === 0 ? (
            <FriendshipEmptyState
              title="Không có nhóm nào để hiển thị"
              description="Bạn chưa tham gia nhóm chat nào hoặc danh sách nhóm đang trống."
            />
          ) : (
            <div className="mt-4 flex-1 min-h-0 space-y-2 overflow-auto pr-1">
              {groupConversations.map((conversation) => (
                <button
                  key={conversation.idConversation}
                  type="button"
                  onClick={() => openGroupConversation(conversation.idConversation)}
                  className="flex w-full items-center justify-between rounded-xl border border-slate-200 px-4 py-3 text-left transition hover:border-blue-200 hover:bg-blue-50/50"
                >
                  <div className="flex min-w-0 items-center gap-4">
                    <SeedAvatar
                      fallback={formatGroupFallback(conversation.name)}
                      tone="bg-sky-100 text-sky-700"
                      className="size-12"
                    />

                    <div className="min-w-0">
                      <p className="truncate text-base font-semibold tracking-tight text-slate-900">
                        {conversation.name?.trim() || "Nhóm không tên"}
                      </p>
                      <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span className="inline-flex items-center gap-1">
                          <UsersRound className="size-3.5" />
                          {conversation.numberMember} thành viên
                        </span>
                        <span className="text-slate-300">•</span>
                        <span className="truncate">{formatActivityLabel(conversation)}</span>
                      </p>
                    </div>
                  </div>

                  <div className="ml-4 inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                    <MessageCircleMore className="size-3.5" />
                    Mở chat
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
