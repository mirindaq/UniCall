import {
  Maximize2,
  Mic,
  MicOff,
  Minimize2,
  Phone,
  PhoneCall,
  PhoneOff,
  PictureInPicture2,
  Video,
  VideoOff,
  X,
} from "lucide-react"
import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from "react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"

const normalizeParticipantId = (value?: string | null) =>
  (value ?? "").trim().toLowerCase()

type GroupParticipant = {
  id: string
  name: string
  avatar?: string | null
}

type CallViewMode = "fullscreen" | "modal" | "minimized"

type ParticipantVideoProps = {
  stream?: MediaStream | null
  mirrored?: boolean
  className?: string
}

function ParticipantVideo({
  stream,
  mirrored = false,
  className,
}: ParticipantVideoProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) {
      return
    }
    video.srcObject = stream ?? null
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
      className={`${className ?? ""}${mirrored ? " scale-x-[-1]" : ""}`}
    />
  )
}

type ParticipantTileProps = {
  participant: GroupParticipant
  isSelf: boolean
  participantStream: MediaStream | null
  localStream?: MediaStream | null
  cameraEnabled?: boolean
  isPinned?: boolean
  onPin?: () => void
  className?: string
  labelClassName?: string
  compact?: boolean
}

function ParticipantTile({
  participant,
  isSelf,
  participantStream,
  localStream = null,
  cameraEnabled = true,
  isPinned = false,
  onPin,
  className = "",
  labelClassName = "text-[10px]",
  compact = false,
}: ParticipantTileProps) {
  const fallbackText = participant.name.trim().slice(0, 2).toUpperCase() || "U"
  const selfStream =
    isSelf && localStream && localStream.getVideoTracks().length > 0 ? localStream : null
  const activeStream = isSelf ? selfStream : participantStream
  const showVideo = Boolean(activeStream) && (isSelf ? cameraEnabled : true)

  const content = showVideo && activeStream ? (
    <ParticipantVideo
      stream={activeStream}
      mirrored={isSelf}
      className="h-full w-full object-cover"
    />
  ) : participant.avatar ? (
    <img src={participant.avatar} alt={participant.name} className="h-full w-full object-cover" />
  ) : (
    <div
      className={`flex h-full w-full flex-col items-center justify-center bg-slate-700 text-white ${
        compact ? "text-sm" : "text-xl"
      } font-semibold`}
    >
      <span>{fallbackText}</span>
      {isSelf && !cameraEnabled ? (
        <span className="mt-1 text-[10px] font-normal text-slate-300">Camera tắt</span>
      ) : null}
    </div>
  )

  const tileClassName = `relative overflow-hidden rounded-xl border text-left ${
    isPinned ? "border-sky-400 ring-2 ring-sky-400/40" : "border-white/20"
  } ${className}`

  if (onPin) {
    return (
      <button type="button" className={tileClassName} onClick={onPin}>
        {content}
        <div
          className={`absolute bottom-1.5 left-1.5 rounded bg-black/60 px-2 py-0.5 text-white ${labelClassName}`}
        >
          {participant.name}
        </div>
      </button>
    )
  }

  return (
    <div className={tileClassName}>
      {content}
      <div
        className={`absolute bottom-1.5 left-1.5 rounded bg-black/60 px-2 py-0.5 text-white ${labelClassName}`}
      >
        {participant.name}
      </div>
    </div>
  )
}

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
  groupParticipants?: GroupParticipant[]
  currentUserId?: string | null
  participantStreams?: Record<string, MediaStream>
  localStream?: MediaStream | null
  remoteAudioRef?: RefObject<HTMLAudioElement | null>
  remoteVideoRef?: RefObject<HTMLVideoElement | null>
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

