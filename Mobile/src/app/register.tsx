import Ionicons from '@expo/vector-icons/Ionicons';
import { AxiosError } from 'axios';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

import {
  getFirebaseAuth,
  toFirebasePhoneNumber,
} from '@/services/firebase-phone-auth.service';
import { authService } from '@/services/auth.service';
import type { ResponseError } from '@/types/api-response';
import type { Gender, RegisterRequest } from '@/types/auth';

type RegisterPayloadWithoutOtp = Omit<RegisterRequest, 'firebaseIdToken'>;

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

const formatDateISO = (date: Date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatDateDisplay = (date: Date) => {
  const day = `${date.getDate()}`.padStart(2, '0');
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

const getApiErrorMessage = (error: unknown, fallbackMessage: string) => {
  if (error instanceof AxiosError) {
    if (!error.response) {
      return 'Không kết nối được máy chủ. Kiểm tra EXPO_PUBLIC_API_BASE_URL.';
    }

    const message = (error.response.data as ResponseError | undefined)?.message;
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

export default function RegisterScreen() {
  const router = useRouter();

  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('@gmail.com');
  const [lastName, setLastName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [gender, setGender] = useState<Gender>('MALE');
  const [dateOfBirth, setDateOfBirth] = useState<Date | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptedTerm1, setAcceptedTerm1] = useState(false);
  const [acceptedTerm2, setAcceptedTerm2] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDatePickerVisible, setDatePickerVisible] = useState(false);

  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpPhoneNumber, setOtpPhoneNumber] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<any | null>(null);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [hasAutoSentOtp, setHasAutoSentOtp] = useState(false);
  const [pendingRegisterPayload, setPendingRegisterPayload] = useState<RegisterPayloadWithoutOtp | null>(null);

  const canSubmit = useMemo(() => {
    return (
      phoneNumber.trim().length > 0 &&
      email.trim().length > 0 &&
      lastName.trim().length > 0 &&
      firstName.trim().length > 0 &&
      dateOfBirth !== null &&
      password.trim().length >= 8 &&
      confirmPassword.trim().length > 0 &&
      acceptedTerm1 &&
      acceptedTerm2 &&
      !isSubmitting
    );
  }, [
    acceptedTerm1,
    acceptedTerm2,
    confirmPassword,
    dateOfBirth,
    email,
    firstName,
    isSubmitting,
    lastName,
    password,
    phoneNumber,
  ]);

  const resetOtpFlow = () => {
    setOtpCode('');
    setOtpPhoneNumber('');
    setConfirmationResult(null);
    setHasAutoSentOtp(false);
    setPendingRegisterPayload(null);
  };

  const handleSendOtp = async (phoneNumberOverride?: string) => {
    const targetPhone = (phoneNumberOverride ?? otpPhoneNumber).trim();
    if (!targetPhone) {
      Toast.show({
        type: 'error',
        text1: 'Thiếu số điện thoại',
        text2: 'Vui lòng nhập số điện thoại hợp lệ.',
      });
      return;
    }

    setIsSendingOtp(true);
    try {
      const firebasePhoneNumber = toFirebasePhoneNumber(targetPhone);
      const nextConfirmation = await getFirebaseAuth().signInWithPhoneNumber(firebasePhoneNumber);
      setOtpPhoneNumber(targetPhone);
      setConfirmationResult(nextConfirmation);
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
      setIsSendingOtp(false);
    }
  };

  const handleVerifyOtpAndRegister = async () => {
    if (!confirmationResult) {
      Toast.show({
        type: 'error',
        text1: 'Chưa gửi OTP',
        text2: 'Vui lòng gửi OTP trước.',
      });
      return;
    }
    if (!otpCode.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Thiếu mã OTP',
        text2: 'Vui lòng nhập mã OTP.',
      });
      return;
    }
    if (!pendingRegisterPayload) {
      Toast.show({
        type: 'error',
        text1: 'Dữ liệu không hợp lệ',
        text2: 'Vui lòng đăng ký lại.',
      });
      return;
    }

    setIsVerifyingOtp(true);
    try {
      const auth = getFirebaseAuth();
      const credentialResult = await confirmationResult.confirm(otpCode.trim());
      const firebaseIdToken = await credentialResult.user.getIdToken();

      await authService.register({
        ...pendingRegisterPayload,
        firebaseIdToken,
      });

      await auth.signOut();

      Toast.show({
        type: 'success',
        text1: 'Đăng ký thành công',
        text2: 'Vui lòng kiểm tra email để kích hoạt tài khoản trước khi đăng nhập.',
      });
      setShowOtpModal(false);
      resetOtpFlow();
      router.replace('/login');
    } catch (error) {
      const firebaseCode = (error as { code?: string } | undefined)?.code;
      Toast.show({
        type: 'error',
        text1: 'Xác thực OTP/Đăng ký thất bại',
        text2:
          firebaseCode?.startsWith('auth/')
            ? getFirebaseErrorMessage(error, 'Mã OTP không hợp lệ hoặc đã hết hạn.')
            : getApiErrorMessage(error, 'Vui lòng kiểm tra lại thông tin.'),
      });
    } finally {
      setIsVerifyingOtp(false);
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (!showOtpModal || hasAutoSentOtp || !otpPhoneNumber) {
      return;
    }
    const timer = setTimeout(() => {
      setHasAutoSentOtp(true);
      void handleSendOtp(otpPhoneNumber);
    }, 150);

    return () => clearTimeout(timer);
  }, [showOtpModal, hasAutoSentOtp, otpPhoneNumber]);

  const handleRegister = async () => {
    const normalizedPhoneNumber = normalizePhone(phoneNumber);

    if (!isValidPhoneNumber(normalizedPhoneNumber)) {
      Toast.show({
        type: 'error',
        text1: 'Số điện thoại chưa đúng',
        text2: 'Vui lòng nhập số dạng 0xxxxxxxxx hoặc +84xxxxxxxxx.',
      });
      return;
    }

    if (!strongPasswordRegex.test(password.trim())) {
      Toast.show({
        type: 'error',
        text1: 'Mật khẩu chưa hợp lệ',
        text2: 'Mật khẩu tối thiểu 8 ký tự, có chữ hoa, chữ thường, số và ký tự đặc biệt.',
      });
      return;
    }

    if (password.trim() !== confirmPassword.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Mật khẩu không khớp',
        text2: 'Vui lòng nhập trùng khớp mật khẩu xác nhận.',
      });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      Toast.show({
        type: 'error',
        text1: 'Email chưa hợp lệ',
        text2: 'Vui lòng nhập đúng định dạng email.',
      });
      return;
    }

    if (!dateOfBirth) {
      Toast.show({
        type: 'error',
        text1: 'Thiếu ngày sinh',
        text2: 'Vui lòng chọn ngày sinh.',
      });
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (dateOfBirth >= today) {
      Toast.show({
        type: 'error',
        text1: 'Ngày sinh chưa hợp lệ',
        text2: 'Ngày sinh phải là ngày trong quá khứ.',
      });
      return;
    }

    if (!lastName.trim() || !firstName.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Họ tên chưa hợp lệ',
        text2: 'Vui lòng nhập đầy đủ cả họ và tên.',
      });
      return;
    }

    if (!acceptedTerm1 || !acceptedTerm2) {
      Toast.show({
        type: 'error',
        text1: 'Thiếu xác nhận',
        text2: 'Vui lòng đồng ý các điều khoản để tiếp tục.',
      });
      return;
    }

    setIsSubmitting(true);
    setPendingRegisterPayload({
      phoneNumber: normalizedPhoneNumber,
      email: normalizedEmail,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      gender,
      dateOfBirth: formatDateISO(dateOfBirth),
      password: password.trim(),
    });
    setOtpPhoneNumber(normalizedPhoneNumber);
    setOtpCode('');
    setConfirmationResult(null);
    setHasAutoSentOtp(false);
    setShowOtpModal(true);
  };

  const isOtpBusy = isSendingOtp || isVerifyingOtp;

  return (
    <SafeAreaView className="flex-1 bg-slate-100" edges={['top', 'bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
        <ScrollView className="flex-1 px-6" contentContainerClassName="grow pb-6" keyboardShouldPersistTaps="handled">
          <Pressable
            className="mt-1 h-10 w-10 items-center justify-center rounded-full border border-slate-300 bg-white"
            onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color="#111827" />
          </Pressable>

          <Text className="mt-8 text-center text-3xl font-extrabold tracking-tight text-slate-900">Tạo tài khoản UniCall</Text>
          <Text className="mt-2 text-center text-base text-slate-500">Tạo tài khoản mới để bắt đầu kết nối</Text>

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

            <View className="flex-row gap-2.5">
              <TextInput
                value={lastName}
                onChangeText={setLastName}
                placeholder="Họ"
                placeholderTextColor="#9ca3af"
                className="flex-1 rounded-2xl border border-slate-300 bg-white px-4 py-4 text-base text-slate-900"
              />

              <TextInput
                value={firstName}
                onChangeText={setFirstName}
                placeholder="Tên"
                placeholderTextColor="#9ca3af"
                className="flex-1 rounded-2xl border border-slate-300 bg-white px-4 py-4 text-base text-slate-900"
              />
            </View>

            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="Email (ví dụ: abc@gmail.com)"
              placeholderTextColor="#9ca3af"
              keyboardType="email-address"
              autoCapitalize="none"
              className="rounded-2xl border border-slate-300 bg-white px-4 py-4 text-base text-slate-900"
            />

            <View className="flex-row gap-2.5">
              <GenderOption label="Nam" selected={gender === 'MALE'} onPress={() => setGender('MALE')} />
              <GenderOption label="Nữ" selected={gender === 'FEMALE'} onPress={() => setGender('FEMALE')} />
              <GenderOption label="Khác" selected={gender === 'OTHER'} onPress={() => setGender('OTHER')} />
            </View>

            <Pressable
              className="flex-row items-center justify-between rounded-2xl border border-slate-300 bg-white px-4 py-4"
              onPress={() => setDatePickerVisible(true)}>
              <Text className={`${dateOfBirth ? 'text-slate-900' : 'text-slate-400'} text-base`}>
                {dateOfBirth ? formatDateDisplay(dateOfBirth) : 'Chọn ngày sinh'}
              </Text>
              <Ionicons name="calendar-outline" size={20} color="#475569" />
            </Pressable>

            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Mật khẩu (>=8 ký tự, hoa, thường, số, ký tự đặc biệt)"
              placeholderTextColor="#9ca3af"
              secureTextEntry
              className="rounded-2xl border border-slate-300 bg-white px-4 py-4 text-base text-slate-900"
            />

            <TextInput
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Xác nhận mật khẩu"
              placeholderTextColor="#9ca3af"
              secureTextEntry
              className="rounded-2xl border border-slate-300 bg-white px-4 py-4 text-base text-slate-900"
            />

            <Pressable className="mt-1 flex-row items-start" onPress={() => setAcceptedTerm1((value) => !value)}>
              <Checkbox checked={acceptedTerm1} />
              <Text className="ml-3 flex-1 text-sm leading-6 text-slate-900">
                Tôi đồng ý với <Text className="font-bold text-blue-600">điều khoản sử dụng UniCall</Text>
              </Text>
            </Pressable>

            <Pressable className="flex-row items-start" onPress={() => setAcceptedTerm2((value) => !value)}>
              <Checkbox checked={acceptedTerm2} />
              <Text className="ml-3 flex-1 text-sm leading-6 text-slate-900">
                Tôi đồng ý với <Text className="font-bold text-blue-600">điều khoản mạng xã hội UniCall</Text>
              </Text>
            </Pressable>

            <Pressable
              className={`mt-2 items-center justify-center rounded-full py-4 ${
                canSubmit ? 'bg-blue-600' : 'bg-slate-300'
              }`}
              onPress={handleRegister}
              disabled={!canSubmit}>
              <Text className={`text-xl font-bold ${canSubmit ? 'text-white' : 'text-slate-500'}`}>
                {isSubmitting ? 'Đang xử lý...' : 'Tiếp tục'}
              </Text>
            </Pressable>
          </View>

          <View className="mb-2 mt-auto flex-row flex-wrap items-center justify-center px-4">
            <Text className="text-base leading-6 text-slate-900">Bạn đã có tài khoản? </Text>
            <Pressable onPress={() => router.replace('/login')}>
              <Text className="text-base font-bold leading-6 text-blue-600">Đăng nhập ngay</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        transparent
        animationType="fade"
        visible={showOtpModal}
        onRequestClose={() => {
          if (isOtpBusy) return;
          setShowOtpModal(false);
          resetOtpFlow();
          setIsSubmitting(false);
        }}>
        <View className="flex-1 items-center justify-center bg-black/45 px-5">
          <View className="w-full max-w-md rounded-2xl bg-white p-5">
            <Text className="text-lg font-bold text-slate-900">Xác thực OTP</Text>
            <Text className="mt-2 text-sm leading-5 text-slate-600">
              Vui lòng nhập mã OTP đã gửi đến số <Text className="font-semibold">{otpPhoneNumber || '*****'}</Text>.
            </Text>

            <TextInput
              value={otpCode}
              onChangeText={setOtpCode}
              placeholder="Nhập mã OTP"
              placeholderTextColor="#9ca3af"
              keyboardType="number-pad"
              className="mt-4 rounded-xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-900"
            />

            <View className="mt-4 flex-row justify-end gap-2">
              <Pressable
                className="rounded-xl border border-slate-300 bg-white px-4 py-2.5"
                onPress={() => {
                  if (isOtpBusy) return;
                  setShowOtpModal(false);
                  resetOtpFlow();
                  setIsSubmitting(false);
                }}>
                <Text className="font-medium text-slate-700">Hủy</Text>
              </Pressable>

              <Pressable
                className={`rounded-xl px-4 py-2.5 ${isSendingOtp ? 'bg-sky-300' : 'bg-slate-600'}`}
                onPress={() => void handleSendOtp()}
                disabled={isSendingOtp}>
                <Text className="font-semibold text-white">{isSendingOtp ? 'Đang gửi...' : 'Gửi lại OTP'}</Text>
              </Pressable>

              <Pressable
                className={`rounded-xl px-4 py-2.5 ${isVerifyingOtp ? 'bg-sky-300' : 'bg-sky-500'}`}
                onPress={() => void handleVerifyOtpAndRegister()}
                disabled={isVerifyingOtp || !confirmationResult || !otpCode.trim()}>
                <Text className="font-semibold text-white">
                  {isVerifyingOtp ? 'Đang xác thực...' : 'Xác thực'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <DateTimePickerModal
        isVisible={isDatePickerVisible}
        mode="date"
        maximumDate={new Date(Date.now() - 24 * 60 * 60 * 1000)}
        date={dateOfBirth ?? new Date(2000, 0, 1)}
        onConfirm={(selectedDate) => {
          setDateOfBirth(selectedDate);
          setDatePickerVisible(false);
        }}
        onCancel={() => setDatePickerVisible(false)}
      />
    </SafeAreaView>
  );
}

function GenderOption({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      className={`flex-1 items-center justify-center rounded-full border py-2.5 ${
        selected ? 'border-blue-600 bg-blue-50' : 'border-slate-300 bg-white'
      }`}
      onPress={onPress}>
      <Text className={`font-semibold ${selected ? 'text-blue-600' : 'text-slate-700'}`}>{label}</Text>
    </Pressable>
  );
}

function Checkbox({ checked }: { checked: boolean }) {
  return (
    <View
      className={`h-7 w-7 items-center justify-center rounded-[10px] border ${
        checked ? 'border-blue-600 bg-blue-600' : 'border-slate-300 bg-slate-50'
      }`}>
      {checked ? <Ionicons name="checkmark" size={16} color="#ffffff" /> : null}
    </View>
  );
}
