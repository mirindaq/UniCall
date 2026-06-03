import {
  Expand,
  Maximize2,
  Mic,
  MicOff,
  Minimize2,
  Phone,
  PhoneCall,
  PhoneOff,
  Shrink,
  Video,
  VideoOff,
  X,
} from "lucide-react"
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type RefObject } from "react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import type { SfuParticipantMedia } from "@/services/call/adapters/call-media-adapter"

type GroupParticipant = { id: string; name: string; avatar?: string | null }

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
  micEnabled?: boolean
  cameraEnabled?: boolean
  canToggleCamera?: boolean
  isGroupCall?: boolean
  currentUserId?: string | null
  groupParticipants?: GroupParticipant[]
  participantMedia?: SfuParticipantMedia[]
  localStream?: MediaStream | null
  remoteAudioRef?: RefObject<HTMLAudioElement | null>
  remoteVideoRef?: RefObject<HTMLVideoElement | null>
  localVideoRef?: RefObject<HTMLVideoElement | null>
  onAccept: () => void
  onAcceptWithoutCamera?: () => void
  onReject: () => void
  onEnd: () => void
  onToggleMic?: () => void
  onToggleCamera?: () => void
}

const formatDuration = (seconds: number) => {
  const mm = Math.floor(seconds / 60)
  const ss = seconds % 60
  return `${mm.toString().padStart(2, "0")}:${ss.toString().padStart(2, "0")}`
}

const normalizeId = (value?: string | null) => value?.trim().toLowerCase() ?? ""

const initialsOf = (name: string) => {
  const text = name.trim()
  if (!text) {
    return "U"
  }
  const words = text.split(/\s+/).filter(Boolean)
  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase()
  }
  return `${words[0][0] ?? ""}${words[words.length - 1][0] ?? ""}`.toUpperCase()
}

type PanelPosition = { x: number; y: number }

/** Renders a MediaStream into a <video>, keeping srcObject in sync. */
function StreamVideo({
  stream,
  mirror = false,
  className,
}: {
  stream: MediaStream | null
  mirror?: boolean
  className?: string
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) {
      return
    }
    if (video.srcObject !== stream) {
      video.srcObject = stream
    }
    if (stream) {
      void video.play().catch(() => undefined)
    }
  }, [stream])

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted
      className={`${className ?? ""} ${mirror ? "scale-x-[-1]" : ""}`}
    />
  )
}

type GroupTile = {
  participant: GroupParticipant
  isSelf: boolean
  stream: MediaStream | null
  hasVideo: boolean
}

