import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { Pressable, Text, View } from 'react-native';

interface ChatOptionsHeaderProps {
  onBack: () => void;
}

export function ChatOptionsHeader({ onBack }: ChatOptionsHeaderProps) {
  return (
    <View className="bg-[#1e98f3] px-3.5 pb-2.5 pt-2.5">
      <View className="flex-row items-center">
        <Pressable className="mr-1.5 h-9 w-9 items-center justify-center rounded-full" onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </Pressable>

        <Text allowFontScaling={false} className="flex-1 text-[17px] font-semibold text-white">
          Tùy chọn
        </Text>
      </View>
    </View>
  );
}

