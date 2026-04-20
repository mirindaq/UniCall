export type MediaMode = "audio" | "video"

export type SfuJoinOptions = {
  url: string
  token: string
  onRemoteStreamChanged?: (stream: MediaStream | null) => void
  onParticipantIdsChanged?: (participantIds: string[]) => void
}

export type CallJoinOptions = {
  audioOnly: boolean
  sfu?: SfuJoinOptions
}

export interface CallMediaAdapter {
  join(options: CallJoinOptions): Promise<MediaStream>
  leave(): Promise<void>
  toggleMic(enabled: boolean): Promise<void>
  toggleCamera(enabled: boolean): Promise<void>
  getLocalStream(): MediaStream | null
}
