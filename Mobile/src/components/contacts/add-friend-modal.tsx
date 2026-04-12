import { AxiosError } from 'axios';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import Toast from 'react-native-toast-message';

import { ConversationAvatar } from '@/components/messages/conversation-avatar';
import type { RelationshipStatus } from '@/services/friend.service';
import { friendRequestService, friendService } from '@/services/friend.service';
import { userService } from '@/services/user.service';
import type { ResponseError } from '@/types/api-response';
import type { UserSearchItem } from '@/types/user';

type AddFriendModalProps = {
  visible: boolean;
  onClose: () => void;
  myIdentityUserId: string | null;
  myFirstName: string;
  myLastName: string;
};

function parseVietnamPhone(input: string): { valid: boolean; normalized: string | null } {
  const digits = input.replace(/\D/g, '');
  if (/^0\d{9}$/.test(digits)) {
    return { valid: true, normalized: digits };
  }
  if (/^84\d{9}$/.test(digits)) {
    return { valid: true, normalized: `0${digits.slice(2)}` };
  }
  return { valid: false, normalized: null };
}

function toInitials(name: string) {
  const words = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) {
    return 'U';
  }
  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }
  return `${words[0][0] ?? ''}${words[words.length - 1][0] ?? ''}`.toUpperCase();
}

