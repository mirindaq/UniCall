import Ionicons from "@expo/vector-icons/Ionicons";
import { AxiosError } from "axios";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

import { AppStatusBarBlue } from "@/components/ui/app-status-bar-blue";
import { authTokenStore } from "@/configurations/axios.config";
import { userService } from "@/services/user.service";
import type { ResponseError } from "@/types/api-response";

const PHONE_MAX_LENGTH = 15;
const REASON_MAX_LENGTH = 200;

const normalizePhoneInput = (value: string) =>
  value.replace(/[^\d+]/g, "").slice(0, PHONE_MAX_LENGTH);

export default function AccountDeleteScreen() {
  const router = useRouter();
  const { phone } = useLocalSearchParams<{ phone?: string }>();

  const [step, setStep] = useState<1 | 2>(1);
  const [phoneNumber, setPhoneNumber] = useState(
    typeof phone === "string" ? phone : "",
  );
  const [reason, setReason] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const isStepOneValid = useMemo(() => {
    return phoneNumber.trim().length > 0 && reason.trim().length > 0;
  }, [phoneNumber, reason]);

  const canDeleteAccount = useMemo(() => {
    return password.trim().length > 0 && !isSubmittingRequest && !isLoggingOut;
  }, [isLoggingOut, isSubmittingRequest, password]);

  const reasonInputHeightClass = useMemo(() => {
    if (reason.length > 120 || reason.includes("\n\n")) {
      return "h-[120px]";
    }
    if (reason.length > 40 || reason.includes("\n")) {
      return "h-[80px]";
    }
    return "h-[44px]";
  }, [reason]);

  const handleBack = () => {
    if (step === 2) {
      setStep(1);
      return;
    }
    router.back();
  };

  const getApiErrorMessage = (error: unknown, fallbackMessage: string) => {
    if (error instanceof AxiosError) {
      const message = (error.response?.data as ResponseError | undefined)?.message;
      return message || fallbackMessage;
    }
    return fallbackMessage;
  };

  const handleRequestAccountDeletion = async () => {
    if (!canDeleteAccount) {
      return;
    }

    setIsSubmittingRequest(true);
    try {
      await userService.requestAccountDeletion({
        phoneNumber: phoneNumber.trim(),
        reason: reason.trim(),
        password: password.trim(),
      });
      setShowSuccessModal(true);
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "Không thể yêu cầu xóa tài khoản",
        text2: getApiErrorMessage(error, "Vui lòng kiểm tra lại thông tin và thử lại."),
      });
    } finally {
      setIsSubmittingRequest(false);
    }
  };

  const handleAcknowledgeAndLogout = async () => {
    if (isLoggingOut) {
      return;
    }

    setIsLoggingOut(true);
    await authTokenStore.clear();
    router.replace("/login");
  };

  return (
    <View className="flex-1 bg-[#f4f5f7]">
      <AppStatusBarBlue />
      <SafeAreaView edges={["top"]} className="bg-[#1e98f3]" />

      <View className="bg-[#1e98f3] px-4 pb-3 pt-2">
        <View className="flex-row items-center">
          <Pressable
            className="mr-2 h-10 w-10 items-center justify-center rounded-full"
            onPress={handleBack}
          >
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
          </Pressable>
          <Text allowFontScaling={false} className="text-[17px] font-semibold text-white">
            Xóa tài khoản
          </Text>
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        <ScrollView
          className="flex-1"
          contentContainerClassName="pb-8"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="bg-[#e9eaed] px-5 py-4">
            <Text allowFontScaling={false} className="text-[16px] leading-7 text-slate-800">
              Bạn không thể khôi phục dữ liệu của tài khoản cũ khi đăng ký tài khoản mới bằng số điện thoại này.
            </Text>
          </View>

          {step === 1 ? (
            <View className="px-5 pt-7">
              <Text allowFontScaling={false} className="text-[17px] font-semibold text-slate-500">
                Để xóa tài khoản này, nhập số điện thoại:
              </Text>

              <TextInput
                value={phoneNumber}
                onChangeText={(value) => setPhoneNumber(normalizePhoneInput(value))}
                keyboardType="phone-pad"
                placeholder="Nhập số điện thoại"
                placeholderTextColor="#9ca3af"
                className="mt-5 border-b border-[#1eb9df] pb-3 text-[17px] text-slate-700"
              />

              <View className="mt-8 flex-row items-center justify-between">
                <Text allowFontScaling={false} className="text-[17px] font-semibold text-slate-500">
                  Lý do xóa tài khoản:
                </Text>
                <Text allowFontScaling={false} className="text-[16px] text-slate-400">
                  {reason.length}/{REASON_MAX_LENGTH}
                </Text>
              </View>

              <TextInput
                value={reason}
                onChangeText={(value) => setReason(value.slice(0, REASON_MAX_LENGTH))}
                placeholder="Nhập nội dung"
                placeholderTextColor="#9ca3af"
                multiline
                textAlignVertical="top"
                className={`mt-4 border-b border-slate-300 pb-3 text-[17px] text-slate-700 ${reasonInputHeightClass}`}
              />

              <Pressable
                className={`mt-8 h-12 items-center justify-center rounded-full ${
                  isStepOneValid ? "bg-[#8ccdf0]" : "bg-[#c5d8e8]"
                }`}
                disabled={!isStepOneValid}
                onPress={() => setStep(2)}
              >
                <Text allowFontScaling={false} className="text-[17px] font-semibold text-white">
                  TIẾP TỤC
                </Text>
              </Pressable>
            </View>
          ) : (
            <View className="px-5 pt-7">
              <View className="flex-row items-center justify-between">
                <Text allowFontScaling={false} className="text-[17px] font-semibold text-slate-500">
                  Xác nhận mật khẩu:
                </Text>
                <Pressable onPress={() => setShowPassword((prev) => !prev)}>
                  <Text allowFontScaling={false} className="text-[17px] font-semibold text-slate-500">
                    {showPassword ? "ẨN" : "HIỆN"}
                  </Text>
                </Pressable>
              </View>

              <TextInput
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                placeholder="Nhập mật khẩu"
                placeholderTextColor="#9ca3af"
                className="mt-4 border-b border-[#1eb9df] pb-3 text-[17px] text-slate-700"
              />

              <Text allowFontScaling={false} className="mt-8 text-[15px] leading-6 text-slate-500">
                Hoàn tất xóa tài khoản nghĩa là bạn rút lại sự đồng ý với việc xử lý dữ liệu cá nhân theo{" "}
                <Text className="text-[#1e98f3]">Điều khoản sử dụng của UniCall</Text>
              </Text>

              <Pressable
                className={`mt-5 h-12 items-center justify-center rounded-full ${
                  canDeleteAccount ? "bg-[#f49ca4]" : "bg-[#f6c9cd]"
                }`}
                disabled={!canDeleteAccount}
                onPress={() => {
                  void handleRequestAccountDeletion();
                }}
              >
                <Text allowFontScaling={false} className="text-[17px] font-semibold text-white">
                  {isSubmittingRequest ? "ĐANG XỬ LÝ..." : "XÓA TÀI KHOẢN"}
                </Text>
              </Pressable>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal transparent animationType="fade" visible={showSuccessModal}>
        <View className="flex-1 items-center justify-center bg-black/45 px-6">
          <View className="w-full max-w-md rounded-2xl bg-white p-5">
            <Text allowFontScaling={false} className="text-[18px] font-bold text-slate-900">
              Yêu cầu xóa tài khoản đã được ghi nhận
            </Text>
            <Text allowFontScaling={false} className="mt-3 text-[15px] leading-6 text-slate-600">
              Tài khoản của bạn đang ở trạng thái chờ xóa. Nếu trong 30 ngày tới bạn không đăng nhập lại, tài khoản sẽ bị
              xóa vĩnh viễn khỏi hệ thống.
            </Text>
            <Pressable
              className={`mt-5 h-11 items-center justify-center rounded-xl ${isLoggingOut ? "bg-sky-300" : "bg-sky-500"}`}
              onPress={() => {
                void handleAcknowledgeAndLogout();
              }}
              disabled={isLoggingOut}
            >
              <Text allowFontScaling={false} className="text-[16px] font-semibold text-white">
                {isLoggingOut ? "Đang đăng xuất..." : "Xác nhận"}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}
