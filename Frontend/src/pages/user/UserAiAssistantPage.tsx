import { Bot, CornerDownLeft, Loader2, Sparkles, Wrench } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import type { FormEvent } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { assistantService } from "@/services/assistant/assistant.service"
import type {
  AssistantAskResponse,
  AssistantIntent,
  AssistantThreadMessageResponse,
  AssistantToolCode,
} from "@/types/assistant"
import { generateUuid } from "@/utils/uuid.util"

type AssistantMessageRole = "user" | "assistant"

type AssistantMessageItem = {
  id: string
  role: AssistantMessageRole
  content: string
  createdAt: string
  intent?: AssistantIntent
  toolsUsed?: AssistantToolCode[]
  data?: unknown
}

function formatTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return "--:--"
  }
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}

function toAssistantMessage(response: AssistantAskResponse): AssistantMessageItem {
  return {
    id: generateUuid(),
    role: "assistant",
    content: response.answer || "Mình chưa có câu trả lời phù hợp.",
    createdAt: new Date().toISOString(),
    intent: response.intent,
    toolsUsed: response.toolsUsed,
    data: response.data,
  }
}

function toUiRole(role?: AssistantThreadMessageResponse["role"]): AssistantMessageRole {
  return role === "USER" ? "user" : "assistant"
}

function fromHistoryMessage(message: AssistantThreadMessageResponse): AssistantMessageItem {
  return {
    id: message.id || generateUuid(),
    role: toUiRole(message.role),
    content: message.content || "",
    createdAt: message.createdAt || new Date().toISOString(),
    intent: message.intent,
    toolsUsed: message.toolsUsed,
    data: message.data,
  }
}