function GroupCallGrid({
  tiles,
  pinnedId,
  onPin,
  fullscreen,
}: {
  tiles: GroupTile[]
  pinnedId: string | null
  onPin: (id: string) => void
  fullscreen: boolean
}) {
  const ordered = (() => {
    if (!pinnedId) {
      return tiles
    }
    const pinned = tiles.find((tile) => tile.participant.id === pinnedId)
    if (!pinned) {
      return tiles
    }
    return [pinned, ...tiles.filter((tile) => tile.participant.id !== pinnedId)]
  })()

  const count = ordered.length
  const gridColsClass =
    count <= 1
      ? "grid-cols-1"
      : count === 2
        ? "grid-cols-2"
        : count <= 4
          ? "grid-cols-2"
          : count <= 9
            ? "grid-cols-3"
            : "grid-cols-4"

  return (
    <div className={`grid ${gridColsClass} gap-2`}>
      {ordered.map((tile) => {
        const { participant, isSelf, stream, hasVideo } = tile
        const isPinned = participant.id === pinnedId
        return (
          <button
            key={participant.id}
            type="button"
            onClick={() => onPin(participant.id)}
            className={`group relative aspect-video overflow-hidden rounded-xl border bg-slate-800 text-left transition ${
              isPinned ? "border-sky-400 ring-2 ring-sky-400/60" : "border-white/15"
            } ${fullscreen ? "min-h-[140px]" : ""}`}
          >
            {hasVideo && stream ? (
              <StreamVideo
                stream={stream}
                mirror={isSelf}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-slate-800">
                <Avatar className="h-14 w-14">
                  <AvatarImage src={participant.avatar ?? undefined} alt={participant.name} />
                  <AvatarFallback className="bg-slate-600 text-base font-semibold text-white">
                    {initialsOf(participant.name)}
                  </AvatarFallback>
                </Avatar>
                <span className="px-2 text-center text-[11px] text-slate-300">
                  {hasVideo ? "Đang tải video..." : "Đã tắt camera"}
                </span>
              </div>
            )}

            <div className="absolute bottom-1.5 left-1.5 flex max-w-[calc(100%-12px)] items-center gap-1 rounded-md bg-black/60 px-2 py-0.5">
              <span className="truncate text-[11px] font-medium text-white">
                {isSelf ? `${participant.name} (Bạn)` : participant.name}
              </span>
            </div>
          </button>
        )
      })}
    </div>
  )
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
  micEnabled = true,
  cameraEnabled = true,
  canToggleCamera = false,
  isGroupCall = false,
  currentUserId,
  groupParticipants = [],
  participantMedia = [],
  localStream,
  remoteAudioRef,
  remoteVideoRef,
  localVideoRef,
  onAccept,
  onAcceptWithoutCamera,
  onReject,
  onEnd,
  onToggleMic,
  onToggleCamera,
}: IncomingCallPopupProps) {
  const [elapsed, setElapsed] = useState(0)
  const [remainingMs, setRemainingMs] = useState<number | null>(null)
  const [isMinimized, setIsMinimized] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [panelPosition, setPanelPosition] = useState<PanelPosition | null>(null)
  const [pinnedParticipantId, setPinnedParticipantId] = useState<string | null>(null)

  const panelRef = useRef<HTMLDivElement | null>(null)
  const dragStateRef = useRef<{ offsetX: number; offsetY: number; pointerId: number } | null>(null)

  const inCallActive = phase === "in-call" && !statusMessage

  useEffect(() => {
    if (!inCallActive) {
      setIsMinimized(false)
      setPanelPosition(null)
      setPinnedParticipantId(null)
    }
  }, [inCallActive])

  useEffect(() => {
    if (!isGroupCall) {
      setPinnedParticipantId(null)
      return
    }
    if (!pinnedParticipantId && groupParticipants.length > 0) {
      setPinnedParticipantId(groupParticipants[0].id)
    }
  }, [groupParticipants, isGroupCall, pinnedParticipantId])

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

  // Keep React state in sync with the native fullscreen status.
  useEffect(() => {
    const handleChange = () => {
      setIsFullscreen(document.fullscreenElement === panelRef.current)
    }
    document.addEventListener("fullscreenchange", handleChange)
    return () => document.removeEventListener("fullscreenchange", handleChange)
  }, [])

  const toggleFullscreen = () => {
    const panel = panelRef.current
    if (!panel) {
      return
    }
    if (document.fullscreenElement === panel) {
      void document.exitFullscreen().catch(() => undefined)
    } else {
      setIsMinimized(false)
      void panel.requestFullscreen().catch(() => undefined)
    }
  }

  const fallback = initialsOf(callerName)
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

  const onDragStart = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!inCallActive || isFullscreen) {
      return
    }
    const target = event.target as HTMLElement
    if (target.closest("button")) {
      return
    }

    const rect = panelRef.current?.getBoundingClientRect()
    if (!rect) {
      return
    }

    dragStateRef.current = {
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      pointerId: event.pointerId,
    }
  }

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      const drag = dragStateRef.current
      const panel = panelRef.current
      if (!drag || !panel) {
        return
      }
      if (event.pointerId !== drag.pointerId) {
        return
      }

      const width = panel.offsetWidth
      const height = panel.offsetHeight
      const nextX = Math.min(
        Math.max(8, event.clientX - drag.offsetX),
        Math.max(8, window.innerWidth - width - 8)
      )
      const nextY = Math.min(
        Math.max(8, event.clientY - drag.offsetY),
        Math.max(8, window.innerHeight - height - 8)
      )
      setPanelPosition({ x: nextX, y: nextY })
    }

    const handlePointerUp = (event: PointerEvent) => {
      const drag = dragStateRef.current
      if (!drag || event.pointerId !== drag.pointerId) {
        return
      }
      dragStateRef.current = null
    }

    window.addEventListener("pointermove", handlePointerMove)
    window.addEventListener("pointerup", handlePointerUp)
    window.addEventListener("pointercancel", handlePointerUp)
    return () => {
      window.removeEventListener("pointermove", handlePointerMove)
      window.removeEventListener("pointerup", handlePointerUp)
      window.removeEventListener("pointercancel", handlePointerUp)
    }
  }, [])

  if (!open) {
    return null
  }

  const showVideoArea = !audioOnly

  const mediaByIdentity = new Map(
    participantMedia.map((item) => [normalizeId(item.identity), item])
  )

  const uniqueGroupParticipants = groupParticipants.filter(
    (item, index, arr) => arr.findIndex((it) => it.id === item.id) === index
  )

  const groupTiles: GroupTile[] = uniqueGroupParticipants.map((participant) => {
    const isSelf = normalizeId(participant.id) === normalizeId(currentUserId)
    const media = mediaByIdentity.get(normalizeId(participant.id))
    const stream = isSelf ? localStream ?? null : media?.stream ?? null
    const hasVideo = isSelf
      ? Boolean(localStream?.getVideoTracks().some((track) => track.readyState === "live" && track.enabled))
      : Boolean(media?.hasVideo)
    return { participant, isSelf, stream, hasVideo }
  })

  const useFloatingPanel = phase !== "in-call" || Boolean(statusMessage)
  const modalClassName = isFullscreen
    ? "h-screen w-screen max-w-none rounded-none"
    : useFloatingPanel
      ? "w-[360px] max-w-[calc(100vw-1rem)]"
      : showVideoArea
        ? "w-[min(92vw,820px)] max-w-[92vw]"
        : "w-[360px] max-w-[calc(100vw-1rem)]"

  if (inCallActive && isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />
        {!audioOnly ? <video ref={remoteVideoRef} autoPlay playsInline className="hidden" /> : null}

        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-xl">
          <Avatar className="h-10 w-10">
            <AvatarImage src={callerAvatar ?? undefined} alt={callerName} />
            <AvatarFallback>{fallback}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900">{callerName}</p>
            <p className="text-xs text-slate-500">{formatDuration(elapsed)}</p>
          </div>
          <Button type="button" variant="ghost" size="icon-sm" onClick={() => setIsMinimized(false)}>
            <Maximize2 className="h-4 w-4" />
          </Button>
          <Button type="button" variant="destructive" size="icon-sm" onClick={onEnd}>
            <PhoneOff className="h-4 w-4" />
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`fixed z-50 flex ${
        useFloatingPanel && !isFullscreen
          ? "bottom-4 right-4 items-end justify-end"
          : "inset-0 items-center justify-center"
      }`}
      style={
        inCallActive && panelPosition && !isFullscreen
          ? {
              left: panelPosition.x,
              top: panelPosition.y,
              right: "auto",
              bottom: "auto",
            }
          : undefined
      }
    >
      <div
        ref={panelRef}
        className={`${modalClassName} flex flex-col overflow-hidden border border-slate-300 bg-white shadow-2xl ring-1 ring-slate-200 ${
          isFullscreen ? "" : "rounded-2xl"
        }`}
      >
        <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />

        <div
          className={`flex shrink-0 items-center justify-between px-4 pt-3 ${
            inCallActive && !isFullscreen ? "cursor-move select-none" : ""
          }`}
          onPointerDown={onDragStart}
        >
          <span className="text-xs font-medium text-slate-400">
            {inCallActive && !isFullscreen ? "Giữ để kéo" : ""}
          </span>
          <div className="flex items-center gap-1">
            {inCallActive && !isFullscreen ? (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="text-slate-500 hover:text-slate-700"
                title="Thu nhỏ"
                onClick={() => setIsMinimized(true)}
              >
                <Minimize2 className="h-4 w-4" />
              </Button>
            ) : null}
            {inCallActive && showVideoArea ? (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="text-slate-500 hover:text-slate-700"
                title={isFullscreen ? "Thoát toàn màn hình" : "Toàn màn hình"}
                onClick={toggleFullscreen}
              >
                {isFullscreen ? <Shrink className="h-4 w-4" /> : <Expand className="h-4 w-4" />}
              </Button>
            ) : null}
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
        </div>

        <div
          className={`flex min-h-0 flex-1 flex-col px-6 pb-5 text-center ${
            isFullscreen ? "justify-center overflow-y-auto" : ""
          }`}
        >
          <p className="shrink-0 text-sm font-medium text-slate-500">{copy.label}</p>

          {showVideoArea && !useFloatingPanel && isGroupCall ? (
            <div
              className={`mx-auto mt-3 w-full rounded-xl bg-slate-900 p-2 ${
                isFullscreen ? "max-w-[1400px]" : "max-w-[800px]"
              }`}
            >
              <GroupCallGrid
                tiles={groupTiles}
                pinnedId={pinnedParticipantId}
                onPin={setPinnedParticipantId}
                fullscreen={isFullscreen}
              />
            </div>
          ) : showVideoArea && !useFloatingPanel ? (
            <div
              className={`relative mx-auto mt-3 aspect-video w-full overflow-hidden rounded-xl bg-slate-900 ${
                isFullscreen ? "max-h-[80vh]" : "max-h-[62vh]"
              }`}
            >
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                muted
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
              <Avatar className="mx-auto mt-3 h-20 w-20 ring-4 ring-slate-100">
                <AvatarImage src={callerAvatar ?? undefined} alt={callerName} />
                <AvatarFallback className="text-lg">{fallback}</AvatarFallback>
              </Avatar>
              <p className="mt-3 truncate text-xl font-semibold text-slate-900">{callerName}</p>
            </>
          )}

          <p className={`mt-2 shrink-0 text-sm ${statusMessage ? "text-amber-600" : "text-slate-500"}`}>
            {copy.subtitle}
          </p>
          {isGroupCall && inCallActive ? (
            <p className="mt-1 shrink-0 text-xs text-slate-500">Bấm vào ô để ghim người đó lên đầu.</p>
          ) : null}
          {countdownPercent != null ? (
            <div className={`mx-auto mt-3 shrink-0 ${showVideoArea && !useFloatingPanel ? "max-w-full" : "max-w-[500px]"}`}>
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

        <div className="flex shrink-0 flex-wrap items-center justify-center gap-3 border-t border-slate-200 px-5 py-4">
          {statusMessage ? null : phase === "incoming" ? (
            <>
              <Button
                type="button"
                variant="destructive"
                className="h-11 w-11 rounded-full"
                onClick={onReject}
                title="Từ chối"
              >
                <PhoneOff className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                className="h-11 w-11 rounded-full bg-emerald-600 hover:bg-emerald-700"
                onClick={onAccept}
                title="Nhận"
              >
                <Phone className="h-4 w-4" />
              </Button>
              {!audioOnly && onAcceptWithoutCamera ? (
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 w-11 rounded-full"
                  onClick={onAcceptWithoutCamera}
                  title="Nhận không camera"
                >
                  <VideoOff className="h-4 w-4" />
                </Button>
              ) : null}
            </>
          ) : (
            <>
              <Button
                type="button"
                variant={micEnabled ? "outline" : "secondary"}
                className="h-11 w-11 rounded-full"
                title={micEnabled ? "Tắt mic" : "Bật mic"}
                onClick={onToggleMic}
              >
                {micEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
              </Button>
              {canToggleCamera ? (
                <Button
                  type="button"
                  variant={cameraEnabled ? "outline" : "secondary"}
                  className="h-11 w-11 rounded-full"
                  title={cameraEnabled ? "Tắt camera" : "Bật camera"}
                  onClick={onToggleCamera}
                >
                  {cameraEnabled ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
                </Button>
              ) : null}
              <Button
                type="button"
                variant="destructive"
                className="h-11 min-w-28 rounded-full"
                onClick={onEnd}
              >
                <PhoneCall className="mr-2 h-4 w-4" />
                Tắt
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
