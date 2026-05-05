import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Toast from "react-native-toast-message";

import { authTokenStore } from "@/configurations/axios.config";
import { chatService } from "@/services/chat.service";
import { chatSocketService } from "@/services/chat-socket.service";
import { userService } from "@/services/user.service";
import type {
  CallSignalType,
  ConversationType,
  UserRealtimeEvent,
} from "@/types/chat";

const WEBRTC_ICE_SERVERS = [
  {
    urls: "stun:stun.relay.metered.ca:80",
  },
];
const RING_TIMEOUT_MS = 15_000;
const CONNECTING_TIMEOUT_MS = 20_000;
const CALL_DEBUG_ENABLED = true;

const callDebugLog = (...args: unknown[]) => {
  if (!CALL_DEBUG_ENABLED) {
    return;
  }
  console.log("[mobile-call]", ...args);
};

const toErrorLog = (error: unknown) => {
  if (error instanceof Error) {
    return { name: error.name, message: error.message, stack: error.stack };
  }
  return { value: error };
};

type CallPhase = "idle" | "outgoing" | "incoming" | "connecting" | "in-call";

type CallMember = {
  id: string;
  name: string;
  avatar?: string | null;
};

type ActiveCall = {
  conversationId: string;
  callId: string;
  peerUserId: string;
  peerName: string;
  peerAvatar?: string | null;
  audioOnly: boolean;
  isGroupCall?: boolean;
  members?: CallMember[];
  joinedUserIds?: string[];
  startedAt?: number;
};

type StartCallParams = {
  conversationId: string;
  peerUserId?: string;
  peerName?: string;
  peerAvatar?: string | null;
  conversationType?: ConversationType;
  targetUserIds?: string[];
  groupMembers?: CallMember[];
};

type PendingIncomingOffer = {
  conversationId: string;
  callId: string;
  fromUserId: string;
  sdp?: string;
  audioOnly: boolean;
};

type CallContextValue = {
  phase: CallPhase;
  statusMessage: string | null;
  activeCall: ActiveCall | null;
  micEnabled: boolean;
  cameraEnabled: boolean;
  canToggleCamera: boolean;
  localStreamURL: string | null;
  remoteStreamURL: string | null;
  remoteStreamRenderKey: number;
  startAudioCall: (params: StartCallParams) => Promise<void>;
  startVideoCall: (params: StartCallParams) => Promise<void>;
  joinGroupCallFromConversation: (conversationId: string) => Promise<boolean>;
  acceptIncomingCall: () => Promise<void>;
  acceptIncomingCallWithoutCamera: () => Promise<void>;
  rejectIncomingCall: () => Promise<void>;
  endCurrentCall: () => Promise<void>;
  toggleMicrophone: () => void;
  toggleCamera: () => void;
};

const CallContext = createContext<CallContextValue | null>(null);

const buildCallId = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

