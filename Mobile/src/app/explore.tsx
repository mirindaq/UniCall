import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ExploreScreen() {
  return (
    <SafeAreaView className="flex-1 bg-slate-100" edges={['top', 'bottom']}>
      <ScrollView className="flex-1 px-6" contentContainerClassName="grow pt-10 pb-8">
        <Text className="text-center text-3xl font-bold text-slate-900">Explore</Text>
        <Text className="mt-3 text-center text-base leading-6 text-slate-600">
          Màn hình này đang để đơn giản để giữ dự án thống nhất theo NativeWind.
        </Text>

        <View className="mt-8 gap-3 rounded-2xl border border-slate-200 bg-white p-4">
          <Text className="text-lg font-semibold text-slate-900">Gợi ý</Text>
          <Text className="text-sm leading-6 text-slate-700">
            Nếu bạn muốn, mình sẽ thiết kế lại màn Explore theo luồng tính năng thật của UniCall thay vì giữ màn mẫu.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
