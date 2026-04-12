import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import Toast from 'react-native-toast-message';

import { authTokenStore } from '@/configurations/axios.config';
import { chatSocketService } from '@/services/chat-socket.service';
import { userService } from '@/services/user.service';
import type { CallSignalType, UserRealtimeEvent } from '@/types/chat';

const WEBRTC_ICE_SERVERS = [{ urls: 'stun:stun.l.google.com:19302' }];
const RING_TIMEOUT_MS = 15_000;

type CallPhase = 'idle' | 'outgoing' | 'incoming' | 'connecting' | 'in-call';

type ActiveCall = {
  conversationId: string;
  callId: string;
  peerUserId: string;
  peerName: string;
  peerAvatar?: string | null;
  audioOnly: boolean;
  startedAt?: number;
};

type StartCallParams = {
  conversationId: string;
  peerUserId: string;
  peerName?: string;
  peerAvatar?: string | null;
};

type PendingIncomingOffer = {
  conversationId: string;
  callId: string;
  fromUserId: string;
  sdp: string;
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
  startAudioCall: (params: StartCallParams) => Promise<void>;
  startVideoCall: (params: StartCallParams) => Promise<void>;
  acceptIncomingCall: () => Promise<void>;
  acceptIncomingCallWithoutCamera: () => Promise<void>;
  rejectIncomingCall: () => Promise<void>;
  endCurrentCall: () => Promise<void>;
  toggleMicrophone: () => void;
  toggleCamera: () => void;
};

const CallContext = createContext<CallContextValue | null>(null);

const buildCallId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

