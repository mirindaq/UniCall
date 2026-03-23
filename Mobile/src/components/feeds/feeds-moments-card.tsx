import React from 'react';
import { Text, View } from 'react-native';

export function FeedsMomentsCard() {
  return (
    <View className="mt-2 bg-white px-5 py-4">
      <Text allowFontScaling={false} className="text-[15px] font-semibold text-slate-900">
        Khoảnh khắc
      </Text>
      <View className="mt-3 h-[132px] w-[102px] items-center justify-end rounded-2xl bg-slate-800 pb-3">
        <View className="absolute top-8 h-[42px] w-[42px] items-center justify-center rounded-full border-2 border-white bg-black/30">
          <Text allowFontScaling={false} className="text-[28px] leading-[32px] text-white">
            +
          </Text>
        </View>
        <Text allowFontScaling={false} className="text-[15px] text-white">
          Tạo mới
        </Text>
      </View>
    </View>
  );
}