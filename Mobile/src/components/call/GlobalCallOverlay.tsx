import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useMemo } from 'react';
import { Image, Pressable, Text, View } from 'react-native';

import { useCall } from '@/contexts/call-context';

const formatDuration = (seconds: number) => {
  const mm = Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0');
  const ss = Math.floor(seconds % 60)
    .toString()
    .padStart(2, '0');
  return `${mm}:${ss}`;
};

export function GlobalCallOverlay() {
  const {
    phase,
    statusMessage,
    activeCall,
    micEnabled,
    cameraEnabled,
    canToggleCamera,
    localStreamURL,
    remoteStreamURL,
    remoteStreamRenderKey,
    acceptIncomingCall,
    acceptIncomingCallWithoutCamera,
    rejectIncomingCall,
    endCurrentCall,
    toggleMicrophone,
    toggleCamera,
  } = useCall();

  const RTCView = useMemo(() => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mod = require('react-native-webrtc');
      return mod.RTCView as React.ComponentType<any>;
    } catch {
      return null;
    }
  }, []);

  if (phase === 'idle' || !activeCall) {
    return null;
  }

  const title =
    phase === 'incoming'
      ? activeCall.audioOnly
        ? 'Cuộc gọi thoại đến'
        : 'Cuộc gọi video đến'
      : phase === 'outgoing'
        ? activeCall.audioOnly
          ? 'Đang gọi thoại...'
          : 'Đang gọi video...'
        : phase === 'connecting'
          ? 'Đang kết nối...'
          : activeCall.audioOnly
            ? 'Đang gọi thoại'
            : 'Đang gọi video';

  const startedAt = activeCall.startedAt ?? 0;
  const callDurationLabel =
    startedAt > 0 ? formatDuration((Date.now() - startedAt) / 1000) : null;

  return (
    <View className="absolute inset-0 z-50 bg-black/70">
      <View className="flex-1 items-center justify-center px-4 pb-8 pt-14">
        {!activeCall.audioOnly && RTCView ? (
          <View className="relative h-full w-full max-w-3xl">
            {remoteStreamURL ? (
              <RTCView
                key={`${remoteStreamRenderKey}-${remoteStreamURL}`}
                streamURL={remoteStreamURL}
                objectFit="cover"
                mirror={false}
                zOrder={0}
                surfaceView={false}
                style={{ height: '100%', width: '100%', borderRadius: 16, backgroundColor: '#000' }}
              />
            ) : (
              <View className="h-full w-full items-center justify-center rounded-2xl bg-slate-900">
                <Text className="text-sm text-slate-200">Đang chờ video đối phương...</Text>
              </View>
            )}

            {localStreamURL ? (
              <View className="absolute bottom-24 right-4 h-40 w-28 overflow-hidden rounded-xl border border-white/40 bg-black">
                <RTCView
                  streamURL={localStreamURL}
                  objectFit="cover"
                  mirror
                  zOrder={1}
                  surfaceView={false}
                  style={{ height: '100%', width: '100%' }}
                />
              </View>
            ) : null}
          </View>
        ) : (
          <View className="items-center">
            {activeCall.peerAvatar ? (
              <Image source={{ uri: activeCall.peerAvatar }} className="h-24 w-24 rounded-full" />
            ) : (
              <View className="h-24 w-24 items-center justify-center rounded-full bg-slate-400">
                <Text className="text-xl font-bold text-white">{activeCall.peerName.slice(0, 2).toUpperCase()}</Text>
              </View>
            )}
          </View>
        )}

        <View className="absolute top-14 items-center">
          <Text className="text-xl font-semibold text-white">{activeCall.peerName}</Text>
          <Text className="mt-1 text-sm text-slate-200">{statusMessage ?? title}</Text>
          {callDurationLabel && phase === 'in-call' ? (
            <Text className="mt-1 text-sm text-slate-200">{callDurationLabel}</Text>
          ) : null}
        </View>

        <View className="absolute bottom-8 flex-row items-center gap-4">
          {phase === 'incoming' ? (
            <>
              <Pressable className="h-14 w-14 items-center justify-center rounded-full bg-red-500" onPress={() => void rejectIncomingCall()}>
                <Ionicons name="call" size={24} color="#fff" style={{ transform: [{ rotate: '135deg' }] }} />
              </Pressable>
              <Pressable className="h-14 w-14 items-center justify-center rounded-full bg-emerald-500" onPress={() => void acceptIncomingCall()}>
                <Ionicons name="call" size={24} color="#fff" />
              </Pressable>
              {!activeCall.audioOnly ? (
                <Pressable className="h-14 w-14 items-center justify-center rounded-full bg-slate-700" onPress={() => void acceptIncomingCallWithoutCamera()}>
                  <Ionicons name="videocam-off-outline" size={24} color="#fff" />
                </Pressable>
              ) : null}
            </>
          ) : (
            <>
              <Pressable className="h-12 w-12 items-center justify-center rounded-full bg-slate-700" onPress={toggleMicrophone}>
                <Ionicons name={micEnabled ? 'mic' : 'mic-off'} size={21} color="#fff" />
              </Pressable>
              {canToggleCamera ? (
                <Pressable className="h-12 w-12 items-center justify-center rounded-full bg-slate-700" onPress={toggleCamera}>
                  <Ionicons name={cameraEnabled ? 'videocam' : 'videocam-off'} size={21} color="#fff" />
                </Pressable>
              ) : null}
              <Pressable className="h-14 w-14 items-center justify-center rounded-full bg-red-500" onPress={() => void endCurrentCall()}>
                <Ionicons name="call" size={24} color="#fff" style={{ transform: [{ rotate: '135deg' }] }} />
              </Pressable>
            </>
          )}
        </View>
      </View>
    </View>
  );
}
