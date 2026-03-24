import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { Pressable, Text, View } from 'react-native';

interface UserProfileTopBarProps {
  title: string;
  dark?: boolean;
  onBack: () => void;
  onCall?: () => void;
}

export function UserProfileTopBar({ title, dark = true, onBack, onCall }: UserProfileTopBarProps) {
  const iconColor = dark ? '#ffffff' : '#111827';

  return (
    <View className="absolute left-0 right-0 top-0 z-20 px-3.5 pb-2.5 pt-2.5">
      <View className="flex-row items-center">
        <Pressable className="mr-1 h-9 w-9 items-center justify-center rounded-full" onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color={iconColor} />
        </Pressable>

        <Text allowFontScaling={false} numberOfLines={1} className={`flex-1 text-[17px] font-semibold ${dark ? 'text-white' : 'text-slate-900'}`}>
          {title}
        </Text>

        <Pressable className="h-9 w-9 items-center justify-center rounded-full" onPress={onCall}>
          <Ionicons name="call-outline" size={22} color={iconColor} />
        </Pressable>
        <Pressable className="ml-2 h-9 w-9 items-center justify-center rounded-full">
          <Ionicons name="person-add-outline" size={22} color={iconColor} />
        </Pressable>
        <Pressable className="ml-2 h-9 w-9 items-center justify-center rounded-full">
          <Ionicons name="ellipsis-horizontal" size={24} color={iconColor} />
        </Pressable>
      </View>
    </View>
  );
}
