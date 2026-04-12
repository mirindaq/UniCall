import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"

import { CALL_RING_TIMEOUT_MS, WEBRTC_ICE_SERVERS } from "@/constants/call"
import { useAuth } from "@/contexts/auth-context"
import { chatSocketService } from "@/services/chat/chat-socket.service"
import type {
  CallSignalType,
  ConversationType,
  UserRealtimeEvent,
} from "@/types/chat"

type CallPhase = "idle" | "outgoing" | "incoming" | "connecting" | "in-call"

type ActiveCall = {
  conversationId: string
  callId: string
  peerUserId: string
  audioOnly: boolean
  startedAt?: number
  ringingStartedAt?: number
}

type PendingIncomingOffer = {
  conversationId: string
  callId: string
  fromUserId: string
  sdp: string
  audioOnly: boolean
}

type UseConversationCallOptions = {
  conversationId?: string
  conversationType?: ConversationType
  currentUserId?: string | null
  peerUserId?: string | null
}

const getMicrophoneErrorMessage = (error: unknown): string => {
  if (!(error instanceof DOMException)) {
    return "Không thể mở microphone. Vui lòng thử lại."
  }

  if (
    error.name === "NotAllowedError" ||
    error.name === "PermissionDeniedError"
  ) {
    return "Microphone đang bị chặn quyền. Hãy bấm biểu tượng ổ khóa cạnh URL và cho phép Microphone."
  }
  if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
    return "Không tìm thấy thiết bị microphone trên máy."
  }
  if (error.name === "NotReadableError" || error.name === "TrackStartError") {
    return "Microphone đang được ứng dụng khác sử dụng (Zoom/Meet/Teams...). Hãy đóng app đó rồi thử lại."
  }
  if (error.name === "SecurityError") {
    return "Trình duyệt không cho truy cập microphone trong ngữ cảnh hiện tại."
  }

  return `Không thể mở microphone (${error.name}). Vui lòng thử lại.`
}

