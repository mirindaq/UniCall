import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { authTokenStore } from '@/configurations/axios.config';

export default function WelcomeScreen() {
  const router = useRouter();

  const handleLogout = () => {
    authTokenStore.clear();
    router.replace('/login');
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-100" edges={['top', 'bottom']}>
      <View className="flex-1 items-center justify-center gap-3 px-6">
        <Text className="text-center text-3xl font-bold text-slate-900">Chào mừng bạn đến với Unicall</Text>
        <Text className="text-base text-slate-600">Đăng nhập thành công.</Text>

        <Pressable className="mt-4 rounded-full bg-blue-600 px-8 py-3" onPress={handleLogout}>
          <Text className="text-base font-semibold text-white">Đăng xuất</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
