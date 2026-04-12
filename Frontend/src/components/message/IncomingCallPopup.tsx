import { Phone, PhoneCall, PhoneOff, X } from "lucide-react"
import { useEffect, useState, type RefObject } from "react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"

type IncomingCallPopupProps = {
  open: boolean
  phase: "incoming" | "outgoing" | "connecting" | "in-call"
  callerName: string
  callerAvatar?: string | null
  audioOnly?: boolean
  startedAt?: number
  ringDeadlineAt?: number
  ringDurationMs?: number
  statusMessage?: string | null
  remoteAudioRef?: RefObject<HTMLAudioElement | null>
  remoteVideoRef?: RefObject<HTMLVideoElement | null>
  localVideoRef?: RefObject<HTMLVideoElement | null>
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
  audioOnly = true,
  startedAt,
  ringDeadlineAt,
  ringDurationMs = 15_000,
  statusMessage,
  remoteAudioRef,
  remoteVideoRef,
  localVideoRef,
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
  const callKind = audioOnly ? "thoại" : "video"
  const countdownPercent =
    remainingMs == null ? null : Math.max(0, Math.min(100, (remainingMs / ringDurationMs) * 100))
  const countdownSeconds = remainingMs == null ? null : Math.ceil(remainingMs / 1000)

  const copy =
    phase === "incoming"
      ? {
          label: `Cuộc gọi ${callKind} đến`,
          subtitle: statusMessage ?? "Đang gọi cho bạn...",
        }
      : phase === "outgoing"
        ? {
            label: `Đang gọi ${callKind}`,
            subtitle: statusMessage ?? "Đang đổ chuông...",
          }
        : phase === "connecting"
          ? {
              label: "Đang kết nối",
              subtitle: statusMessage ?? "Đang thiết lập cuộc gọi...",
            }
          : {
              label: `Đang trong cuộc gọi ${callKind}`,
              subtitle: statusMessage ?? `Thời lượng: ${formatDuration(elapsed)}`,
            }

  const handleClose = phase === "incoming" ? onReject : onEnd

  if (!open) {
    return null
  }

  const showVideoArea = !audioOnly
  const modalClassName = showVideoArea
    ? "w-[min(96vw,1200px)] max-w-[96vw]"
    : "w-[360px] max-w-[calc(100vw-2rem)]"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 backdrop-blur-sm">
      <div className={`${modalClassName} rounded-2xl border border-slate-200 bg-white shadow-2xl`}>
        <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />

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

          {showVideoArea ? (
            <div className="relative mx-auto mt-4 aspect-video w-full max-h-[70vh] overflow-hidden rounded-xl bg-slate-900">
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="h-full w-full object-cover"
              />
              <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/10" />
              <div className="absolute bottom-3 left-3 rounded-md bg-black/55 px-2 py-1 text-xs text-white">
                {callerName}
              </div>
              <div className="absolute bottom-3 right-3 h-24 w-32 overflow-hidden rounded-lg border border-white/20 bg-black/50">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="h-full w-full scale-x-[-1] object-cover"
                />
              </div>
            </div>
          ) : (
            <>
              <Avatar className="mx-auto mt-4 h-20 w-20 ring-4 ring-slate-100">
                <AvatarImage src={callerAvatar ?? undefined} alt={callerName} />
                <AvatarFallback className="text-lg">{fallback}</AvatarFallback>
              </Avatar>
              <p className="mt-3 truncate text-xl font-semibold text-slate-900">{callerName}</p>
            </>
          )}

          <p className={`mt-2 text-sm ${statusMessage ? "text-amber-600" : "text-slate-500"}`}>{copy.subtitle}</p>
          {countdownPercent != null ? (
            <div className={`mx-auto mt-3 ${showVideoArea ? "max-w-full" : "max-w-[500px]"}`}>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-blue-600 transition-all duration-200"
                  style={{ width: `${countdownPercent}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-slate-500">Tự hủy sau {countdownSeconds}s</p>
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
