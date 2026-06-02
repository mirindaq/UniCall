import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export const AUTH_BRAND = '#1e98f3';

type AuthScreenLayoutProps = {
  children: React.ReactNode;
  onBack?: () => void;
};

export function AuthScreenLayout({ children, onBack }: AuthScreenLayoutProps) {
  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top', 'bottom']}>
      <View className="absolute -right-16 top-24 h-48 w-48 rounded-full bg-sky-200/40" />
      <View className="absolute -left-20 bottom-32 h-56 w-56 rounded-full bg-sky-100/50" />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1">
        <ScrollView
          className="flex-1 px-5"
          contentContainerClassName="grow pb-8"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {onBack ? (
            <Pressable
              onPress={onBack}
              className="mt-1 h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white shadow-sm"
              hitSlop={8}>
              <Ionicons name="arrow-back" size={22} color="#334155" />
            </Pressable>
          ) : null}
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

type AuthHeroProps = {
  title: string;
  subtitle: string;
};

export function AuthHero({ title, subtitle }: AuthHeroProps) {
  return (
    <View className="mt-4 overflow-hidden rounded-3xl bg-[#1e98f3] px-6 py-8 shadow-md shadow-sky-200">
      <View className="mb-4 h-14 w-14 items-center justify-center rounded-2xl bg-white/20">
        <Ionicons name="chatbubbles" size={30} color="#ffffff" />
      </View>
      <Text className="text-[28px] font-bold tracking-tight text-white">{title}</Text>
      <Text className="mt-2 text-[15px] leading-6 text-sky-50">{subtitle}</Text>
    </View>
  );
}

type AuthTextFieldProps = TextInputProps & {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  secureToggle?: boolean;
};

export function AuthTextField({
  label,
  icon,
  secureToggle = false,
  secureTextEntry,
  ...inputProps
}: AuthTextFieldProps) {
  const [hidden, setHidden] = useState(Boolean(secureTextEntry));

  return (
    <View>
      <Text className="mb-1.5 text-[13px] font-medium text-slate-600">{label}</Text>
      <View className="min-h-[52px] flex-row items-center rounded-2xl border border-slate-200 bg-slate-50 px-3">
        <Ionicons name={icon} size={20} color="#64748b" />
        <TextInput
          {...inputProps}
          secureTextEntry={secureToggle ? hidden : secureTextEntry}
          placeholderTextColor="#94a3b8"
          className="ml-2.5 min-w-0 flex-1 py-3.5 text-[16px] text-slate-900"
        />
        {secureToggle ? (
          <Pressable
            onPress={() => setHidden((value) => !value)}
            hitSlop={10}
            className="h-9 w-9 items-center justify-center">
            <Ionicons name={hidden ? 'eye-off-outline' : 'eye-outline'} size={20} color="#64748b" />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

type AuthPhoneFieldProps = {
  label?: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
};

export function AuthPhoneField({
  label = 'Số điện thoại',
  value,
  onChangeText,
  placeholder = '0912 345 678',
}: AuthPhoneFieldProps) {
  return (
    <View>
      <Text className="mb-1.5 text-[13px] font-medium text-slate-600">{label}</Text>
      <View className="min-h-[52px] flex-row items-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
        <View className="border-r border-slate-200 bg-white px-3.5 py-3.5">
          <Text className="text-[15px] font-semibold text-slate-700">+84</Text>
        </View>
        <Ionicons name="call-outline" size={20} color="#64748b" style={{ marginLeft: 10 }} />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#94a3b8"
          keyboardType="phone-pad"
          className="min-w-0 flex-1 py-3.5 pr-3 text-[16px] text-slate-900"
        />
      </View>
    </View>
  );
}

type AuthPrimaryButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
};

export function AuthPrimaryButton({ label, onPress, disabled = false, loading = false }: AuthPrimaryButtonProps) {
  const isEnabled = !disabled && !loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={!isEnabled}
      className={`min-h-[52px] items-center justify-center rounded-2xl ${
        isEnabled ? 'bg-[#1e98f3]' : 'bg-slate-200'
      } shadow-sm shadow-sky-200/60`}>
      <Text className={`text-[16px] font-semibold ${isEnabled ? 'text-white' : 'text-slate-400'}`}>
        {loading ? 'Đang xử lý...' : label}
      </Text>
    </Pressable>
  );
}

type AuthModalProps = {
  visible: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
};

export function AuthModal({ visible, title, description, onClose, children, footer }: AuthModalProps) {
  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <View className="flex-1 items-center justify-center bg-black/45 px-5">
        <View className="w-full max-w-md rounded-3xl bg-white p-5 shadow-lg">
          <View className="mb-1 flex-row items-start justify-between">
            <View className="min-w-0 flex-1 pr-3">
              <Text className="text-[18px] font-bold text-slate-900">{title}</Text>
              {description ? (
                <Text className="mt-2 text-[14px] leading-5 text-slate-600">{description}</Text>
              ) : null}
            </View>
            <Pressable
              onPress={onClose}
              className="h-9 w-9 items-center justify-center rounded-full bg-slate-100"
              hitSlop={8}>
              <Ionicons name="close" size={20} color="#64748b" />
            </Pressable>
          </View>

          <View className="mt-4">{children}</View>
          {footer ? <View className="mt-4">{footer}</View> : null}
        </View>
      </View>
    </Modal>
  );
}

type AuthModalButtonProps = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
  loading?: boolean;
};

export function AuthModalButton({
  label,
  onPress,
  variant = 'secondary',
  disabled = false,
  loading = false,
}: AuthModalButtonProps) {
  const isPrimary = variant === 'primary';
  const isEnabled = !disabled && !loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={!isEnabled}
      className={`min-h-[44px] flex-1 items-center justify-center rounded-xl border ${
        isPrimary
          ? isEnabled
            ? 'border-[#1e98f3] bg-[#1e98f3]'
            : 'border-slate-200 bg-slate-200'
          : isEnabled
            ? 'border-slate-200 bg-white'
            : 'border-slate-100 bg-slate-50'
      }`}>
      <Text
        className={`text-[14px] font-semibold ${
          isPrimary ? (isEnabled ? 'text-white' : 'text-slate-400') : 'text-slate-700'
        }`}>
        {loading ? 'Đang xử lý...' : label}
      </Text>
    </Pressable>
  );
}

export function AuthModalFooter({ children }: { children: React.ReactNode }) {
  return <View className="flex-row gap-2">{children}</View>;
}