export function CallProvider({ children }: { children: React.ReactNode }) {
  const [phase, setPhase] = useState<CallPhase>("idle");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [localStreamURL, setLocalStreamURL] = useState<string | null>(null);
  const [remoteStreamURL, setRemoteStreamURL] = useState<string | null>(null);
  const [remoteStreamRenderKey, setRemoteStreamRenderKey] = useState(0);
  const [myIdentityUserId, setMyIdentityUserId] = useState<string | null>(null);

  const phaseRef = useRef<CallPhase>("idle");
  const activeCallRef = useRef<ActiveCall | null>(null);
  const myIdentityUserIdRef = useRef<string | null>(null);
  const peerConnectionRef = useRef<any>(null);
  const localStreamRef = useRef<any>(null);
  const remoteStreamRef = useRef<any>(null);
  const pendingIncomingOfferRef = useRef<PendingIncomingOffer | null>(null);
  const pendingIceCandidatesRef = useRef<any[]>([]);
  const sfuRoomRef = useRef<any>(null);
  const usingSfuCallRef = useRef(false);
  const ringTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const connectingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const closeDelayTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const localRelayCandidateCountRef = useRef(0);
  const remoteRelayCandidateCountRef = useRef(0);

  const ensureWebRtcModule = useCallback(() => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mod = require("react-native-webrtc");
      return mod;
    } catch {
      Toast.show({
        type: "error",
        text1: "Thiếu thư viện gọi",
        text2: "Cần cài react-native-webrtc và build lại app mobile.",
      });
      return null;
    }
  }, []);

  const ensureLiveKitModule = useCallback(() => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      return require("livekit-client");
    } catch {
      Toast.show({
        type: "error",
        text1: "Thiếu thư viện SFU",
        text2: "Cần cài livekit-client và build lại app mobile.",
      });
      return null;
    }
  }, []);

  const configureLiveKitGlobals = useCallback(() => {
    const webRtc = ensureWebRtcModule();
    if (!webRtc) {
      return null;
    }
    const globalAny = globalThis as any;
    if (!globalAny.RTCPeerConnection) {
      globalAny.RTCPeerConnection = webRtc.RTCPeerConnection;
    }
    if (!globalAny.RTCSessionDescription) {
      globalAny.RTCSessionDescription = webRtc.RTCSessionDescription;
    }
    if (!globalAny.RTCIceCandidate) {
      globalAny.RTCIceCandidate = webRtc.RTCIceCandidate;
    }
    if (!globalAny.MediaStream) {
      globalAny.MediaStream = webRtc.MediaStream;
    }
    if (!globalAny.MediaStreamTrack) {
      globalAny.MediaStreamTrack = webRtc.MediaStreamTrack;
    }
    if (!globalAny.navigator) {
      globalAny.navigator = {};
    }
    if (!globalAny.navigator.mediaDevices) {
      globalAny.navigator.mediaDevices = webRtc.mediaDevices;
    }
    return webRtc;
  }, [ensureWebRtcModule]);

  const clearRingTimeout = useCallback(() => {
    if (ringTimeoutRef.current) {
      clearTimeout(ringTimeoutRef.current);
      ringTimeoutRef.current = null;
    }
  }, []);

  const clearConnectingTimeout = useCallback(() => {
    if (connectingTimeoutRef.current) {
      clearTimeout(connectingTimeoutRef.current);
      connectingTimeoutRef.current = null;
    }
  }, []);

  const clearCloseDelayTimeout = useCallback(() => {
    if (closeDelayTimeoutRef.current) {
      clearTimeout(closeDelayTimeoutRef.current);
      closeDelayTimeoutRef.current = null;
    }
  }, []);

  const updateJoinedIdsFromSfuRoom = useCallback(() => {
    const room = sfuRoomRef.current;
    if (!room) {
      return;
    }
    const ids = [
      room.localParticipant?.identity,
      ...(Array.from(room.remoteParticipants?.values?.() ?? []).map(
        (participant: any) => participant?.identity
      ) as string[]),
    ].filter((value): value is string => Boolean(value));
    const unique = Array.from(new Set(ids));
    setActiveCall((prev) =>
      prev
        ? {
            ...prev,
            joinedUserIds: unique,
          }
        : prev
    );
  }, []);

  const syncLocalPreviewFromSfuRoom = useCallback(
    (webRtc: any, room: any) => {
      const localStream = new webRtc.MediaStream();
      room.localParticipant
        ?.getTrackPublications?.()
        ?.forEach((publication: any) => {
          const mediaTrack = publication?.track?.mediaStreamTrack;
          if (mediaTrack) {
            localStream.addTrack(mediaTrack);
          }
        });
      localStreamRef.current = localStream;
      setLocalStreamURL(localStream?.toURL?.() ?? null);
      const localAudioTrack = localStream.getAudioTracks?.()?.[0];
      const localVideoTrack = localStream.getVideoTracks?.()?.[0];
      setMicEnabled(localAudioTrack ? localAudioTrack.enabled : true);
      setCameraEnabled(localVideoTrack ? localVideoTrack.enabled : false);
    },
    []
  );

  const cleanupSfuRoom = useCallback(() => {
    const room = sfuRoomRef.current;
    sfuRoomRef.current = null;
    usingSfuCallRef.current = false;
    if (room) {
      room.disconnect?.(true);
    }
  }, []);

  const connectSfuRoom = useCallback(
    async (
      conversationId: string,
      callId: string,
      audioOnly: boolean,
      startWithCameraOff = false
    ) => {
      const webRtc = configureLiveKitGlobals();
      if (!webRtc) {
        throw new Error("react-native-webrtc is missing");
      }
      const liveKit = ensureLiveKitModule();
      if (!liveKit) {
        throw new Error("livekit-client is missing");
      }

      const sfuTokenResponse = await chatService.createConversationSfuToken(
        conversationId,
        callId
      );
      const sfuToken = sfuTokenResponse.data;
      if (!sfuToken?.url || !sfuToken?.token) {
        throw new Error("SFU token payload is invalid");
      }

      cleanupSfuRoom();
      remoteStreamRef.current = null;
      setRemoteStreamURL(null);
      setRemoteStreamRenderKey(0);

      const { Room, RoomEvent, Track } = liveKit;
      const room = new Room();
      sfuRoomRef.current = room;
      usingSfuCallRef.current = true;

      const ensureRemoteStream = () => {
        if (!remoteStreamRef.current) {
          remoteStreamRef.current = new webRtc.MediaStream();
        }
        return remoteStreamRef.current;
      };

      room.on(RoomEvent.TrackSubscribed, (track: any) => {
        if (
          track?.kind !== Track.Kind.Video &&
          track?.kind !== Track.Kind.Audio
        ) {
          return;
        }
        const mediaTrack = track?.mediaStreamTrack;
        if (!mediaTrack) {
          return;
        }
        const remoteStream = ensureRemoteStream();
        const exists = remoteStream
          .getTracks?.()
          ?.some((item: any) => item.id === mediaTrack.id);
        if (!exists) {
          remoteStream.addTrack(mediaTrack);
        }
        setRemoteStreamURL(remoteStream.toURL?.() ?? null);
        setRemoteStreamRenderKey((value) => value + 1);
      });

      room.on(RoomEvent.TrackUnsubscribed, (track: any) => {
        const mediaTrack = track?.mediaStreamTrack;
        const remoteStream = remoteStreamRef.current;
        if (!mediaTrack || !remoteStream) {
          return;
        }
        remoteStream.removeTrack(mediaTrack);
        const hasTracks = (remoteStream.getTracks?.() ?? []).length > 0;
        setRemoteStreamURL(hasTracks ? remoteStream.toURL?.() ?? null : null);
        setRemoteStreamRenderKey((value) => value + 1);
      });
      room.on(RoomEvent.ParticipantConnected, () => {
        updateJoinedIdsFromSfuRoom();
      });
      room.on(RoomEvent.ParticipantDisconnected, () => {
        updateJoinedIdsFromSfuRoom();
      });
      room.on(RoomEvent.Reconnected, () => {
        updateJoinedIdsFromSfuRoom();
      });

      await room.connect(sfuToken.url, sfuToken.token);
      await room.localParticipant.setMicrophoneEnabled(true);
      await room.localParticipant.setCameraEnabled(
        !audioOnly && !startWithCameraOff
      );

      syncLocalPreviewFromSfuRoom(webRtc, room);
      updateJoinedIdsFromSfuRoom();
    },
    [
      cleanupSfuRoom,
      configureLiveKitGlobals,
      ensureLiveKitModule,
      syncLocalPreviewFromSfuRoom,
      updateJoinedIdsFromSfuRoom,
    ]
  );

  const closeWithMessage = useCallback(
    (message: string) => {
      setStatusMessage(message);
      clearCloseDelayTimeout();
      closeDelayTimeoutRef.current = setTimeout(() => {
        setStatusMessage(null);
        setPhase("idle");
        setActiveCall(null);
      }, 1500);
    },
    [clearCloseDelayTimeout],
  );

  const cleanupPeerConnection = useCallback(() => {
    clearRingTimeout();
    clearConnectingTimeout();
    clearCloseDelayTimeout();
    cleanupSfuRoom();

    if (peerConnectionRef.current) {
      peerConnectionRef.current.onicecandidate = null;
      peerConnectionRef.current.ontrack = null;
      peerConnectionRef.current.onconnectionstatechange = null;
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track: any) => track.stop());
      localStreamRef.current = null;
    }
    remoteStreamRef.current = null;

    pendingIceCandidatesRef.current = [];
    pendingIncomingOfferRef.current = null;
    localRelayCandidateCountRef.current = 0;
    remoteRelayCandidateCountRef.current = 0;
    setLocalStreamURL(null);
    setRemoteStreamURL(null);
    setRemoteStreamRenderKey(0);
    setMicEnabled(true);
    setCameraEnabled(true);
  }, [
    cleanupSfuRoom,
    clearCloseDelayTimeout,
    clearConnectingTimeout,
    clearRingTimeout,
  ]);

  const resetCall = useCallback(() => {
    cleanupPeerConnection();
    setStatusMessage(null);
    setPhase("idle");
    setActiveCall(null);
  }, [cleanupPeerConnection]);

  useEffect(() => {
    phaseRef.current = phase;
    callDebugLog("phase:changed", { phase });
  }, [phase]);

  useEffect(() => {
    activeCallRef.current = activeCall;
  }, [activeCall]);

  useEffect(() => {
    myIdentityUserIdRef.current = myIdentityUserId;
  }, [myIdentityUserId]);

  const sendSignal = useCallback(
    async (
      type: CallSignalType,
      conversationId: string,
      callId: string,
      extras?: {
        audioOnly?: boolean;
        targetUserIds?: string[];
        sdp?: string;
        candidate?: string;
        sdpMid?: string;
        sdpMLineIndex?: number;
      },
    ): Promise<boolean> => {
      callDebugLog("sendSignal:start", {
        type,
        conversationId,
        callId,
        extras,
      });
      await chatSocketService.connect();
      const isConnected = await chatSocketService.waitForConnected();
      if (!isConnected) {
        callDebugLog("sendSignal:socket-not-connected", {
          type,
          conversationId,
          callId,
        });
        return false;
      }

      const sent = chatSocketService.sendCallSignal(
        conversationId,
        callId,
        type,
        {
          audioOnly:
            extras?.audioOnly ?? activeCallRef.current?.audioOnly ?? true,
          targetUserIds: extras?.targetUserIds,
          sdp: extras?.sdp,
          candidate: extras?.candidate,
          sdpMid: extras?.sdpMid,
          sdpMLineIndex: extras?.sdpMLineIndex,
        },
      );
      callDebugLog("sendSignal:done", { type, conversationId, callId, sent });
      return sent;
    },
    [],
  );

  const createPeerConnection = useCallback(
    (conversationId: string, callId: string, audioOnly: boolean) => {
      const webRtc = ensureWebRtcModule();
      if (!webRtc) {
        throw new Error("react-native-webrtc is missing");
      }

      const { RTCPeerConnection } = webRtc;
      const pc = new RTCPeerConnection({ iceServers: WEBRTC_ICE_SERVERS });
      const { MediaStream } = webRtc;
      const inboundStream = new MediaStream();
      remoteStreamRef.current = inboundStream;
      setRemoteStreamURL(null);
      callDebugLog("pc:create", {
        conversationId,
        callId,
        audioOnly,
        iceServers: WEBRTC_ICE_SERVERS,
      });

      const markConnected = () => {
        callDebugLog("pc:markConnected", { conversationId, callId });
        clearRingTimeout();
        clearConnectingTimeout();
        setStatusMessage(null);
        setPhase("in-call");
        setActiveCall((prev) =>
          prev && prev.startedAt == null
            ? {
                ...prev,
                startedAt: Date.now(),
              }
            : prev,
        );
      };

      pc.onicecandidate = (event: any) => {
        if (!event?.candidate) {
          callDebugLog("pc:onicecandidate:end-of-candidates", { callId });
          if (localRelayCandidateCountRef.current === 0) {
            callDebugLog("turn:warning:no-local-relay-candidate", { callId });
          }
          return;
        }
        const candidateStr = `${event.candidate?.candidate ?? ""}`;
        if (candidateStr.includes(" typ relay ")) {
          localRelayCandidateCountRef.current += 1;
        }
        callDebugLog("pc:onicecandidate", {
          callId,
          hasCandidate: Boolean(event.candidate?.candidate),
          sdpMid: event.candidate?.sdpMid,
          sdpMLineIndex: event.candidate?.sdpMLineIndex,
        });
        void sendSignal("ICE_CANDIDATE", conversationId, callId, {
          audioOnly,
          candidate: event.candidate.candidate,
          sdpMid: event.candidate.sdpMid ?? undefined,
          sdpMLineIndex: event.candidate.sdpMLineIndex ?? undefined,
        });
      };

      pc.ontrack = (event: any) => {
        const sourceStream = event?.streams?.[0];
        let targetStream = remoteStreamRef.current ?? inboundStream;
        if (sourceStream?.toURL) {
          targetStream = sourceStream;
          remoteStreamRef.current = sourceStream;
        } else if (event?.track) {
          const exists = targetStream
            .getTracks?.()
            ?.some((t: any) => t.id === event.track.id);
          if (!exists) {
            targetStream.addTrack(event.track);
          }
        }

        const videoTrackCount = targetStream.getVideoTracks?.()?.length ?? 0;
        const audioTrackCount = targetStream.getAudioTracks?.()?.length ?? 0;
        const remoteUrl = targetStream.toURL?.() ?? null;
        callDebugLog("pc:ontrack", {
          callId,
          streamCount: event?.streams?.length ?? 0,
          trackKind: event?.track?.kind,
          sourceHasToURL: Boolean(sourceStream?.toURL),
          trackEnabled: event?.track?.enabled,
          trackMuted: event?.track?.muted,
          videoTrackCount,
          audioTrackCount,
          hasRemoteURL: Boolean(remoteUrl),
        });
        setRemoteStreamURL(remoteUrl);
        setRemoteStreamRenderKey((value) => value + 1);
      };

      pc.onconnectionstatechange = () => {
        const state = pc.connectionState;
        callDebugLog("pc:onconnectionstatechange", { callId, state });
        if (state === "connected") {
          markConnected();
          return;
        }

        if (
          state === "failed" ||
          state === "disconnected" ||
          state === "closed"
        ) {
          resetCall();
        }
      };

      pc.oniceconnectionstatechange = () => {
        const state = pc.iceConnectionState;
        callDebugLog("pc:oniceconnectionstatechange", { callId, state });
        if (state === "connected" || state === "completed") {
          markConnected();
          return;
        }
        if (
          state === "failed" ||
          state === "disconnected" ||
          state === "closed"
        ) {
          resetCall();
        }
      };

      pc.onsignalingstatechange = () => {
        callDebugLog("pc:onsignalingstatechange", {
          callId,
          signalingState: pc.signalingState,
        });
      };

      pc.onicegatheringstatechange = () => {
        callDebugLog("pc:onicegatheringstatechange", {
          callId,
          iceGatheringState: pc.iceGatheringState,
        });
      };

      peerConnectionRef.current = pc;
      return pc;
    },
    [
      clearConnectingTimeout,
      clearRingTimeout,
      ensureWebRtcModule,
      resetCall,
      sendSignal,
    ],
  );

  const ensureLocalStream = useCallback(
    async (audioOnly: boolean, startWithCameraOff = false) => {
      callDebugLog("localStream:request", { audioOnly, startWithCameraOff });
      const webRtc = ensureWebRtcModule();
      if (!webRtc) {
        throw new Error("react-native-webrtc is missing");
      }
      const { mediaDevices } = webRtc;

      if (localStreamRef.current) {
        localStreamRef.current
          .getTracks()
          .forEach((track: any) => track.stop());
        localStreamRef.current = null;
      }

      const stream = await mediaDevices.getUserMedia({
        audio: true,
        video: audioOnly ? false : { facingMode: "user" },
      });
      localStreamRef.current = stream;
      setLocalStreamURL(stream.toURL?.() ?? null);

      const audioTrack = stream.getAudioTracks?.()[0];
      const videoTrack = stream.getVideoTracks?.()[0];
      callDebugLog("localStream:acquired", {
        audioOnly,
        audioTrack: Boolean(audioTrack),
        videoTrack: Boolean(videoTrack),
      });
      setMicEnabled(audioTrack ? audioTrack.enabled : true);
      if (videoTrack) {
        videoTrack.enabled = !startWithCameraOff;
      }
      setCameraEnabled(videoTrack ? videoTrack.enabled : false);
      return stream;
    },
    [ensureWebRtcModule],
  );

  const attachLocalTracks = useCallback(
    (pc: any, stream: any, audioOnly: boolean) => {
      stream
        .getTracks()
        .filter((track: any) => (audioOnly ? track.kind === "audio" : true))
        .forEach((track: any) => {
          pc.addTrack(track, stream);
        });
    },
    [],
  );

  const flushPendingIceCandidates = useCallback(
    async (pc: any) => {
      if (pendingIceCandidatesRef.current.length === 0) {
        return;
      }

      const candidates = [...pendingIceCandidatesRef.current];
      pendingIceCandidatesRef.current = [];
      callDebugLog("ice:flushPending:start", { count: candidates.length });

      const webRtc = ensureWebRtcModule();
      if (!webRtc) {
        return;
      }
      const { RTCIceCandidate } = webRtc;

      for (const candidate of candidates) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
          callDebugLog("ice:flushPending:added", {
            sdpMid: candidate?.sdpMid,
            sdpMLineIndex: candidate?.sdpMLineIndex,
          });
        } catch {
          callDebugLog("ice:flushPending:failed", {
            sdpMid: candidate?.sdpMid,
            sdpMLineIndex: candidate?.sdpMLineIndex,
          });
          // ignore invalid buffered candidate
        }
      }
    },
    [ensureWebRtcModule],
  );

  const startCall = useCallback(
    async (params: StartCallParams, audioOnly: boolean) => {
      if (phaseRef.current !== "idle") {
        callDebugLog("startCall:ignored-not-idle", { phase: phaseRef.current });
        return;
      }
      const {
        conversationId,
        peerUserId,
        peerName,
        peerAvatar,
        conversationType,
        targetUserIds,
        groupMembers,
      } = params;
      const isGroupCall = conversationType === "GROUP";
      if (isGroupCall && audioOnly) {
        Toast.show({
          type: "info",
          text1: "Cuộc gọi nhóm chỉ hỗ trợ gọi video",
        });
        return;
      }
      const callId = buildCallId();

      try {
        callDebugLog("startCall:begin", {
          conversationId,
          callId,
          peerUserId,
          audioOnly,
        });
        await chatSocketService.connect();

        setStatusMessage(null);
        setPhase("outgoing");
        setActiveCall({
          conversationId,
          callId,
          peerUserId: peerUserId ?? "group",
          peerName: peerName ?? peerUserId ?? "Nhóm chat",
          peerAvatar: peerAvatar ?? null,
          audioOnly,
          isGroupCall,
          members: groupMembers,
          joinedUserIds: myIdentityUserIdRef.current
            ? [myIdentityUserIdRef.current]
            : [],
        });

        let offerPayloadSdp: string | undefined;
        if (isGroupCall) {
          await connectSfuRoom(conversationId, callId, audioOnly);
        } else {
          const pc = createPeerConnection(conversationId, callId, audioOnly);
          const localStream = await ensureLocalStream(audioOnly);
          attachLocalTracks(pc, localStream, audioOnly);

          const offer = await pc.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: !audioOnly,
          });
          await pc.setLocalDescription(offer);
          const localOfferSdp = pc.localDescription?.sdp ?? offer.sdp ?? "";
          if (!localOfferSdp) {
            throw new Error("Cannot create valid offer sdp");
          }
          offerPayloadSdp = localOfferSdp;
          callDebugLog("startCall:offer-created", {
            callId,
            sdpLength: localOfferSdp.length,
          });
        }

        const offerSent = await sendSignal("OFFER", conversationId, callId, {
          audioOnly,
          targetUserIds: isGroupCall ? targetUserIds : undefined,
          sdp: offerPayloadSdp,
        });
        if (!offerSent) {
          throw new Error("Call signaling socket is not connected");
        }
        callDebugLog("startCall:offer-sent", { callId });

        clearRingTimeout();
        ringTimeoutRef.current = setTimeout(() => {
          const latest = activeCallRef.current;
          if (phaseRef.current === "outgoing" && latest?.callId === callId) {
            callDebugLog("startCall:ring-timeout", { callId });
            void sendSignal("END", latest.conversationId, latest.callId, {
              audioOnly: latest.audioOnly,
            });
            closeWithMessage("Người dùng không bắt máy");
            cleanupPeerConnection();
          }
        }, RING_TIMEOUT_MS);
      } catch (error) {
        callDebugLog("startCall:error", { callId, error: toErrorLog(error) });
        Toast.show({
          type: "error",
          text1: audioOnly
            ? "Không thể bắt đầu cuộc gọi thoại"
            : "Không thể bắt đầu cuộc gọi video",
        });
        resetCall();
      }
    },
    [
      attachLocalTracks,
      cleanupPeerConnection,
      clearRingTimeout,
      closeWithMessage,
      connectSfuRoom,
      createPeerConnection,
      ensureLocalStream,
      resetCall,
      sendSignal,
    ],
  );

  const startAudioCall = useCallback(
    async (params: StartCallParams) => {
      await startCall(params, true);
    },
    [startCall],
  );

  const startVideoCall = useCallback(
    async (params: StartCallParams) => {
      await startCall(params, false);
    },
    [startCall],
  );

  const acceptIncomingCallInternal = useCallback(
    async (startWithCameraOff: boolean) => {
      const offer = pendingIncomingOfferRef.current;
      if (!offer || phaseRef.current !== "incoming") {
        return;
      }

      try {
        callDebugLog("acceptCall:begin", {
          callId: offer.callId,
          conversationId: offer.conversationId,
          audioOnly: offer.audioOnly,
          startWithCameraOff,
        });
        await chatSocketService.connect();

        const isGroupCall = !offer.audioOnly;
        let acceptPayloadSdp: string | undefined;
        if (isGroupCall) {
          await connectSfuRoom(
            offer.conversationId,
            offer.callId,
            offer.audioOnly,
            startWithCameraOff
          );
        } else {
          const webRtc = ensureWebRtcModule();
          if (!webRtc) {
            return;
          }
          const { RTCSessionDescription } = webRtc;

          const pc = createPeerConnection(
            offer.conversationId,
            offer.callId,
            offer.audioOnly,
          );
          const localStream = await ensureLocalStream(
            offer.audioOnly,
            startWithCameraOff,
          );
          attachLocalTracks(pc, localStream, offer.audioOnly);

          const setRemoteOfferStartedAt = Date.now();
          await pc.setRemoteDescription(
            new RTCSessionDescription({ type: "offer", sdp: offer.sdp ?? "" }),
          );
          callDebugLog("acceptCall:setRemoteDescription:done", {
            callId: offer.callId,
            elapsedMs: Date.now() - setRemoteOfferStartedAt,
          });
          await flushPendingIceCandidates(pc);

          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          const localAnswerSdp = pc.localDescription?.sdp ?? answer.sdp ?? "";
          if (!localAnswerSdp) {
            throw new Error("Cannot create valid answer sdp");
          }
          acceptPayloadSdp = localAnswerSdp;
          callDebugLog("acceptCall:answer-created", {
            callId: offer.callId,
            sdpLength: localAnswerSdp.length,
          });
        }

        const acceptSent = await sendSignal("ACCEPT", offer.conversationId, offer.callId, {
          audioOnly: offer.audioOnly,
          sdp: acceptPayloadSdp,
        });
        if (!acceptSent) {
          throw new Error("Call signaling socket is not connected");
        }
        callDebugLog("acceptCall:accept-sent", { callId: offer.callId });

        setStatusMessage(null);
        setPhase(isGroupCall ? "in-call" : "connecting");
        setActiveCall((prev) =>
          prev
            ? {
                ...prev,
                callId: offer.callId,
                conversationId: offer.conversationId,
                audioOnly: offer.audioOnly,
                joinedUserIds: Array.from(
                  new Set([
                    ...(prev.joinedUserIds ?? []),
                    offer.fromUserId,
                    ...(myIdentityUserIdRef.current
                      ? [myIdentityUserIdRef.current]
                      : []),
                  ]),
                ),
              }
            : {
                conversationId: offer.conversationId,
                callId: offer.callId,
                peerUserId: offer.fromUserId,
                peerName: offer.fromUserId,
                audioOnly: offer.audioOnly,
                isGroupCall: offer.audioOnly === false,
                joinedUserIds: Array.from(
                  new Set([
                    offer.fromUserId,
                    ...(myIdentityUserIdRef.current
                      ? [myIdentityUserIdRef.current]
                      : []),
                  ]),
                ),
              },
        );
        pendingIncomingOfferRef.current = null;
      } catch (error) {
        callDebugLog("acceptCall:error", {
          callId: offer.callId,
          error: toErrorLog(error),
        });
        Toast.show({
          type: "error",
          text1: "Không thể nhận cuộc gọi",
        });
      }
    },
    [
      attachLocalTracks,
      connectSfuRoom,
      createPeerConnection,
      ensureLocalStream,
      ensureWebRtcModule,
      flushPendingIceCandidates,
      sendSignal,
    ],
  );

  const acceptIncomingCall = useCallback(async () => {
    await acceptIncomingCallInternal(false);
  }, [acceptIncomingCallInternal]);

  const acceptIncomingCallWithoutCamera = useCallback(async () => {
    await acceptIncomingCallInternal(true);
  }, [acceptIncomingCallInternal]);

  const joinGroupCallFromConversation = useCallback(
    async (conversationId: string): Promise<boolean> => {
      if (!conversationId) {
        return false;
      }
      const current = activeCallRef.current;
      if (
        current &&
        current.conversationId === conversationId &&
        phaseRef.current !== "idle"
      ) {
        return true;
      }

      const pendingOffer = pendingIncomingOfferRef.current;
      if (
        pendingOffer &&
        pendingOffer.conversationId === conversationId &&
        phaseRef.current === "incoming"
      ) {
        await acceptIncomingCallInternal(false);
        return true;
      }

      return false;
    },
    [acceptIncomingCallInternal],
  );

  const rejectIncomingCall = useCallback(async () => {
    const current = activeCallRef.current;
    if (!current || phaseRef.current !== "incoming") {
      return;
    }
    await sendSignal("REJECT", current.conversationId, current.callId, {
      audioOnly: current.audioOnly,
    });
    resetCall();
  }, [resetCall, sendSignal]);

  const endCurrentCall = useCallback(async () => {
    const current = activeCallRef.current;
    if (!current || phaseRef.current === "idle") {
      return;
    }
    await sendSignal("END", current.conversationId, current.callId, {
      audioOnly: current.audioOnly,
    });
    resetCall();
  }, [resetCall, sendSignal]);

  const toggleMicrophone = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) {
      return;
    }
    const audioTracks = stream.getAudioTracks?.() ?? [];
    if (audioTracks.length === 0) {
      return;
    }
    const nextEnabled = !audioTracks[0].enabled;
    audioTracks.forEach((track: any) => {
      track.enabled = nextEnabled;
    });
    setMicEnabled(nextEnabled);
  }, []);

  const toggleCamera = useCallback(() => {
    const current = activeCallRef.current;
    if (!current || current.audioOnly) {
      return;
    }
    const stream = localStreamRef.current;
    if (!stream) {
      return;
    }
    const videoTracks = stream.getVideoTracks?.() ?? [];
    if (videoTracks.length === 0) {
      return;
    }
    const nextEnabled = !videoTracks[0].enabled;
    videoTracks.forEach((track: any) => {
      track.enabled = nextEnabled;
    });
    setCameraEnabled(nextEnabled);
  }, []);

  const logPeerStats = useCallback((tag: string) => {
    const pc = peerConnectionRef.current;
    if (!pc?.getStats) {
      return;
    }
    void pc
      .getStats()
      .then((report: any) => {
        const entries: any[] = [];
        if (Array.isArray(report)) {
          entries.push(...report);
        } else if (typeof report?.forEach === "function") {
          report.forEach((value: any) => entries.push(value));
        } else if (report && typeof report === "object") {
          entries.push(...Object.values(report));
        }

        const candidatePair = entries.find(
          (item) =>
            item?.type === "candidate-pair" &&
            (item?.selected || item?.state === "succeeded"),
        );
        const localCandidate = candidatePair?.localCandidateId
          ? entries.find((item) => item?.id === candidatePair.localCandidateId)
          : undefined;
        const remoteCandidate = candidatePair?.remoteCandidateId
          ? entries.find((item) => item?.id === candidatePair.remoteCandidateId)
          : undefined;

        callDebugLog("stats:snapshot", {
          tag,
          signalingState: pc.signalingState,
          iceConnectionState: pc.iceConnectionState,
          connectionState: pc.connectionState,
          iceGatheringState: pc.iceGatheringState,
          selectedPairState: candidatePair?.state,
          selectedPairNominated: candidatePair?.nominated,
          selectedPairWritable: candidatePair?.writable,
          bytesSent: candidatePair?.bytesSent,
          bytesReceived: candidatePair?.bytesReceived,
          localCandidateType: localCandidate?.candidateType,
          localCandidateProtocol: localCandidate?.protocol,
          remoteCandidateType: remoteCandidate?.candidateType,
          remoteCandidateProtocol: remoteCandidate?.protocol,
        });
      })
      .catch((error: unknown) => {
        callDebugLog("stats:error", { tag, error: toErrorLog(error) });
      });
  }, []);

  useEffect(() => {
    clearConnectingTimeout();
    const currentCallId = activeCall?.callId;
    if (phase !== "connecting" || !currentCallId) {
      return;
    }

    connectingTimeoutRef.current = setTimeout(() => {
      const latest = activeCallRef.current;
      if (
        phaseRef.current !== "connecting" ||
        !latest ||
        latest.callId !== currentCallId
      ) {
        return;
      }
      callDebugLog("connecting:timeout", { callId: currentCallId });
      callDebugLog("turn:relay-candidate-summary", {
        callId: currentCallId,
        localRelayCandidates: localRelayCandidateCountRef.current,
        remoteRelayCandidates: remoteRelayCandidateCountRef.current,
      });
      void sendSignal("END", latest.conversationId, latest.callId, {
        audioOnly: latest.audioOnly,
      });
      closeWithMessage("Khong the thiet lap ket noi cuoc goi");
      cleanupPeerConnection();
    }, CONNECTING_TIMEOUT_MS);

    return () => {
      clearConnectingTimeout();
    };
  }, [
    activeCall?.callId,
    cleanupPeerConnection,
    clearConnectingTimeout,
    closeWithMessage,
    phase,
    sendSignal,
  ]);

  useEffect(() => {
    if (phase !== "connecting" && phase !== "in-call") {
      return;
    }
    logPeerStats(`phase-${phase}-start`);
    const timer = setInterval(() => {
      logPeerStats(`phase-${phase}-tick`);
    }, 2000);
    return () => {
      clearInterval(timer);
    };
  }, [logPeerStats, phase]);

  useEffect(() => {
    let mounted = true;
    let userEventsSubscription: { unsubscribe: () => void } | undefined;

    const handleUserEvent = (event: UserRealtimeEvent) => {
      if (event.eventType !== "CALL_SIGNAL" || !event.callSignal) {
        return;
      }
      const signal = event.callSignal;
      callDebugLog("signal:received", {
        type: signal.type,
        callId: signal.callId,
        conversationId: signal.conversationId,
        fromUserId: signal.fromUserId,
        toUserId: signal.toUserId,
        audioOnly: signal.audioOnly,
        hasSdp: Boolean(signal.sdp),
        hasCandidate: Boolean(signal.candidate),
      });
      if (signal.fromUserId === myIdentityUserIdRef.current) {
        callDebugLog("signal:ignored-self", {
          type: signal.type,
          callId: signal.callId,
        });
        return;
      }

      if (signal.type === "OFFER") {
        const isGroupOffer = signal.audioOnly === false;
        if (
          !myIdentityUserIdRef.current ||
          signal.toUserId !== myIdentityUserIdRef.current ||
          (!isGroupOffer && !signal.sdp)
        ) {
          callDebugLog("signal:offer-ignored-invalid-target-or-sdp", {
            callId: signal.callId,
            hasSdp: Boolean(signal.sdp),
            myId: myIdentityUserIdRef.current,
            toUserId: signal.toUserId,
          });
          return;
        }
        const currentCall = activeCallRef.current;
        if (
          phaseRef.current === "incoming" &&
          currentCall?.callId === signal.callId
        ) {
          return;
        }

        if (phaseRef.current !== "idle") {
          callDebugLog("signal:offer-reject-busy", {
            callId: signal.callId,
            phase: phaseRef.current,
          });
          void sendSignal("REJECT", signal.conversationId, signal.callId, {
            audioOnly: signal.audioOnly,
          });
          return;
        }

        pendingIncomingOfferRef.current = {
          conversationId: signal.conversationId,
          callId: signal.callId,
          fromUserId: signal.fromUserId,
          sdp: signal.sdp,
          audioOnly: signal.audioOnly,
        };

        setPhase("incoming");
        setStatusMessage(null);
        setActiveCall({
          conversationId: signal.conversationId,
          callId: signal.callId,
          peerUserId: signal.fromUserId,
          peerName: signal.fromUserId,
          peerAvatar: null,
          audioOnly: signal.audioOnly,
          isGroupCall: signal.audioOnly === false,
          joinedUserIds: [signal.fromUserId],
        });

        void userService
          .getProfileByIdentityUserId(signal.fromUserId)
          .then((response) => {
            if (!mounted) {
              return;
            }
            const profile = response.data;
            const name =
              `${profile.lastName ?? ""} ${profile.firstName ?? ""}`.trim() ||
              signal.fromUserId;
            setActiveCall((prev) =>
              prev && prev.callId === signal.callId
                ? {
                    ...prev,
                    peerName: name,
                    peerAvatar: profile.avatar ?? null,
                  }
                : prev,
            );
          })
          .catch(() => undefined);

        return;
      }

      const current = activeCallRef.current;
      if (!current || current.callId !== signal.callId) {
        if (
          signal.type === "ICE_CANDIDATE" &&
          signal.candidate &&
          signal.audioOnly !== false
        ) {
          callDebugLog("signal:ice-buffered-no-active-call", {
            callId: signal.callId,
          });
          pendingIceCandidatesRef.current.push({
            candidate: signal.candidate,
            sdpMid: signal.sdpMid,
            sdpMLineIndex: signal.sdpMLineIndex,
          });
        }
        return;
      }

      if (signal.type === "ACCEPT" && phaseRef.current === "outgoing") {
        if (current.isGroupCall) {
          clearRingTimeout();
          setActiveCall((prev) =>
            prev && prev.callId === signal.callId
              ? {
                  ...prev,
                  joinedUserIds: Array.from(
                    new Set([...(prev.joinedUserIds ?? []), signal.fromUserId]),
                  ),
                  startedAt: prev.startedAt ?? Date.now(),
                }
              : prev,
          );
          setPhase("in-call");
          return;
        }
        if (!signal.sdp) {
          return;
        }
        callDebugLog("signal:accept-processing", { callId: signal.callId });
        const webRtc = ensureWebRtcModule();
        const pc = peerConnectionRef.current;
        if (!webRtc || !pc) {
          callDebugLog("signal:accept-ignored-no-webrtc-or-pc", {
            callId: signal.callId,
            hasWebRtc: Boolean(webRtc),
            hasPc: Boolean(pc),
          });
          return;
        }
        const { RTCSessionDescription } = webRtc;
        const setRemoteAnswerStartedAt = Date.now();
        void pc
          .setRemoteDescription(
            new RTCSessionDescription({ type: "answer", sdp: signal.sdp }),
          )
          .then(() => {
            callDebugLog("signal:accept:setRemoteDescription:done", {
              callId: signal.callId,
              elapsedMs: Date.now() - setRemoteAnswerStartedAt,
            });
          })
          .then(() => flushPendingIceCandidates(pc))
          .then(() => {
            callDebugLog("signal:accept-remote-description-set", {
              callId: signal.callId,
            });
            setActiveCall((prev) =>
              prev && prev.callId === signal.callId
                ? {
                    ...prev,
                    joinedUserIds: Array.from(
                      new Set([...(prev.joinedUserIds ?? []), signal.fromUserId]),
                    ),
                  }
                : prev,
            );
            setPhase("connecting");
          })
          .catch((error: unknown) => {
            callDebugLog("signal:accept-processing-failed", {
              callId: signal.callId,
              error: toErrorLog(error),
            });
            Toast.show({
              type: "error",
              text1: "Không thể thiết lập kết nối cuộc gọi",
            });
            resetCall();
          });
        return;
      }

      if (
        signal.type === "ICE_CANDIDATE" &&
        signal.candidate &&
        !current.isGroupCall
      ) {
        if (`${signal.candidate}`.includes(" typ relay ")) {
          remoteRelayCandidateCountRef.current += 1;
        }
        const webRtc = ensureWebRtcModule();
        const pc = peerConnectionRef.current;
        if (!webRtc || !pc) {
          callDebugLog("signal:ice-buffered-no-pc", { callId: signal.callId });
          pendingIceCandidatesRef.current.push({
            candidate: signal.candidate,
            sdpMid: signal.sdpMid,
            sdpMLineIndex: signal.sdpMLineIndex,
          });
          return;
        }

        const { RTCIceCandidate } = webRtc;
        const candidate = {
          candidate: signal.candidate,
          sdpMid: signal.sdpMid,
          sdpMLineIndex: signal.sdpMLineIndex,
        };

        if (!pc.remoteDescription) {
          callDebugLog("signal:ice-buffered-no-remote-description", {
            callId: signal.callId,
          });
          pendingIceCandidatesRef.current.push(candidate);
          return;
        }

        void pc
          .addIceCandidate(new RTCIceCandidate(candidate))
          .then(() => {
            callDebugLog("signal:ice-added", { callId: signal.callId });
          })
          .catch((error: unknown) => {
            callDebugLog("signal:ice-add-failed", {
              callId: signal.callId,
              error,
            });
          });
        return;
      }

      if (signal.type === "REJECT") {
        callDebugLog("signal:reject", {
          callId: signal.callId,
          phase: phaseRef.current,
        });
        if (phaseRef.current === "outgoing") {
          closeWithMessage("Người dùng đã từ chối cuộc gọi");
          cleanupPeerConnection();
          return;
        }
        resetCall();
        return;
      }

      if (signal.type === "END") {
        callDebugLog("signal:end", {
          callId: signal.callId,
          phase: phaseRef.current,
        });
        if (phaseRef.current === "outgoing") {
          closeWithMessage("Người dùng không bắt máy");
          cleanupPeerConnection();
          return;
        }
        resetCall();
      }
    };

    const setup = async () => {
      const token = await authTokenStore.get();
      callDebugLog("setup:start", { hasToken: Boolean(token) });
      if (!token) {
        resetCall();
        return;
      }

      const profile = await userService.getMyProfile();
      if (mounted) {
        setMyIdentityUserId(profile.data.identityUserId ?? null);
      }

      await chatSocketService.connect(undefined, () => {
        if (!mounted) {
          return;
        }
        callDebugLog("socket:disconnected");
        resetCall();
      });
      callDebugLog("socket:connected-and-subscribing-user-events");
      userEventsSubscription =
        chatSocketService.subscribeUserEvents(handleUserEvent);
    };

    void setup().catch(() => undefined);

    return () => {
      mounted = false;
      userEventsSubscription?.unsubscribe();
    };
  }, [
    closeWithMessage,
    cleanupPeerConnection,
    ensureWebRtcModule,
    flushPendingIceCandidates,
    resetCall,
    sendSignal,
  ]);

  useEffect(
    () => () => {
      cleanupPeerConnection();
      clearCloseDelayTimeout();
    },
    [cleanupPeerConnection, clearCloseDelayTimeout],
  );

  const value = useMemo<CallContextValue>(
    () => ({
      phase,
      statusMessage,
      activeCall,
      micEnabled,
      cameraEnabled,
      canToggleCamera: Boolean(activeCall && !activeCall.audioOnly),
      localStreamURL,
      remoteStreamURL,
      remoteStreamRenderKey,
      startAudioCall,
      startVideoCall,
      joinGroupCallFromConversation,
      acceptIncomingCall,
      acceptIncomingCallWithoutCamera,
      rejectIncomingCall,
      endCurrentCall,
      toggleMicrophone,
      toggleCamera,
    }),
    [
      acceptIncomingCall,
      acceptIncomingCallWithoutCamera,
      activeCall,
      cameraEnabled,
      endCurrentCall,
      localStreamURL,
      micEnabled,
      phase,
      rejectIncomingCall,
      remoteStreamURL,
      remoteStreamRenderKey,
      startAudioCall,
      startVideoCall,
      joinGroupCallFromConversation,
      statusMessage,
      toggleCamera,
      toggleMicrophone,
    ],
  );

  return <CallContext.Provider value={value}>{children}</CallContext.Provider>;
}

export function useCall() {
  const context = useContext(CallContext);
  if (!context) {
    throw new Error("useCall must be used within CallProvider");
  }
  return context;
}
