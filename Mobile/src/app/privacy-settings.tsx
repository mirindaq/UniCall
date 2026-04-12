import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

import { AppStatusBarBlue } from '@/components/ui/app-status-bar-blue';
import { userService } from '@/services/user.service';

export default function PrivacySettingsScreen() {
  const router = useRouter();
  const [allowFriendInvites, setAllowFriendInvites] = useState(true);
  const [allowPhoneSearch, setAllowPhoneSearch] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingFriendInvites, setIsUpdatingFriendInvites] = useState(false);
  const [isUpdatingPhoneSearch, setIsUpdatingPhoneSearch] = useState(false);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      try {
        const [friendInviteResponse, phoneSearchResponse] = await Promise.all([
          userService.getMyFriendInvitePrivacy(),
          userService.getMyPhoneSearchPrivacy(),
        ]);
        if (!mounted) {
          return;
        }
        setAllowFriendInvites(Boolean(friendInviteResponse.data.allowFriendInvites));
        setAllowPhoneSearch(Boolean(phoneSearchResponse.data.allowPhoneSearch));
      } catch {
        if (!mounted) {
          return;
        }
        Toast.show({
          type: 'error',
          text1: 'Không tải được cài đặt quyền riêng tư',
        });
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const switchValue = useMemo(() => allowFriendInvites, [allowFriendInvites]);
  const phoneSearchSwitchValue = useMemo(() => allowPhoneSearch, [allowPhoneSearch]);

  const handleToggleFriendInvites = async (nextValue: boolean) => {
    if (isUpdatingFriendInvites || isLoading) {
      return;
    }

    const previous = allowFriendInvites;
    setAllowFriendInvites(nextValue);
    setIsUpdatingFriendInvites(true);

    try {
      await userService.updateMyFriendInvitePrivacy(nextValue);
      Toast.show({
        type: 'success',
        text1: nextValue ? 'Đã bật nhận lời mời kết bạn' : 'Đã tắt nhận lời mời kết bạn',
      });
    } catch {
      setAllowFriendInvites(previous);
      Toast.show({
        type: 'error',
        text1: 'Không thể cập nhật cài đặt',
      });
    } finally {
      setIsUpdatingFriendInvites(false);
    }
  };

  const handleTogglePhoneSearch = async (nextValue: boolean) => {
    if (isUpdatingPhoneSearch || isLoading) {
      return;
    }

    const previous = allowPhoneSearch;
    setAllowPhoneSearch(nextValue);
    setIsUpdatingPhoneSearch(true);

    try {
      await userService.updateMyPhoneSearchPrivacy(nextValue);
      Toast.show({
        type: 'success',
        text1: nextValue
          ? 'Đã bật cho phép tìm kiếm bằng số điện thoại'
          : 'Đã tắt cho phép tìm kiếm bằng số điện thoại',
      });
    } catch {
      setAllowPhoneSearch(previous);
      Toast.show({
        type: 'error',
        text1: 'Không thể cập nhật cài đặt',
      });
    } finally {
      setIsUpdatingPhoneSearch(false);
    }
  };

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
            Quyền riêng tư
          </Text>
        </View>
      </View>

      <View className="mt-4 bg-white px-5 py-4">
        <View className="flex-row items-center justify-between">
          <View className="flex-1 pr-4">
            <Text allowFontScaling={false} className="text-[17px] text-slate-900">
              Nhận lời mời kết bạn
            </Text>
            <Text allowFontScaling={false} className="mt-1 text-[13px] text-slate-500">
              Khi tắt, người khác vẫn tìm thấy bạn nhưng không thể gửi lời mời kết bạn.
            </Text>
          </View>

          <Switch
            value={switchValue}
            onValueChange={(value) => {
              void handleToggleFriendInvites(value);
            }}
            disabled={isLoading || isUpdatingFriendInvites}
            trackColor={{ false: '#d1d5db', true: '#1f6fff' }}
            thumbColor="#ffffff"
          />
        </View>
      </View>

      <View className="mt-3 bg-white px-5 py-4">
        <View className="flex-row items-center justify-between">
          <View className="flex-1 pr-4">
            <Text allowFontScaling={false} className="text-[17px] text-slate-900">
              Cho phép người khác tìm kiếm bằng số điện thoại
            </Text>
            <Text allowFontScaling={false} className="mt-1 text-[13px] text-slate-500">
              Khi tắt, người khác sẽ không thể tìm thấy bạn bằng số điện thoại.
            </Text>
          </View>

          <Switch
            value={phoneSearchSwitchValue}
            onValueChange={(value) => {
              void handleTogglePhoneSearch(value);
            }}
            disabled={isLoading || isUpdatingPhoneSearch}
            trackColor={{ false: '#d1d5db', true: '#1f6fff' }}
            thumbColor="#ffffff"
          />
        </View>
      </View>
    </View>
  );
}
