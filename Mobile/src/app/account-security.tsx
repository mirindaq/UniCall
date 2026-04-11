import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppStatusBarBlue } from '@/components/ui/app-status-bar-blue';

export default function AccountSecurityScreen() {
  const router = useRouter();
  const { phone } = useLocalSearchParams<{ phone?: string }>();

  return (
    <View className="flex-1 bg-[#f3f4f6]">
      <AppStatusBarBlue />
      <SafeAreaView edges={['top']} className="bg-[#1e98f3]" />

      <View className="bg-[#1e98f3] px-4 pb-3 pt-2">
        <View className="flex-row items-center">
          <Pressable className="mr-2 h-10 w-10 items-center justify-center rounded-full" onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
          </Pressable>
          <Text allowFontScaling={false} className="text-[17px] font-semibold text-white">
            Tài khoản và bảo mật
          </Text>
        </View>
      </View>

      <View className="mt-4 bg-white">
        <Pressable
          className="flex-row items-center px-5 py-4"
          onPress={() => {
            router.push({
              pathname: '/account-delete',
              params: { phone: typeof phone === 'string' ? phone : '' },
            });
          }}>
          <Text allowFontScaling={false} className="flex-1 text-[17px] text-slate-900">
            Xóa tài khoản
          </Text>
          <Ionicons name="chevron-forward" size={24} color="#9ca3af" />
        </Pressable>
      </View>
    </View>
  );
}
