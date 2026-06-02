import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { Pressable, Text, View } from 'react-native';

type ContactsHeaderProps = {
  onPressSearch?: () => void;
  onPressAddFriend?: () => void;
};

export function ContactsHeader({ onPressSearch, onPressAddFriend }: ContactsHeaderProps) {
  return (
    <View className="bg-[#1e98f3] px-4 pb-3 pt-2">
      <View className="flex-row items-center gap-2">
        <Pressable
          onPress={onPressSearch}
          className="h-11 flex-1 flex-row items-center rounded-full bg-white/95 px-4 shadow-sm">
          <Ionicons name="search-outline" size={22} color="#64748b" />
          <Text allowFontScaling={false} className="ml-2.5 flex-1 text-[16px] text-slate-500">
            Tìm kiếm
          </Text>
        </Pressable>
        <Pressable
          onPress={onPressAddFriend}
          className="h-10 w-10 items-center justify-center rounded-full bg-white/20">
          <Ionicons name="person-add-outline" size={24} color="#ffffff" />
        </Pressable>
      </View>
    </View>
  );
}
