import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { Text, View } from 'react-native';

export function FeedsHeader() {
  return (
    <View className="bg-[#1e98f3] px-5 pb-3.5 pt-2">
      <View className="flex-row items-center">
        <View className="mr-2 h-10 w-10 items-center justify-center rounded-full">
          <Ionicons name="search-outline" size={28} color="#ffffff" />
        </View>
        <Text allowFontScaling={false} className="flex-1 text-[18px] text-sky-100">
          Tìm kiếm
        </Text>
        <View className="h-10 w-10 items-center justify-center rounded-full">
          <Ionicons name="images-outline" size={26} color="#ffffff" />
        </View>
        <View className="h-10 w-10 items-center justify-center rounded-full">
          <Ionicons name="notifications-outline" size={25} color="#ffffff" />
        </View>
      </View>
    </View>
  );
}