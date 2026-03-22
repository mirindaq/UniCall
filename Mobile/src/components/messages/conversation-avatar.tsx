import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { Text, View } from 'react-native';

import type { MockAvatar } from '@/mock/chat-conversations';

interface ConversationAvatarProps {
  avatar: MockAvatar;
  isVerified?: boolean;
}

export function ConversationAvatar({ avatar, isVerified = false }: ConversationAvatarProps) {
  const textColor = avatar.textColor ?? '#ffffff';

  return (
    <View className="relative">
      <View
        className="h-[54px] w-[54px] items-center justify-center rounded-full"
        style={{ backgroundColor: avatar.backgroundColor }}>
        <Text
          className={avatar.type === 'emoji' ? 'text-[22px]' : 'text-lg font-semibold'}
          style={{ color: textColor }}>
          {avatar.value}
        </Text>
      </View>

      {isVerified ? (
        <View className="absolute -bottom-0.5 -right-0.5 h-[18px] w-[18px] items-center justify-center rounded-full bg-amber-400">
          <Ionicons name="checkmark" size={11} color="#ffffff" />
        </View>
      ) : null}
    </View>
  );
}
