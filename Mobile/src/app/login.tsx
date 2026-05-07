import Ionicons from '@expo/vector-icons/Ionicons';
import { AxiosError } from 'axios';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

import { authTokenStore } from '@/configurations/axios.config';
import { authService } from '@/services/auth.service';
import { getFirebaseAuth, toFirebasePhoneNumber } from '@/services/firebase-phone-auth.service';
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

const isValidPhoneNumber = (value: string) => /^(0|\+84)\d{9}$/.test(value);
const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;

const getApiErrorMessage = (error: unknown, fallbackMessage: string) => {
  if (error instanceof AxiosError) {
    if (!error.response) {
      return 'Không kết nối được máy chủ. Kiểm tra EXPO_PUBLIC_API_BASE_URL.';
    }

    const message = (error.response.data as ResponseError | undefined)?.message;
    if (error.response.status === 401 && !message) {
      console.log(error.response)
      return 'Số điện thoại hoặc mật khẩu chưa đúng.';
    }
    return message || fallbackMessage;
  }

  return fallbackMessage;
};

const getFirebaseErrorMessage = (error: unknown, fallbackMessage: string) => {
  const code = (error as { code?: string } | undefined)?.code;

  switch (code) {
    case 'auth/invalid-phone-number':
      return 'Số điện thoại không hợp lệ.';
    case 'auth/too-many-requests':
      return 'Bạn đã thử quá nhiều lần. Vui lòng thử lại sau.';
    case 'auth/invalid-verification-code':
      return 'Mã OTP không đúng.';
    case 'auth/code-expired':
      return 'Mã OTP đã hết hạn.';
    default:
      return fallbackMessage;
  }
};

const isEmailNotVerifiedError = (message: string) => {
  const normalized = message.toLowerCase();
  return normalized.includes('not activated') || normalized.includes('verify your email');
};

