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
  private onParticipantStreamsChanged:
    | ((streams: Record<string, MediaStream>) => void)
    | null = null
  private onLocalStreamChanged: ((stream: MediaStream | null) => void) | null =
    null

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
    this.emitLocalStream()
  }

  private emitLocalStream() {
    this.onLocalStreamChanged?.(this.localStream)
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

  private emitParticipantStreams() {
    if (!this.onParticipantStreamsChanged) {
      return
    }
    const streams: Record<string, MediaStream> = {}
    this.participantStreams.forEach((stream, participantId) => {
      if (stream.getTracks().length > 0) {
        streams[participantId] = stream
      }
    })
    this.onParticipantStreamsChanged(streams)
  }

  private ensureParticipantStream(participantId: string) {
    let stream = this.participantStreams.get(participantId)
    if (!stream) {
      stream = new MediaStream()
      this.participantStreams.set(participantId, stream)
    }
    return stream
  }

  private addTrackToStream(stream: MediaStream, mediaTrack: MediaStreamTrack) {
    const exists = stream.getTracks().some((track) => track.id === mediaTrack.id)
    if (!exists) {
      stream.addTrack(mediaTrack)
    }
  }

  private addRemoteTrack(track: RemoteTrack) {
    const mediaTrack = track.mediaStreamTrack
    if (!mediaTrack) {
      return
    }
    if (!this.remoteStream) {
      this.remoteStream = new MediaStream()
      this.remoteTrackIds.clear()
    }
    if (this.remoteTrackIds.has(mediaTrack.id)) {
      return
    }
    this.remoteStream.addTrack(mediaTrack)
    this.remoteTrackIds.add(mediaTrack.id)
    this.emitRemoteStream()
  }

  private removeRemoteTrack(track: RemoteTrack) {
    const mediaTrack = track.mediaStreamTrack
    if (!mediaTrack || !this.remoteStream) {
      return
    }
    this.remoteStream.removeTrack(mediaTrack)
    this.remoteTrackIds.delete(mediaTrack.id)
    if (this.remoteTrackIds.size === 0) {
      this.remoteStream = null
    }
    this.emitRemoteStream()
  }

  private addParticipantTrack(participantId: string, track: RemoteTrack) {
    const mediaTrack = track.mediaStreamTrack
    if (!mediaTrack) {
      return
    }
    const participantStream = this.ensureParticipantStream(participantId)
    this.addTrackToStream(participantStream, mediaTrack)
    this.emitParticipantStreams()
    this.addRemoteTrack(track)
  }

  private removeParticipantTrack(participantId: string, track: RemoteTrack) {
    const mediaTrack = track.mediaStreamTrack
    if (!mediaTrack) {
      return
    }
    const participantStream = this.participantStreams.get(participantId)
    if (participantStream) {
      participantStream.removeTrack(mediaTrack)
      if (participantStream.getTracks().length === 0) {
        this.participantStreams.delete(participantId)
      }
      this.emitParticipantStreams()
    }
    this.removeRemoteTrack(track)
  }

  private clearParticipantStreams() {
    this.participantStreams.clear()
    this.emitParticipantStreams()
  }

  private bindRoomEvents(room: Room) {
    room.on(
      RoomEvent.TrackSubscribed,
      (
        track: RemoteTrack,
        _publication: RemoteTrackPublication,
        participant: RemoteParticipant
      ) => {
        if (track.kind !== Track.Kind.Audio && track.kind !== Track.Kind.Video) {
          return
        }
        if (participant.isLocal) {
          this.rebuildLocalStream()
          return
        }
        const participantId = participant.identity
        if (!participantId) {
          return
        }
        this.addParticipantTrack(participantId, track)
      }
    )
    room.on(
      RoomEvent.TrackUnsubscribed,
      (
        track: RemoteTrack,
        _publication: RemoteTrackPublication,
        participant: RemoteParticipant
      ) => {
        if (participant.isLocal) {
          this.rebuildLocalStream()
          return
        }
        const participantId = participant.identity
        if (!participantId) {
          this.removeRemoteTrack(track)
          return
        }
        this.removeParticipantTrack(participantId, track)
      }
    )
    room.on(RoomEvent.ParticipantConnected, () => {
      this.emitParticipantIds()
    })
    room.on(RoomEvent.ParticipantDisconnected, (participant) => {
      this.participantStreams.delete(participant.identity)
      this.emitParticipantStreams()
      this.emitParticipantIds()
    })
    room.on(RoomEvent.Reconnected, () => {
      this.emitParticipantIds()
    })
    room.on(RoomEvent.LocalTrackPublished, () => {
      this.rebuildLocalStream()
    })
    room.on(RoomEvent.LocalTrackUnpublished, () => {
      this.rebuildLocalStream()
    })
    room.on(RoomEvent.Disconnected, () => {
      this.remoteTrackIds.clear()
      this.remoteStream = null
      this.clearParticipantStreams()
      this.emitRemoteStream()
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
    this.onParticipantStreamsChanged = sfu.onParticipantStreamsChanged ?? null
    this.onLocalStreamChanged = sfu.onLocalStreamChanged ?? null

    const room = new Room()
    this.room = room
    this.bindRoomEvents(room)
    await room.connect(sfu.url, sfu.token)
    await room.localParticipant.setMicrophoneEnabled(true)
    await room.localParticipant.setCameraEnabled(!options.audioOnly)
    this.rebuildLocalStream()
    this.emitParticipantIds()
    this.emitRemoteStream()
    this.emitParticipantStreams()

    return this.localStream ?? new MediaStream()
  }

  async leave(): Promise<void> {
    const room = this.room
    this.room = null
    this.localStream = null
    this.remoteTrackIds.clear()
    this.remoteStream = null
    this.clearParticipantStreams()
    this.emitRemoteStream()
    this.emitLocalStream()
    this.emitParticipantIds()
    this.onRemoteStreamChanged = null
    this.onParticipantIdsChanged = null
    this.onParticipantStreamsChanged = null
    this.onLocalStreamChanged = null

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
