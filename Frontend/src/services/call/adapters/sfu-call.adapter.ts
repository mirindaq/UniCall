import {
  Room,
  RoomEvent,
  Track,
  type RemoteParticipant,
  type RemoteTrack,
  type RemoteTrackPublication,
} from "livekit-client"

import type {
  CallJoinOptions,
  CallMediaAdapter,
  SfuParticipantMedia,
} from "@/services/call/adapters/call-media-adapter"

export class SFUCallAdapter implements CallMediaAdapter {
  private room: Room | null = null
  private localStream: MediaStream | null = null
  private remoteStream: MediaStream | null = null
  private remoteTrackIds = new Set<string>()
  private participantStreams = new Map<string, MediaStream>()
  private onRemoteStreamChanged: ((stream: MediaStream | null) => void) | null =
    null
  private onParticipantIdsChanged: ((participantIds: string[]) => void) | null =
    null
  private onParticipantMediaChanged:
    | ((media: SfuParticipantMedia[]) => void)
    | null = null

  private rebuildLocalStream() {
    const room = this.room
    if (!room) {
      this.localStream = null
      return
    }

    const stream = new MediaStream()
    room.localParticipant
      .getTrackPublications()
      .forEach((publication: any) => {
        const mediaTrack = publication.track?.mediaStreamTrack
        if (!mediaTrack) {
          return
        }
        stream.addTrack(mediaTrack)
      })

    this.localStream = stream.getTracks().length > 0 ? stream : null
  }

  private emitParticipantIds() {
    if (!this.onParticipantIdsChanged) {
      return
    }
    const room = this.room
    if (!room) {
      this.onParticipantIdsChanged([])
      return
    }
    const ids = [
      room.localParticipant.identity,
      ...Array.from(room.remoteParticipants.values()).map(
        (participant) => participant.identity
      ),
    ]
    const normalizedIds = Array.from(new Set(ids.filter(Boolean)))
    this.onParticipantIdsChanged(normalizedIds)
  }

  private emitRemoteStream() {
    this.onRemoteStreamChanged?.(this.remoteStream)
  }

  private emitParticipantMedia() {
    if (!this.onParticipantMediaChanged) {
      return
    }
    const media: SfuParticipantMedia[] = Array.from(
      this.participantStreams.entries()
    ).map(([identity, stream]) => ({
      identity,
      stream,
      hasVideo: stream.getVideoTracks().some((track) => track.readyState === "live"),
      hasAudio: stream.getAudioTracks().some((track) => track.readyState === "live"),
    }))
    this.onParticipantMediaChanged(media)
  }

  private getOrCreateParticipantStream(identity: string): MediaStream {
    let stream = this.participantStreams.get(identity)
    if (!stream) {
      stream = new MediaStream()
      this.participantStreams.set(identity, stream)
    }
    return stream
  }

  private addRemoteTrack(track: RemoteTrack, participant: RemoteParticipant) {
    const mediaTrack = track.mediaStreamTrack
    if (!mediaTrack) {
      return
    }
    // Global remote stream: keeps audio playback simple and acts as a fallback.
    if (!this.remoteStream) {
      this.remoteStream = new MediaStream()
      this.remoteTrackIds.clear()
    }
    if (!this.remoteTrackIds.has(mediaTrack.id)) {
      this.remoteStream.addTrack(mediaTrack)
      this.remoteTrackIds.add(mediaTrack.id)
      this.emitRemoteStream()
    }

    // Per-participant stream so the UI can map each video to the right person.
    const identity = participant.identity
    if (identity) {
      const participantStream = this.getOrCreateParticipantStream(identity)
      if (!participantStream.getTracks().some((item) => item.id === mediaTrack.id)) {
        participantStream.addTrack(mediaTrack)
        this.emitParticipantMedia()
      }
    }
  }