export default function LoginScreen() {
  const router = useRouter();

  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showResendVerificationModal, setShowResendVerificationModal] = useState(false);
  const [resendEmail, setResendEmail] = useState('');
  const [isResendingVerification, setIsResendingVerification] = useState(false);

  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [forgotPasswordPhone, setForgotPasswordPhone] = useState('');
  const [forgotPasswordNewPassword, setForgotPasswordNewPassword] = useState('');
  const [forgotPasswordConfirmNewPassword, setForgotPasswordConfirmNewPassword] = useState('');
  const [isSubmittingForgotPassword, setIsSubmittingForgotPassword] = useState(false);

  const [showForgotOtpModal, setShowForgotOtpModal] = useState(false);
  const [forgotOtpPhone, setForgotOtpPhone] = useState('');
  const [forgotOtpCode, setForgotOtpCode] = useState('');
  const [forgotOtpConfirmation, setForgotOtpConfirmation] = useState<any | null>(null);
  const [isSendingForgotOtp, setIsSendingForgotOtp] = useState(false);
  const [isVerifyingForgotOtp, setIsVerifyingForgotOtp] = useState(false);
  const [hasAutoSentForgotOtp, setHasAutoSentForgotOtp] = useState(false);
  const [pendingForgotPasswordPayload, setPendingForgotPasswordPayload] = useState<{
    phoneNumber: string;
    newPassword: string;
  } | null>(null);

  useEffect(() => {
    void (async () => {
      const accessToken = await authTokenStore.get();
      if (accessToken) {
        router.replace('/message');
      }
    })();
  }, [router]);

  useEffect(() => {
    if (!showForgotPasswordModal) {
      return;
    }
    setForgotPasswordPhone(phoneNumber.trim());
  }, [showForgotPasswordModal, phoneNumber]);

  useEffect(() => {
    if (!showForgotOtpModal || hasAutoSentForgotOtp || !forgotOtpPhone) {
      return;
    }
    const timer = setTimeout(() => {
      setHasAutoSentForgotOtp(true);
      void handleSendForgotOtp(forgotOtpPhone);
    }, 150);

    return () => clearTimeout(timer);
  }, [showForgotOtpModal, hasAutoSentForgotOtp, forgotOtpPhone]);

  const canSubmit = useMemo(() => {
    return phoneNumber.trim().length > 0 && password.trim().length > 0 && !isSubmitting;
  }, [isSubmitting, password, phoneNumber]);

  const resetForgotOtpFlow = () => {
    setForgotOtpCode('');
    setForgotOtpPhone('');
    setForgotOtpConfirmation(null);
    setHasAutoSentForgotOtp(false);
    setPendingForgotPasswordPayload(null);
  };

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
      const refreshToken = response.data?.refreshToken;

      if (!accessToken || !refreshToken) {
        throw new Error('Missing access token');
      }

      await authTokenStore.set(accessToken, refreshToken);
      router.replace('/message');
    } catch (error) {
      await authTokenStore.clear();
      const message = getApiErrorMessage(error, 'Vui lòng kiểm tra lại tài khoản.');
      if (isEmailNotVerifiedError(message)) {
        setShowResendVerificationModal(true);
        Toast.show({
          type: 'error',
          text1: 'Tài khoản chưa xác thực email',
          text2: 'Vui lòng nhập email để gửi lại liên kết kích hoạt.',
        });
        return;
      }

      Toast.show({
        type: 'error',
        text1: 'Đăng nhập thất bại',
        text2: message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendVerification = async () => {
    const normalizedPhoneNumber = normalizePhone(phoneNumber);
    if (!isValidPhoneNumber(normalizedPhoneNumber)) {
      Toast.show({
        type: 'error',
        text1: 'Số điện thoại chưa đúng',
        text2: 'Vui lòng nhập đúng số điện thoại tài khoản cần xác thực.',
      });
      return;
    }

    if (!resendEmail.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Thiếu email',
        text2: 'Vui lòng nhập email đã đăng ký.',
      });
      return;
    }

    setIsResendingVerification(true);
    try {
      const response = await authService.resendVerificationEmail({
        phoneNumber: normalizedPhoneNumber,
        email: resendEmail.trim(),
      });
      Toast.show({
        type: 'success',
        text1: 'Đã gửi lại email xác thực',
        text2: response.message || 'Vui lòng kiểm tra hộp thư email của bạn.',
      });
      setShowResendVerificationModal(false);
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Không thể gửi email',
        text2: getApiErrorMessage(error, 'Vui lòng kiểm tra lại số điện thoại hoặc email.'),
      });
    } finally {
      setIsResendingVerification(false);
    }
  };

  const handleSendForgotOtp = async (phoneNumberOverride?: string) => {
    const targetPhone = (phoneNumberOverride ?? forgotOtpPhone).trim();
    if (!targetPhone) {
      Toast.show({
        type: 'error',
        text1: 'Thiếu số điện thoại',
        text2: 'Vui lòng nhập số điện thoại hợp lệ.',
      });
      return;
    }

    setIsSendingForgotOtp(true);
    try {
      const firebasePhoneNumber = toFirebasePhoneNumber(targetPhone);
      const nextConfirmation = await getFirebaseAuth().signInWithPhoneNumber(firebasePhoneNumber);
      setForgotOtpPhone(targetPhone);
      setForgotOtpConfirmation(nextConfirmation);
      Toast.show({
        type: 'success',
        text1: 'Đã gửi OTP',
        text2: 'Vui lòng kiểm tra SMS.',
      });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Gửi OTP thất bại',
        text2: getFirebaseErrorMessage(error, 'Không thể gửi OTP. Vui lòng thử lại.'),
      });
    } finally {
      setIsSendingForgotOtp(false);
    }
  };

  const handleVerifyForgotOtpAndReset = async () => {
    if (!forgotOtpConfirmation) {
      Toast.show({
        type: 'error',
        text1: 'Chưa gửi OTP',
        text2: 'Vui lòng gửi OTP trước.',
      });
      return;
    }

    if (!forgotOtpCode.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Thiếu mã OTP',
        text2: 'Vui lòng nhập mã OTP.',
      });
      return;
    }

    if (!pendingForgotPasswordPayload) {
      Toast.show({
        type: 'error',
        text1: 'Dữ liệu không hợp lệ',
        text2: 'Vui lòng thực hiện lại thao tác quên mật khẩu.',
      });
      return;
    }

    setIsVerifyingForgotOtp(true);
    try {
      const auth = getFirebaseAuth();
      const credentialResult = await forgotOtpConfirmation.confirm(forgotOtpCode.trim());
      const firebaseIdToken = await credentialResult.user.getIdToken();

      await authService.resetPasswordWithOtp({
        phoneNumber: pendingForgotPasswordPayload.phoneNumber,
        newPassword: pendingForgotPasswordPayload.newPassword,
        firebaseIdToken,
      });

      await auth.signOut();

      Toast.show({
        type: 'success',
        text1: 'Đặt lại mật khẩu thành công',
        text2: 'Bạn có thể đăng nhập bằng mật khẩu mới.',
      });

      setShowForgotOtpModal(false);
      setShowForgotPasswordModal(false);
      setForgotPasswordNewPassword('');
      setForgotPasswordConfirmNewPassword('');
      resetForgotOtpFlow();
    } catch (error) {
      const firebaseCode = (error as { code?: string } | undefined)?.code;
      Toast.show({
        type: 'error',
        text1: 'Xác thực OTP/đổi mật khẩu thất bại',
        text2:
          firebaseCode?.startsWith('auth/')
            ? getFirebaseErrorMessage(error, 'Mã OTP không hợp lệ hoặc đã hết hạn.')
            : getApiErrorMessage(error, 'Vui lòng kiểm tra lại thông tin.'),
      });
    } finally {
      setIsVerifyingForgotOtp(false);
      setIsSubmittingForgotPassword(false);
    }
  };

  const handleForgotPassword = async () => {
    const normalizedPhoneNumber = normalizePhone(forgotPasswordPhone);
    if (!isValidPhoneNumber(normalizedPhoneNumber)) {
      Toast.show({
        type: 'error',
        text1: 'Số điện thoại chưa đúng',
        text2: 'Vui lòng nhập đúng số điện thoại tài khoản.',
      });
      return;
    }

    if (!strongPasswordRegex.test(forgotPasswordNewPassword.trim())) {
      Toast.show({
        type: 'error',
        text1: 'Mật khẩu chưa hợp lệ',
        text2: 'Mật khẩu tối thiểu 8 ký tự, có chữ hoa, chữ thường, số và ký tự đặc biệt.',
      });
      return;
    }

    if (forgotPasswordNewPassword.trim() !== forgotPasswordConfirmNewPassword.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Mật khẩu không khớp',
        text2: 'Vui lòng nhập trùng khớp mật khẩu xác nhận.',
      });
      return;
    }

    setIsSubmittingForgotPassword(true);
    setPendingForgotPasswordPayload({
      phoneNumber: normalizedPhoneNumber,
      newPassword: forgotPasswordNewPassword.trim(),
    });
    setForgotOtpPhone(normalizedPhoneNumber);
    setForgotOtpCode('');
    setForgotOtpConfirmation(null);
    setHasAutoSentForgotOtp(false);
    setShowForgotOtpModal(true);
    setIsSubmittingForgotPassword(false);
  };

  const isForgotOtpBusy = isSendingForgotOtp || isVerifyingForgotOtp;

  return (
    <SafeAreaView className="flex-1 bg-slate-100" edges={['top', 'bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
        <ScrollView className="flex-1 px-6" contentContainerClassName="grow pb-6" keyboardShouldPersistTaps="handled">
          <Pressable className="mt-1 h-10 w-10 items-center justify-center rounded-full border border-slate-300 bg-white" onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color="#111827" />
          </Pressable>

          <Text className="mt-8 text-center text-3xl font-extrabold tracking-tight text-slate-900">Đăng nhập</Text>
          <Text className="mt-2 text-center text-base text-slate-500">Chào mừng bạn quay lại UniCall</Text>

          <View className="mt-7 gap-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
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

            <Pressable className="self-end" onPress={() => setShowForgotPasswordModal(true)}>
              <Text className="text-sm font-semibold text-blue-600">Quên mật khẩu?</Text>
            </Pressable>

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

      <Modal
        transparent
        animationType="fade"
        visible={showResendVerificationModal}
        onRequestClose={() => setShowResendVerificationModal(false)}>
        <View className="flex-1 items-center justify-center bg-black/45 px-5">
          <View className="w-full max-w-md rounded-2xl bg-white p-5">
            <Text className="text-lg font-bold text-slate-900">Xác thực email tài khoản</Text>
            <Text className="mt-2 text-sm leading-5 text-slate-600">
              Tài khoản chưa kích hoạt. Nhập đúng email đã đăng ký để gửi lại liên kết xác thực.
            </Text>
            <TextInput
              value={resendEmail}
              onChangeText={setResendEmail}
              placeholder="Nhập email đã đăng ký"
              placeholderTextColor="#9ca3af"
              keyboardType="email-address"
              autoCapitalize="none"
              className="mt-4 rounded-xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-900"
            />
            <View className="mt-4 flex-row justify-end gap-2">
              <Pressable
                className="rounded-xl border border-slate-300 bg-white px-4 py-2.5"
                onPress={() => setShowResendVerificationModal(false)}>
                <Text className="font-medium text-slate-700">Đóng</Text>
              </Pressable>
              <Pressable
                className={`rounded-xl px-4 py-2.5 ${isResendingVerification ? 'bg-sky-300' : 'bg-sky-500'}`}
                onPress={handleResendVerification}
                disabled={isResendingVerification}>
                <Text className="font-semibold text-white">
                  {isResendingVerification ? 'Đang gửi...' : 'Gửi lại email'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        transparent
        animationType="fade"
        visible={showForgotPasswordModal}
        onRequestClose={() => setShowForgotPasswordModal(false)}>
        <View className="flex-1 items-center justify-center bg-black/45 px-5">
          <View className="w-full max-w-md rounded-2xl bg-white p-5">
            <Text className="text-lg font-bold text-slate-900">Quên mật khẩu</Text>
            <Text className="mt-2 text-sm leading-5 text-slate-600">
              Nhập số điện thoại và mật khẩu mới. UniCall sẽ gửi OTP để xác thực trước khi đổi mật khẩu.
            </Text>
            <TextInput
              value={forgotPasswordPhone}
              onChangeText={setForgotPasswordPhone}
              placeholder="Nhập số điện thoại tài khoản"
              placeholderTextColor="#9ca3af"
              keyboardType="phone-pad"
              className="mt-4 rounded-xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-900"
            />
            <TextInput
              value={forgotPasswordNewPassword}
              onChangeText={setForgotPasswordNewPassword}
              placeholder="Mật khẩu mới"
              placeholderTextColor="#9ca3af"
              secureTextEntry
              className="mt-3 rounded-xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-900"
            />
            <TextInput
              value={forgotPasswordConfirmNewPassword}
              onChangeText={setForgotPasswordConfirmNewPassword}
              placeholder="Xác nhận mật khẩu mới"
              placeholderTextColor="#9ca3af"
              secureTextEntry
              className="mt-3 rounded-xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-900"
            />
            <View className="mt-4 flex-row justify-end gap-2">
              <Pressable
                className="rounded-xl border border-slate-300 bg-white px-4 py-2.5"
                onPress={() => setShowForgotPasswordModal(false)}>
                <Text className="font-medium text-slate-700">Đóng</Text>
              </Pressable>
              <Pressable
                className={`rounded-xl px-4 py-2.5 ${isSubmittingForgotPassword ? 'bg-sky-300' : 'bg-sky-500'}`}
                onPress={handleForgotPassword}
                disabled={isSubmittingForgotPassword}>
                <Text className="font-semibold text-white">
                  {isSubmittingForgotPassword ? 'Đang xử lý...' : 'Gửi OTP'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        transparent
        animationType="fade"
        visible={showForgotOtpModal}
        onRequestClose={() => {
          if (isForgotOtpBusy) return;
          setShowForgotOtpModal(false);
          resetForgotOtpFlow();
        }}>
        <View className="flex-1 items-center justify-center bg-black/45 px-5">
          <View className="w-full max-w-md rounded-2xl bg-white p-5">
            <Text className="text-lg font-bold text-slate-900">Xác thực OTP</Text>
            <Text className="mt-2 text-sm leading-5 text-slate-600">
              Vui lòng nhập mã OTP đã gửi đến số <Text className="font-semibold">{forgotOtpPhone || '*****'}</Text>.
            </Text>
            <TextInput
              value={forgotOtpCode}
              onChangeText={setForgotOtpCode}
              placeholder="Nhập mã OTP"
              placeholderTextColor="#9ca3af"
              keyboardType="number-pad"
              className="mt-4 rounded-xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-900"
            />
            <View className="mt-4 flex-row justify-end gap-2">
              <Pressable
                className="rounded-xl border border-slate-300 bg-white px-4 py-2.5"
                onPress={() => {
                  if (isForgotOtpBusy) return;
                  setShowForgotOtpModal(false);
                  resetForgotOtpFlow();
                }}>
                <Text className="font-medium text-slate-700">Hủy</Text>
              </Pressable>
              <Pressable
                className={`rounded-xl px-4 py-2.5 ${isSendingForgotOtp ? 'bg-sky-300' : 'bg-slate-600'}`}
                onPress={() => void handleSendForgotOtp()}
                disabled={isSendingForgotOtp}>
                <Text className="font-semibold text-white">{isSendingForgotOtp ? 'Đang gửi...' : 'Gửi lại OTP'}</Text>
              </Pressable>
              <Pressable
                className={`rounded-xl px-4 py-2.5 ${isVerifyingForgotOtp ? 'bg-sky-300' : 'bg-sky-500'}`}
                onPress={() => void handleVerifyForgotOtpAndReset()}
                disabled={isVerifyingForgotOtp || !forgotOtpConfirmation || !forgotOtpCode.trim()}>
                <Text className="font-semibold text-white">
                  {isVerifyingForgotOtp ? 'Đang xác thực...' : 'Xác thực'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
