import {
  Bot,
  MessageSquarePlus,
  Send,
  Sparkles,
  X,
} from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { useChatPage } from "@/contexts/ChatPageContext"
import { chatService } from "@/services/chat/chat.service"
import type {
  AiAssistantThreadDetailResponse,
  AiAssistantThreadSummaryResponse,
  AiAssistantTurnResponse,
  AiThreadRole,
  AiThreadScope,
} from "@/types/chat"

const DEFAULT_SCOPE: AiThreadScope = "CURRENT_CONVERSATION"
const CITATION_LIMIT = 8

function formatTime(value?: string): string {
  if (!value) {
    return "--"
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return "--"
  }
  return date.toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
  })
}

function roleLabel(role: AiThreadRole): string {
  return role === "USER" ? "Bạn" : "Trợ lý AI"
}

export default function ChatAiAssistantSidebar() {
  const {
    selectedConversationId,
    conversations,
    detailsView,
    setDetailsView,
    selectConversation,
    requestMessageFocus,
  } = useChatPage()

  const [threads, setThreads] = useState<AiAssistantThreadSummaryResponse[]>([])
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null)
  const [threadDetail, setThreadDetail] = useState<AiAssistantThreadDetailResponse | null>(null)
  const [scope, setScope] = useState<AiThreadScope>(DEFAULT_SCOPE)
  const [selectedScopeConversationIds, setSelectedScopeConversationIds] = useState<string[]>([])
  const [question, setQuestion] = useState("")
  const [isLoadingThreads, setIsLoadingThreads] = useState(false)
  const [isLoadingDetail, setIsLoadingDetail] = useState(false)
  const [isCreatingThread, setIsCreatingThread] = useState(false)
  const [isAsking, setIsAsking] = useState(false)
  const turnsBottomRef = useRef<HTMLDivElement | null>(null)

  const loadThreads = useCallback(async () => {
    setIsLoadingThreads(true)
    try {
      const response = await chatService.listAiThreads()
      const items = response.data ?? []
      setThreads(items)
      setSelectedThreadId((prev) => {
        if (prev && items.some((item) => item.idThread === prev)) {
          return prev
        }
        return items[0]?.idThread ?? null
      })
    } catch {
      toast.error("Không tải được danh sách trợ lý AI")
    } finally {
      setIsLoadingThreads(false)
    }
  }, [])

  const loadThreadDetail = useCallback(async (threadId: string) => {
    setIsLoadingDetail(true)
    try {
      const response = await chatService.getAiThreadDetail(threadId)
      setThreadDetail(response.data)
    } catch {
      toast.error("Không tải được nội dung thread")
      setThreadDetail(null)
    } finally {
      setIsLoadingDetail(false)
    }
  }, [])

  const createThread = useCallback(async () => {
    setIsCreatingThread(true)
    try {
      const response = await chatService.createAiThread(undefined, selectedConversationId ?? undefined)
      const created = response.data
      setThreads((prev) => [created, ...prev.filter((item) => item.idThread !== created.idThread)])
      setSelectedThreadId(created.idThread)
      setThreadDetail(null)
      return created.idThread
    } catch {
      toast.error("Không tạo được AI thread")
      return null
    } finally {
      setIsCreatingThread(false)
    }
  }, [selectedConversationId])

  useEffect(() => {
    if (detailsView !== "ai") {
      return
    }
    void loadThreads()
  }, [detailsView, loadThreads])

  useEffect(() => {
    if (!selectedThreadId) {
      setThreadDetail(null)
      return
    }
    void loadThreadDetail(selectedThreadId)
  }, [loadThreadDetail, selectedThreadId])

  useEffect(() => {
    if (!selectedConversationId) {
      return
    }
    setSelectedScopeConversationIds((prev) => {
      if (prev.includes(selectedConversationId)) {
        return prev
      }
      return [selectedConversationId, ...prev]
    })
  }, [selectedConversationId])

  useEffect(() => {
    turnsBottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
  }, [threadDetail?.turns?.length])

  const scopeConversationOptions = useMemo(() => {
    return conversations.map((conversation) => ({
      id: conversation.idConversation,
      label: conversation.name?.trim() || (conversation.type === "GROUP" ? "Nhóm" : "Cuộc trò chuyện"),
    }))
  }, [conversations])

  const toggleScopeConversation = useCallback((conversationId: string) => {
    setSelectedScopeConversationIds((prev) => {
      if (prev.includes(conversationId)) {
        return prev.filter((id) => id !== conversationId)
      }
      return [...prev, conversationId]
    })
  }, [])

  const jumpToCitation = useCallback(
    (conversationId: string, messageId: string) => {
      if (!conversationId || !messageId) {
        return
      }
      if (conversationId === selectedConversationId) {
        requestMessageFocus(messageId)
        return
      }
      selectConversation(conversationId)
      window.setTimeout(() => {
        setDetailsView("ai")
        requestMessageFocus(messageId)
      }, 0)
    },
    [requestMessageFocus, selectConversation, selectedConversationId, setDetailsView]
  )

  const handleAsk = useCallback(async () => {
    const normalizedQuestion = question.trim()
    if (!normalizedQuestion) {
      return
    }

    let threadId = selectedThreadId
    if (!threadId) {
      threadId = await createThread()
      if (!threadId) {
        return
      }
    }

    const scopePayloadConversationId =
      scope === "CURRENT_CONVERSATION" ? selectedConversationId ?? threadDetail?.defaultConversationId : undefined
    const scopePayloadConversationIds =
      scope === "SELECTED_CONVERSATIONS"
        ? selectedScopeConversationIds.filter((id) => !!id)
        : undefined

    if (scope === "CURRENT_CONVERSATION" && !scopePayloadConversationId) {
      toast.error("Hãy chọn một hội thoại hiện tại để truy vấn")
      return
    }
    if (scope === "SELECTED_CONVERSATIONS" && (!scopePayloadConversationIds || scopePayloadConversationIds.length === 0)) {
      toast.error("Hãy chọn ít nhất một hội thoại cho scope đã chọn")
      return
    }

    setIsAsking(true)
    try {
      const response = await chatService.askAiThread(threadId, {
        query: normalizedQuestion,
        scope,
        conversationId: scopePayloadConversationId,
        conversationIds: scopePayloadConversationIds,
        limit: CITATION_LIMIT,
      })
      const assistantTurn = response.data
      const userTurn: AiAssistantTurnResponse = {
        idTurn: `local-user-${Date.now()}`,
        role: "USER",
        content: normalizedQuestion,
        createdAt: new Date().toISOString(),
        citations: [],
      }

      setThreadDetail((prev) => {
        if (!prev) {
          return prev
        }
        return {
          ...prev,
          turns: [...(prev.turns ?? []), userTurn, assistantTurn],
          updatedAt: new Date().toISOString(),
        }
      })
      setQuestion("")
      await loadThreads()
    } catch {
      toast.error("Không hỏi được trợ lý AI")
    } finally {
      setIsAsking(false)
    }
  }, [
    createThread,
    loadThreads,
    question,
    scope,
    selectedConversationId,
    selectedScopeConversationIds,
    selectedThreadId,
    threadDetail?.defaultConversationId,
  ])

  return (
    <div className="flex h-full w-full max-w-[340px] shrink-0 flex-col border-l bg-background">
      <div className="border-b px-4 pb-3 pt-3">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">Trợ lý AI</h3>
          <Button
            variant="ghost"
            size="icon-sm"
            className="rounded-full text-muted-foreground hover:text-foreground"
            onClick={() => setDetailsView("main")}
            title="Đóng trợ lý AI"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-8 flex-1"
            disabled={isCreatingThread}
            onClick={() => void createThread()}
          >
            <MessageSquarePlus className="mr-1.5 h-3.5 w-3.5" />
            Thread mới
          </Button>
        </div>

        <div className="mt-2 flex flex-wrap gap-1.5">
          {threads.slice(0, 8).map((thread) => (
            <button
              key={thread.idThread}
              type="button"
              className={`rounded-full border px-2 py-1 text-xs ${
                selectedThreadId === thread.idThread
                  ? "border-blue-300 bg-blue-50 text-blue-700"
                  : "border-border text-muted-foreground hover:bg-muted"
              }`}
              onClick={() => setSelectedThreadId(thread.idThread)}
            >
              {thread.title}
            </button>
          ))}
        </div>
      </div>

      <div className="border-b px-4 py-2">
        <p className="mb-1 text-xs font-medium text-muted-foreground">Scope</p>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            className={`rounded-full border px-2 py-1 text-xs ${
              scope === "CURRENT_CONVERSATION"
                ? "border-blue-300 bg-blue-50 text-blue-700"
                : "border-border text-muted-foreground hover:bg-muted"
            }`}
            onClick={() => setScope("CURRENT_CONVERSATION")}
          >
            Hội thoại hiện tại
          </button>
          <button
            type="button"
            className={`rounded-full border px-2 py-1 text-xs ${
              scope === "SELECTED_CONVERSATIONS"
                ? "border-blue-300 bg-blue-50 text-blue-700"
                : "border-border text-muted-foreground hover:bg-muted"
            }`}
            onClick={() => setScope("SELECTED_CONVERSATIONS")}
          >
            Chọn nhiều hội thoại
          </button>
          <button
            type="button"
            className={`rounded-full border px-2 py-1 text-xs ${
              scope === "MY_ALL_CONVERSATIONS"
                ? "border-blue-300 bg-blue-50 text-blue-700"
                : "border-border text-muted-foreground hover:bg-muted"
            }`}
            onClick={() => setScope("MY_ALL_CONVERSATIONS")}
          >
            Toàn bộ chat của tôi
          </button>
        </div>

        {scope === "SELECTED_CONVERSATIONS" ? (
          <div className="mt-2 max-h-28 space-y-1 overflow-y-auto rounded-md border border-border p-2">
            {scopeConversationOptions.map((item) => (
              <label key={item.id} className="flex cursor-pointer items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  className="h-3.5 w-3.5"
                  checked={selectedScopeConversationIds.includes(item.id)}
                  onChange={() => toggleScopeConversation(item.id)}
                />
                <span className="truncate">{item.label}</span>
              </label>
            ))}
          </div>
        ) : null}
      </div>

      <ScrollArea className="min-h-0 flex-1 px-3 py-3">
        {isLoadingThreads || isLoadingDetail ? (
          <div className="flex h-full min-h-[200px] items-center justify-center">
            <Spinner className="size-5 text-muted-foreground" />
          </div>
        ) : null}

        {!isLoadingThreads && !isLoadingDetail && !threadDetail ? (
          <div className="flex min-h-[220px] flex-col items-center justify-center gap-2 px-4 text-center text-sm text-muted-foreground">
            <Bot className="h-10 w-10 text-primary/60" />
            <p>Tạo thread để bắt đầu hỏi trợ lý AI.</p>
          </div>
        ) : null}

        {threadDetail ? (
          <div className="space-y-3">
            {(threadDetail.turns ?? []).map((turn) => (
              <div
                key={turn.idTurn}
                className={`rounded-lg border px-3 py-2 ${
                  turn.role === "USER" ? "border-blue-100 bg-blue-50/50" : "border-border bg-background"
                }`}
              >
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-muted-foreground">
                    {roleLabel(turn.role)}
                  </span>
                  <span className="text-[11px] text-muted-foreground">{formatTime(turn.createdAt)}</span>
                </div>
                <p className="whitespace-pre-wrap text-sm text-foreground">{turn.content}</p>

                {turn.role === "ASSISTANT" && (turn.citations?.length ?? 0) > 0 ? (
                  <>
                    <Separator className="my-2" />
                    <div className="space-y-1">
                      <p className="text-[11px] font-medium text-muted-foreground">Nguồn tham chiếu</p>
                      {turn.citations.map((citation) => (
                        <button
                          key={`${turn.idTurn}-${citation.messageId}`}
                          type="button"
                          className="w-full rounded-md border border-border px-2 py-1 text-left text-xs hover:bg-muted/60"
                          onClick={() => jumpToCitation(citation.conversationId, citation.messageId)}
                        >
                          <div className="mb-0.5 flex items-center justify-between gap-2">
                            <span className="truncate text-[11px] text-blue-700">{citation.messageId}</span>
                            <span className="text-[11px] text-emerald-600">
                              {Math.round((citation.score ?? 0) * 100)}%
                            </span>
                          </div>
                          <p className="line-clamp-2 text-[11px] text-muted-foreground">
                            {citation.snippet}
                          </p>
                        </button>
                      ))}
                    </div>
                  </>
                ) : null}
              </div>
            ))}
            <div ref={turnsBottomRef} />
          </div>
        ) : null}
      </ScrollArea>

      <div className="border-t px-3 pb-3 pt-2">
        <Textarea
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="Hỏi trợ lý AI về nội dung trong phạm vi đã chọn..."
          className="min-h-[84px] resize-none"
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault()
              if (!isAsking) {
                void handleAsk()
              }
            }
          }}
        />
        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5" />
            Enter để gửi, Shift+Enter xuống dòng
          </span>
          <Button
            type="button"
            size="sm"
            disabled={isAsking || !question.trim()}
            onClick={() => void handleAsk()}
          >
            {isAsking ? <Spinner className="mr-1.5 size-3.5" /> : <Send className="mr-1.5 h-3.5 w-3.5" />}
            Gửi
          </Button>
        </div>
      </div>
    </div>
  )
}
