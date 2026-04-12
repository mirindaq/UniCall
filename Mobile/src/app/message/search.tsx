import Ionicons from '@expo/vector-icons/Ionicons';
import { AxiosError } from 'axios';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

import { ConversationAvatar } from '@/components/messages/conversation-avatar';
import { AppStatusBarBlue } from '@/components/ui/app-status-bar-blue';
import { chatService } from '@/services/chat.service';
import { friendRequestService, friendService, type RelationshipStatus } from '@/services/friend.service';
import { userService } from '@/services/user.service';
import type { ResponseError } from '@/types/api-response';
import type { UserSearchItem } from '@/types/user';

const normalizePhoneKeyword = (value: string) => value.trim().replace(/\s+/g, '');

const toDisplayName = (user: UserSearchItem) => {
  return `${user.lastName ?? ''} ${user.firstName ?? ''}`.trim() || user.fullName || user.phoneNumber;
};

const toFallback = (user: UserSearchItem) => {
  const first = user.firstName?.[0] ?? '';
  const last = user.lastName?.[0] ?? '';
  return `${last}${first}`.toUpperCase() || 'U';
};

const getApiMessage = (error: unknown, fallback: string) => {
  const axiosError = error as AxiosError<ResponseError>;
  return axiosError?.response?.data?.message || fallback;
};

