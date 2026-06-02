import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, Text, View } from 'react-native';

import { useCall } from '@/contexts/call-context';

const normalizeId = (value?: string | null) =>
  (value ?? '').trim().toLowerCase();

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
  const [pinnedMemberId, setPinnedMemberId] = useState<string | null>(null);

  const RTCView = useMemo(() => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mod = require('react-native-webrtc');
      return mod.RTCView as React.ComponentType<any>;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    if (!activeCall) {
      setPinnedMemberId(null);
      return;
    }
    if (!activeCall.isGroupCall) {
      setPinnedMemberId(null);
      return;
    }
    if (!pinnedMemberId && (activeCall.members?.length ?? 0) > 0) {
      setPinnedMemberId(activeCall.members?.[0]?.id ?? null);
    }
  }, [activeCall, pinnedMemberId]);

  const visibleGroupMembers = useMemo(() => {
    if (!activeCall?.isGroupCall || !activeCall.members) {
      return [];
    }
    const joinedIds = new Set(
      (activeCall.joinedUserIds ?? [])
        .map((id) => normalizeId(id))
        .filter((id) => id.length > 0)
    );
    const joinedMembers = activeCall.members.filter((member) =>
      joinedIds.has(normalizeId(member.id))
    );
    const sourceMembers = joinedMembers.length > 0 ? joinedMembers : activeCall.members;
    const deduped = sourceMembers.filter(
      (member, index, list) =>
        list.findIndex((item) => item.id === member.id) === index
    );
    if (deduped.length === 0) {
      return [];
    }
    const pinned = deduped.find((item) => item.id === pinnedMemberId) ?? deduped[0];
    const rest = deduped.filter((item) => item.id !== pinned.id);
    return [pinned, ...rest].slice(0, 4);
  }, [activeCall, pinnedMemberId]);

  const hiddenGroupCount = Math.max(0, (activeCall?.joinedUserIds?.length ?? 0) - visibleGroupMembers.length);

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
  const showRemoteAudio =
    activeCall.audioOnly &&
    Boolean(remoteStreamURL) &&
    RTCView &&
    (phase === 'in-call' || phase === 'connecting');
  const isOneToOneVideo =
    !activeCall.audioOnly && !activeCall.isGroupCall && Boolean(RTCView);

  return (
    <View className="absolute inset-0 z-50 bg-black">
      <View className="flex-1">
        {!activeCall.audioOnly && RTCView && activeCall.isGroupCall ? (
          <View className="flex-1 justify-center px-2 pb-28 pt-14">
          <View className="w-full max-w-3xl self-center rounded-2xl bg-slate-900 p-2">
            <View className="flex-row flex-wrap justify-between gap-y-2">
              {visibleGroupMembers.map((member, index) => {
                const showRemote = index === 0 && Boolean(remoteStreamURL);
                const showLocal =
                  (index === 1 && Boolean(localStreamURL)) ||
                  (!remoteStreamURL && index === 0 && Boolean(localStreamURL));
                return (
                  <Pressable
                    key={member.id}
                    className="relative h-44 w-[49%] overflow-hidden rounded-xl bg-slate-800"
                    onPress={() => setPinnedMemberId(member.id)}>
                    {showRemote && remoteStreamURL ? (
                      <RTCView
                        key={`${remoteStreamRenderKey}-${remoteStreamURL}-${member.id}`}
                        streamURL={remoteStreamURL}
                        objectFit="cover"
                        mirror={false}
                        zOrder={0}
                        surfaceView={false}
                        style={{ height: '100%', width: '100%', backgroundColor: '#000' }}
                      />
                    ) : showLocal && localStreamURL ? (
                      <RTCView
                        streamURL={localStreamURL}
                        objectFit="cover"
                        mirror
                        zOrder={1}
                        surfaceView={false}
                        style={{ height: '100%', width: '100%', backgroundColor: '#000' }}
                      />
                    ) : member.avatar ? (
                      <Image source={{ uri: member.avatar }} className="h-full w-full" resizeMode="cover" />
                    ) : (
                      <View className="h-full w-full items-center justify-center bg-slate-700">
                        <Text className="text-xl font-bold text-white">
                          {member.name.slice(0, 2).toUpperCase()}
                        </Text>
                      </View>
                    )}
                    <View className="absolute bottom-1 left-1 rounded bg-black/55 px-1.5 py-0.5">
                      <Text className="text-[10px] text-white" numberOfLines={1}>
                        {member.name}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
              {visibleGroupMembers.length === 0 ? (
                <>
                  <View className="relative h-44 w-[49%] overflow-hidden rounded-xl bg-slate-800">
                    {remoteStreamURL ? (
                      <RTCView
                        key={`${remoteStreamRenderKey}-${remoteStreamURL}-fallback`}
                        streamURL={remoteStreamURL}
                        objectFit="cover"
                        mirror={false}
                        zOrder={0}
                        surfaceView={false}
                        style={{ height: '100%', width: '100%', backgroundColor: '#000' }}
                      />
                    ) : (
                      <View className="h-full w-full items-center justify-center bg-slate-700">
                        <Text className="text-sm text-white">Đang chờ người tham gia...</Text>
                      </View>
                    )}
                  </View>
                  {localStreamURL ? (
                    <View className="relative h-44 w-[49%] overflow-hidden rounded-xl bg-slate-800">
                      <RTCView
                        streamURL={localStreamURL}
                        objectFit="cover"
                        mirror
                        zOrder={1}
                        surfaceView={false}
                        style={{ height: '100%', width: '100%', backgroundColor: '#000' }}
                      />
                      <View className="absolute bottom-1 left-1 rounded bg-black/55 px-1.5 py-0.5">
                        <Text className="text-[10px] text-white">Bạn</Text>
                      </View>
                    </View>
                  ) : null}
                </>
              ) : null}
              {hiddenGroupCount > 0 ? (
                <View className="h-44 w-[49%] items-center justify-center rounded-xl border border-dashed border-white/25 bg-slate-800">
                  <Text className="text-2xl font-semibold text-white">+{hiddenGroupCount}</Text>
                </View>
              ) : null}
            </View>
          </View>
          </View>
        ) : isOneToOneVideo ? (
          <View className="flex-1">
            {remoteStreamURL ? (
              <RTCView
                key={`${remoteStreamRenderKey}-${remoteStreamURL}`}
                streamURL={remoteStreamURL}
                objectFit="cover"
                mirror={false}
                zOrder={0}
                surfaceView={false}
                style={{ flex: 1, width: '100%', backgroundColor: '#000' }}
              />
            ) : (
              <View className="flex-1 items-center justify-center bg-slate-900">
                {activeCall.peerAvatar ? (
                  <Image source={{ uri: activeCall.peerAvatar }} className="h-28 w-28 rounded-full" />
                ) : (
                  <View className="h-28 w-28 items-center justify-center rounded-full bg-slate-600">
                    <Text className="text-2xl font-bold text-white">
                      {activeCall.peerName.slice(0, 2).toUpperCase()}
                    </Text>
                  </View>
                )}
                <Text className="mt-4 text-sm text-slate-300">Đang chờ video đối phương...</Text>
              </View>
            )}

            {localStreamURL ? (
              <View className="absolute bottom-28 right-4 h-44 w-32 overflow-hidden rounded-2xl border-2 border-white/50 bg-black shadow-lg">
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
          <View className="flex-1 items-center justify-center px-4 pb-28 pt-14">
            {activeCall.peerAvatar ? (
              <Image source={{ uri: activeCall.peerAvatar }} className="h-28 w-28 rounded-full" />
            ) : (
              <View className="h-28 w-28 items-center justify-center rounded-full bg-slate-600">
                <Text className="text-2xl font-bold text-white">
                  {activeCall.peerName.slice(0, 2).toUpperCase()}
                </Text>
              </View>
            )}
          </View>
        )}

        {showRemoteAudio ? (
          <RTCView
            key={`audio-${remoteStreamRenderKey}-${remoteStreamURL}`}
            streamURL={remoteStreamURL!}
            objectFit="cover"
            mirror={false}
            zOrder={0}
            surfaceView={false}
            style={{ position: 'absolute', width: 1, height: 1, opacity: 0, left: 0, top: 0 }}
          />
        ) : null}

        <View className="absolute left-0 right-0 top-14 items-center px-4">
          <Text className="text-xl font-semibold text-white">{activeCall.peerName}</Text>
          <Text className="mt-1 text-center text-sm text-slate-200">{statusMessage ?? title}</Text>
          {callDurationLabel && phase === 'in-call' ? (
            <Text className="mt-1 text-sm text-slate-300">{callDurationLabel}</Text>
          ) : null}
        </View>

        <View className="absolute bottom-8 left-0 right-0 flex-row items-center justify-center gap-4">
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
