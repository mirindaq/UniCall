import type { RefObject } from "react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { participantDisplayInitials } from "@/utils/group-call-display.util"

export type GroupCallStageParticipant = {
  id: string
  name: string
  avatar?: string | null
}

type GroupCallStageProps = {
  participants: GroupCallStageParticipant[]
  remoteVideoRef?: RefObject<HTMLVideoElement | null>
  localVideoRef?: RefObject<HTMLVideoElement | null>
  statusHint?: string | null
}

export default function GroupCallStage({
  participants,
  remoteVideoRef,
  localVideoRef,
  statusHint,
}: GroupCallStageProps) {
  return (
    <div className="mx-auto mt-3 w-full max-w-[820px]">
      <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-slate-950 ring-1 ring-slate-800">
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          muted
          className="h-full w-full object-cover"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />

        <div className="absolute bottom-3 right-3 h-28 w-40 overflow-hidden rounded-xl border-2 border-white/25 bg-black/60 shadow-lg">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="h-full w-full scale-x-[-1] object-cover"
          />
          <div className="absolute inset-x-0 bottom-0 bg-black/60 px-2 py-1 text-center text-[11px] font-medium text-white">
            Bạn
          </div>
        </div>

        <div className="absolute bottom-3 left-3 rounded-lg bg-black/55 px-2.5 py-1 text-xs font-medium text-white">
          {participants.length > 0
            ? `${participants.length} người trong cuộc gọi`
            : statusHint ?? "Cuộc gọi nhóm"}
        </div>
      </div>

      {participants.length > 0 ? (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {participants.map((participant) => {
            const initials = participantDisplayInitials(participant.name)
            return (
              <div
                key={participant.id}
                className="flex min-w-[88px] shrink-0 flex-col items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2 py-2 shadow-sm"
              >
                <Avatar className="h-11 w-11 ring-2 ring-slate-100">
                  <AvatarImage src={participant.avatar ?? undefined} alt={participant.name} />
                  <AvatarFallback className="bg-sky-100 text-xs font-semibold text-sky-700">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <span className="max-w-[80px] truncate text-center text-[11px] font-medium text-slate-700">
                  {participant.name}
                </span>
              </div>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