  private removeRemoteTrack(track: RemoteTrack, participant: RemoteParticipant) {
    const mediaTrack = track.mediaStreamTrack
    if (!mediaTrack) {
      return
    }
    if (this.remoteStream) {
      this.remoteStream.removeTrack(mediaTrack)
      this.remoteTrackIds.delete(mediaTrack.id)
      if (this.remoteTrackIds.size === 0) {
        this.remoteStream = null
      }
      this.emitRemoteStream()
    }

    const identity = participant.identity
    const participantStream = identity
      ? this.participantStreams.get(identity)
      : undefined
    if (participantStream) {
      participantStream.removeTrack(mediaTrack)
      if (participantStream.getTracks().length === 0) {
        this.participantStreams.delete(identity)
      }
      this.emitParticipantMedia()
    }
  }

  private dropParticipant(participant: RemoteParticipant) {
    const identity = participant.identity
    if (identity && this.participantStreams.delete(identity)) {
      this.emitParticipantMedia()
    }
  }

  private bindRoomEvents(room: Room) {
    room.on(
      RoomEvent.TrackSubscribed,
      (
        track: RemoteTrack,
        _publication: RemoteTrackPublication,
        participant: RemoteParticipant
      ) => {
        if (track.kind === Track.Kind.Audio || track.kind === Track.Kind.Video) {
          this.addRemoteTrack(track, participant)
        }
      }
    )
    room.on(
      RoomEvent.TrackUnsubscribed,
      (
        track: RemoteTrack,
        _publication: RemoteTrackPublication,
        participant: RemoteParticipant
      ) => {
        this.removeRemoteTrack(track, participant)
      }
    )
    room.on(RoomEvent.ParticipantConnected, () => {
      this.emitParticipantIds()
    })
    room.on(RoomEvent.ParticipantDisconnected, (participant: RemoteParticipant) => {
      this.dropParticipant(participant)
      this.emitParticipantIds()
    })
    room.on(RoomEvent.Reconnected, () => {
      this.emitParticipantIds()
    })
    room.on(RoomEvent.Disconnected, () => {
      this.remoteTrackIds.clear()
      this.remoteStream = null
      this.participantStreams.clear()
      this.emitRemoteStream()
      this.emitParticipantMedia()
      this.emitParticipantIds()
    })
  }

  async join(options: CallJoinOptions): Promise<MediaStream> {
    const sfu = options.sfu
    if (!sfu?.url || !sfu.token) {
      throw new Error("Missing SFU connection params")
    }

    await this.leave()
    this.onRemoteStreamChanged = sfu.onRemoteStreamChanged ?? null
    this.onParticipantIdsChanged = sfu.onParticipantIdsChanged ?? null
    this.onParticipantMediaChanged = sfu.onParticipantMediaChanged ?? null

    const room = new Room()
    this.room = room
    this.bindRoomEvents(room)
    await room.connect(sfu.url, sfu.token)
    await room.localParticipant.setMicrophoneEnabled(true)
    await room.localParticipant.setCameraEnabled(!options.audioOnly)
    this.rebuildLocalStream()
    this.emitParticipantIds()
    this.emitRemoteStream()
    this.emitParticipantMedia()

    return this.localStream ?? new MediaStream()
  }

  async leave(): Promise<void> {
    const room = this.room
    this.room = null
    this.localStream = null
    this.remoteTrackIds.clear()
    this.remoteStream = null
    this.participantStreams.clear()
    this.emitRemoteStream()
    this.emitParticipantMedia()
    this.emitParticipantIds()
    this.onRemoteStreamChanged = null
    this.onParticipantIdsChanged = null
    this.onParticipantMediaChanged = null

    if (room) {
      room.disconnect(true)
    }
  }

  async toggleMic(enabled: boolean): Promise<void> {
    if (!this.room) {
      return
    }
    await this.room.localParticipant.setMicrophoneEnabled(enabled)
    this.rebuildLocalStream()
  }

  async toggleCamera(enabled: boolean): Promise<void> {
    if (!this.room) {
      return
    }
    await this.room.localParticipant.setCameraEnabled(enabled)
    this.rebuildLocalStream()
  }

  getLocalStream(): MediaStream | null {
    return this.localStream
  }
}
