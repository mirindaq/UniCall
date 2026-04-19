import Ionicons from '@expo/vector-icons/Ionicons';
import { AxiosError } from 'axios';
import { useRouter } from 'expo-router';
import { FirebaseRecaptchaVerifierModal } from 'expo-firebase-recaptcha';
import { PhoneAuthProvider, signInWithCredential, signOut } from 'firebase/auth';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

import { authTokenStore } from '@/configurations/axios.config';
import { authService } from '@/services/auth.service';
import { getFirebaseAuth, getFirebaseConfig, toFirebasePhoneNumber } from '@/services/firebase-phone-auth.service';
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
      return 'Khong ket noi duoc may chu. Kiem tra EXPO_PUBLIC_API_BASE_URL.';
    }

    const message = (error.response.data as ResponseError | undefined)?.message;
    if (error.response.status === 401 && !message) {
      return 'So dien thoai hoac mat khau chua dung.';
    }
    return message || fallbackMessage;
  }

  return fallbackMessage;
};

const getFirebaseErrorMessage = (error: unknown, fallbackMessage: string) => {
  const code = (error as { code?: string } | undefined)?.code;

  switch (code) {
    case 'auth/invalid-phone-number':
      return 'So dien thoai khong hop le.';
    case 'auth/too-many-requests':
      return 'Ban da thu qua nhieu lan. Vui long thu lai sau.';
    case 'auth/invalid-verification-code':
      return 'Ma OTP khong dung.';
    case 'auth/code-expired':
      return 'Ma OTP da het han.';
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
  const recaptchaVerifier = useRef<FirebaseRecaptchaVerifierModal | null>(null);

  const firebaseConfig = useMemo(() => {
    try {
      return getFirebaseConfig();
    } catch {
      return null;
    }
  }, []);

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
  const [forgotOtpVerificationId, setForgotOtpVerificationId] = useState('');
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
    setForgotOtpVerificationId('');
    setHasAutoSentForgotOtp(false);
    setPendingForgotPasswordPayload(null);
  };

  const handleLogin = async () => {
    const normalizedPhoneNumber = normalizePhone(phoneNumber);
    if (!normalizedPhoneNumber || !password.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Thieu thong tin',
        text2: 'Vui long nhap so dien thoai va mat khau.',
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
      const message = getApiErrorMessage(error, 'Vui long kiem tra lai tai khoan.');
      if (isEmailNotVerifiedError(message)) {
        setShowResendVerificationModal(true);
        Toast.show({
          type: 'error',
          text1: 'Tai khoan chua xac thuc email',
          text2: 'Vui long nhap email de gui lai link kich hoat.',
        });
        return;
      }

      Toast.show({
        type: 'error',
        text1: 'Dang nhap that bai',
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
        text1: 'So dien thoai chua dung',
        text2: 'Vui long nhap dung so dien thoai tai khoan can xac thuc.',
      });
      return;
    }

    if (!resendEmail.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Thieu email',
        text2: 'Vui long nhap email da dang ky.',
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
        text1: 'Da gui lai email xac thuc',
        text2: response.message || 'Vui long kiem tra hop thu email cua ban.',
      });
      setShowResendVerificationModal(false);
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Khong the gui email',
        text2: getApiErrorMessage(error, 'Vui long kiem tra lai so dien thoai hoac email.'),
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
        text1: 'Thieu so dien thoai',
        text2: 'Vui long nhap so dien thoai hop le.',
      });
      return;
    }

    if (!firebaseConfig) {
      Toast.show({
        type: 'error',
        text1: 'Thieu cau hinh Firebase',
        text2: 'Vui long them EXPO_PUBLIC_FIREBASE_* trong file .env.',
      });
      return;
    }

    setIsSendingForgotOtp(true);
    try {
      const provider = new PhoneAuthProvider(getFirebaseAuth());
      const firebasePhoneNumber = toFirebasePhoneNumber(targetPhone);
      const newVerificationId = await provider.verifyPhoneNumber(
        firebasePhoneNumber,
        recaptchaVerifier.current as never
      );
      setForgotOtpPhone(targetPhone);
      setForgotOtpVerificationId(newVerificationId);
      Toast.show({
        type: 'success',
        text1: 'Da gui OTP',
        text2: 'Vui long kiem tra SMS.',
      });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Gui OTP that bai',
        text2: getFirebaseErrorMessage(error, 'Khong the gui OTP. Vui long thu lai.'),
      });
    } finally {
      setIsSendingForgotOtp(false);
    }
  };

  const handleVerifyForgotOtpAndReset = async () => {
    if (!forgotOtpVerificationId) {
      Toast.show({
        type: 'error',
        text1: 'Chua gui OTP',
        text2: 'Vui long gui OTP truoc.',
      });
      return;
    }

    if (!forgotOtpCode.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Thieu ma OTP',
        text2: 'Vui long nhap ma OTP.',
      });
      return;
    }

    if (!pendingForgotPasswordPayload) {
      Toast.show({
        type: 'error',
        text1: 'Du lieu khong hop le',
        text2: 'Vui long thuc hien lai thao tac quen mat khau.',
      });
      return;
    }

    setIsVerifyingForgotOtp(true);
    try {
      const auth = getFirebaseAuth();
      const credential = PhoneAuthProvider.credential(forgotOtpVerificationId, forgotOtpCode.trim());
      const credentialResult = await signInWithCredential(auth, credential);
      const firebaseIdToken = await credentialResult.user.getIdToken();

      await authService.resetPasswordWithOtp({
        phoneNumber: pendingForgotPasswordPayload.phoneNumber,
        newPassword: pendingForgotPasswordPayload.newPassword,
        firebaseIdToken,
      });

      await signOut(auth);

      Toast.show({
        type: 'success',
        text1: 'Dat lai mat khau thanh cong',
        text2: 'Ban co the dang nhap bang mat khau moi.',
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
        text1: 'Xac thuc OTP/doi mat khau that bai',
        text2:
          firebaseCode?.startsWith('auth/')
            ? getFirebaseErrorMessage(error, 'Ma OTP khong hop le hoac da het han.')
            : getApiErrorMessage(error, 'Vui long kiem tra lai thong tin.'),
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
        text1: 'So dien thoai chua dung',
        text2: 'Vui long nhap dung so dien thoai tai khoan.',
      });
      return;
    }

    if (!strongPasswordRegex.test(forgotPasswordNewPassword.trim())) {
      Toast.show({
        type: 'error',
        text1: 'Mat khau chua hop le',
        text2: 'Mat khau toi thieu 8 ky tu, co chu hoa, chu thuong, so va ky tu dac biet.',
      });
      return;
    }

    if (forgotPasswordNewPassword.trim() !== forgotPasswordConfirmNewPassword.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Mat khau khong khop',
        text2: 'Vui long nhap trung khop mat khau xac nhan.',
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
    setForgotOtpVerificationId('');
    setHasAutoSentForgotOtp(false);
    setShowForgotOtpModal(true);
    setIsSubmittingForgotPassword(false);
  };

  const isForgotOtpBusy = isSendingForgotOtp || isVerifyingForgotOtp;

  return (
    <SafeAreaView className="flex-1 bg-slate-100" edges={['top', 'bottom']}>
      {firebaseConfig ? (
        <FirebaseRecaptchaVerifierModal
          ref={recaptchaVerifier}
          firebaseConfig={firebaseConfig}
          attemptInvisibleVerification
        />
      ) : null}

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
        <ScrollView className="flex-1 px-6" contentContainerClassName="grow pb-6" keyboardShouldPersistTaps="handled">
          <Pressable className="mt-1 h-10 w-10 items-center justify-center rounded-full border border-slate-300 bg-white" onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color="#111827" />
          </Pressable>

          <Text className="mt-8 text-center text-3xl font-bold text-slate-900">Dang nhap</Text>

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
              placeholder="Mat khau"
              placeholderTextColor="#9ca3af"
              secureTextEntry
              className="rounded-2xl border border-slate-300 bg-white px-4 py-4 text-base text-slate-900"
            />

            <Pressable className="self-end" onPress={() => setShowForgotPasswordModal(true)}>
              <Text className="text-sm font-semibold text-blue-600">Quen mat khau?</Text>
            </Pressable>

            <Pressable
              className={`mt-2 items-center justify-center rounded-full py-4 ${canSubmit ? 'bg-blue-600' : 'bg-slate-300'}`}
              onPress={handleLogin}
              disabled={!canSubmit}>
              <Text className="text-xl font-bold text-white">{isSubmitting ? 'Dang xu ly...' : 'Tiep tuc'}</Text>
            </Pressable>
          </View>

          <View className="mb-2 mt-auto flex-row flex-wrap items-center justify-center px-4">
            <Text className="text-base leading-6 text-slate-900">Ban chua co tai khoan? </Text>
            <Pressable onPress={() => router.push('/register')}>
              <Text className="text-base font-bold leading-6 text-blue-600">Tao tai khoan</Text>
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
            <Text className="text-lg font-bold text-slate-900">Xac thuc email tai khoan</Text>
            <Text className="mt-2 text-sm leading-5 text-slate-600">
              Tai khoan chua kich hoat. Nhap dung email da dang ky de gui lai link xac thuc.
            </Text>
            <TextInput
              value={resendEmail}
              onChangeText={setResendEmail}
              placeholder="Nhap email da dang ky"
              placeholderTextColor="#9ca3af"
              keyboardType="email-address"
              autoCapitalize="none"
              className="mt-4 rounded-xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-900"
            />
            <View className="mt-4 flex-row justify-end gap-2">
              <Pressable
                className="rounded-xl border border-slate-300 bg-white px-4 py-2.5"
                onPress={() => setShowResendVerificationModal(false)}>
                <Text className="font-medium text-slate-700">Dong</Text>
              </Pressable>
              <Pressable
                className={`rounded-xl px-4 py-2.5 ${isResendingVerification ? 'bg-sky-300' : 'bg-sky-500'}`}
                onPress={handleResendVerification}
                disabled={isResendingVerification}>
                <Text className="font-semibold text-white">
                  {isResendingVerification ? 'Dang gui...' : 'Gui lai email'}
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
            <Text className="text-lg font-bold text-slate-900">Quen mat khau</Text>
            <Text className="mt-2 text-sm leading-5 text-slate-600">
              Nhap so dien thoai va mat khau moi. Unicall se gui OTP de xac thuc truoc khi doi mat khau.
            </Text>
            <TextInput
              value={forgotPasswordPhone}
              onChangeText={setForgotPasswordPhone}
              placeholder="Nhap so dien thoai tai khoan"
              placeholderTextColor="#9ca3af"
              keyboardType="phone-pad"
              className="mt-4 rounded-xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-900"
            />
            <TextInput
              value={forgotPasswordNewPassword}
              onChangeText={setForgotPasswordNewPassword}
              placeholder="Mat khau moi"
              placeholderTextColor="#9ca3af"
              secureTextEntry
              className="mt-3 rounded-xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-900"
            />
            <TextInput
              value={forgotPasswordConfirmNewPassword}
              onChangeText={setForgotPasswordConfirmNewPassword}
              placeholder="Xac nhan mat khau moi"
              placeholderTextColor="#9ca3af"
              secureTextEntry
              className="mt-3 rounded-xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-900"
            />
            <View className="mt-4 flex-row justify-end gap-2">
              <Pressable
                className="rounded-xl border border-slate-300 bg-white px-4 py-2.5"
                onPress={() => setShowForgotPasswordModal(false)}>
                <Text className="font-medium text-slate-700">Dong</Text>
              </Pressable>
              <Pressable
                className={`rounded-xl px-4 py-2.5 ${isSubmittingForgotPassword ? 'bg-sky-300' : 'bg-sky-500'}`}
                onPress={handleForgotPassword}
                disabled={isSubmittingForgotPassword}>
                <Text className="font-semibold text-white">
                  {isSubmittingForgotPassword ? 'Dang xu ly...' : 'Gui OTP'}
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
            <Text className="text-lg font-bold text-slate-900">Xac thuc OTP</Text>
            <Text className="mt-2 text-sm leading-5 text-slate-600">
              Vui long nhap ma OTP da gui den so <Text className="font-semibold">{forgotOtpPhone || '*****'}</Text>.
            </Text>
            <TextInput
              value={forgotOtpCode}
              onChangeText={setForgotOtpCode}
              placeholder="Nhap ma OTP"
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
                <Text className="font-medium text-slate-700">Huy</Text>
              </Pressable>
              <Pressable
                className={`rounded-xl px-4 py-2.5 ${isSendingForgotOtp ? 'bg-sky-300' : 'bg-slate-600'}`}
                onPress={() => void handleSendForgotOtp()}
                disabled={isSendingForgotOtp}>
                <Text className="font-semibold text-white">{isSendingForgotOtp ? 'Dang gui...' : 'Gui lai OTP'}</Text>
              </Pressable>
              <Pressable
                className={`rounded-xl px-4 py-2.5 ${isVerifyingForgotOtp ? 'bg-sky-300' : 'bg-sky-500'}`}
                onPress={() => void handleVerifyForgotOtpAndReset()}
                disabled={isVerifyingForgotOtp || !forgotOtpVerificationId || !forgotOtpCode.trim()}>
                <Text className="font-semibold text-white">
                  {isVerifyingForgotOtp ? 'Dang xac thuc...' : 'Xac thuc'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