export function UserAiAssistantPage() {
  const [input, setInput] = useState("")
  const [sending, setSending] = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [messages, setMessages] = useState<AssistantMessageItem[]>([])
  const endRef = useRef<HTMLDivElement | null>(null)
  const formRef = useRef<HTMLFormElement | null>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, sending])

  useEffect(() => {
    let cancelled = false

    const loadHistory = async () => {
      setLoadingHistory(true)
      try {
        const threadRes = await assistantService.getDefaultThread()
        const threadId = threadRes.data?.threadId
        const historyRes = await assistantService.listMessages(threadId, 1, 100)
        const historyItems = [...(historyRes.data?.items || [])]
          .reverse()
          .map(fromHistoryMessage)

        if (!cancelled) {
          setMessages(historyItems)
        }
      } catch (error) {
        console.error("assistant history error", error)
        if (!cancelled) {
          toast.error("Không tải được lịch sử AI Assistant.")
        }
      } finally {
        if (!cancelled) {
          setLoadingHistory(false)
        }
      }
    }

    loadHistory()
    return () => {
      cancelled = true
    }
  }, [])

  const canSend = useMemo(() => input.trim().length > 0 && !sending, [input, sending])

  const handleSend = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const question = input.trim()
    if (!question || sending) {
      return
    }

    const userMessage: AssistantMessageItem = {
      id: generateUuid(),
      role: "user",
      content: question,
      createdAt: new Date().toISOString(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setSending(true)

    try {
      const response = await assistantService.ask({ message: question })
      setMessages((prev) => [...prev, toAssistantMessage(response.data)])
    } catch (error) {
      console.error("assistant ask error", error)
      toast.error("AI Assistant đang bận, vui lòng thử lại.")
      setMessages((prev) => [
        ...prev,
        {
          id: generateUuid(),
          role: "assistant",
          content: "AI Assistant tạm thời chưa phản hồi. Bạn thử lại sau nhé.",
          createdAt: new Date().toISOString(),
        },
      ])
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="h-full w-full bg-slate-100 p-2.5 sm:p-4 md:p-6">
      <section className="mx-auto flex h-full w-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <header className="border-b border-slate-200 bg-linear-to-r from-blue-50 via-cyan-50 to-sky-50 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-blue-600 text-white">
              <Bot className="size-5" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-slate-900">AI Assistant</h1>
              <p className="text-sm text-slate-600">Hỏi đáp hội thoại, tra cứu thông tin chat và phân tích ngữ cảnh.</p>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto bg-slate-50 px-4 py-5 md:px-6">
          {loadingHistory ? (
            <div className="flex h-full min-h-80 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 text-center">
              <Loader2 className="mb-3 size-6 animate-spin text-blue-500" />
              <p className="text-sm text-slate-600">Đang tải lịch sử AI Assistant...</p>
            </div>
          ) : null}

          {!loadingHistory && messages.length === 0 ? (
            <div className="flex h-full min-h-80 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 text-center">
              <Sparkles className="mb-3 size-7 text-blue-500" />
              <p className="text-base font-medium text-slate-700">Bắt đầu trò chuyện với AI Assistant</p>
              <p className="mt-1 text-sm text-slate-500">
                Ví dụ: &quot;Tìm giúp tôi ai nói tin nhắn họp 9h&quot; hoặc &quot;Tóm tắt hội thoại gần đây&quot;.
              </p>
            </div>
          ) : null}

          <div className="space-y-4">
            {messages.map((message) => (
              <article
                key={message.id}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`w-full rounded-2xl border px-3 py-3 shadow-xs sm:w-auto sm:max-w-3xl sm:px-4 ${
                    message.role === "user"
                      ? "border-blue-600 bg-blue-600 text-white"
                      : "border-slate-200 bg-white text-slate-800"
                  }`}
                >
                  {message.role === "assistant" ? (
                    <div className="text-sm leading-relaxed break-words">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                          ul: ({ children }) => <ul className="mb-2 list-disc pl-5 last:mb-0">{children}</ul>,
                          ol: ({ children }) => <ol className="mb-2 list-decimal pl-5 last:mb-0">{children}</ol>,
                          code: ({ children }) => (
                            <code className="rounded bg-slate-100 px-1 py-0.5 text-xs text-slate-700">
                              {children}
                            </code>
                          ),
                          a: ({ children, href }) => (
                            <a href={href} target="_blank" rel="noreferrer" className="text-blue-600 underline">
                              {children}
                            </a>
                          ),
                        }}
                      >
                        {message.content || ""}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>
                  )}

                  {message.role === "assistant" && message.intent ? (
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-600">
                        Intent: {message.intent}
                      </span>
                      {message.toolsUsed && message.toolsUsed.length > 0
                        ? message.toolsUsed.map((tool) => (
                            <span
                              key={`${message.id}-${tool}`}
                              className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 font-medium text-blue-700"
                            >
                              <Wrench className="size-3.5" />
                              {tool}
                            </span>
                          ))
                        : null}
                    </div>
                  ) : null}

                  {message.role === "assistant" && message.data ? (
                    <details className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-2.5">
                      <summary className="cursor-pointer text-xs font-medium text-slate-600">Dữ liệu tool</summary>
                      <pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap break-all text-xs text-slate-600">
                        {JSON.stringify(message.data, null, 2)}
                      </pre>
                    </details>
                  ) : null}

                  <p
                    className={`mt-2 text-[11px] ${
                      message.role === "user" ? "text-blue-100" : "text-slate-400"
                    }`}
                  >
                    {formatTime(message.createdAt)}
                  </p>
                </div>
              </article>
            ))}

            {sending ? (
              <article className="flex justify-start">
                <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-xs">
                  <Loader2 className="size-4 animate-spin" />
                  AI Assistant đang phân tích câu hỏi...
                </div>
              </article>
            ) : null}
            <div ref={endRef} />
          </div>
        </div>

        <footer className="border-t border-slate-200 bg-white p-4 md:px-6">
          <form ref={formRef} onSubmit={handleSend} className="space-y-3">
            <Textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Nhập câu hỏi cho AI Assistant..."
              className="min-h-24 resize-none rounded-xl border-slate-300 bg-slate-50 focus-visible:ring-blue-500"
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault()
                  formRef.current?.requestSubmit()
                }
              }}
            />
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-slate-500">
                Enter để gửi, Shift + Enter để xuống dòng.
              </p>
              <Button
                type="submit"
                disabled={!canSend}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 hover:bg-blue-700 sm:w-auto"
              >
                <CornerDownLeft className="size-4" />
                Gửi
              </Button>
            </div>
          </form>
        </footer>
      </section>
    </div>
  )
}
