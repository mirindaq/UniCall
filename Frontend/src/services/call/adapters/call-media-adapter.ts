export type MediaMode = "audio" | "video"

export type SfuParticipantMedia = {
  identity: string
  stream: MediaStream
  hasVideo: boolean
  hasAudio: boolean
}

export type SfuJoinOptions = {
  url: string
  token: string
  onRemoteStreamChanged?: (stream: MediaStream | null) => void
  onParticipantIdsChanged?: (participantIds: string[]) => void
  onParticipantMediaChanged?: (media: SfuParticipantMedia[]) => void
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