export function CallProvider({ children }: { children: React.ReactNode }) {
  const [phase, setPhase] = useState<CallPhase>('idle');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [localStreamURL, setLocalStreamURL] = useState<string | null>(null);
  const [remoteStreamURL, setRemoteStreamURL] = useState<string | null>(null);
  const [myIdentityUserId, setMyIdentityUserId] = useState<string | null>(null);

  const phaseRef = useRef<CallPhase>('idle');
  const activeCallRef = useRef<ActiveCall | null>(null);
  const myIdentityUserIdRef = useRef<string | null>(null);
  const peerConnectionRef = useRef<any>(null);
  const localStreamRef = useRef<any>(null);
  const pendingIncomingOfferRef = useRef<PendingIncomingOffer | null>(null);
  const pendingIceCandidatesRef = useRef<any[]>([]);
  const ringTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const ensureWebRtcModule = useCallback(() => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mod = require('react-native-webrtc');
      return mod;
    } catch {
      Toast.show({
        type: 'error',
        text1: 'Thiếu thư viện gọi',
        text2: 'Cần cài react-native-webrtc và build lại app mobile.',
      });
      return null;
    }
  }, []);

  const clearRingTimeout = useCallback(() => {
    if (ringTimeoutRef.current) {
      clearTimeout(ringTimeoutRef.current);
      ringTimeoutRef.current = null;
    }
  }, []);

  const closeWithMessage = useCallback((message: string) => {
    setStatusMessage(message);
    setTimeout(() => {
      setStatusMessage(null);
      setPhase('idle');
      setActiveCall(null);
    }, 1500);
  }, []);

  const cleanupPeerConnection = useCallback(() => {
    clearRingTimeout();

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

    pendingIceCandidatesRef.current = [];
    pendingIncomingOfferRef.current = null;
    setLocalStreamURL(null);
    setRemoteStreamURL(null);
    setMicEnabled(true);
    setCameraEnabled(true);
  }, [clearRingTimeout]);

  const resetCall = useCallback(() => {
    cleanupPeerConnection();
    setStatusMessage(null);
    setPhase('idle');
    setActiveCall(null);
  }, [cleanupPeerConnection]);

  useEffect(() => {
    phaseRef.current = phase;
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
        sdp?: string;
        candidate?: string;
        sdpMid?: string;
        sdpMLineIndex?: number;
      }
    ): Promise<boolean> => {
      await chatSocketService.connect();
      const isConnected = await chatSocketService.waitForConnected();
      if (!isConnected) {
        return false;
      }

      return chatSocketService.sendCallSignal(conversationId, callId, type, {
        audioOnly: extras?.audioOnly ?? activeCallRef.current?.audioOnly ?? true,
        sdp: extras?.sdp,
        candidate: extras?.candidate,
        sdpMid: extras?.sdpMid,
        sdpMLineIndex: extras?.sdpMLineIndex,
      });
    },
    [],
  );

  const createPeerConnection = useCallback(
    (conversationId: string, callId: string, audioOnly: boolean) => {
      const webRtc = ensureWebRtcModule();
      if (!webRtc) {
        throw new Error('react-native-webrtc is missing');
      }

      const { RTCPeerConnection } = webRtc;
      const pc = new RTCPeerConnection({ iceServers: WEBRTC_ICE_SERVERS });

      pc.onicecandidate = (event: any) => {
        if (!event?.candidate) {
          return;
        }
        void sendSignal('ICE_CANDIDATE', conversationId, callId, {
          audioOnly,
          candidate: event.candidate.candidate,
          sdpMid: event.candidate.sdpMid ?? undefined,
          sdpMLineIndex: event.candidate.sdpMLineIndex ?? undefined,
        });
      };

      pc.ontrack = (event: any) => {
        const stream = event?.streams?.[0];
        if (stream?.toURL) {
          setRemoteStreamURL(stream.toURL());
        }
      };

      pc.onconnectionstatechange = () => {
        const state = pc.connectionState;
        if (state === 'connected') {
          clearRingTimeout();
          setStatusMessage(null);
          setPhase('in-call');
          setActiveCall((prev) =>
            prev && prev.startedAt == null
              ? {
                  ...prev,
                  startedAt: Date.now(),
                }
              : prev,
          );
          return;
        }

        if (state === 'failed' || state === 'disconnected' || state === 'closed') {
          resetCall();
        }
      };

      peerConnectionRef.current = pc;
      return pc;
    },
    [clearRingTimeout, ensureWebRtcModule, resetCall, sendSignal],
  );

  const ensureLocalStream = useCallback(
    async (audioOnly: boolean, startWithCameraOff = false) => {
      const webRtc = ensureWebRtcModule();
      if (!webRtc) {
        throw new Error('react-native-webrtc is missing');
      }
      const { mediaDevices } = webRtc;

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track: any) => track.stop());
        localStreamRef.current = null;
      }

      const stream = await mediaDevices.getUserMedia({
        audio: true,
        video: audioOnly ? false : { facingMode: 'user' },
      });
      localStreamRef.current = stream;
      setLocalStreamURL(stream.toURL?.() ?? null);

      const audioTrack = stream.getAudioTracks?.()[0];
      const videoTrack = stream.getVideoTracks?.()[0];
      setMicEnabled(audioTrack ? audioTrack.enabled : true);
      if (videoTrack) {
        videoTrack.enabled = !startWithCameraOff;
      }
      setCameraEnabled(videoTrack ? videoTrack.enabled : false);
      return stream;
    },
    [ensureWebRtcModule],
  );

  const attachLocalTracks = useCallback((pc: any, stream: any, audioOnly: boolean) => {
    stream
      .getTracks()
      .filter((track: any) => (audioOnly ? track.kind === 'audio' : true))
      .forEach((track: any) => {
        pc.addTrack(track, stream);
      });
  }, []);

  const flushPendingIceCandidates = useCallback(async (pc: any) => {
    if (pendingIceCandidatesRef.current.length === 0) {
      return;
    }

    const candidates = [...pendingIceCandidatesRef.current];
    pendingIceCandidatesRef.current = [];

    const webRtc = ensureWebRtcModule();
    if (!webRtc) {
      return;
    }
    const { RTCIceCandidate } = webRtc;

    for (const candidate of candidates) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch {
        // ignore invalid buffered candidate
      }
    }
  }, [ensureWebRtcModule]);

  const startCall = useCallback(
    async (params: StartCallParams, audioOnly: boolean) => {
      if (phaseRef.current !== 'idle') {
        return;
      }
      const { conversationId, peerUserId, peerName, peerAvatar } = params;
      const callId = buildCallId();

      try {
        await chatSocketService.connect();

        const pc = createPeerConnection(conversationId, callId, audioOnly);
        const localStream = await ensureLocalStream(audioOnly);
        attachLocalTracks(pc, localStream, audioOnly);

        const offer = await pc.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: !audioOnly,
        });
        await pc.setLocalDescription(offer);

        const localOfferSdp = pc.localDescription?.sdp ?? offer.sdp ?? '';
        if (!localOfferSdp) {
          throw new Error('Cannot create valid offer sdp');
        }

        setStatusMessage(null);
        setPhase('outgoing');
        setActiveCall({
          conversationId,
          callId,
          peerUserId,
          peerName: peerName ?? peerUserId,
          peerAvatar: peerAvatar ?? null,
          audioOnly,
        });

        const offerSent = await sendSignal('OFFER', conversationId, callId, {
          audioOnly,
          sdp: localOfferSdp,
        });
        if (!offerSent) {
          throw new Error('Call signaling socket is not connected');
        }

        clearRingTimeout();
        ringTimeoutRef.current = setTimeout(() => {
          const latest = activeCallRef.current;
          if (phaseRef.current === 'outgoing' && latest?.callId === callId) {
            void sendSignal('END', latest.conversationId, latest.callId, {
              audioOnly: latest.audioOnly,
            });
            closeWithMessage('Người dùng không bắt máy');
            cleanupPeerConnection();
          }
        }, RING_TIMEOUT_MS);
      } catch {
        Toast.show({
          type: 'error',
          text1: audioOnly ? 'Không thể bắt đầu cuộc gọi thoại' : 'Không thể bắt đầu cuộc gọi video',
        });
        resetCall();
      }
    },
    [attachLocalTracks, cleanupPeerConnection, clearRingTimeout, closeWithMessage, createPeerConnection, ensureLocalStream, resetCall, sendSignal],
  );

  const startAudioCall = useCallback(async (params: StartCallParams) => {
    await startCall(params, true);
  }, [startCall]);

  const startVideoCall = useCallback(async (params: StartCallParams) => {
    await startCall(params, false);
  }, [startCall]);

  const acceptIncomingCallInternal = useCallback(
    async (startWithCameraOff: boolean) => {
      const offer = pendingIncomingOfferRef.current;
      if (!offer || phaseRef.current !== 'incoming') {
        return;
      }

      try {
        await chatSocketService.connect();

        const webRtc = ensureWebRtcModule();
        if (!webRtc) {
          return;
        }
        const { RTCSessionDescription } = webRtc;

        const pc = createPeerConnection(offer.conversationId, offer.callId, offer.audioOnly);
        const localStream = await ensureLocalStream(offer.audioOnly, startWithCameraOff);
        attachLocalTracks(pc, localStream, offer.audioOnly);

        await pc.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp: offer.sdp }));
        await flushPendingIceCandidates(pc);

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        const localAnswerSdp = pc.localDescription?.sdp ?? answer.sdp ?? '';
        if (!localAnswerSdp) {
          throw new Error('Cannot create valid answer sdp');
        }

        const acceptSent = await sendSignal('ACCEPT', offer.conversationId, offer.callId, {
          audioOnly: offer.audioOnly,
          sdp: localAnswerSdp,
        });
        if (!acceptSent) {
          throw new Error('Call signaling socket is not connected');
        }

        setStatusMessage(null);
        setPhase('connecting');
        setActiveCall((prev) =>
          prev
            ? { ...prev, callId: offer.callId, conversationId: offer.conversationId, audioOnly: offer.audioOnly }
            : {
                conversationId: offer.conversationId,
                callId: offer.callId,
                peerUserId: offer.fromUserId,
                peerName: offer.fromUserId,
                audioOnly: offer.audioOnly,
              },
        );
        pendingIncomingOfferRef.current = null;
      } catch {
        Toast.show({
          type: 'error',
          text1: 'Không thể nhận cuộc gọi',
        });
      }
    },
    [attachLocalTracks, createPeerConnection, ensureLocalStream, ensureWebRtcModule, flushPendingIceCandidates, sendSignal],
  );

  const acceptIncomingCall = useCallback(async () => {
    await acceptIncomingCallInternal(false);
  }, [acceptIncomingCallInternal]);

  const acceptIncomingCallWithoutCamera = useCallback(async () => {
    await acceptIncomingCallInternal(true);
  }, [acceptIncomingCallInternal]);

  const rejectIncomingCall = useCallback(async () => {
    const current = activeCallRef.current;
    if (!current || phaseRef.current !== 'incoming') {
      return;
    }
    await sendSignal('REJECT', current.conversationId, current.callId, {
      audioOnly: current.audioOnly,
    });
    resetCall();
  }, [resetCall, sendSignal]);

  const endCurrentCall = useCallback(async () => {
    const current = activeCallRef.current;
    if (!current || phaseRef.current === 'idle') {
      return;
    }
    await sendSignal('END', current.conversationId, current.callId, {
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

  useEffect(() => {
    let mounted = true;
    let userEventsSubscription: { unsubscribe: () => void } | undefined;

    const handleUserEvent = (event: UserRealtimeEvent) => {
      if (event.eventType !== 'CALL_SIGNAL' || !event.callSignal) {
        return;
      }
      const signal = event.callSignal;
      if (signal.fromUserId === myIdentityUserIdRef.current) {
        return;
      }

      if (signal.type === 'OFFER') {
        if (!signal.sdp || !myIdentityUserIdRef.current || signal.toUserId !== myIdentityUserIdRef.current) {
          return;
        }

        if (phaseRef.current !== 'idle') {
          void sendSignal('REJECT', signal.conversationId, signal.callId, {
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

        setPhase('incoming');
        setStatusMessage(null);
        setActiveCall({
          conversationId: signal.conversationId,
          callId: signal.callId,
          peerUserId: signal.fromUserId,
          peerName: signal.fromUserId,
          peerAvatar: null,
          audioOnly: signal.audioOnly,
        });

        void userService
          .getProfileByIdentityUserId(signal.fromUserId)
          .then((response) => {
            if (!mounted) {
              return;
            }
            const profile = response.data;
            const name = `${profile.lastName ?? ''} ${profile.firstName ?? ''}`.trim() || signal.fromUserId;
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
        if (signal.type === 'ICE_CANDIDATE' && signal.candidate) {
          pendingIceCandidatesRef.current.push({
            candidate: signal.candidate,
            sdpMid: signal.sdpMid,
            sdpMLineIndex: signal.sdpMLineIndex,
          });
        }
        return;
      }

      if (signal.type === 'ACCEPT' && signal.sdp && phaseRef.current === 'outgoing') {
        const webRtc = ensureWebRtcModule();
        const pc = peerConnectionRef.current;
        if (!webRtc || !pc) {
          return;
        }
        const { RTCSessionDescription } = webRtc;
        void pc
          .setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: signal.sdp }))
          .then(() => flushPendingIceCandidates(pc))
          .then(() => {
            setPhase('connecting');
          })
          .catch(() => {
            Toast.show({ type: 'error', text1: 'Không thể thiết lập kết nối cuộc gọi' });
            resetCall();
          });
        return;
      }

      if (signal.type === 'ICE_CANDIDATE' && signal.candidate) {
        const webRtc = ensureWebRtcModule();
        const pc = peerConnectionRef.current;
        if (!webRtc || !pc) {
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
          pendingIceCandidatesRef.current.push(candidate);
          return;
        }

        void pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => undefined);
        return;
      }

      if (signal.type === 'REJECT') {
        if (phaseRef.current === 'outgoing') {
          closeWithMessage('Người dùng đã từ chối cuộc gọi');
          cleanupPeerConnection();
          return;
        }
        resetCall();
        return;
      }

      if (signal.type === 'END') {
        if (phaseRef.current === 'outgoing') {
          closeWithMessage('Người dùng không bắt máy');
          cleanupPeerConnection();
          return;
        }
        resetCall();
      }
    };

    const setup = async () => {
      const token = await authTokenStore.get();
      if (!token) {
        resetCall();
        return;
      }

      const profile = await userService.getMyProfile();
      if (mounted) {
        setMyIdentityUserId(profile.data.identityUserId ?? null);
      }

      await chatSocketService.connect();
      userEventsSubscription = chatSocketService.subscribeUserEvents(handleUserEvent);
    };

    void setup().catch(() => undefined);

    return () => {
      mounted = false;
      userEventsSubscription?.unsubscribe();
    };
  }, [closeWithMessage, cleanupPeerConnection, ensureWebRtcModule, flushPendingIceCandidates, resetCall, sendSignal]);

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
      startAudioCall,
      startVideoCall,
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
      startAudioCall,
      startVideoCall,
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
    throw new Error('useCall must be used within CallProvider');
  }
  return context;
}
