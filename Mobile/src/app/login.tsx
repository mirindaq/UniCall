import { AxiosError } from 'axios';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Toast from 'react-native-toast-message';

import {
  AuthHero,
  AuthModal,
  AuthModalButton,
  AuthModalFooter,
  AuthPhoneField,
  AuthPrimaryButton,
  AuthScreenLayout,
  AuthTextField,
} from '@/components/auth/auth-form-primitives';
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
    <AuthScreenLayout onBack={() => router.back()}>
      <AuthHero title="Đăng nhập" subtitle="Chào mừng bạn quay lại UniCall" />

      <View className="-mt-3 rounded-3xl border border-slate-100 bg-white p-5 shadow-md shadow-slate-200/80">
        <View className="gap-4">
          <AuthPhoneField value={phoneNumber} onChangeText={setPhoneNumber} />

          <AuthTextField
            label="Mật khẩu"
            icon="lock-closed-outline"
            value={password}
            onChangeText={setPassword}
            placeholder="Nhập mật khẩu"
            secureToggle
            secureTextEntry
          />

          <Pressable className="self-end py-0.5" onPress={() => setShowForgotPasswordModal(true)} hitSlop={8}>
            <Text className="text-[14px] font-semibold text-[#1e98f3]">Quên mật khẩu?</Text>
          </Pressable>

          <AuthPrimaryButton
            label="Đăng nhập"
            onPress={() => void handleLogin()}
            disabled={!canSubmit}
            loading={isSubmitting}
          />
        </View>
      </View>

      <View className="mt-8 flex-row flex-wrap items-center justify-center">
        <Text className="text-[15px] text-slate-600">Bạn chưa có tài khoản? </Text>
        <Pressable onPress={() => router.push('/register')} hitSlop={8}>
          <Text className="text-[15px] font-bold text-[#1e98f3]">Tạo tài khoản</Text>
        </Pressable>
      </View>

      <AuthModal
        visible={showResendVerificationModal}
        title="Xác thực email"
        description="Tài khoản chưa kích hoạt. Nhập email đã đăng ký để gửi lại liên kết xác thực."
        onClose={() => setShowResendVerificationModal(false)}
        footer={
          <AuthModalFooter>
            <AuthModalButton label="Đóng" onPress={() => setShowResendVerificationModal(false)} />
            <AuthModalButton
              label="Gửi lại email"
              variant="primary"
              onPress={() => void handleResendVerification()}
              loading={isResendingVerification}
            />
          </AuthModalFooter>
        }>
        <AuthTextField
          label="Email"
          icon="mail-outline"
          value={resendEmail}
          onChangeText={setResendEmail}
          placeholder="email@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </AuthModal>

      <AuthModal
        visible={showForgotPasswordModal}
        title="Quên mật khẩu"
        description="Nhập số điện thoại và mật khẩu mới. UniCall sẽ gửi OTP để xác thực."
        onClose={() => setShowForgotPasswordModal(false)}
        footer={
          <AuthModalFooter>
            <AuthModalButton label="Đóng" onPress={() => setShowForgotPasswordModal(false)} />
            <AuthModalButton
              label="Gửi OTP"
              variant="primary"
              onPress={() => void handleForgotPassword()}
              loading={isSubmittingForgotPassword}
            />
          </AuthModalFooter>
        }>
        <View className="gap-3">
          <AuthPhoneField
            label="Số điện thoại tài khoản"
            value={forgotPasswordPhone}
            onChangeText={setForgotPasswordPhone}
          />
          <AuthTextField
            label="Mật khẩu mới"
            icon="lock-closed-outline"
            value={forgotPasswordNewPassword}
            onChangeText={setForgotPasswordNewPassword}
            placeholder="Mật khẩu mới"
            secureToggle
            secureTextEntry
          />
          <AuthTextField
            label="Xác nhận mật khẩu"
            icon="shield-checkmark-outline"
            value={forgotPasswordConfirmNewPassword}
            onChangeText={setForgotPasswordConfirmNewPassword}
            placeholder="Nhập lại mật khẩu"
            secureToggle
            secureTextEntry
          />
        </View>
      </AuthModal>

      <AuthModal
        visible={showForgotOtpModal}
        title="Xác thực OTP"
        description={`Nhập mã OTP đã gửi tới ${forgotOtpPhone || 'số điện thoại của bạn'}.`}
        onClose={() => {
          if (isForgotOtpBusy) {
            return;
          }
          setShowForgotOtpModal(false);
          resetForgotOtpFlow();
        }}
        footer={
          <AuthModalFooter>
            <AuthModalButton
              label="Hủy"
              onPress={() => {
                if (isForgotOtpBusy) {
                  return;
                }
                setShowForgotOtpModal(false);
                resetForgotOtpFlow();
              }}
            />
            <AuthModalButton
              label="Gửi lại"
              onPress={() => void handleSendForgotOtp()}
              loading={isSendingForgotOtp}
            />
            <AuthModalButton
              label="Xác thực"
              variant="primary"
              onPress={() => void handleVerifyForgotOtpAndReset()}
              loading={isVerifyingForgotOtp}
              disabled={!forgotOtpConfirmation || !forgotOtpCode.trim()}
            />
          </AuthModalFooter>
        }>
        <AuthTextField
          label="Mã OTP"
          icon="keypad-outline"
          value={forgotOtpCode}
          onChangeText={setForgotOtpCode}
          placeholder="Nhập 6 chữ số"
          keyboardType="number-pad"
        />
      </AuthModal>
    </AuthScreenLayout>
  );
}
