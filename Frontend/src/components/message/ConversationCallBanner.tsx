import { Phone, PhoneCall, PhoneOff } from "lucide-react"
import { useEffect, useMemo, useState } from "react"

import { Button } from "@/components/ui/button"

type ConversationCallBannerProps = {
  phase: "idle" | "outgoing" | "incoming" | "connecting" | "in-call"
  statusText: string
  startedAt?: number
  onAccept: () => void
  onReject: () => void
  onEnd: () => void
}

const formatDuration = (seconds: number) => {
  const mm = Math.floor(seconds / 60)
  const ss = seconds % 60
  return `${mm.toString().padStart(2, "0")}:${ss.toString().padStart(2, "0")}`
}

export default function ConversationCallBanner({
  phase,
  statusText,
  startedAt,
  onAccept,
  onReject,
  onEnd,
}: ConversationCallBannerProps) {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (phase !== "in-call" || !startedAt) {
      return
    }
    const tick = () => {
      const seconds = Math.max(0, Math.floor((Date.now() - startedAt) / 1000))
      setElapsed(seconds)
    }
    tick()
    const interval = window.setInterval(tick, 1000)
    return () => window.clearInterval(interval)
  }, [phase, startedAt])

  const durationText = useMemo(() => {
    if (phase !== "in-call") {
      return null
    }
    return formatDuration(elapsed)
  }, [elapsed, phase])

  if (phase === "idle") {
    return null
  }

  return (
    <div className="flex shrink-0 items-center justify-between gap-3 border-b bg-emerald-50 px-4 py-2 text-sm text-emerald-900">
      <div className="flex min-w-0 items-center gap-2">
        <PhoneCall className="h-4 w-4 shrink-0" />
        <p className="truncate font-medium">
          {statusText}
          {durationText ? ` • ${durationText}` : ""}
        </p>
      </div>
      <div className="flex items-center gap-2">
        {phase === "incoming" ? (
          <>
            <Button size="sm" className="h-8 bg-emerald-600 hover:bg-emerald-700" onClick={onAccept}>
              <Phone className="mr-1 h-4 w-4" />
              Nhận
            </Button>
            <Button size="sm" variant="destructive" className="h-8" onClick={onReject}>
              <PhoneOff className="mr-1 h-4 w-4" />
              Từ chối
            </Button>
          </>
        ) : (
          <Button size="sm" variant="destructive" className="h-8" onClick={onEnd}>
            <PhoneOff className="mr-1 h-4 w-4" />
            Kết thúc
          </Button>
        )}
      </div>
    </div>
  )
}
