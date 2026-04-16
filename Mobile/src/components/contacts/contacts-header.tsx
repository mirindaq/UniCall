import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { Pressable, Text, View } from 'react-native';

type ContactsHeaderProps = {
  onPressSearch?: () => void;
  onPressAddFriend?: () => void;
};

export function ContactsHeader({ onPressSearch, onPressAddFriend }: ContactsHeaderProps) {
  return (
    <View className="bg-[#1e98f3] px-5 pb-3.5 pt-2">
      <View className="flex-row items-center">
        <Pressable onPress={onPressSearch} className="mr-2 h-10 w-10 items-center justify-center rounded-full">
          <Ionicons name="search-outline" size={28} color="#ffffff" />
        </Pressable>
        <Text allowFontScaling={false} className="flex-1 text-[18px] text-sky-100">
          Tìm kiếm
        </Text>
        <Pressable onPress={onPressAddFriend} className="h-10 w-10 items-center justify-center rounded-full">
          <Ionicons name="person-add-outline" size={27} color="#ffffff" />
        </Pressable>
      </View>
    </View>
  );
}

