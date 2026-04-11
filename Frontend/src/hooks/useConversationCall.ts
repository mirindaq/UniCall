import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"

import { CALL_RING_TIMEOUT_MS, WEBRTC_ICE_SERVERS } from "@/constants/call"
import { useAuth } from "@/contexts/auth-context"
import { chatSocketService } from "@/services/chat/chat-socket.service"
import type { CallSignalType, ConversationCallSignal, ConversationType } from "@/types/chat"

type CallPhase = "idle" | "outgoing" | "incoming" | "connecting" | "in-call"

type ActiveCall = {
  callId: string
  peerUserId: string
  audioOnly: boolean
  startedAt?: number
}

type PendingIncomingOffer = {
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
  peerDisplayName?: string
}

const getMicrophoneErrorMessage = (error: unknown): string => {
  if (!(error instanceof DOMException)) {
    return "Không thể mở microphone. Vui lòng thử lại."
  }

  if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
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
  peerDisplayName,
}: UseConversationCallOptions) {
  const { isAuthenticated } = useAuth()
  const [phase, setPhase] = useState<CallPhase>("idle")
  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null)
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null)

  const phaseRef = useRef<CallPhase>("idle")
  const activeCallRef = useRef<ActiveCall | null>(null)
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null)
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const pendingIncomingOfferRef = useRef<PendingIncomingOffer | null>(null)
  const pendingIceCandidatesRef = useRef<RTCIceCandidateInit[]>([])
  const ringTimeoutRef = useRef<number | null>(null)

  const canStartAudioCall = Boolean(
    conversationId && currentUserId && peerUserId && conversationType === "DOUBLE"
  )

  const clearRingTimeout = useCallback(() => {
    if (ringTimeoutRef.current != null) {
      window.clearTimeout(ringTimeoutRef.current)
      ringTimeoutRef.current = null
    }
  }, [])

  const sendSignal = useCallback(
    (
      type: CallSignalType,
      callId: string,
      extras?: {
        sdp?: string
        candidate?: string
        sdpMid?: string
        sdpMLineIndex?: number
      }
    ) => {
      if (!conversationId) {
        return
      }
      chatSocketService.sendCallSignal(conversationId, callId, type, {
        audioOnly: true,
        ...extras,
      })
    },
    [conversationId]
  )

  const cleanupPeerConnection = useCallback(() => {
    clearRingTimeout()

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
  }, [clearRingTimeout])

  const resetCall = useCallback(() => {
    cleanupPeerConnection()
    setPhase("idle")
    setActiveCall(null)
  }, [cleanupPeerConnection])

  useEffect(() => {
    phaseRef.current = phase
  }, [phase])

  useEffect(() => {
    activeCallRef.current = activeCall
  }, [activeCall])

  const createPeerConnection = useCallback(
    (callId: string) => {
      cleanupPeerConnection()
      const pc = new RTCPeerConnection({ iceServers: WEBRTC_ICE_SERVERS })
      const inboundStream = new MediaStream()
      setRemoteStream(inboundStream)

      pc.ontrack = (event) => {
        event.streams[0]?.getTracks().forEach((track) => inboundStream.addTrack(track))
      }
      pc.onicecandidate = (event) => {
        if (!event.candidate) {
          return
        }
        sendSignal("ICE_CANDIDATE", callId, {
          candidate: event.candidate.candidate,
          sdpMid: event.candidate.sdpMid ?? undefined,
          sdpMLineIndex: event.candidate.sdpMLineIndex ?? undefined,
        })
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
        if (state === "failed" || state === "disconnected" || state === "closed") {
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

  const flushPendingIceCandidates = useCallback(async (pc: RTCPeerConnection) => {
    if (pendingIceCandidatesRef.current.length === 0) {
      return
    }
    const candidates = [...pendingIceCandidatesRef.current]
    pendingIceCandidatesRef.current = []
    for (const candidate of candidates) {
      try {
        await pc.addIceCandidate(candidate)
      } catch {
        // Ignore invalid candidate from remote
      }
    }
  }, [])

  const startAudioCall = useCallback(async () => {
    if (!canStartAudioCall || !peerUserId) {
      toast.info("Hiện chỉ hỗ trợ gọi thoại cho hội thoại 1-1")
      return
    }
    if (phaseRef.current !== "idle") {
      toast.info("Bạn đang có cuộc gọi trong hội thoại này")
      return
    }
    const callId = buildCallId()
    try {
      const localStream = await ensureLocalAudioStream()
      const pc = createPeerConnection(callId)
      localStream.getTracks().forEach((track) => pc.addTrack(track, localStream))

      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
      })
      await pc.setLocalDescription(offer)

      setPhase("outgoing")
      setActiveCall({
        callId,
        peerUserId,
        audioOnly: true,
      })
      sendSignal("OFFER", callId, {
        sdp: offer.sdp ?? "",
      })
    } catch {
      toast.error("Không thể bắt đầu cuộc gọi thoại")
      resetCall()
    }
  }, [canStartAudioCall, createPeerConnection, ensureLocalAudioStream, peerUserId, resetCall, sendSignal])

  const acceptIncomingCall = useCallback(async () => {
    const offer = pendingIncomingOfferRef.current
    if (phaseRef.current !== "incoming" || !offer) {
      return
    }
    try {
      const localStream = await ensureLocalAudioStream()
      const pc = createPeerConnection(offer.callId)
      localStream.getTracks().forEach((track) => pc.addTrack(track, localStream))

      await pc.setRemoteDescription(
        new RTCSessionDescription({
          type: "offer",
          sdp: offer.sdp,
        })
      )
      await flushPendingIceCandidates(pc)

      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)

      sendSignal("ACCEPT", offer.callId, {
        sdp: answer.sdp ?? "",
      })
      setPhase("connecting")
      setActiveCall({
        callId: offer.callId,
        peerUserId: offer.fromUserId,
        audioOnly: true,
      })
      pendingIncomingOfferRef.current = null
    } catch {
      setPhase("incoming")
      setActiveCall((prev) => prev ?? {
        callId: offer.callId,
        peerUserId: offer.fromUserId,
        audioOnly: true,
      })
      pendingIncomingOfferRef.current = offer
    }
  }, [createPeerConnection, ensureLocalAudioStream, flushPendingIceCandidates, resetCall, sendSignal])

  const rejectIncomingCall = useCallback(() => {
    const call = activeCallRef.current
    if (phaseRef.current !== "incoming" || !call) {
      return
    }
    sendSignal("REJECT", call.callId)
    resetCall()
  }, [resetCall, sendSignal])

  const endCurrentCall = useCallback(() => {
    const call = activeCallRef.current
    if (!call || phaseRef.current === "idle") {
      return
    }
    sendSignal("END", call.callId)
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
        if (phaseRef.current === "outgoing" && activeCallRef.current?.callId === currentCallId) {
          toast.info("Không có phản hồi cuộc gọi")
          sendSignal("END", currentCallId)
          resetCall()
        }
      }, CALL_RING_TIMEOUT_MS)
    }

    if (phase === "incoming") {
      ringTimeoutRef.current = window.setTimeout(() => {
        if (phaseRef.current === "incoming" && activeCallRef.current?.callId === currentCallId) {
          sendSignal("REJECT", currentCallId)
          resetCall()
        }
      }, CALL_RING_TIMEOUT_MS)
    }

    return () => {
      clearRingTimeout()
    }
  }, [activeCall?.callId, clearRingTimeout, phase, resetCall, sendSignal])

  useEffect(() => {
    if (!conversationId || !isAuthenticated || !currentUserId) {
      queueMicrotask(() => {
        resetCall()
      })
      return
    }

    let subscription: ReturnType<typeof chatSocketService.subscribeConversationCalls>

    const handleConnected = () => {
      subscription = chatSocketService.subscribeConversationCalls(conversationId, (signal) => {
        void handleSignal(signal)
      })
    }
    const handleDisconnected = () => {
      queueMicrotask(() => {
        resetCall()
      })
    }

    const handleSignal = async (signal: ConversationCallSignal) => {
      if (signal.fromUserId === currentUserId) {
        return
      }

      if (signal.type === "OFFER") {
        if (!signal.sdp) {
          return
        }
        const currentCall = activeCallRef.current
        if (phaseRef.current === "incoming" && currentCall?.callId === signal.callId) {
          return
        }
        if (phaseRef.current !== "idle") {
          sendSignal("REJECT", signal.callId)
          return
        }
        pendingIncomingOfferRef.current = {
          callId: signal.callId,
          fromUserId: signal.fromUserId,
          sdp: signal.sdp,
          audioOnly: signal.audioOnly,
        }
        setPhase("incoming")
        setActiveCall({
          callId: signal.callId,
          peerUserId: signal.fromUserId,
          audioOnly: signal.audioOnly,
        })
        toast.info(`${peerDisplayName ?? "Người dùng"} đang gọi thoại`)
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

      if (signal.type === "ACCEPT" && signal.sdp && phaseRef.current === "outgoing") {
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
        toast.success("Đối phương đã nhận cuộc gọi")
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
          // Ignore bad candidate packets
        }
        return
      }

      if (signal.type === "REJECT") {
        toast.info("Cuộc gọi đã bị từ chối")
        resetCall()
        return
      }

      if (signal.type === "END") {
        toast.info("Cuộc gọi đã kết thúc")
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
    conversationId,
    currentUserId,
    flushPendingIceCandidates,
    isAuthenticated,
    peerDisplayName,
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

  useEffect(() => {
    queueMicrotask(() => {
      resetCall()
    })
  }, [conversationId, resetCall])

  useEffect(() => () => cleanupPeerConnection(), [cleanupPeerConnection])

  const statusText = useMemo(() => {
    if (phase === "outgoing") {
      return `Đang gọi ${peerDisplayName ?? "người dùng"}...`
    }
    if (phase === "incoming") {
      return `${peerDisplayName ?? "Người dùng"} đang gọi cho bạn`
    }
    if (phase === "connecting") {
      return `Đang kết nối thoại với ${peerDisplayName ?? "người dùng"}...`
    }
    if (phase === "in-call") {
      return `Đang gọi thoại với ${peerDisplayName ?? "người dùng"}`
    }
    return ""
  }, [peerDisplayName, phase])

  return {
    canStartAudioCall,
    phase,
    activeCall,
    statusText,
    remoteAudioRef,
    startAudioCall,
    acceptIncomingCall,
    rejectIncomingCall,
    endCurrentCall,
  }
}
