import React from 'react';
import { Image, Pressable, Text, View } from 'react-native';

interface ProfileIdentityProps {
  name: string;
  initials: string;
  avatarUrl?: string | null;
  onPress?: () => void;
}

export function ProfileIdentity({ name, initials, avatarUrl, onPress }: ProfileIdentityProps) {
  return (
    <Pressable className="bg-white px-5 py-4" onPress={onPress}>
      <View className="flex-row items-center">
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} className="h-[60px] w-[60px] rounded-full bg-slate-200" />
        ) : (
          <View className="h-[60px] w-[60px] items-center justify-center rounded-full bg-slate-800">
            <Text allowFontScaling={false} className="text-[30px] font-semibold text-white">
              {initials}
            </Text>
          </View>
        )}
        <View className="ml-4">
          <Text allowFontScaling={false} className="text-[20px] text-slate-900">
            {name}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}
