import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useMemo } from 'react';
import { Image, Pressable, Text, View } from 'react-native';

import { ConversationAvatar } from '@/components/messages/conversation-avatar';
import type { FriendRequestStatus } from '@/services/friend.service';
import type { FriendActionItem, FriendContactItem } from '@/types/contacts';

type FriendContactViewItem = FriendContactItem & { avatarUrl?: string | null };

type InvitationCardItem = {
  idFriendRequest: string;
  displayName: string;
  avatarUrl?: string | null;
  fallback: string;
  content: string;
  timeRequest?: string;
};

interface ContactsFriendsTabProps {
  friendActions: FriendActionItem[];
  friendContacts: FriendContactViewItem[];
  showInvitations: boolean;
  receivedInvitations: InvitationCardItem[];
  sentInvitations: InvitationCardItem[];
  processingMap: Record<string, boolean>;
  onOpenInvitations: () => void;
  onBackToFriends: () => void;
  onUpdateInvitationStatus: (idFriendRequest: string, status: FriendRequestStatus) => void;
}

function FriendActionRow({ action, onPress }: { action: FriendActionItem; onPress?: () => void }) {
  const iconName = 'person-add';

  return (
    <Pressable className="flex-row items-center px-5 py-4" onPress={onPress}>
      <View className="h-[42px] w-[42px] items-center justify-center rounded-full bg-[#1e98f3]">
        <Ionicons name={iconName} size={23} color="#ffffff" />
      </View>
      <Text allowFontScaling={false} className="ml-4 text-[17px] text-slate-900">
        {action.title}
        {action.countText ? ` (${action.countText})` : ''}
      </Text>
      <Ionicons name="chevron-forward" size={20} color="#94a3b8" style={{ marginLeft: 'auto' }} />
    </Pressable>
  );
}

function FriendContactRow({ item }: { item: FriendContactViewItem }) {
  return (
    <View className="flex-row items-center px-5 py-4">
      {item.avatarUrl ? (
        <Image source={{ uri: item.avatarUrl }} className="h-[54px] w-[54px] rounded-full bg-slate-200" />
      ) : (
        <ConversationAvatar avatar={item.avatar} />
      )}
      <Text allowFontScaling={false} className="ml-4 flex-1 text-[17px] text-slate-900">
        {item.name}
      </Text>
      <Ionicons name="call-outline" size={24} color="#374151" />
      <View className="ml-[22px]">
        <Ionicons name="videocam-outline" size={24} color="#374151" />
      </View>
    </View>
  );
}

function InviteCard({
  item,
  mode,
  isProcessing,
  onAction,
}: {
  item: InvitationCardItem;
  mode: 'received' | 'sent';
  isProcessing: boolean;
  onAction: (status: FriendRequestStatus) => void;
}) {
  return (
    <View className="rounded-2xl border border-slate-200 bg-white p-3">
      <View className="flex-row items-start">
        {item.avatarUrl ? (
          <Image source={{ uri: item.avatarUrl }} className="h-[52px] w-[52px] rounded-full bg-slate-200" />
        ) : (
          <ConversationAvatar
            size={52}
            avatar={{ type: 'initials', value: item.fallback, backgroundColor: '#94a3b8' }}
          />
        )}
        <View className="ml-3 flex-1">
          <Text numberOfLines={1} className="text-[16px] font-semibold text-slate-900">
            {item.displayName}
          </Text>
          {item.timeRequest ? (
            <Text className="text-[12px] text-slate-500">{new Date(item.timeRequest).toLocaleString('vi-VN')}</Text>
          ) : null}
          <Text numberOfLines={2} className="mt-1 text-[13px] text-slate-600">
            {item.content}
          </Text>
        </View>
      </View>

      {mode === 'received' ? (
        <View className="mt-3 flex-row gap-2">
          <Pressable
            disabled={isProcessing}
            onPress={() => onAction('REJECTED')}
            className="flex-1 items-center rounded-xl bg-slate-100 py-2.5">
            <Text className="text-[13px] font-semibold text-slate-700">Từ chối</Text>
          </Pressable>
          <Pressable
            disabled={isProcessing}
            onPress={() => onAction('ACCEPTED')}
            className="flex-1 items-center rounded-xl bg-[#1e98f3] py-2.5">
            <Text className="text-[13px] font-semibold text-white">Đồng ý</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable
          disabled={isProcessing}
          onPress={() => onAction('CANCELED')}
          className="mt-3 items-center rounded-xl bg-slate-100 py-2.5">
          <Text className="text-[13px] font-semibold text-slate-700">Thu hồi lời mời</Text>
        </Pressable>
      )}
    </View>
  );
}

