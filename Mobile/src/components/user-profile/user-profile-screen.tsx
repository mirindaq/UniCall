import Ionicons from '@expo/vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

import { authService } from '@/services/auth.service';
import type { UpdateMyProfileRequest, UserProfile } from '@/types/user';
import { dateToIsoDate, formatDateVi, isoDateToDate } from '@/utils/date.util';
import { mapGenderToLabel } from '@/utils/gender.util';

import { UserProfileTopBar } from './user-profile-top-bar';

type UserProfileScreenProps = {
  profile: UserProfile | null;
  isLoading: boolean;
  isSelf: boolean;
  onBack: () => void;
  onSaveProfile: (payload: UpdateMyProfileRequest) => Promise<void>;
  onUploadAvatar: (fileUri: string) => Promise<void>;
};

type EditableGender = 'MALE' | 'FEMALE' | 'OTHER';

const toDisplayName = (profile: UserProfile | null) => {
  if (!profile) {
    return '--';
  }
  return `${profile.lastName ?? ''} ${profile.firstName ?? ''}`.trim() || profile.phoneNumber || '--';
};

const toInitials = (profile: UserProfile | null) => {
  if (!profile) {
    return 'U';
  }
  const a = profile.firstName?.[0] ?? '';
  const b = profile.lastName?.[0] ?? '';
  const fromName = `${a}${b}`.toUpperCase();
  if (fromName) {
    return fromName;
  }
  return profile.phoneNumber?.slice(0, 1).toUpperCase() || 'U';
};

