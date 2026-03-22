import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { ConversationAvatar } from '@/components/messages/conversation-avatar';

const composerActions = [
  { id: 'photo', label: 'Ảnh', icon: 'image', iconColor: '#5ec87c' },
  { id: 'video', label: 'Video', icon: 'videocam', iconColor: '#d946ef' },
  { id: 'album', label: 'Album', icon: 'images', iconColor: '#3b82f6' },
  { id: 'background', label: 'Nền chữ', icon: 'brush', iconColor: '#60a5fa' },
] as const;

export function FeedsComposerCard() {
  return (
    <View className="bg-white pb-3">
      <View className="flex-row items-center px-5 py-4">
        <ConversationAvatar avatar={{ type: 'initials', value: 'U', backgroundColor: '#111827' }} />
        <Text allowFontScaling={false} className="ml-4 text-[16px] text-slate-400">
          Hôm nay bạn thế nào?
        </Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-4">
        {composerActions.map((action) => (
          <Pressable key={action.id} className="mr-3 flex-row items-center rounded-full bg-slate-100 px-5 py-2.5">
            <Ionicons name={action.icon} size={16} color={action.iconColor} />
            <Text allowFontScaling={false} className="ml-2 text-[15px] text-slate-900">
              {action.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}