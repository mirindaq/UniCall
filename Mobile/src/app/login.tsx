import Ionicons from '@expo/vector-icons/Ionicons';
import { AxiosError } from 'axios';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

import { authTokenStore } from '@/configurations/axios.config';
import { authService } from '@/services/auth.service';
import type { ResponseError } from '@/types/api-response';

const normalizePhone = (value: string) => {
  const raw = value.trim().replace(/\s+/g, '').replace(/-/g, '');
  if (raw.startsWith('+')) {
    return `+${raw.slice(1).replace(/\D/g, '')}`;
  }

  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('84') && digits.length === 11) {
    return `+${digits}`;
  }
  if (digits.length === 9) {
    return `0${digits}`;
  }

  return digits;
};

const getApiErrorMessage = (error: unknown, fallbackMessage: string) => {
  if (error instanceof AxiosError) {
    if (!error.response) {
      return 'Không kết nối được máy chủ. Kiểm tra EXPO_PUBLIC_API_BASE_URL hoặc IP LAN của máy chạy backend.';
    }

    if (error.response.status === 401) {
      return 'Số điện thoại hoặc mật khẩu chưa đúng.';
    }

    const message = (error.response.data as ResponseError | undefined)?.message;
    return message || fallbackMessage;
  }

  return fallbackMessage;
};

export default function LoginScreen() {
  const router = useRouter();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit = useMemo(() => {
    return phoneNumber.trim().length > 0 && password.trim().length > 0 && !isSubmitting;
  }, [isSubmitting, password, phoneNumber]);

  const handleLogin = async () => {
    const normalizedPhoneNumber = normalizePhone(phoneNumber);
    if (!normalizedPhoneNumber || !password.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Thiếu thông tin',
        text2: 'Vui lòng nhập số điện thoại và mật khẩu.',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await authService.login({
        phoneNumber: normalizedPhoneNumber,
        password: password.trim(),
      });
      const accessToken = response.data?.accessToken;

      if (!accessToken) {
        throw new Error('Missing access token');
      }

      authTokenStore.set(accessToken);
      router.replace('/message');
    } catch (error) {
      authTokenStore.clear();
      Toast.show({
        type: 'error',
        text1: 'Đăng nhập thất bại',
        text2: getApiErrorMessage(error, 'Vui lòng kiểm tra lại tài khoản.'),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-100" edges={['top', 'bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
        <ScrollView className="flex-1 px-6" contentContainerClassName="grow pb-6" keyboardShouldPersistTaps="handled">
          <Pressable className="mt-1 h-10 w-10 items-center justify-center rounded-full border border-slate-300 bg-white" onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color="#111827" />
          </Pressable>

          <Text className="mt-8 text-center text-3xl font-bold text-slate-900">Đăng nhập</Text>

          <View className="mt-7 gap-3">
            <View className="flex-row items-center overflow-hidden rounded-2xl border-2 border-blue-500 bg-white">
              <View className="w-[92px] items-center justify-center border-r border-slate-300 bg-slate-100 py-4">
                <Text className="text-base font-medium text-slate-900">+84</Text>
              </View>
              <TextInput
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                placeholder="0123 456 789"
                placeholderTextColor="#9ca3af"
                keyboardType="phone-pad"
                className="flex-1 px-4 py-4 text-base text-slate-900"
              />
            </View>

            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Mật khẩu"
              placeholderTextColor="#9ca3af"
              secureTextEntry
              className="rounded-2xl border border-slate-300 bg-white px-4 py-4 text-base text-slate-900"
            />

            <Pressable
              className={`mt-2 items-center justify-center rounded-full py-4 ${canSubmit ? 'bg-blue-600' : 'bg-slate-300'}`}
              onPress={handleLogin}
              disabled={!canSubmit}>
              <Text className="text-xl font-bold text-white">{isSubmitting ? 'Đang xử lý...' : 'Tiếp tục'}</Text>
            </Pressable>
          </View>

          <View className="mb-2 mt-auto flex-row flex-wrap items-center justify-center px-4">
            <Text className="text-base leading-6 text-slate-900">Bạn chưa có tài khoản? </Text>
            <Pressable onPress={() => router.push('/register')}>
              <Text className="text-base font-bold leading-6 text-blue-600">Tạo tài khoản</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}