export function UserProfileScreen({
  profile,
  isLoading,
  isSelf,
  onBack,
  onSaveProfile,
  onUploadAvatar,
}: UserProfileScreenProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isDatePickerVisible, setDatePickerVisible] = useState(false);
  const [form, setForm] = useState<UpdateMyProfileRequest>({
    firstName: '',
    lastName: '',
    gender: 'MALE',
    dateOfBirth: '',
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    if (!profile) {
      return;
    }
    setForm({
      firstName: profile.firstName ?? '',
      lastName: profile.lastName ?? '',
      gender: (profile.gender?.toUpperCase() || 'MALE') as EditableGender,
      dateOfBirth: profile.dateOfBirth ?? '',
    });
  }, [profile]);

  const displayName = useMemo(() => toDisplayName(profile), [profile]);
  const initials = useMemo(() => toInitials(profile), [profile]);
  const selectedDate = useMemo(() => isoDateToDate(form.dateOfBirth), [form.dateOfBirth]);

  const handlePickAvatar = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Toast.show({
        type: 'error',
        text1: 'Thiếu quyền truy cập ảnh',
        text2: 'Vui lòng cấp quyền thư viện ảnh để đổi avatar.',
      });
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.9,
    });

    if (result.canceled || result.assets.length === 0) {
      return;
    }

    setIsUploadingAvatar(true);
    try {
      await onUploadAvatar(result.assets[0].uri);
      Toast.show({
        type: 'success',
        text1: 'Đã cập nhật ảnh đại diện',
      });
    } catch {
      Toast.show({
        type: 'error',
        text1: 'Cập nhật avatar thất bại',
      });
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleSave = async () => {
    if (!form.firstName.trim() || !form.lastName.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Họ tên không hợp lệ',
      });
      return;
    }
    if (!form.dateOfBirth) {
      Toast.show({
        type: 'error',
        text1: 'Vui lòng chọn ngày sinh',
      });
      return;
    }

    setIsSaving(true);
    try {
      await onSaveProfile({
        ...form,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
      });
      setIsEditing(false);
      Toast.show({
        type: 'success',
        text1: 'Cập nhật thông tin thành công',
      });
    } catch {
      Toast.show({
        type: 'error',
        text1: 'Cập nhật thông tin thất bại',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!profile?.phoneNumber) {
      return;
    }
    if (!passwordForm.currentPassword.trim()) {
      Toast.show({ type: 'error', text1: 'Vui lòng nhập mật khẩu hiện tại' });
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      Toast.show({ type: 'error', text1: 'Mật khẩu mới tối thiểu 6 ký tự' });
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      Toast.show({ type: 'error', text1: 'Xác nhận mật khẩu không khớp' });
      return;
    }
    if (passwordForm.currentPassword === passwordForm.newPassword) {
      Toast.show({ type: 'error', text1: 'Mật khẩu mới phải khác mật khẩu cũ' });
      return;
    }

    setIsChangingPassword(true);
    try {
      await authService.changePassword({
        phoneNumber: profile.phoneNumber,
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setShowChangePassword(false);
      Toast.show({ type: 'success', text1: 'Đổi mật khẩu thành công' });
    } catch {
      Toast.show({
        type: 'error',
        text1: 'Đổi mật khẩu thất bại',
        text2: 'Vui lòng kiểm tra lại mật khẩu hiện tại.',
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <View className="flex-1 bg-slate-100">
      <SafeAreaView edges={['top']} className="bg-[#1e98f3]" />
      <View className="h-52 bg-[#1e98f3]">
        <UserProfileTopBar title="Thông tin cá nhân" dark onBack={onBack} />
      </View>

      <View className="-mt-16 items-center">
        <Pressable
          disabled={!isSelf || isUploadingAvatar}
          onPress={() => void handlePickAvatar()}
          className="relative rounded-full">
          {profile?.avatar ? (
            <Image source={{ uri: profile.avatar }} className="h-32 w-32 rounded-full border-4 border-white bg-white" />
          ) : (
            <View className="h-32 w-32 items-center justify-center rounded-full border-4 border-white bg-slate-800">
              <Text className="text-4xl font-bold text-white">{initials}</Text>
            </View>
          )}

          {isSelf ? (
            <View className="absolute -bottom-1 -right-1 h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white">
              {isUploadingAvatar ? (
                <ActivityIndicator size="small" color="#0284c7" />
              ) : (
                <Ionicons name="pencil" size={16} color="#334155" />
              )}
            </View>
          ) : null}
        </Pressable>
        <Text className="mt-4 text-center text-2xl font-bold text-slate-900">{displayName}</Text>
        {isSelf ? (
          <View className="mt-4 mb-4 flex-row justify-end">
            <Pressable
              onPress={() => (isEditing ? void handleSave() : setIsEditing(true))}
              disabled={isSaving}
              className={`rounded-full px-4 py-2 ${isEditing ? 'bg-sky-600' : 'bg-white border border-slate-300'}`}>
              <Text className={`font-semibold ${isEditing ? 'text-white' : 'text-slate-700'}`}>
                {isEditing ? (isSaving ? 'Đang lưu...' : 'Lưu') : 'Chỉnh sửa'}
              </Text>
            </Pressable>
          </View>
        ) : null}

      </View>

      <ScrollView className="flex-1 px-4" contentContainerClassName="pb-8 pt-4" showsVerticalScrollIndicator={false}>

        {isLoading ? (
          <View className="mt-10 items-center">
            <ActivityIndicator size="large" color="#0284c7" />
            <Text className="mt-3 text-slate-500">Đang tải thông tin...</Text>
          </View>
        ) : !profile ? (
          <View className="mt-10 items-center">
            <Text className="text-slate-500">Không có dữ liệu người dùng.</Text>
          </View>
        ) : (
          <View className="gap-4">

            <ProfileField label="Số điện thoại" value={profile.phoneNumber} readonly />
            <ProfileField label="Email" value={profile.email} readonly />

            <EditableField
              enabled={isSelf && isEditing}
              label="Họ"
              value={isEditing ? form.lastName : profile.lastName}
              onChange={(value) => setForm((prev) => ({ ...prev, lastName: value }))}
            />
            <EditableField
              enabled={isSelf && isEditing}
              label="Tên"
              value={isEditing ? form.firstName : profile.firstName}
              onChange={(value) => setForm((prev) => ({ ...prev, firstName: value }))}
            />

            <View className="rounded-2xl bg-white px-4 py-3">
              <Text className="mb-1 text-sm font-medium text-slate-500">Giới tính</Text>
              {isSelf && isEditing ? (
                <View className="flex-row gap-2">
                  {(['MALE', 'FEMALE', 'OTHER'] as EditableGender[]).map((option) => (
                    <Pressable
                      key={option}
                      className={`flex-1 items-center rounded-full border px-3 py-2 ${form.gender === option ? 'border-sky-600 bg-sky-50' : 'border-slate-300'
                        }`}
                      onPress={() => setForm((prev) => ({ ...prev, gender: option }))}>
                      <Text className={`${form.gender === option ? 'text-sky-600' : 'text-slate-700'}`}>
                        {mapGenderToLabel(option)}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              ) : (
                <Text className="text-base text-slate-900">{mapGenderToLabel(profile.gender)}</Text>
              )}
            </View>

            <Pressable
              disabled={!(isSelf && isEditing)}
              className={`rounded-2xl px-4 py-3 ${isSelf && isEditing ? 'bg-white' : 'bg-white'}`}
              onPress={() => setDatePickerVisible(true)}>
              <Text className="mb-1 text-sm font-medium text-slate-500">Ngày sinh</Text>
              <View className="flex-row items-center justify-between">
                <Text className="text-base text-slate-900">
                  {isSelf && isEditing ? formatDateVi(form.dateOfBirth) : formatDateVi(profile.dateOfBirth)}
                </Text>
                {isSelf && isEditing ? <Ionicons name="calendar-outline" size={18} color="#475569" /> : null}
              </View>
            </Pressable>

            {isSelf ? (
              <View className="mt-1 rounded-2xl bg-white px-4 py-3">
                <View className="flex-row items-center justify-between">
                  <Text className="text-base font-semibold text-slate-900">Bảo mật tài khoản</Text>
                  <Pressable onPress={() => setShowChangePassword((prev) => !prev)}>
                    <Text className="font-semibold text-sky-600">{showChangePassword ? 'Đóng' : 'Đổi mật khẩu'}</Text>
                  </Pressable>
                </View>

                {showChangePassword ? (
                  <View className="mt-3 gap-3">
                    <PasswordInput
                      value={passwordForm.currentPassword}
                      onChange={(value) => setPasswordForm((prev) => ({ ...prev, currentPassword: value }))}
                      placeholder="Mật khẩu hiện tại"
                    />
                    <PasswordInput
                      value={passwordForm.newPassword}
                      onChange={(value) => setPasswordForm((prev) => ({ ...prev, newPassword: value }))}
                      placeholder="Mật khẩu mới"
                    />
                    <PasswordInput
                      value={passwordForm.confirmPassword}
                      onChange={(value) => setPasswordForm((prev) => ({ ...prev, confirmPassword: value }))}
                      placeholder="Xác nhận mật khẩu mới"
                    />
                    <Pressable
                      className={`items-center rounded-xl py-2.5 ${isChangingPassword ? 'bg-sky-300' : 'bg-sky-600'}`}
                      disabled={isChangingPassword}
                      onPress={() => void handleChangePassword()}>
                      <Text className="font-semibold text-white">
                        {isChangingPassword ? 'Đang đổi...' : 'Cập nhật mật khẩu'}
                      </Text>
                    </Pressable>
                  </View>
                ) : null}
              </View>
            ) : null}
          </View>
        )}
      </ScrollView>

      <DateTimePickerModal
        isVisible={isDatePickerVisible}
        mode="date"
        date={selectedDate ?? new Date(2000, 0, 1)}
        maximumDate={new Date(Date.now() - 24 * 60 * 60 * 1000)}
        onConfirm={(date) => {
          setForm((prev) => ({ ...prev, dateOfBirth: dateToIsoDate(date) }));
          setDatePickerVisible(false);
        }}
        onCancel={() => setDatePickerVisible(false)}
      />

      <SafeAreaView edges={['bottom']} className="bg-slate-100" />
    </View>
  );
}

function ProfileField({
  label,
  value,
  readonly = false,
}: {
  label: string;
  value: string;
  readonly?: boolean;
}) {
  return (
    <View className={`rounded-2xl px-4 py-3 ${readonly ? 'bg-slate-100' : 'bg-white'}`}>
      <Text className={`mb-1 text-sm font-medium ${readonly ? 'text-slate-400' : 'text-slate-500'}`}>{label}</Text>
      <Text className={`text-base ${readonly ? 'text-slate-500' : 'text-slate-900'}`}>{value || '--'}</Text>
    </View>
  );
}

function EditableField({
  label,
  value,
  onChange,
  enabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  enabled: boolean;
}) {
  return (
    <View className="rounded-2xl bg-white px-4 py-3">
      <Text className="mb-1 text-sm font-medium text-slate-500">{label}</Text>
      <TextInput
        value={value}
        editable={enabled}
        onChangeText={onChange}
        placeholder={label}
        className="text-base text-slate-900"
        placeholderTextColor="#94a3b8"
      />
    </View>
  );
}

function PasswordInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <TextInput
      value={value}
      onChangeText={onChange}
      secureTextEntry
      placeholder={placeholder}
      placeholderTextColor="#94a3b8"
      className="rounded-xl border border-slate-300 px-3 py-2.5 text-base text-slate-900"
    />
  );
}