export function ContactsFriendsTab({
  friendActions,
  friendContacts,
  showInvitations,
  receivedInvitations,
  sentInvitations,
  processingMap,
  onOpenInvitations,
  onBackToFriends,
  onUpdateInvitationStatus,
}: ContactsFriendsTabProps) {
  const sections = useMemo(() => {
    const bySection = new Map<string, FriendContactItem[]>();
    friendContacts.forEach((item) => {
      const section = item.section ?? '';
      const existing = bySection.get(section) ?? [];
      existing.push(item);
      bySection.set(section, existing);
    });
    return Array.from(bySection.entries());
  }, [friendContacts]);

  if (showInvitations) {
    return (
      <View className="pb-4">
        <View className="flex-row items-center border-b border-slate-200 bg-white px-4 py-3">
          <Pressable onPress={onBackToFriends} className="mr-2 rounded-full p-1">
            <Ionicons name="arrow-back" size={20} color="#1f2937" />
          </Pressable>
          <Text className="text-[17px] font-semibold text-slate-900">Lời mời kết bạn</Text>
        </View>

        <View className="px-4 py-3">
          <Text className="mb-2 text-[14px] font-semibold text-slate-700">
            Lời mời đã nhận ({receivedInvitations.length})
          </Text>
          {receivedInvitations.length === 0 ? (
            <Text className="rounded-xl bg-white px-4 py-5 text-center text-[13px] text-slate-500">
              Bạn chưa nhận lời mời kết bạn nào.
            </Text>
          ) : (
            <View className="gap-2">
              {receivedInvitations.map((item) => (
                <InviteCard
                  key={item.idFriendRequest}
                  item={item}
                  mode="received"
                  isProcessing={Boolean(processingMap[item.idFriendRequest])}
                  onAction={(status) => onUpdateInvitationStatus(item.idFriendRequest, status)}
                />
              ))}
            </View>
          )}
        </View>

        <View className="px-4 pb-3">
          <Text className="mb-2 text-[14px] font-semibold text-slate-700">
            Lời mời đã gửi ({sentInvitations.length})
          </Text>
          {sentInvitations.length === 0 ? (
            <Text className="rounded-xl bg-white px-4 py-5 text-center text-[13px] text-slate-500">
              Bạn chưa gửi lời mời kết bạn nào.
            </Text>
          ) : (
            <View className="gap-2">
              {sentInvitations.map((item) => (
                <InviteCard
                  key={item.idFriendRequest}
                  item={item}
                  mode="sent"
                  isProcessing={Boolean(processingMap[item.idFriendRequest])}
                  onAction={(status) => onUpdateInvitationStatus(item.idFriendRequest, status)}
                />
              ))}
            </View>
          )}
        </View>
      </View>
    );
  }

  return (
    <View className="pb-4">
      <View className="bg-white">
        {friendActions.map((action) => (
          <FriendActionRow
            key={action.id}
            action={action}
            onPress={action.type === 'invite' ? onOpenInvitations : undefined}
          />
        ))}
      </View>

      <View className="my-2 h-2 bg-slate-100" />

      <View className="flex-row items-center px-5 py-3">
        <View className="rounded-full bg-slate-200 px-4 py-2">
          <Text allowFontScaling={false} className="text-[14px] font-semibold text-slate-900">
            Tất cả {friendContacts.length}
          </Text>
        </View>
      </View>

      {sections.map(([section, items]) => (
        <View key={section}>
          <View className="flex-row items-center border-b border-slate-100 px-5 py-2.5">
            <Text allowFontScaling={false} className="text-[15px] font-semibold text-slate-900">
              {section}
            </Text>
          </View>
          {items.map((item) => (
            <FriendContactRow key={item.id} item={item} />
          ))}
        </View>
      ))}
    </View>
  );
}
