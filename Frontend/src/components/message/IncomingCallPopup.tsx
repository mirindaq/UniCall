import { Phone, PhoneCall, PhoneOff, X } from "lucide-react"
import { useEffect, useState } from "react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"

type IncomingCallPopupProps = {
  open: boolean
  phase: "incoming" | "outgoing" | "connecting" | "in-call"
  callerName: string
  callerAvatar?: string | null
  startedAt?: number
  ringDeadlineAt?: number
  ringDurationMs?: number
  statusMessage?: string | null
  onAccept: () => void
  onReject: () => void
  onEnd: () => void
}

const formatDuration = (seconds: number) => {
  const mm = Math.floor(seconds / 60)
  const ss = seconds % 60
  return `${mm.toString().padStart(2, "0")}:${ss.toString().padStart(2, "0")}`
}

export default function IncomingCallPopup({
  open,
  phase,
  callerName,
  callerAvatar,
  startedAt,
  ringDeadlineAt,
  ringDurationMs = 15_000,
  statusMessage,
  onAccept,
  onReject,
  onEnd,
}: IncomingCallPopupProps) {
  const [elapsed, setElapsed] = useState(0)
  const [remainingMs, setRemainingMs] = useState<number | null>(null)

  useEffect(() => {
    if (phase !== "in-call" || !startedAt) {
      setElapsed(0)
      return
    }
    const tick = () => {
      const seconds = Math.max(0, Math.floor((Date.now() - startedAt) / 1000))
      setElapsed(seconds)
    }
    tick()
    const timer = window.setInterval(tick, 1000)
    return () => window.clearInterval(timer)
  }, [phase, startedAt])

  useEffect(() => {
    if (
      !ringDeadlineAt ||
      (phase !== "outgoing" && phase !== "incoming") ||
      Boolean(statusMessage)
    ) {
      setRemainingMs(null)
      return
    }
    const tick = () => {
      setRemainingMs(Math.max(0, ringDeadlineAt - Date.now()))
    }
    tick()
    const timer = window.setInterval(tick, 200)
    return () => window.clearInterval(timer)
  }, [phase, ringDeadlineAt, statusMessage])

  const fallback = callerName.trim().slice(0, 2).toUpperCase() || "U"
  const countdownPercent =
    remainingMs == null ? null : Math.max(0, Math.min(100, (remainingMs / ringDurationMs) * 100))

  const copy =
    phase === "incoming"
      ? {
          label: "Cuộc gọi thoại đến",
          subtitle: statusMessage ?? "Đang gọi cho bạn...",
        }
      : phase === "outgoing"
        ? {
            label: "Đang gọi thoại",
            subtitle: statusMessage ?? "Đang đổ chuông...",
          }
        : phase === "connecting"
          ? {
              label: "Đang kết nối",
              subtitle: statusMessage ?? "Đang thiết lập cuộc gọi...",
            }
          : {
              label: "Đang trong cuộc gọi",
              subtitle: statusMessage ?? `Thời lượng: ${formatDuration(elapsed)}`,
            }

  const handleClose = phase === "incoming" ? onReject : onEnd

  if (!open) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 backdrop-blur-sm">
      <div className="w-[360px] max-w-[calc(100vw-2rem)] rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-end px-4 pt-4">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="text-slate-500 hover:text-slate-700"
            title="Tắt"
            onClick={handleClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="px-6 pb-5 text-center">
          <p className="text-sm font-medium text-slate-500">{copy.label}</p>
          <Avatar className="mx-auto mt-4 h-20 w-20 ring-4 ring-slate-100">
            <AvatarImage src={callerAvatar ?? undefined} alt={callerName} />
            <AvatarFallback className="text-lg">{fallback}</AvatarFallback>
          </Avatar>
          <p className="mt-3 truncate text-xl font-semibold text-slate-900">{callerName}</p>
          <p className={`mt-1 text-sm ${statusMessage ? "text-amber-600" : "text-slate-500"}`}>{copy.subtitle}</p>
          {countdownPercent != null ? (
            <div className="mt-3">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-blue-600 transition-all duration-200"
                  style={{ width: `${countdownPercent}%` }}
                />
              </div>
            </div>
          ) : null}
        </div>
        <div className="flex items-center justify-center gap-4 border-t border-slate-200 px-6 py-5">
          {statusMessage ? null : phase === "incoming" ? (
            <>
              <Button
                type="button"
                variant="destructive"
                className="h-11 min-w-32 rounded-full"
                onClick={onReject}
              >
                <PhoneOff className="mr-2 h-4 w-4" />
                Từ chối
              </Button>
              <Button
                type="button"
                className="h-11 min-w-32 rounded-full bg-emerald-600 hover:bg-emerald-700"
                onClick={onAccept}
              >
                <Phone className="mr-2 h-4 w-4" />
                Nhận
              </Button>
            </>
          ) : (
            <Button
              type="button"
              variant="destructive"
              className="h-11 min-w-32 rounded-full"
              onClick={onEnd}
            >
              <PhoneCall className="mr-2 h-4 w-4" />
              Tắt cuộc gọi
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
