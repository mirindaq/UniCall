import React from 'react';
import { Text, View } from 'react-native';

export function FeedsSectionTabs() {
  return (
    <View className="border-b border-slate-200 bg-white px-5 py-3">
      <View className="flex-row">
        <View className="mr-8">
          <Text allowFontScaling={false} className="text-[18px] font-semibold text-slate-900">
            Nhật ký
          </Text>
          <View className="mt-2 h-[3px] w-[76px] rounded-full bg-slate-900" />
        </View>
      </View>
    </View>
  );
}