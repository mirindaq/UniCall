import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GroupCallStage, type GroupCallMember } from '@/components/call/GroupCallStage';
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

type CallControlProps = {
  label: string;
  onPress: () => void;
  icon: keyof typeof Ionicons.glyphMap;
  variant?: 'default' | 'accept' | 'reject' | 'end';
  iconStyle?: object;
};

function CallControlButton({
  label,
  onPress,
  icon,
  variant = 'default',
  iconStyle,
}: CallControlProps) {
  const buttonClass =
    variant === 'accept'
      ? 'bg-emerald-500'
      : variant === 'reject' || variant === 'end'
        ? 'bg-red-500'
        : 'bg-white/12 border border-white/20';

  return (
    <View className="items-center">
      <Pressable
        onPress={onPress}
        className={`h-[58px] w-[58px] items-center justify-center rounded-full ${buttonClass}`}>
        <Ionicons name={icon} size={variant === 'default' ? 22 : 24} color="#fff" style={iconStyle} />
      </Pressable>
      <Text className="mt-2 text-[11px] font-medium text-white/80">{label}</Text>
    </View>
  );
}

export function GlobalCallOverlay() {
  const insets = useSafeAreaInsets();
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
    groupParticipantStreamURLs,
    myIdentityUserId,
    acceptIncomingCall,
    acceptIncomingCallWithoutCamera,
    rejectIncomingCall,
    endCurrentCall,
    toggleMicrophone,
    toggleCamera,
  } = useCall();
  const [pinnedMemberId, setPinnedMemberId] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

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

  const startedAt = activeCall?.startedAt ?? 0;
  useEffect(() => {
    if (phase !== 'in-call' || !startedAt) {
      setElapsedSeconds(0);
      return;
    }
    const tick = () => {
      setElapsedSeconds(Math.max(0, Math.floor((Date.now() - startedAt) / 1000)));
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [phase, startedAt]);

  const myNormalizedId = normalizeId(myIdentityUserId);

  const streamURLForMember = useCallback(
    (memberId: string) => {
      const normalizedMemberId = normalizeId(memberId);
      if (myNormalizedId && normalizedMemberId === myNormalizedId) {
        return localStreamURL;
      }
      return (
        groupParticipantStreamURLs[memberId] ??
        groupParticipantStreamURLs[normalizedMemberId] ??
        null
      );
    },
    [groupParticipantStreamURLs, localStreamURL, myNormalizedId],
  );

  const groupMembers = useMemo((): GroupCallMember[] => {
    if (!activeCall?.isGroupCall) {
      return [];
    }

    const joinedIds = new Set(
      (activeCall.joinedUserIds ?? [])
        .map((id) => normalizeId(id))
        .filter((id) => id.length > 0),
    );

    let sourceMembers = activeCall.members ?? [];
    if (sourceMembers.length > 0 && joinedIds.size > 0) {
      const joinedMembers = sourceMembers.filter((member) =>
        joinedIds.has(normalizeId(member.id)),
      );
      if (joinedMembers.length > 0) {
        sourceMembers = joinedMembers;
      }
    } else if (sourceMembers.length === 0 && joinedIds.size > 0) {
      sourceMembers = (activeCall.joinedUserIds ?? []).map((id) => ({
        id,
        name: id,
        avatar: null,
      }));
    }

    return sourceMembers.filter(
      (member, index, list) =>
        list.findIndex((item) => normalizeId(item.id) === normalizeId(member.id)) ===
        index,
    );
  }, [activeCall]);

  const hiddenGroupCount = Math.max(
    0,
    (activeCall?.joinedUserIds?.length ?? 0) - groupMembers.length,
  );

  if (phase === 'idle' || !activeCall) {
    return null;
  }

  const isGroupVideo =
    !activeCall.audioOnly && activeCall.isGroupCall && Boolean(RTCView);

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

  const callDurationLabel =
    phase === 'in-call' && startedAt > 0 ? formatDuration(elapsedSeconds) : null;

  const participantCount = activeCall.joinedUserIds?.length ?? 0;
  const showRemoteAudio =
    activeCall.audioOnly &&
    Boolean(remoteStreamURL) &&
    RTCView &&
    (phase === 'in-call' || phase === 'connecting');
  const isOneToOneVideo =
    !activeCall.audioOnly && !activeCall.isGroupCall && Boolean(RTCView);

  const headerTop = Math.max(insets.top, 12) + 8;
  const controlsBottom = Math.max(insets.bottom, 12) + 12;

  return (
    <View className="absolute inset-0 z-50 bg-[#0b1220]">
      <View
        pointerEvents="none"
        className="absolute -left-24 top-20 h-56 w-56 rounded-full bg-sky-500/10"
      />
      <View
        pointerEvents="none"
        className="absolute -right-16 bottom-40 h-48 w-48 rounded-full bg-indigo-500/10"
      />

      <View className="flex-1">
        {isGroupVideo ? (
          <View className="flex-1" style={{ paddingTop: headerTop + 76, paddingBottom: controlsBottom + 88 }}>
            <GroupCallStage
              RTCView={RTCView}
              members={groupMembers}
              pinnedMemberId={pinnedMemberId}
              hiddenCount={hiddenGroupCount}
              remoteStreamRenderKey={remoteStreamRenderKey}
              myNormalizedId={myNormalizedId}
              streamURLForMember={streamURLForMember}
              remoteStreamURL={remoteStreamURL}
              localStreamURL={localStreamURL}
              onPinMember={setPinnedMemberId}
            />
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
                  <Image
                    source={{ uri: activeCall.peerAvatar }}
                    className="h-28 w-28 rounded-full"
                  />
                ) : (
                  <View className="h-28 w-28 items-center justify-center rounded-full bg-slate-600">
                    <Text className="text-2xl font-bold text-white">
                      {activeCall.peerName.slice(0, 2).toUpperCase()}
                    </Text>
                  </View>
                )}
                <Text className="mt-4 text-sm text-slate-300">
                  Đang chờ video đối phương...
                </Text>
              </View>
            )}

            {localStreamURL ? (
              <View className="absolute bottom-32 right-4 h-44 w-32 overflow-hidden rounded-2xl border-2 border-white/40 bg-black shadow-lg">
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
          <View
            className="flex-1 items-center justify-center px-4"
            style={{ paddingBottom: controlsBottom + 72, paddingTop: headerTop + 56 }}>
            {activeCall.isGroupCall ? (
              <View className="mb-5 h-24 w-24 items-center justify-center rounded-3xl bg-sky-500/20">
                {activeCall.peerAvatar ? (
                  <Image
                    source={{ uri: activeCall.peerAvatar }}
                    className="h-20 w-20 rounded-2xl"
                    resizeMode="cover"
                  />
                ) : (
                  <Ionicons name="people" size={40} color="#38bdf8" />
                )}
              </View>
            ) : activeCall.peerAvatar ? (
              <Image
                source={{ uri: activeCall.peerAvatar }}
                className="mb-5 h-28 w-28 rounded-full border-4 border-white/15"
              />
            ) : (
              <View className="mb-5 h-28 w-28 items-center justify-center rounded-full border-4 border-white/15 bg-slate-600">
                <Text className="text-2xl font-bold text-white">
                  {activeCall.peerName.slice(0, 2).toUpperCase()}
                </Text>
              </View>
            )}
            {activeCall.isGroupCall && participantCount > 0 ? (
              <Text className="text-sm text-slate-400">
                {participantCount} người trong cuộc gọi
              </Text>
            ) : null}
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

        <View
          className="absolute left-0 right-0 items-center px-5"
          style={{ top: headerTop }}>
          {activeCall.isGroupCall ? (
            <View className="mb-2 flex-row items-center rounded-full bg-sky-500/20 px-3 py-1">
              <Ionicons name="people" size={14} color="#7dd3fc" />
              <Text className="ml-1.5 text-xs font-semibold text-sky-200">
                Cuộc gọi nhóm
              </Text>
            </View>
          ) : null}
          <Text className="text-center text-xl font-semibold text-white" numberOfLines={2}>
            {activeCall.peerName}
          </Text>
          <Text className="mt-1 text-center text-sm text-slate-300">
            {statusMessage ?? title}
          </Text>
          {callDurationLabel ? (
            <View className="mt-2 flex-row items-center rounded-full bg-white/10 px-3 py-1">
              <View className="mr-2 h-2 w-2 rounded-full bg-emerald-400" />
              <Text className="text-sm font-medium tabular-nums text-white">
                {callDurationLabel}
              </Text>
            </View>
          ) : null}
          {activeCall.isGroupCall && participantCount > 0 && !callDurationLabel ? (
            <Text className="mt-1.5 text-xs text-slate-400">
              {participantCount} người đang tham gia
            </Text>
          ) : null}
        </View>

        <View
          className="absolute left-0 right-0 flex-row items-end justify-center gap-6 px-4"
          style={{ bottom: controlsBottom }}>
          {phase === 'incoming' ? (
            <>
              <CallControlButton
                label="Từ chối"
                variant="reject"
                icon="call"
                iconStyle={{ transform: [{ rotate: '135deg' }] }}
                onPress={() => void rejectIncomingCall()}
              />
              <CallControlButton
                label="Trả lời"
                variant="accept"
                icon="call"
                onPress={() => void acceptIncomingCall()}
              />
              {!activeCall.audioOnly ? (
                <CallControlButton
                  label="Không video"
                  icon="videocam-off-outline"
                  onPress={() => void acceptIncomingCallWithoutCamera()}
                />
              ) : null}
            </>
          ) : (
            <>
              <CallControlButton
                label={micEnabled ? 'Tắt mic' : 'Bật mic'}
                icon={micEnabled ? 'mic' : 'mic-off'}
                onPress={toggleMicrophone}
              />
              {canToggleCamera ? (
                <CallControlButton
                  label={cameraEnabled ? 'Tắt cam' : 'Bật cam'}
                  icon={cameraEnabled ? 'videocam' : 'videocam-off'}
                  onPress={toggleCamera}
                />
              ) : null}
              <CallControlButton
                label="Kết thúc"
                variant="end"
                icon="call"
                iconStyle={{ transform: [{ rotate: '135deg' }] }}
                onPress={() => void endCurrentCall()}
              />
            </>
          )}
        </View>
      </View>
    </View>
  );
}
