import {
  Room,
  RoomEvent,
  Track,
  type LocalTrackPublication,
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
  private onRemoteStreamChanged: ((stream: MediaStream | null) => void) | null =
    null
  private onParticipantIdsChanged: ((participantIds: string[]) => void) | null =
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

  private bindRoomEvents(room: Room) {
    room.on(
      RoomEvent.TrackSubscribed,
      (
        track: RemoteTrack,
        _publication: RemoteTrackPublication,
        _participant: RemoteParticipant
      ) => {
        if (track.kind === Track.Kind.Audio || track.kind === Track.Kind.Video) {
          this.addRemoteTrack(track)
        }
      }
    )
    room.on(
      RoomEvent.TrackUnsubscribed,
      (
        track: RemoteTrack,
        _publication: RemoteTrackPublication,
        _participant: RemoteParticipant
      ) => {
        this.removeRemoteTrack(track)
      }
    )
    room.on(RoomEvent.ParticipantConnected, () => {
      this.emitParticipantIds()
    })
    room.on(RoomEvent.ParticipantDisconnected, () => {
      this.emitParticipantIds()
    })
    room.on(RoomEvent.Reconnected, () => {
      this.emitParticipantIds()
    })
    room.on(RoomEvent.Disconnected, () => {
      this.remoteTrackIds.clear()
      this.remoteStream = null
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

    const room = new Room()
    this.room = room
    this.bindRoomEvents(room)
    await room.connect(sfu.url, sfu.token)
    await room.localParticipant.setMicrophoneEnabled(true)
    await room.localParticipant.setCameraEnabled(!options.audioOnly)
    this.rebuildLocalStream()
    this.emitParticipantIds()
    this.emitRemoteStream()

    return this.localStream ?? new MediaStream()
  }

  async leave(): Promise<void> {
    const room = this.room
    this.room = null
    this.localStream = null
    this.remoteTrackIds.clear()
    this.remoteStream = null
    this.emitRemoteStream()
    this.emitParticipantIds()
    this.onRemoteStreamChanged = null
    this.onParticipantIdsChanged = null

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
