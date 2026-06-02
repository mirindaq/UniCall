import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useMemo } from 'react';
import { Image, Pressable, Text, View } from 'react-native';

import { ConversationAvatar } from '@/components/messages/conversation-avatar';
import { buildMockAvatar } from '@/utils/chat-avatar';
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
  return (
    <Pressable
      className="mx-3 mb-2 flex-row items-center rounded-2xl border border-slate-100 bg-white px-4 py-3.5 shadow-sm shadow-slate-200/50"
      style={({ pressed }) => ({ opacity: pressed ? 0.94 : 1 })}
      onPress={onPress}>
      <View className="h-11 w-11 items-center justify-center rounded-full bg-sky-100">
        <Ionicons name="person-add" size={22} color="#1e98f3" />
      </View>
      <Text allowFontScaling={false} className="ml-3.5 flex-1 text-[16px] font-medium text-slate-900">
        {action.title}
        {action.countText ? ` (${action.countText})` : ''}
      </Text>
      <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
    </Pressable>
  );
}

function FriendContactRow({ item }: { item: FriendContactViewItem }) {
  return (
    <Pressable
      className="mx-3 mb-2 flex-row items-center rounded-2xl border border-slate-100 bg-white px-4 py-3"
      style={({ pressed }) => ({ opacity: pressed ? 0.94 : 1 })}>
      {item.avatarUrl ? (
        <Image
          source={{ uri: item.avatarUrl }}
          className="h-[50px] w-[50px] rounded-full border-2 border-white bg-slate-100"
        />
      ) : (
        <ConversationAvatar avatar={item.avatar} size={50} />
      )}
      <Text allowFontScaling={false} className="ml-3.5 min-w-0 flex-1 text-[16px] font-medium text-slate-900">
        {item.name}
      </Text>
      <View className="flex-row items-center gap-3">
        <View className="h-9 w-9 items-center justify-center rounded-full bg-slate-50">
          <Ionicons name="call-outline" size={20} color="#64748b" />
        </View>
        <View className="h-9 w-9 items-center justify-center rounded-full bg-slate-50">
          <Ionicons name="videocam-outline" size={20} color="#64748b" />
        </View>
      </View>
    </Pressable>
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
    <View className="rounded-2xl border border-slate-100 bg-white p-3.5 shadow-sm shadow-slate-200/40">
      <View className="flex-row items-start">
        {item.avatarUrl ? (
          <Image
            source={{ uri: item.avatarUrl }}
            className="h-[50px] w-[50px] rounded-full border-2 border-white bg-slate-100"
          />
        ) : (
          <ConversationAvatar
            size={50}
            avatar={buildMockAvatar(item.displayName, item.idFriendRequest)}
          />
        )}
        <View className="ml-3 min-w-0 flex-1">
          <Text numberOfLines={1} className="text-[16px] font-semibold text-slate-900">
            {item.displayName}
          </Text>
          {item.timeRequest ? (
            <Text className="text-[12px] text-slate-400">
              {new Date(item.timeRequest).toLocaleString('vi-VN')}
            </Text>
          ) : null}
          <Text numberOfLines={2} className="mt-1 text-[13px] leading-5 text-slate-600">
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
            <Text className="text-[13px] font-semibold text-slate-600">Từ chối</Text>
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
          <Text className="text-[13px] font-semibold text-slate-600">Thu hồi lời mời</Text>
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
      <View className="pb-4 pt-2">
        <View className="mx-3 mb-3 flex-row items-center rounded-2xl border border-slate-100 bg-white px-3 py-3">
          <Pressable onPress={onBackToFriends} className="mr-2 rounded-full bg-slate-50 p-2">
            <Ionicons name="arrow-back" size={20} color="#334155" />
          </Pressable>
          <Text className="text-[17px] font-semibold text-slate-900">Lời mời kết bạn</Text>
        </View>

        <View className="px-3 py-1">
          <Text className="mb-2 px-1 text-[13px] font-semibold uppercase tracking-wide text-slate-400">
            Đã nhận ({receivedInvitations.length})
          </Text>
          {receivedInvitations.length === 0 ? (
            <Text className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-8 text-center text-[13px] text-slate-500">
              Bạn chưa nhận lời mời kết bạn nào.
            </Text>
          ) : (
            <View className="gap-2.5">
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

        <View className="px-3 py-3">
          <Text className="mb-2 px-1 text-[13px] font-semibold uppercase tracking-wide text-slate-400">
            Đã gửi ({sentInvitations.length})
          </Text>
          {sentInvitations.length === 0 ? (
            <Text className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-8 text-center text-[13px] text-slate-500">
              Bạn chưa gửi lời mời kết bạn nào.
            </Text>
          ) : (
            <View className="gap-2.5">
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
    <View className="pb-4 pt-2">
      {friendActions.map((action) => (
        <FriendActionRow
          key={action.id}
          action={action}
          onPress={action.type === 'invite' ? onOpenInvitations : undefined}
        />
      ))}

      <View className="mx-3 my-3 flex-row items-center px-1">
        <View className="rounded-full bg-white px-3.5 py-1.5 shadow-sm">
          <Text allowFontScaling={false} className="text-[13px] font-semibold text-slate-700">
            Tất cả · {friendContacts.length}
          </Text>
        </View>
      </View>

      {sections.map(([section, items]) => (
        <View key={section} className="mb-2">
          {section ? (
            <Text
              allowFontScaling={false}
              className="mb-2 px-4 text-[12px] font-semibold uppercase tracking-wide text-slate-400">
              {section}
            </Text>
          ) : null}
          {items.map((item) => (
            <FriendContactRow key={item.id} item={item} />
          ))}
        </View>
      ))}
    </View>
  );
}
