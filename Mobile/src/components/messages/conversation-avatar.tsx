import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { Text, View } from 'react-native';

import type { MockAvatar } from '@/mock/chat-conversations';

interface ConversationAvatarProps {
  avatar: MockAvatar;
  isVerified?: boolean;
  size?: number;
}

export function ConversationAvatar({ avatar, isVerified = false, size = 54 }: ConversationAvatarProps) {
  const textColor = avatar.textColor ?? '#ffffff';
  const isSmall = size <= 46;
  const textClassName = avatar.type === 'emoji' ? (isSmall ? 'text-[18px]' : 'text-[22px]') : isSmall ? 'text-[22px] font-semibold' : 'text-lg font-semibold';

  return (
    <View className="relative">
      <View
        className="items-center justify-center rounded-full"
        style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: avatar.backgroundColor }}>
        <Text
          className={textClassName}
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
