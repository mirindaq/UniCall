import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { Pressable, Text, View } from 'react-native';

import type { MockConversation } from '@/mock/chat-conversations';

import { ConversationAvatar } from './conversation-avatar';

interface ConversationListItemProps {
  conversation: MockConversation & { avatarUrl?: string | null };
  onPress?: () => void;
}

export function ConversationListItem({ conversation, onPress }: ConversationListItemProps) {
  return (
    <Pressable
      className="mx-3 mb-2.5 flex-row items-center rounded-2xl border border-slate-100/90 bg-white px-4 py-3.5 shadow-sm shadow-slate-200/60"
      style={({ pressed }) => ({ opacity: pressed ? 0.94 : 1 })}
      onPress={onPress}>
      <ConversationAvatar
        avatar={conversation.avatar}
        avatarUrl={conversation.avatarUrl}
        isVerified={conversation.isVerified}
      />

      <View className="ml-3.5 min-w-0 flex-1">
        <View className="flex-row items-center justify-between gap-2">
          <Text
            numberOfLines={1}
            className={`min-w-0 flex-1 text-[16px] ${
              conversation.isPreviewBold ? 'font-semibold text-slate-900' : 'font-medium text-slate-900'
            }`}>
            {conversation.name}
          </Text>
          <View className="shrink-0 flex-row items-center">
            {conversation.isPinned ? (
              <Ionicons name="pin" size={12} color="#94a3b8" style={{ marginRight: 4 }} />
            ) : null}
            <Text className="text-[12px] text-slate-400">{conversation.timeLabel}</Text>
          </View>
        </View>

        <View className="mt-1 flex-row items-center">
          <Text
            numberOfLines={1}
            className={`min-w-0 flex-1 text-[14px] leading-5 ${
              conversation.isPreviewBold ? 'font-medium text-slate-800' : 'text-slate-500'
            }`}>
            {conversation.preview}
          </Text>
          {conversation.hasUnreadDot ? (
            <View className="ml-2 h-2.5 w-2.5 shrink-0 rounded-full bg-[#1e98f3]" />
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}
