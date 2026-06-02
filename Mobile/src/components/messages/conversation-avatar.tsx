import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { Image, Text, View } from 'react-native';

import type { MockAvatar } from '@/mock/chat-conversations';

interface ConversationAvatarProps {
  avatar: MockAvatar;
  avatarUrl?: string | null;
  isVerified?: boolean;
  size?: number;
}

export function ConversationAvatar({
  avatar,
  avatarUrl,
  isVerified = false,
  size = 54,
}: ConversationAvatarProps) {
  const textColor = avatar.textColor ?? '#1e293b';
  const fontSize =
    avatar.type === 'emoji'
      ? Math.max(14, size * 0.38)
      : Math.max(11, size * 0.34);

  const borderWidth = size >= 48 ? 2 : 1.5;

  return (
    <View className="relative" style={{ width: size, height: size }}>
      <View
        className="overflow-hidden rounded-full bg-slate-100"
        style={{
          width: size,
          height: size,
          borderWidth,
          borderColor: '#ffffff',
          backgroundColor: avatarUrl ? '#f1f5f9' : (avatar.backgroundColor ?? '#e2e8f0'),
          shadowColor: '#0f172a',
          shadowOpacity: size >= 48 ? 0.08 : 0.05,
          shadowRadius: size >= 48 ? 6 : 3,
          shadowOffset: { width: 0, height: 1 },
          elevation: size >= 48 ? 2 : 1,
        }}>
        {avatarUrl ? (
          <Image
            source={{ uri: avatarUrl }}
            style={{ width: size, height: size }}
            resizeMode="cover"
          />
        ) : (
          <View className="h-full w-full items-center justify-center">
            <Text
              style={{
                color: textColor,
                fontSize,
                fontWeight: '600',
                lineHeight: fontSize + 2,
              }}>
              {avatar.value}
            </Text>
          </View>
        )}
      </View>

      {isVerified && size >= 44 ? (
        <View className="absolute -bottom-0.5 -right-0.5 h-[18px] w-[18px] items-center justify-center rounded-full border-2 border-white bg-amber-400">
          <Ionicons name="checkmark" size={11} color="#ffffff" />
        </View>
      ) : null}
    </View>
  );
}
