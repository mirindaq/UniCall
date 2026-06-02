import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useMemo, type ComponentType } from 'react';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';

export type GroupCallMember = {
  id: string;
  name: string;
  avatar?: string | null;
};

type GroupCallStageProps = {
  RTCView: ComponentType<any> | null;
  members: GroupCallMember[];
  pinnedMemberId: string | null;
  hiddenCount: number;
  remoteStreamRenderKey: number;
  myNormalizedId: string;
  streamURLForMember: (memberId: string) => string | null;
  remoteStreamURL: string | null;
  localStreamURL: string | null;
  onPinMember: (memberId: string) => void;
};

const normalizeId = (value: string) => value.trim().toLowerCase();

const initials = (name: string) => {
  const text = name.trim();
  if (!text) {
    return '?';
  }
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }
  return `${words[0][0] ?? ''}${words[words.length - 1][0] ?? ''}`.toUpperCase();
};

type MemberTileProps = {
  member: GroupCallMember;
  streamURL: string | null;
  isSelf: boolean;
  isPinned: boolean;
  compact?: boolean;
  RTCView: ComponentType<any>;
  renderKey: number;
  onPress: () => void;
};

function MemberTile({
  member,
  streamURL,
  isSelf,
  isPinned,
  compact = false,
  RTCView,
  renderKey,
  onPress,
}: MemberTileProps) {
  const label = isSelf ? 'Bạn' : member.name;

  return (
    <Pressable
      onPress={onPress}
      className={`overflow-hidden bg-slate-800 ${
        compact
          ? `mr-2.5 h-[108px] w-[76px] rounded-2xl border ${
              isPinned ? 'border-sky-400' : 'border-white/15'
            }`
          : `flex-1 rounded-3xl border-2 ${
              isPinned ? 'border-sky-400/90' : 'border-white/10'
            }`
      }`}>
      {streamURL ? (
        <RTCView
          key={`${renderKey}-${streamURL}-${member.id}-${compact ? 'c' : 'f'}`}
          streamURL={streamURL}
          objectFit="cover"
          mirror={isSelf}
          zOrder={isSelf ? 1 : 0}
          surfaceView={false}
          style={{ height: '100%', width: '100%', backgroundColor: '#0f172a' }}
        />
      ) : member.avatar ? (
        <Image
          source={{ uri: member.avatar }}
          className="h-full w-full"
          resizeMode="cover"
        />
      ) : (
        <View className="h-full w-full items-center justify-center bg-slate-800">
          <View
            className={`items-center justify-center rounded-full bg-slate-600/90 ${
              compact ? 'h-10 w-10' : 'h-20 w-20'
            }`}>
            <Text
              className={`font-bold text-white ${compact ? 'text-sm' : 'text-2xl'}`}>
              {initials(member.name)}
            </Text>
          </View>
          {!compact ? (
            <Text className="mt-3 px-4 text-center text-sm text-slate-300">
              Đang chờ video...
            </Text>
          ) : null}
        </View>
      )}

      <View className="absolute inset-x-0 bottom-0 bg-black/50 px-2 py-1.5">
        <Text
          className={`font-medium text-white ${compact ? 'text-[10px]' : 'text-sm'}`}
          numberOfLines={1}>
          {label}
        </Text>
      </View>

      {isSelf ? (
        <View className="absolute right-2 top-2 rounded-full bg-sky-500/90 px-2 py-0.5">
          <Text className="text-[9px] font-semibold uppercase text-white">Bạn</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

export function GroupCallStage({
  RTCView,
  members,
  pinnedMemberId,
  hiddenCount,
  remoteStreamRenderKey,
  myNormalizedId,
  streamURLForMember,
  remoteStreamURL,
  localStreamURL,
  onPinMember,
}: GroupCallStageProps) {
  const pinnedMember = useMemo(() => {
    if (members.length === 0) {
      return null;
    }
    return (
      members.find((item) => item.id === pinnedMemberId) ??
      members.find((item) => normalizeId(item.id) === myNormalizedId) ??
      members[0]
    );
  }, [members, myNormalizedId, pinnedMemberId]);

  const stripMembers = useMemo(() => {
    if (!pinnedMember) {
      return members;
    }
    return members.filter(
      (item) => normalizeId(item.id) !== normalizeId(pinnedMember.id),
    );
  }, [members, pinnedMember]);

  if (!RTCView) {
    return (
      <View className="flex-1 items-center justify-center px-6">
        <Text className="text-center text-sm text-slate-300">
          Thiếu module video. Hãy build lại app với react-native-webrtc.
        </Text>
      </View>
    );
  }

  if (!pinnedMember && members.length === 0) {
    return (
      <View className="flex-1 px-3 pb-2 pt-2">
        <View className="flex-1 overflow-hidden rounded-3xl border border-white/10 bg-slate-800/80">
          {remoteStreamURL ? (
            <RTCView
              key={`${remoteStreamRenderKey}-${remoteStreamURL}-waiting`}
              streamURL={remoteStreamURL}
              objectFit="cover"
              mirror={false}
              zOrder={0}
              surfaceView={false}
              style={{ flex: 1, backgroundColor: '#0f172a' }}
            />
          ) : (
            <View className="flex-1 items-center justify-center px-6">
              <View className="mb-4 h-16 w-16 items-center justify-center rounded-full bg-slate-700/80">
                <Ionicons name="people-outline" size={32} color="#94a3b8" />
              </View>
              <Text className="text-center text-base font-medium text-white">
                Đang chờ mọi người tham gia
              </Text>
              <Text className="mt-1 text-center text-sm text-slate-400">
                Video sẽ hiện khi có người bật camera
              </Text>
            </View>
          )}
        </View>

        {localStreamURL ? (
          <View className="absolute bottom-6 right-5 h-28 w-[88px] overflow-hidden rounded-2xl border-2 border-white/30 bg-black shadow-lg">
            <RTCView
              streamURL={localStreamURL}
              objectFit="cover"
              mirror
              zOrder={1}
              surfaceView={false}
              style={{ height: '100%', width: '100%' }}
            />
            <View className="absolute inset-x-0 bottom-0 bg-black/55 py-1">
              <Text className="text-center text-[10px] font-medium text-white">Bạn</Text>
            </View>
          </View>
        ) : null}
      </View>
    );
  }

  if (!pinnedMember) {
    return null;
  }

  const pinnedStream = streamURLForMember(pinnedMember.id);
  const pinnedIsSelf =
    Boolean(myNormalizedId) &&
    normalizeId(pinnedMember.id) === myNormalizedId;

  return (
    <View className="flex-1 px-3 pb-2 pt-2">
      <View className="min-h-[220px] flex-1">
        <MemberTile
          member={pinnedMember}
          streamURL={pinnedStream}
          isSelf={pinnedIsSelf}
          isPinned
          RTCView={RTCView}
          renderKey={remoteStreamRenderKey}
          onPress={() => onPinMember(pinnedMember.id)}
        />
      </View>

      {stripMembers.length > 0 || hiddenCount > 0 ? (
        <View className="mt-3">
          <Text className="mb-2 px-0.5 text-[11px] font-medium uppercase tracking-wide text-slate-400">
            Người tham gia · chạm để phóng to
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingRight: 8 }}>
            {stripMembers.map((member) => {
              const isSelf =
                Boolean(myNormalizedId) &&
                normalizeId(member.id) === myNormalizedId;
              return (
                <MemberTile
                  key={member.id}
                  member={member}
                  streamURL={streamURLForMember(member.id)}
                  isSelf={isSelf}
                  isPinned={false}
                  compact
                  RTCView={RTCView}
                  renderKey={remoteStreamRenderKey}
                  onPress={() => onPinMember(member.id)}
                />
              );
            })}
            {hiddenCount > 0 ? (
              <View className="mr-2.5 h-[108px] w-[76px] items-center justify-center rounded-2xl border border-dashed border-white/25 bg-slate-800/90">
                <Text className="text-lg font-bold text-white">+{hiddenCount}</Text>
                <Text className="mt-0.5 text-[10px] text-slate-400">khác</Text>
              </View>
            ) : null}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
}