const buildCallId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`

export function useConversationCall({
  conversationId,
  conversationType,
  currentUserId,
  peerUserId,
}: UseConversationCallOptions) {
  const { isAuthenticated } = useAuth()
  const [phase, setPhase] = useState<CallPhase>("idle")
  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null)
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)

  const phaseRef = useRef<CallPhase>("idle")
  const activeCallRef = useRef<ActiveCall | null>(null)
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null)
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const pendingIncomingOfferRef = useRef<PendingIncomingOffer | null>(null)
  const pendingIceCandidatesRef = useRef<RTCIceCandidateInit[]>([])
  const ringTimeoutRef = useRef<number | null>(null)
  const closeDelayTimeoutRef = useRef<number | null>(null)
  const ringtoneContextRef = useRef<AudioContext | null>(null)
  const ringtoneIntervalRef = useRef<number | null>(null)
  const ringtoneUnlockedRef = useRef(false)

  const canStartAudioCall = Boolean(
    conversationId &&
    currentUserId &&
    peerUserId &&
    conversationType === "DOUBLE"
  )

  const clearRingTimeout = useCallback(() => {
    if (ringTimeoutRef.current != null) {
      window.clearTimeout(ringTimeoutRef.current)
      ringTimeoutRef.current = null
    }
  }, [])

  const clearCloseDelayTimeout = useCallback(() => {
    if (closeDelayTimeoutRef.current != null) {
      window.clearTimeout(closeDelayTimeoutRef.current)
      closeDelayTimeoutRef.current = null
    }
  }, [])

  const stopIncomingRingtone = useCallback(() => {
    if (ringtoneIntervalRef.current != null) {
      window.clearInterval(ringtoneIntervalRef.current)
      ringtoneIntervalRef.current = null
    }
  }, [])

  const playIncomingTone = useCallback((context: AudioContext) => {
    const now = context.currentTime
    const beep = (startAt: number, frequency: number, duration: number) => {
      const gain = context.createGain()
      gain.gain.setValueAtTime(0.0001, startAt)
      gain.gain.exponentialRampToValueAtTime(0.1, startAt + 0.015)
      gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration)
      gain.connect(context.destination)

      const osc = context.createOscillator()
      osc.type = "sine"
      osc.frequency.setValueAtTime(frequency, startAt)
      osc.connect(gain)
      osc.start(startAt)
      osc.stop(startAt + duration)
    }

    // Pattern kiểu ringtone điện thoại: ring-ring, nghỉ, ring-ring
    beep(now, 1318, 0.16)
    beep(now + 0.2, 1046, 0.16)
    beep(now + 0.8, 1318, 0.16)
    beep(now + 1.0, 1046, 0.16)
  }, [])

  const startIncomingRingtone = useCallback(() => {
    if (ringtoneIntervalRef.current != null) {
      return
    }
    const context = ringtoneContextRef.current
    if (!context || !ringtoneUnlockedRef.current) {
      return
    }
    if (context.state === "suspended") {
      void context.resume().catch(() => undefined)
    }

    playIncomingTone(context)
    ringtoneIntervalRef.current = window.setInterval(() => {
      if (context.state === "closed") {
        return
      }
      if (context.state === "suspended") {
        void context.resume().catch(() => undefined)
      }
      playIncomingTone(context)
    }, 2200)
  }, [playIncomingTone])

  const sendSignal = useCallback(
    (
      type: CallSignalType,
      signalConversationId: string,
      callId: string,
      extras?: {
        sdp?: string
        candidate?: string
        sdpMid?: string
        sdpMLineIndex?: number
      }
    ) => {
      if (!signalConversationId) {
        return
      }
      chatSocketService.sendCallSignal(signalConversationId, callId, type, {
        audioOnly: true,
        ...extras,
      })
    },
    []
  )

  const cleanupPeerConnection = useCallback(() => {
    clearRingTimeout()
    clearCloseDelayTimeout()
    stopIncomingRingtone()

    if (peerConnectionRef.current) {
      peerConnectionRef.current.onicecandidate = null
      peerConnectionRef.current.ontrack = null
      peerConnectionRef.current.onconnectionstatechange = null
      peerConnectionRef.current.close()
      peerConnectionRef.current = null
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop())
      localStreamRef.current = null
    }
    pendingIceCandidatesRef.current = []
    pendingIncomingOfferRef.current = null
    setRemoteStream(null)
  }, [clearCloseDelayTimeout, clearRingTimeout, stopIncomingRingtone])

  const resetCall = useCallback(() => {
    cleanupPeerConnection()
    setStatusMessage(null)
    setPhase("idle")
    setActiveCall(null)
  }, [cleanupPeerConnection])

  const closeCallWithMessage = useCallback(
    (message: string, delayMs = 1500) => {
      setStatusMessage(message)
      clearCloseDelayTimeout()
      closeDelayTimeoutRef.current = window.setTimeout(() => {
        resetCall()
      }, delayMs)
    },
    [clearCloseDelayTimeout, resetCall]
  )

  useEffect(() => {
    phaseRef.current = phase
  }, [phase])

  useEffect(() => {
    activeCallRef.current = activeCall
  }, [activeCall])

  const createPeerConnection = useCallback(
    (signalConversationId: string, callId: string) => {
      cleanupPeerConnection()
      const pc = new RTCPeerConnection({ iceServers: WEBRTC_ICE_SERVERS })
      const inboundStream = new MediaStream()
      setRemoteStream(inboundStream)

      pc.ontrack = (event) => {
        event.streams[0]
          ?.getTracks()
          .forEach((track) => inboundStream.addTrack(track))
      }
      pc.onicecandidate = (event) => {
        if (!event.candidate) {
          return
        }
        sendSignal("ICE_CANDIDATE", signalConversationId, callId, {
          candidate: event.candidate.candidate,
          sdpMid: event.candidate.sdpMid ?? undefined,
          sdpMLineIndex: event.candidate.sdpMLineIndex ?? undefined,
        })
      }
      pc.onsignalingstatechange = () => {
      }
      pc.oniceconnectionstatechange = () => {
      }
      pc.onicegatheringstatechange = () => {
      }
      pc.onconnectionstatechange = () => {
        const state = pc.connectionState
        if (state === "connected") {
          clearRingTimeout()
          setPhase("in-call")
          setActiveCall((prev) =>
            prev && prev.startedAt == null
              ? {
                  ...prev,
                  startedAt: Date.now(),
                }
              : prev
          )
          return
        }
        if (
          state === "failed" ||
          state === "disconnected" ||
          state === "closed"
        ) {
          queueMicrotask(() => {
            resetCall()
          })
        }
      }

      peerConnectionRef.current = pc
      return pc
    },
    [cleanupPeerConnection, clearRingTimeout, resetCall, sendSignal]
  )

  const ensureLocalAudioStream = useCallback(async () => {
    if (localStreamRef.current) {
      return localStreamRef.current
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      })
      localStreamRef.current = stream
      return stream
    } catch (error) {
      console.error("[call] getUserMedia failed", error)
      toast.error(getMicrophoneErrorMessage(error))
      throw error
    }
  }, [])

  const flushPendingIceCandidates = useCallback(
    async (pc: RTCPeerConnection) => {
      if (pendingIceCandidatesRef.current.length === 0) {
        return
      }
      const candidates = [...pendingIceCandidatesRef.current]
      pendingIceCandidatesRef.current = []
      for (const candidate of candidates) {
        try {
          await pc.addIceCandidate(candidate)
        } catch {
          console.error("[call] addIceCandidate failed (pending)", candidate)
        }
      }
    },
    []
  )

  const startAudioCall = useCallback(async () => {
    if (!canStartAudioCall || !peerUserId || !conversationId) {
      toast.info("Hiện chỉ hỗ trợ gọi thoại cho hội thoại 1-1")
      return
    }
    if (phaseRef.current !== "idle") {
      return
    }
    const callId = buildCallId()
    try {
      const pc = createPeerConnection(conversationId, callId)
      const localStream = await ensureLocalAudioStream()
      localStream
        .getTracks()
        .forEach((track) => {
          pc.addTrack(track, localStream)
        })

      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
      })
      await pc.setLocalDescription(offer)
      const localOfferSdp = pc.localDescription?.sdp ?? offer.sdp ?? ""
      if (!localOfferSdp) {
        throw new Error("Không tạo được SDP offer hợp lệ")
      }

      setPhase("outgoing")
      setActiveCall({
        conversationId,
        callId,
        peerUserId,
        audioOnly: true,
        ringingStartedAt: Date.now(),
      })
      sendSignal("OFFER", conversationId, callId, {
        sdp: localOfferSdp,
      })
    } catch (error) {
      console.error("[call] startAudioCall failed", error)
      toast.error("Không thể bắt đầu cuộc gọi thoại")
      resetCall()
    }
  }, [
    canStartAudioCall,
    conversationId,
    createPeerConnection,
    ensureLocalAudioStream,
    peerUserId,
    resetCall,
    sendSignal,
  ])

  const acceptIncomingCall = useCallback(async () => {
    const offer = pendingIncomingOfferRef.current
    if (phaseRef.current !== "incoming" || !offer) {
      return
    }
    try {
      const pc = createPeerConnection(offer.conversationId, offer.callId)
      const localStream = await ensureLocalAudioStream()
      localStream
        .getTracks()
        .forEach((track) => {
          pc.addTrack(track, localStream)
        })

      await pc.setRemoteDescription(
        new RTCSessionDescription({
          type: "offer",
          sdp: offer.sdp,
        })
      )
      await flushPendingIceCandidates(pc)
      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)
      const localAnswerSdp = pc.localDescription?.sdp ?? answer.sdp ?? ""
      if (!localAnswerSdp) {
        throw new Error("Không tạo được SDP answer hợp lệ")
      }

      sendSignal("ACCEPT", offer.conversationId, offer.callId, {
        sdp: localAnswerSdp,
      })
      setPhase("connecting")
      setActiveCall({
        conversationId: offer.conversationId,
        callId: offer.callId,
        peerUserId: offer.fromUserId,
        audioOnly: true,
        ringingStartedAt: offer ? Date.now() : undefined,
      })
      pendingIncomingOfferRef.current = null
    } catch (error) {
      console.error("[call] acceptIncomingCall failed", error, {
        hasOfferSdp: Boolean(offer.sdp),
        callId: offer.callId,
        conversationId: offer.conversationId,
      })
      setPhase("incoming")
      setActiveCall(
        (prev) =>
          prev ?? {
            conversationId: offer.conversationId,
            callId: offer.callId,
            peerUserId: offer.fromUserId,
            audioOnly: true,
          }
      )
      pendingIncomingOfferRef.current = offer
    }
  }, [
    createPeerConnection,
    ensureLocalAudioStream,
    flushPendingIceCandidates,
    sendSignal,
  ])

  const rejectIncomingCall = useCallback(() => {
    const call = activeCallRef.current
    if (phaseRef.current !== "incoming" || !call) {
      return
    }
    sendSignal("REJECT", call.conversationId, call.callId)
    resetCall()
  }, [resetCall, sendSignal])

  const endCurrentCall = useCallback(() => {
    const call = activeCallRef.current
    if (!call || phaseRef.current === "idle") {
      return
    }
    sendSignal("END", call.conversationId, call.callId)
    resetCall()
  }, [resetCall, sendSignal])

  useEffect(() => {
    clearRingTimeout()
    const currentCallId = activeCall?.callId

    if (!currentCallId) {
      return
    }

    if (phase === "outgoing") {
      ringTimeoutRef.current = window.setTimeout(() => {
        const latest = activeCallRef.current
        if (
          phaseRef.current === "outgoing" &&
          latest?.callId === currentCallId
        ) {
          sendSignal("END", latest.conversationId, currentCallId)
          closeCallWithMessage("Người dùng không bắt máy")
        }
      }, CALL_RING_TIMEOUT_MS)
    }

    return () => {
      clearRingTimeout()
    }
  }, [activeCall?.callId, clearRingTimeout, closeCallWithMessage, phase, sendSignal])

  useEffect(() => {
    if (phase === "incoming") {
      startIncomingRingtone()
      return
    }
    stopIncomingRingtone()
  }, [phase, startIncomingRingtone, stopIncomingRingtone])

  useEffect(() => {
    const AudioContextCtor = window.AudioContext || (window as typeof window & {
      webkitAudioContext?: typeof AudioContext
    }).webkitAudioContext
    if (!AudioContextCtor) {
      return
    }
    const unlock = () => {
      const context = ringtoneContextRef.current ?? new AudioContextCtor()
      ringtoneContextRef.current = context
      void context
        .resume()
        .then(() => {
          ringtoneUnlockedRef.current = true
          if (phaseRef.current === "incoming") {
            startIncomingRingtone()
          }
        })
        .catch(() => undefined)
    }
    window.addEventListener("pointerdown", unlock, { passive: true })
    window.addEventListener("keydown", unlock, { passive: true })
    return () => {
      window.removeEventListener("pointerdown", unlock)
      window.removeEventListener("keydown", unlock)
    }
  }, [startIncomingRingtone])

  useEffect(() => {
    if (!isAuthenticated || !currentUserId) {
      queueMicrotask(() => {
        resetCall()
      })
      return
    }

    let subscription: ReturnType<typeof chatSocketService.subscribeUserEvents>

    const handleConnected = () => {
      subscription = chatSocketService.subscribeUserEvents((event) => {
        void handleEvent(event)
      })
    }
    const handleDisconnected = () => {
      queueMicrotask(() => {
        resetCall()
      })
    }

    const handleEvent = async (event: UserRealtimeEvent) => {
      if (event.eventType !== "CALL_SIGNAL" || !event.callSignal) {
        return
      }
      const signal = event.callSignal
      if (signal.fromUserId === currentUserId) {
        return
      }

      if (signal.type === "OFFER") {
        if (!signal.sdp) {
          return
        }
        const currentCall = activeCallRef.current
        if (
          phaseRef.current === "incoming" &&
          currentCall?.callId === signal.callId
        ) {
          return
        }
        if (phaseRef.current !== "idle") {
          sendSignal("REJECT", signal.conversationId, signal.callId)
          return
        }
        pendingIncomingOfferRef.current = {
          conversationId: signal.conversationId,
          callId: signal.callId,
          fromUserId: signal.fromUserId,
          sdp: signal.sdp,
          audioOnly: signal.audioOnly,
        }
        setPhase("incoming")
        setActiveCall({
          conversationId: signal.conversationId,
          callId: signal.callId,
          peerUserId: signal.fromUserId,
          audioOnly: signal.audioOnly,
          ringingStartedAt: Date.now(),
        })
        return
      }

      const active = activeCallRef.current
      if (!active || active.callId !== signal.callId) {
        if (signal.type === "ICE_CANDIDATE" && signal.candidate) {
          pendingIceCandidatesRef.current.push({
            candidate: signal.candidate,
            sdpMid: signal.sdpMid,
            sdpMLineIndex: signal.sdpMLineIndex,
          })
        }
        return
      }

      if (
        signal.type === "ACCEPT" &&
        signal.sdp &&
        phaseRef.current === "outgoing"
      ) {
        const pc = peerConnectionRef.current
        if (!pc) {
          return
        }
        await pc.setRemoteDescription(
          new RTCSessionDescription({
            type: "answer",
            sdp: signal.sdp,
          })
        )
        await flushPendingIceCandidates(pc)
        setPhase("connecting")
        return
      }

      if (signal.type === "ICE_CANDIDATE" && signal.candidate) {
        const candidate: RTCIceCandidateInit = {
          candidate: signal.candidate,
          sdpMid: signal.sdpMid,
          sdpMLineIndex: signal.sdpMLineIndex,
        }
        const pc = peerConnectionRef.current
        if (!pc || !pc.remoteDescription) {
          pendingIceCandidatesRef.current.push(candidate)
          return
        }
        try {
          await pc.addIceCandidate(candidate)
        } catch {
          console.error("[call] addIceCandidate failed", {
            callId: signal.callId,
            candidate: signal.candidate,
            sdpMid: signal.sdpMid,
            sdpMLineIndex: signal.sdpMLineIndex,
          })
        }
        return
      }

      if (signal.type === "REJECT") {
        if (phaseRef.current === "outgoing") {
          closeCallWithMessage("Người dùng không bắt máy")
          return
        }
        resetCall()
        return
      }

      if (signal.type === "END") {
        if (phaseRef.current === "outgoing") {
          closeCallWithMessage("Người dùng không bắt máy")
          return
        }
        resetCall()
      }
    }

    chatSocketService.connect(handleConnected, handleDisconnected)

    return () => {
      subscription?.unsubscribe()
      chatSocketService.disconnect({
        onConnected: handleConnected,
        onDisconnected: handleDisconnected,
      })
    }
  }, [
    currentUserId,
    flushPendingIceCandidates,
    isAuthenticated,
    closeCallWithMessage,
    resetCall,
    sendSignal,
  ])

  useEffect(() => {
    const audio = remoteAudioRef.current
    if (!audio) {
      return
    }
    audio.srcObject = remoteStream
    if (remoteStream) {
      void audio.play().catch(() => undefined)
    }
  }, [remoteStream])

  useEffect(
    () => () => {
      stopIncomingRingtone()
      cleanupPeerConnection()
      if (ringtoneContextRef.current) {
        const context = ringtoneContextRef.current
        ringtoneContextRef.current = null
        void context.close().catch(() => undefined)
      }
    },
    [cleanupPeerConnection, stopIncomingRingtone]
  )

  return {
    canStartAudioCall,
    phase,
    activeCall,
    statusMessage,
    ringDeadlineAt:
      activeCall?.ringingStartedAt != null
        ? activeCall.ringingStartedAt + CALL_RING_TIMEOUT_MS
        : undefined,
    ringDurationMs: CALL_RING_TIMEOUT_MS,
    remoteAudioRef,
    startAudioCall,
    acceptIncomingCall,
    rejectIncomingCall,
    endCurrentCall,
  }
}