export function AddFriendModal({
  visible,
  onClose,
  myIdentityUserId,
  myFirstName,
  myLastName,
}: AddFriendModalProps) {
  const [keyword, setKeyword] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [users, setUsers] = useState<UserSearchItem[]>([]);
  const [relationshipMap, setRelationshipMap] = useState<Record<string, RelationshipStatus>>({});
  const [isSendingToId, setIsSendingToId] = useState<string | null>(null);

  const canSearch = useMemo(() => keyword.trim().length > 0 && !isSearching, [keyword, isSearching]);

  const getApiMessage = (error: unknown, fallback: string) => {
    const axiosError = error as AxiosError<ResponseError>;
    return axiosError?.response?.data?.message || fallback;
  };

  const resolveRelationship = async (items: UserSearchItem[]) => {
    if (!myIdentityUserId || items.length === 0) {
      return;
    }
    const entries = await Promise.all(
      items.map(async (user) => {
        if (user.identityUserId === myIdentityUserId) {
          return [user.identityUserId, 'NONE'] as const;
        }
        try {
          const response = await friendService.checkRelationship(myIdentityUserId, user.identityUserId);
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
    setRelationshipMap((prev) => ({ ...prev, ...Object.fromEntries(entries) }));
  };

  const handleSearch = async () => {
    if (!myIdentityUserId) {
      Toast.show({ type: 'error', text1: 'Không xác định được tài khoản hiện tại' });
      return;
    }
    const parsed = parseVietnamPhone(keyword);
    if (!parsed.valid || !parsed.normalized) {
      Toast.show({ type: 'error', text1: 'Số điện thoại không hợp lệ' });
      return;
    }

    setIsSearching(true);
    try {
      const response = await userService.searchUsers({
        keyword: parsed.normalized,
        page: 1,
        limit: 8,
      });
      const items = response.data.items ?? [];
      setUsers(items);
      setRelationshipMap({});
      await resolveRelationship(items);
      if (items.length === 0) {
        Toast.show({ type: 'error', text1: 'Không tìm thấy tài khoản' });
      }
    } catch {
      setUsers([]);
      setRelationshipMap({});
      Toast.show({ type: 'error', text1: 'Tìm kiếm thất bại' });
    } finally {
      setIsSearching(false);
    }
  };

  const handleSendRequest = async (user: UserSearchItem) => {
    if (!myIdentityUserId || isSendingToId) {
      return;
    }
    setIsSendingToId(user.identityUserId);
    try {
      await friendRequestService.createFriendRequest({
        idAccountSent: myIdentityUserId,
        idAccountReceive: user.identityUserId,
        firstName: myFirstName,
        lastName: myLastName,
        content: `Xin chào ${user.firstName || 'bạn'}, mình là ${myFirstName} ${myLastName}.`,
      });
      setRelationshipMap((prev) => ({ ...prev, [user.identityUserId]: 'SENT' }));
      Toast.show({ type: 'success', text1: 'Đã gửi lời mời kết bạn' });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Gửi lời mời thất bại',
        text2: getApiMessage(error, 'Vui lòng thử lại.'),
      });
    } finally {
      setIsSendingToId(null);
    }
  };

  const handleClose = () => {
    setKeyword('');
    setUsers([]);
    setRelationshipMap({});
    setIsSendingToId(null);
    setIsSearching(false);
    onClose();
  };

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={handleClose}>
      <View className="flex-1 items-center justify-center bg-black/45 px-4">
        <View className="w-full max-w-[430px] overflow-hidden rounded-2xl bg-white">
          <View className="flex-row items-center justify-between border-b border-slate-200 px-4 py-3">
            <Text allowFontScaling={false} className="text-[18px] font-semibold text-slate-900">
              Thêm bạn
            </Text>
            <Pressable onPress={handleClose} className="rounded-md px-2 py-1">
              <Text allowFontScaling={false} className="text-[15px] text-slate-500">
                Đóng
              </Text>
            </Pressable>
          </View>

          <View className="gap-3 px-4 py-4">
            <View className="flex-row items-center gap-2">
              <TextInput
                value={keyword}
                onChangeText={setKeyword}
                placeholder="Nhập số điện thoại"
                keyboardType="phone-pad"
                className="h-11 flex-1 rounded-xl border border-slate-300 px-3 text-[15px] text-slate-900"
                returnKeyType="search"
                onSubmitEditing={() => void handleSearch()}
              />
              <Pressable
                onPress={() => void handleSearch()}
                disabled={!canSearch}
                className={`h-11 items-center justify-center rounded-xl px-4 ${canSearch ? 'bg-[#1e98f3]' : 'bg-slate-300'}`}>
                <Text allowFontScaling={false} className="text-[14px] font-semibold text-white">
                  Tìm
                </Text>
              </Pressable>
            </View>

            <ScrollView className="max-h-[350px]" keyboardShouldPersistTaps="handled">
              {isSearching ? (
                <View className="items-center py-8">
                  <ActivityIndicator size="small" color="#1e98f3" />
                  <Text allowFontScaling={false} className="mt-2 text-[14px] text-slate-500">
                    Đang tìm kiếm...
                  </Text>
                </View>
              ) : users.length === 0 ? (
                <View className="py-8">
                  <Text allowFontScaling={false} className="text-center text-[14px] text-slate-500">
                    Nhập số điện thoại để tìm bạn bè
                  </Text>
                </View>
              ) : (
                <View className="gap-2">
                  {users.map((user) => {
                    const fullName = user.fullName || `${user.lastName ?? ''} ${user.firstName ?? ''}`.trim();
                    const relation = relationshipMap[user.identityUserId] ?? 'NONE';
                    const isSelf = myIdentityUserId != null && user.identityUserId === myIdentityUserId;
                    const canSend = !isSelf && relation === 'NONE' && isSendingToId !== user.identityUserId;
                    const actionLabel = isSelf
                      ? 'Tôi'
                      : relation === 'FRIEND'
                        ? 'Bạn bè'
                        : relation === 'SENT'
                          ? 'Đã gửi'
                          : relation === 'RECEIVED'
                            ? 'Đã nhận'
                            : isSendingToId === user.identityUserId
                              ? 'Đang gửi...'
                              : 'Kết bạn';

                    return (
                      <View key={user.identityUserId} className="flex-row items-center gap-3 rounded-xl px-2 py-2">
                        {user.avatar ? (
                          <Image source={{ uri: user.avatar }} className="h-12 w-12 rounded-full bg-slate-200" />
                        ) : (
                          <ConversationAvatar
                            avatar={{
                              type: 'initials',
                              value: toInitials(fullName),
                              backgroundColor: '#94a3b8',
                            }}
                          />
                        )}
                        <View className="flex-1">
                          <Text allowFontScaling={false} className="text-[15px] font-semibold text-slate-900">
                            {fullName}
                          </Text>
                          <Text allowFontScaling={false} className="text-[13px] text-slate-500">
                            {user.phoneNumber || '--'}
                          </Text>
                        </View>
                        <Pressable
                          onPress={() => void handleSendRequest(user)}
                          disabled={!canSend}
                          className={`h-8 min-w-[82px] items-center justify-center rounded-lg border px-3 ${
                            canSend ? 'border-[#1e98f3] bg-white' : 'border-slate-300 bg-slate-100'
                          }`}>
                          <Text
                            allowFontScaling={false}
                            className={`text-[13px] font-medium ${canSend ? 'text-[#1e98f3]' : 'text-slate-500'}`}>
                            {actionLabel}
                          </Text>
                        </Pressable>
                      </View>
                    );
                  })}
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </View>
    </Modal>
  );
}