export default function MessageSearchScreen() {
  const router = useRouter();
  const [keyword, setKeyword] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [users, setUsers] = useState<UserSearchItem[]>([]);
  const [relationshipMap, setRelationshipMap] = useState<Record<string, RelationshipStatus>>({});
  const [myProfile, setMyProfile] = useState<{ identityUserId: string; firstName: string; lastName: string } | null>(
    null
  );
  const [sendingToId, setSendingToId] = useState<string | null>(null);

  const canSearch = useMemo(() => normalizePhoneKeyword(keyword).length > 0 && !isSearching, [keyword, isSearching]);

  const ensureMyProfile = async () => {
    if (myProfile) {
      return myProfile;
    }
    const response = await userService.getMyProfile();
    const profileData = {
      identityUserId: response.data.identityUserId,
      firstName: response.data.firstName ?? '',
      lastName: response.data.lastName ?? '',
    };
    setMyProfile(profileData);
    return profileData;
  };

  const resolveRelationship = async (items: UserSearchItem[]) => {
    const current = await ensureMyProfile();
    const entries = await Promise.all(
      items.map(async (user) => {
        if (user.identityUserId === current.identityUserId) {
          return [user.identityUserId, 'NONE'] as const;
        }
        try {
          const response = await friendService.checkRelationship(current.identityUserId, user.identityUserId);
          const payload = response.data as
            | { areFriends?: boolean; note?: string; meSent?: boolean }
            | RelationshipStatus;
          if (typeof payload === 'string') {
            return [user.identityUserId, payload] as const;
          }
          if (payload?.areFriends) {
            return [user.identityUserId, 'FRIEND'] as const;
          }
          if (payload?.note) {
            return [user.identityUserId, payload.meSent ? 'SENT' : 'RECEIVED'] as const;
          }
          return [user.identityUserId, 'NONE'] as const;
        } catch {
          return [user.identityUserId, 'NONE'] as const;
        }
      })
    );

    setRelationshipMap(Object.fromEntries(entries));
  };

  const handleSearch = async () => {
    if (!canSearch) {
      return;
    }
    setIsSearching(true);
    try {
      const response = await userService.searchUsers({
        keyword: normalizePhoneKeyword(keyword),
        page: 1,
        limit: 20,
      });
      const items = response.data.items ?? [];
      setUsers(items);
      await resolveRelationship(items);
      if (items.length === 0) {
        Toast.show({
          type: 'error',
          text1: 'Không tìm thấy người dùng',
        });
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Tìm kiếm thất bại',
        text2: getApiMessage(error, 'Vui lòng thử lại.'),
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddFriend = async (user: UserSearchItem) => {
    const current = await ensureMyProfile();
    if (sendingToId || user.identityUserId === current.identityUserId) {
      return;
    }

    setSendingToId(user.identityUserId);
    try {
      const defaultMessage = `Xin chào ${user.firstName || 'bạn'}. Mình là ${current.firstName} ${current.lastName}. Mình tìm thấy bạn qua số điện thoại!`;
      await friendRequestService.createFriendRequest({
        idAccountSent: current.identityUserId,
        idAccountReceive: user.identityUserId,
        firstName: current.firstName,
        lastName: current.lastName,
        content: defaultMessage,
      });
      setRelationshipMap((prev) => ({ ...prev, [user.identityUserId]: 'SENT' }));
      Toast.show({
        type: 'success',
        text1: 'Đã gửi lời mời kết bạn',
      });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Không thể gửi lời mời',
        text2: getApiMessage(error, 'Vui lòng thử lại.'),
      });
    } finally {
      setSendingToId(null);
    }
  };

  const handleOpenChat = async (user: UserSearchItem) => {
    try {
      const response = await chatService.getOrCreateDirect(user.identityUserId);
      router.push(`/message/${response.data.idConversation}`);
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Không mở được cuộc trò chuyện',
        text2: getApiMessage(error, 'Vui lòng thử lại.'),
      });
    }
  };

  return (
    <View className="flex-1 bg-[#f3f4f6]">
      <AppStatusBarBlue />
      <SafeAreaView edges={['top']} className="bg-[#1e98f3]" />

      <View className="bg-[#1e98f3] px-3.5 pb-2.5 pt-2.5">
        <View className="flex-row items-center">
          <Pressable className="mr-1 h-9 w-9 items-center justify-center rounded-full" onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
          </Pressable>

          <View className="mr-2 h-[42px] flex-1 flex-row items-center rounded-2xl bg-white px-3.5">
            <Ionicons name="search-outline" size={23} color="#737373" />
            <TextInput
              value={keyword}
              onChangeText={setKeyword}
              className="ml-2.5 flex-1 text-[18px] text-slate-900"
              placeholder="Nhập số điện thoại hoặc tên"
              placeholderTextColor="#9ca3af"
              autoFocus
              selectionColor="#1e98f3"
              allowFontScaling={false}
              onSubmitEditing={() => void handleSearch()}
            />
            {keyword ? (
              <Pressable
                className="h-7 w-7 items-center justify-center rounded-full bg-slate-400"
                onPress={() => {
                  setKeyword('');
                  setUsers([]);
                  setRelationshipMap({});
                }}>
                <Ionicons name="close" size={17} color="#ffffff" />
              </Pressable>
            ) : null}
          </View>

          <Pressable className="h-9 w-9 items-center justify-center rounded-full" onPress={() => void handleSearch()}>
            <Ionicons name="search" size={22} color="#ffffff" />
          </Pressable>
        </View>
      </View>

      <ScrollView className="flex-1 bg-white" showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View className="px-5 py-3">
          <Text className="text-[17px] font-semibold text-slate-900">Kết quả tìm kiếm</Text>
        </View>

        {users.length === 0 ? (
          <View className="px-5 pb-8">
            <Text className="text-[14px] text-slate-500">
              {isSearching ? 'Đang tìm...' : 'Nhập từ khóa để tìm người dùng và kết bạn.'}
            </Text>
          </View>
        ) : (
          users.map((user, index) => {
            const status = relationshipMap[user.identityUserId] ?? 'NONE';
            const isMe = myProfile != null && user.identityUserId === myProfile.identityUserId;
            const canAdd = status === 'NONE' && sendingToId !== user.identityUserId;
            const actionLabel =
              isMe
                ? 'Tôi'
                : sendingToId === user.identityUserId
                ? 'Đang gửi...'
                : status === 'FRIEND'
                ? 'Bạn bè'
                : status === 'SENT'
                ? 'Đã gửi'
                : status === 'RECEIVED'
                ? 'Đã nhận'
                : 'Kết bạn';
            return (
              <View key={user.identityUserId}>
                <Pressable className="flex-row items-center px-5 py-3.5" onPress={() => void handleOpenChat(user)}>
                  <ConversationAvatar
                    avatar={{
                      type: 'initials',
                      value: toFallback(user),
                      backgroundColor: '#94a3b8',
                    }}
                    avatarUrl={user.avatar ?? null}
                    size={46}
                  />

                  <View className="ml-4 flex-1">
                    <Text className="text-[16px] text-slate-900">{toDisplayName(user)}</Text>
                    <Text className="mt-0.5 text-[13px] text-slate-500">{user.phoneNumber}</Text>
                  </View>

                  <Pressable
                    className={`rounded-full px-3 py-1.5 ${
                      isMe
                        ? 'bg-slate-200 border border-slate-300'
                        : canAdd
                        ? 'bg-sky-50 border border-sky-500'
                        : 'bg-slate-100 border border-slate-200'
                    }`}
                    disabled={!canAdd || isMe}
                    onPress={() => void handleAddFriend(user)}>
                    <Text
                      className={`text-[13px] font-semibold ${
                        isMe ? 'text-slate-700' : canAdd ? 'text-sky-600' : 'text-slate-500'
                      }`}>
                      {actionLabel}
                    </Text>
                  </Pressable>
                </Pressable>
                {index < users.length - 1 ? <View className="ml-[86px] h-px bg-slate-200" /> : null}
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}