type PanelPosition = { x: number; y: number }

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
  groupParticipants = [],
  currentUserId = null,
  participantStreams = {},
  localStream = null,
  remoteAudioRef,
  remoteVideoRef,
  onAccept,
  onAcceptWithoutCamera,
  onReject,
  onEnd,
  onToggleMic,
  onToggleCamera,
}: IncomingCallPopupProps) {
  const [elapsed, setElapsed] = useState(0)
  const [remainingMs, setRemainingMs] = useState<number | null>(null)
  const [viewMode, setViewMode] = useState<CallViewMode>("modal")
  const [panelPosition, setPanelPosition] = useState<PanelPosition | null>(null)
  const [pinnedParticipantId, setPinnedParticipantId] = useState<string | null>(null)

  const panelRef = useRef<HTMLDivElement | null>(null)
  const dragStateRef = useRef<{ offsetX: number; offsetY: number; pointerId: number } | null>(
    null
  )
  const lastExpandedViewRef = useRef<Exclude<CallViewMode, "minimized">>("modal")
  const prevPhaseRef = useRef(phase)

  const inCallActive = phase === "in-call" && !statusMessage
  const showVideoArea = !audioOnly
  const useFloatingPanel = phase !== "in-call" || Boolean(statusMessage)

  useEffect(() => {
    if (phase === "in-call" && prevPhaseRef.current !== "in-call" && showVideoArea) {
      const initialMode: CallViewMode = isGroupCall ? "fullscreen" : "modal"
      setViewMode(initialMode)
      lastExpandedViewRef.current = initialMode
    }
    if (phase !== "in-call") {
      setViewMode("modal")
      setPanelPosition(null)
      setPinnedParticipantId(null)
    }
    prevPhaseRef.current = phase
  }, [phase, showVideoArea, isGroupCall])

  useEffect(() => {
    if (!isGroupCall) {
      setPinnedParticipantId(null)
      return
    }
    if (!pinnedParticipantId && groupParticipants.length > 0) {
      const firstRemote =
        groupParticipants.find(
          (participant) =>
            normalizeParticipantId(participant.id) !==
            normalizeParticipantId(currentUserId)
        ) ?? groupParticipants[0]
      setPinnedParticipantId(firstRemote.id)
    }
  }, [currentUserId, groupParticipants, isGroupCall, pinnedParticipantId])

  useEffect(() => {
    if (phase !== "in-call" || !startedAt) {
      setElapsed(0)
      return
    }
    const tick = () => {
      setElapsed(Math.max(0, Math.floor((Date.now() - startedAt) / 1000)))
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
              label: isGroupCall ? "Cuộc gọi nhóm video" : `Đang trong cuộc gọi ${callKind}`,
              subtitle: statusMessage ?? formatDuration(elapsed),
            }

  const handleClose = phase === "incoming" ? onReject : onEnd

  const expandToFullscreen = () => {
    lastExpandedViewRef.current = "fullscreen"
    setViewMode("fullscreen")
    setPanelPosition(null)
  }

  const expandToModal = () => {
    lastExpandedViewRef.current = "modal"
    setViewMode("modal")
  }

  const minimizeToBar = () => {
    if (viewMode !== "minimized") {
      lastExpandedViewRef.current = viewMode === "fullscreen" ? "fullscreen" : "modal"
    }
    setViewMode("minimized")
  }

  const restoreFromBar = () => {
    setViewMode(lastExpandedViewRef.current)
  }

  const onDragStart = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!inCallActive || viewMode !== "modal") {
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
    if (!inCallActive || viewMode !== "fullscreen" || !showVideoArea) {
      return
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        lastExpandedViewRef.current = "modal"
        setViewMode("modal")
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [inCallActive, showVideoArea, viewMode])

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
      setPanelPosition({
        x: Math.min(
          Math.max(8, event.clientX - drag.offsetX),
          Math.max(8, window.innerWidth - width - 8)
        ),
        y: Math.min(
          Math.max(8, event.clientY - drag.offsetY),
          Math.max(8, window.innerHeight - height - 8)
        ),
      })
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

  const myNormalizedId = normalizeParticipantId(currentUserId)

  const getParticipantStream = (participantId: string) => {
    const normalizedId = normalizeParticipantId(participantId)
    if (participantStreams[participantId]?.getTracks().length) {
      return participantStreams[participantId]
    }
    const matchedEntry = Object.entries(participantStreams).find(
      ([id, stream]) =>
        normalizeParticipantId(id) === normalizedId && stream.getTracks().length > 0
    )
    return matchedEntry?.[1] ?? null
  }

  const isSelfParticipant = (participantId: string) =>
    Boolean(myNormalizedId) && normalizeParticipantId(participantId) === myNormalizedId

  const uniqueGroupParticipants = groupParticipants.filter(
    (item, index, arr) => arr.findIndex((it) => it.id === item.id) === index
  )

  const pinnedMember =
    uniqueGroupParticipants.find((item) => item.id === pinnedParticipantId) ??
    uniqueGroupParticipants.find(
      (item) => normalizeParticipantId(item.id) !== myNormalizedId
    ) ??
    uniqueGroupParticipants[0] ??
    null

  const stripMembers = pinnedMember
    ? uniqueGroupParticipants.filter((item) => item.id !== pinnedMember.id)
    : uniqueGroupParticipants

  const renderParticipantTile = (
    participant: GroupParticipant,
    options: {
      isPinned?: boolean
      onPin?: () => void
      className?: string
      labelClassName?: string
      compact?: boolean
    } = {}
  ) => {
    const isSelf = isSelfParticipant(participant.id)
    const participantStream = isSelf ? null : getParticipantStream(participant.id)

    return (
      <ParticipantTile
        key={participant.id}
        participant={participant}
        isSelf={isSelf}
        participantStream={participantStream}
        localStream={localStream}
        cameraEnabled={cameraEnabled}
        isPinned={options.isPinned}
        onPin={options.onPin}
        className={options.className}
        labelClassName={options.labelClassName}
        compact={options.compact}
      />
    )
  }

  const renderGroupVideoStage = (layout: "fullscreen" | "modal") => {
    const isFullscreen = layout === "fullscreen"

    if (uniqueGroupParticipants.length === 0) {
      return (
        <div
          className={`flex items-center justify-center rounded-xl bg-slate-800 text-sm text-slate-300 ${
            isFullscreen ? "h-full min-h-0 flex-1" : "aspect-video"
          }`}
        >
          Đang chờ mọi người tham gia...
        </div>
      )
    }

    if (uniqueGroupParticipants.length === 1 && pinnedMember) {
      return renderParticipantTile(pinnedMember, {
        isPinned: true,
        className: `${isFullscreen ? "h-full min-h-0" : "aspect-video"} bg-slate-800`,
        labelClassName: isFullscreen ? "text-xs" : "text-[10px]",
      })
    }

    if (!pinnedMember) {
      return null
    }

    return (
      <div
        className={`flex min-h-0 w-full gap-2 ${
          isFullscreen ? "h-full flex-1" : "min-h-[300px]"
        }`}
      >
        <div className="min-h-0 min-w-0 flex-[4]">
          {renderParticipantTile(pinnedMember, {
            isPinned: true,
            className: `${isFullscreen ? "h-full" : "h-full min-h-[240px]"} bg-slate-800`,
            labelClassName: isFullscreen ? "text-sm" : "text-xs",
          })}
        </div>

        <div className="flex min-h-0 min-w-0 flex-[1] flex-col">
          <p className="mb-2 shrink-0 px-0.5 text-[10px] font-medium uppercase tracking-wide text-white/45">
            Người tham gia
          </p>
          <div className="flex min-h-[500px] flex-1 flex-col gap-2 overflow-y-auto pr-0.5">
            {stripMembers.map((participant) =>
              renderParticipantTile(participant, {
                onPin: () => setPinnedParticipantId(participant.id),
                className: `${isFullscreen ? "h-40 shrink-0" : "aspect-video shrink-0"} bg-slate-800`,
                labelClassName: "text-[10px]",
                compact: true,
              })
            )}
          </div>
        </div>
      </div>
    )
  }

  const renderCallControls = (variant: "light" | "dark" = "light") => {
    const outlineClass =
      variant === "dark"
        ? "border-white/25 bg-white/10 text-white hover:bg-white/20"
        : undefined
    const secondaryClass =
      variant === "dark" ? "bg-white/15 text-white hover:bg-white/25" : undefined

    if (statusMessage) {
      return null
    }

    if (phase === "incoming") {
      return (
        <>
          <Button
            type="button"
            variant="destructive"
            className="h-12 w-12 rounded-full"
            onClick={onReject}
            title="Từ chối"
          >
            <PhoneOff className="h-5 w-5" />
          </Button>
          <Button
            type="button"
            className="h-12 w-12 rounded-full bg-emerald-600 hover:bg-emerald-700"
            onClick={onAccept}
            title="Nhận"
          >
            <Phone className="h-5 w-5" />
          </Button>
          {!audioOnly && onAcceptWithoutCamera ? (
            <Button
              type="button"
              variant="outline"
              className={`h-12 w-12 rounded-full ${outlineClass ?? ""}`}
              onClick={onAcceptWithoutCamera}
              title="Nhận không camera"
            >
              <VideoOff className="h-5 w-5" />
            </Button>
          ) : null}
        </>
      )
    }

    return (
      <>
        <Button
          type="button"
          variant={micEnabled ? "outline" : "secondary"}
          className={`h-12 w-12 rounded-full ${micEnabled ? outlineClass ?? "" : secondaryClass ?? ""}`}
          title={micEnabled ? "Tắt mic" : "Bật mic"}
          onClick={onToggleMic}
        >
          {micEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
        </Button>
        {canToggleCamera ? (
          <Button
            type="button"
            variant={cameraEnabled ? "outline" : "secondary"}
            className={`h-12 w-12 rounded-full ${cameraEnabled ? outlineClass ?? "" : secondaryClass ?? ""}`}
            title={cameraEnabled ? "Tắt camera" : "Bật camera"}
            onClick={onToggleCamera}
          >
            {cameraEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
          </Button>
        ) : null}
        <Button
          type="button"
          variant="destructive"
          className="h-12 min-w-32 rounded-full"
          onClick={onEnd}
        >
          <PhoneCall className="mr-2 h-5 w-5" />
          Tắt
        </Button>
      </>
    )
  }

  const renderViewModeControls = (variant: "light" | "dark" = "light") => {
    if (!inCallActive) {
      return null
    }

    const ghostClass =
      variant === "dark"
        ? "text-white/80 hover:bg-white/10 hover:text-white"
        : "text-slate-500 hover:text-slate-700"

    return (
      <>
        {showVideoArea ? (
          viewMode === "fullscreen" ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className={ghostClass}
              title="Thu về cửa sổ"
              onClick={expandToModal}
            >
              <Minimize2 className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className={ghostClass}
              title="Toàn màn hình"
              onClick={expandToFullscreen}
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          )
        ) : null}
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className={ghostClass}
          title="Thu nhỏ góc màn hình"
          onClick={minimizeToBar}
        >
          <PictureInPicture2 className="h-4 w-4" />
        </Button>
      </>
    )
  }

  const renderDirectVideo = (layout: "fullscreen" | "modal") => {
    const isFullscreen = layout === "fullscreen"
    const showLocalPreview =
      Boolean(localStream) && localStream!.getVideoTracks().length > 0 && cameraEnabled

    return (
      <div
        className={`relative overflow-hidden bg-slate-900 ${
          isFullscreen
            ? "h-full w-full flex-1 rounded-none"
            : "mx-auto mt-3 aspect-video w-full max-h-[62vh] rounded-xl"
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
        <div
          className={`absolute overflow-hidden rounded-lg border border-white/20 bg-black/50 ${
            isFullscreen ? "bottom-6 right-6 h-36 w-52" : "bottom-3 right-3 h-24 w-32"
          }`}
        >
          {showLocalPreview ? (
            <ParticipantVideo
              stream={localStream}
              mirrored
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-slate-800 text-xs text-slate-300">
              Camera tắt
            </div>
          )}
        </div>
      </div>
    )
  }

  if (!open) {
    return null
  }

  if (inCallActive && viewMode === "minimized") {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />
        {!audioOnly ? <video ref={remoteVideoRef} autoPlay playsInline className="hidden" /> : null}

        <div className="flex max-w-[min(100vw-2rem,360px)] items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-xl">
          <Avatar className="h-10 w-10 shrink-0">
            <AvatarImage src={callerAvatar ?? undefined} alt={callerName} />
            <AvatarFallback>{fallback}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-900">{callerName}</p>
            <p className="truncate text-xs text-slate-500">
              {formatDuration(elapsed)}
              {isGroupCall && groupParticipants.length > 0
                ? ` · ${groupParticipants.length} người`
                : ""}
            </p>
          </div>
          <Button type="button" variant="ghost" size="icon-sm" onClick={restoreFromBar} title="Mở rộng">
            <Maximize2 className="h-4 w-4" />
          </Button>
          <Button type="button" variant="destructive" size="icon-sm" onClick={onEnd}>
            <PhoneOff className="h-4 w-4" />
          </Button>
        </div>
      </div>
    )
  }

  if (inCallActive && viewMode === "fullscreen" && showVideoArea) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-slate-950">
        <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />

        <div className="flex shrink-0 items-center justify-between px-4 py-3 text-white">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-white/70">{copy.label}</p>
            <p className="truncate text-lg font-semibold">{callerName}</p>
            <p className="text-sm text-white/60">
              {formatDuration(elapsed)}
              {isGroupCall && groupParticipants.length > 0
                ? ` · ${groupParticipants.length} người`
                : ""}
            </p>
          </div>
          <div className="flex items-center gap-1">
            {renderViewModeControls("dark")}
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="text-white/80 hover:bg-white/10 hover:text-white"
              title="Kết thúc"
              onClick={handleClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col px-3 pb-3">
          {isGroupCall ? renderGroupVideoStage("fullscreen") : renderDirectVideo("fullscreen")}
        </div>

        {isGroupCall ? (
          <p className="pb-2 text-center text-xs text-white/45">
            Bấm người bên phải để ghim lên khung lớn
          </p>
        ) : null}

        <div className="flex shrink-0 flex-wrap items-center justify-center gap-3 px-4 pb-6 pt-2">
          {renderCallControls("dark")}
        </div>
      </div>
    )
  }

  const modalClassName = useFloatingPanel
    ? "w-[360px] max-w-[calc(100vw-1rem)]"
    : showVideoArea
      ? "w-[min(92vw,780px)] max-w-[92vw]"
      : "w-[360px] max-w-[calc(100vw-1rem)]"

  return (
    <div
      className={`fixed z-50 flex ${
        useFloatingPanel
          ? "bottom-4 right-4 items-end justify-end"
          : inCallActive && showVideoArea
            ? "inset-0 items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]"
            : "inset-0 items-center justify-center"
      }`}
      style={
        inCallActive && viewMode === "modal" && panelPosition
          ? {
              left: panelPosition.x,
              top: panelPosition.y,
              right: "auto",
              bottom: "auto",
              background: "transparent",
              backdropFilter: "none",
            }
          : undefined
      }
    >
      <div
        ref={panelRef}
        className={`${modalClassName} overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-2xl ring-1 ring-slate-200`}
      >
        <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />

        <div
          className={`flex items-center justify-between px-4 pt-3 ${
            inCallActive && viewMode === "modal" ? "cursor-move select-none" : ""
          }`}
          onPointerDown={onDragStart}
        >
          <span className="text-xs font-medium text-slate-400">
            {inCallActive && viewMode === "modal" ? "Giữ để kéo" : ""}
          </span>
          <div className="flex items-center gap-1">
            {renderViewModeControls("light")}
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="text-slate-500 hover:text-slate-700"
              title="Đóng"
              onClick={handleClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className={`px-6 pb-5 text-center ${showVideoArea && inCallActive ? "pb-3" : ""}`}>
          {!inCallActive || !showVideoArea ? (
            <p className="text-sm font-medium text-slate-500">{copy.label}</p>
          ) : null}

          {showVideoArea && !useFloatingPanel && isGroupCall ? (
            <div className="mx-auto mt-1 w-full rounded-xl bg-slate-900 p-2">
              {renderGroupVideoStage("modal")}
            </div>
          ) : showVideoArea && !useFloatingPanel ? (
            renderDirectVideo("modal")
          ) : (
            <>
              <Avatar className="mx-auto mt-3 h-20 w-20 ring-4 ring-slate-100">
                <AvatarImage src={callerAvatar ?? undefined} alt={callerName} />
                <AvatarFallback className="text-lg">{fallback}</AvatarFallback>
              </Avatar>
              <p className="mt-3 truncate text-xl font-semibold text-slate-900">{callerName}</p>
            </>
          )}

          {!inCallActive || !showVideoArea ? (
            <p className={`mt-2 text-sm ${statusMessage ? "text-amber-600" : "text-slate-500"}`}>
              {copy.subtitle}
            </p>
          ) : inCallActive ? (
            <p className="mt-2 text-sm text-slate-500">{formatDuration(elapsed)}</p>
          ) : null}

          {countdownPercent != null ? (
            <div className={`mx-auto mt-3 ${showVideoArea && !useFloatingPanel ? "max-w-full" : "max-w-[500px]"}`}>
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

        <div className="flex flex-wrap items-center justify-center gap-3 border-t border-slate-200 px-5 py-4">
          {renderCallControls("light")}
        </div>
      </div>
    </div>
  )
}
