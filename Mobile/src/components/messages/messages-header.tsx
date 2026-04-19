import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { Pressable, Text, View } from 'react-native';

interface MessagesHeaderProps {
  onPressSearch: () => void;
  onPressCreateGroup?: () => void;
}

export function MessagesHeader({ onPressSearch, onPressCreateGroup }: MessagesHeaderProps) {
  return (
    <View className="bg-[#1e98f3] px-5 pb-2.5 pt-2.5">
      <View className="flex-row items-center">
        <Pressable className="mr-2 h-[44px] flex-1 flex-row items-center rounded-2xl bg-[#2ea2f5] px-4" onPress={onPressSearch}>
          <Ionicons name="search-outline" size={27} color="#ffffff" />
          <Text allowFontScaling={false} className="ml-3 text-[17px] text-sky-100">
            Tìm kiếm
          </Text>
        </Pressable>

        <Pressable className="h-10 w-10 items-center justify-center rounded-full">
          <Ionicons name="qr-code-outline" size={24} color="#ffffff" />
        </Pressable>
        <Pressable
          className="ml-1 h-10 w-10 items-center justify-center rounded-full"
          onPress={onPressCreateGroup}>
          <Ionicons name="add" size={32} color="#ffffff" />
        </Pressable>
      </View>
    </View>
  );
}
