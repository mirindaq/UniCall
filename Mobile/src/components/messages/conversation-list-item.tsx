import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { Pressable, Text, View } from 'react-native';

import type { MockConversation } from '@/mock/chat-conversations';

import { ConversationAvatar } from './conversation-avatar';

interface ConversationListItemProps {
  conversation: MockConversation;
  onPress?: () => void;
}

export function ConversationListItem({ conversation, onPress }: ConversationListItemProps) {
  return (
    <Pressable className="flex-row items-center border-b border-slate-200 bg-[#f3f4f6] px-5 py-3.5" onPress={onPress}>
      <ConversationAvatar avatar={conversation.avatar} isVerified={conversation.isVerified} />

      <View className="ml-3.5 flex-1">
        <View className="flex-row items-start justify-between gap-3">
          <Text numberOfLines={1} className="flex-1 text-[18px] font-medium text-black">
            {conversation.name}
          </Text>
          <View className="flex-row items-center">
            {conversation.isPinned ? <Ionicons name="pin" size={13} color="#9ca3af" style={{ marginRight: 4 }} /> : null}
            <Text className="text-[13px] text-slate-500">{conversation.timeLabel}</Text>
          </View>
        </View>

        <View className="mt-1 flex-row items-center">
          <Text
            numberOfLines={1}
            className={`flex-1 text-[15px] ${
              conversation.isPreviewBold ? 'font-semibold text-slate-900' : 'text-slate-500'
            }`}>
            {conversation.preview}
          </Text>
          {conversation.hasUnreadDot ? <View className="ml-2 h-2.5 w-2.5 rounded-full bg-red-500" /> : null}
        </View>
      </View>
    </Pressable>
  );
}
