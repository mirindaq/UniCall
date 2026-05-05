import type {
  CallJoinOptions,
  CallMediaAdapter,
  MediaMode,
} from "@/services/call/adapters/call-media-adapter"

export class P2PCallAdapter implements CallMediaAdapter {
  private localStream: MediaStream | null = null
  private localMode: MediaMode | null = null

  async join(options: CallJoinOptions): Promise<MediaStream> {
    const expectedMode: MediaMode = options.audioOnly ? "audio" : "video"
    if (this.localStream && this.localMode === expectedMode) {
      return this.localStream
    }

    await this.leave()
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: options.audioOnly ? false : { facingMode: "user" },
    })

    this.localStream = stream
    this.localMode = expectedMode
    return stream
  }

  async leave(): Promise<void> {
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop())
    }
    this.localStream = null
    this.localMode = null
  }

  async toggleMic(enabled: boolean): Promise<void> {
    const stream = this.localStream
    if (!stream) {
      return
    }
    stream.getAudioTracks().forEach((track) => {
      track.enabled = enabled
    })
  }

  async toggleCamera(enabled: boolean): Promise<void> {
    const stream = this.localStream
    if (!stream) {
      return
    }
    stream.getVideoTracks().forEach((track) => {
      track.enabled = enabled
    })
  }

  getLocalStream(): MediaStream | null {
    return this.localStream
  }
}
