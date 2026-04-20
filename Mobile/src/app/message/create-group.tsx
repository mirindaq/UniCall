import Ionicons from "@expo/vector-icons/Ionicons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

import { chatService } from "@/services/chat.service";
import { friendService } from "@/services/friend.service";
import { userService } from "@/services/user.service";
import type { FriendItem } from "@/types/friendship";

type MemberOption = {
  id: string;
  displayName: string;
  phoneNumber?: string;
  avatar?: string | null;
  fallback: string;
};

const SEARCH_LIMIT = 20;

function toFallback(fullName: string) {
  const words = fullName.trim().split(/\s+/).filter(Boolean);

  if (words.length === 0) {
    return "U";
  }
  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }
  return `${words[0][0] ?? ""}${words[words.length - 1][0] ?? ""}`.toUpperCase();
}

function getErrorMessage(error: unknown, fallback: string) {
  const message = (error as { response?: { data?: { message?: string } } })
    ?.response?.data?.message;
  return message || fallback;
}

function getStringParam(value: string | string[] | undefined) {
  if (!value) {
    return "";
  }
  return Array.isArray(value) ? (value[0] ?? "") : value;
}

function mapFriendToMember(
  friend: FriendItem,
  myIdentityUserId: string,
): MemberOption | null {
  const peerIdentityUserId =
    friend.idAccountSent === myIdentityUserId
      ? friend.idAccountReceive
      : friend.idAccountSent;

  if (!peerIdentityUserId?.trim()) {
    return null;
  }

  const displayName =
    friend.fullName?.trim() ||
    `${friend.firstName ?? ""} ${friend.lastName ?? ""}`.trim() ||
    peerIdentityUserId;

  return {
    id: peerIdentityUserId,
    displayName,
    avatar: friend.avatar || friend.pathAvartar || null,
    fallback: toFallback(displayName),
  };
}

function dedupeMembers(items: MemberOption[]) {
  const unique = new Map<string, MemberOption>();
  items.forEach((item) => {
    if (!unique.has(item.id)) {
      unique.set(item.id, item);
    }
  });
  return Array.from(unique.values());
}

export default function CreateGroupScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    presetMemberId?: string | string[];
    presetMemberName?: string | string[];
    presetMemberAvatar?: string | string[];
  }>();

  const presetMemberId = getStringParam(params.presetMemberId).trim();
  const presetMemberName = getStringParam(params.presetMemberName).trim();
  const presetMemberAvatar = getStringParam(params.presetMemberAvatar).trim();

  const presetMember = useMemo<MemberOption | null>(() => {
    if (!presetMemberId) {
      return null;
    }
    const displayName = presetMemberName || presetMemberId;
    return {
      id: presetMemberId,
      displayName,
      avatar: presetMemberAvatar || null,
      fallback: toFallback(displayName),
    };
  }, [presetMemberAvatar, presetMemberId, presetMemberName]);

  const [myIdentityUserId, setMyIdentityUserId] = useState<string | null>(null);
  const [groupName, setGroupName] = useState("");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [debouncedKeyword, setDebouncedKeyword] = useState("");
  const [friendMembers, setFriendMembers] = useState<MemberOption[]>([]);
  const [searchedMembers, setSearchedMembers] = useState<MemberOption[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<
    Record<string, MemberOption>
  >({});
  const [isInitializing, setIsInitializing] = useState(false);
  const [isSearchingFirstPage, setIsSearchingFirstPage] = useState(false);
  const [isSearchingMore, setIsSearchingMore] = useState(false);
  const [searchPage, setSearchPage] = useState(1);
  const [searchTotalPage, setSearchTotalPage] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [memberError, setMemberError] = useState<string | null>(null);

  const selectedMemberList = useMemo(
    () => Object.values(selectedMembers),
    [selectedMembers],
  );
  const displayedMembers = useMemo(
    () => (debouncedKeyword ? searchedMembers : friendMembers),
    [debouncedKeyword, friendMembers, searchedMembers],
  );
  const canLoadMore =
    debouncedKeyword.length > 0 &&
    searchPage < searchTotalPage &&
    !isSearchingMore;

  const loadInitialMembers = useCallback(async () => {
    setIsInitializing(true);
    try {
      const myProfileResponse = await userService.getMyProfile();
      const identityUserId = myProfileResponse.data.identityUserId;
      setMyIdentityUserId(identityUserId ?? null);
      if (!identityUserId) {
        setFriendMembers(presetMember ? [presetMember] : []);
        if (presetMember) {
          setSelectedMembers({ [presetMember.id]: presetMember });
        }
        return;
      }

      const friendsResponse = await friendService.getAllFriends(identityUserId);
      const mappedFriends = dedupeMembers(
        (friendsResponse.data ?? [])
          .map((friend) => mapFriendToMember(friend, identityUserId))
          .filter((item): item is MemberOption => Boolean(item)),
      );

      if (
        presetMember &&
        !mappedFriends.some((item) => item.id === presetMember.id)
      ) {
        mappedFriends.unshift(presetMember);
      }

      setFriendMembers(mappedFriends);
      if (presetMember) {
        const presetFromList =
          mappedFriends.find((item) => item.id === presetMember.id) ??
          presetMember;
        setSelectedMembers({ [presetFromList.id]: presetFromList });
      }
    } catch (error) {
      Toast.show({
        type: "error",
        text1: getErrorMessage(error, "Không tải được danh sách bạn bè"),
      });
    } finally {
      setIsInitializing(false);
    }
  }, [presetMember]);

  const runSearch = useCallback(
    async (pageToLoad: number, append: boolean) => {
      if (!myIdentityUserId || !debouncedKeyword.trim()) {
        setSearchedMembers([]);
        setSearchPage(1);
        setSearchTotalPage(1);
        return;
      }

      if (append) {
        setIsSearchingMore(true);
      } else {
        setIsSearchingFirstPage(true);
      }

      try {
        const response = await userService.searchUsers({
          keyword: debouncedKeyword.trim(),
          page: pageToLoad,
          limit: SEARCH_LIMIT,
        });
        const pageData = response.data;
        const mapped = (pageData.items ?? [])
          .filter((item) => item.identityUserId !== myIdentityUserId)
          .map<MemberOption>((item) => ({
            id: item.identityUserId,
            displayName:
              item.fullName ||
              `${item.firstName ?? ""} ${item.lastName ?? ""}`.trim() ||
              item.identityUserId,
            phoneNumber: item.phoneNumber,
            avatar: item.avatar ?? null,
            fallback: toFallback(
              item.fullName ||
                `${item.firstName ?? ""} ${item.lastName ?? ""}`.trim(),
            ),
          }));

        setSearchPage(pageData.page ?? pageToLoad);
        setSearchTotalPage(pageData.totalPage ?? pageToLoad);
        setSearchedMembers((prev) =>
          append ? dedupeMembers([...prev, ...mapped]) : dedupeMembers(mapped),
        );
      } catch (error) {
        if (!append) {
          Toast.show({
            type: "error",
            text1: getErrorMessage(error, "Không tìm được người dùng"),
          });
        }
      } finally {
        if (append) {
          setIsSearchingMore(false);
        } else {
          setIsSearchingFirstPage(false);
        }
      }
    },
    [debouncedKeyword, myIdentityUserId],
  );

  useEffect(() => {
    void loadInitialMembers();
  }, [loadInitialMembers]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedKeyword(searchKeyword.trim());
    }, 400);
    return () => clearTimeout(timer);
  }, [searchKeyword]);

  useEffect(() => {
    if (!debouncedKeyword) {
      setSearchedMembers([]);
      setSearchPage(1);
      setSearchTotalPage(1);
      return;
    }
    void runSearch(1, false);
  }, [debouncedKeyword, runSearch]);

  const toggleMember = useCallback((member: MemberOption) => {
    setSelectedMembers((prev) => {
      if (prev[member.id]) {
        const next = { ...prev };
        delete next[member.id];
        return next;
      }
      return {
        ...prev,
        [member.id]: member,
      };
    });
    setMemberError(null);
  }, []);

  const handleCreateGroup = useCallback(async () => {
    const trimmedGroupName = groupName.trim();
    if (!trimmedGroupName) {
      setNameError("Vui lòng nhập tên nhóm");
      return;
    }

    const uniqueMemberIds = Array.from(
      new Set(selectedMemberList.map((item) => item.id)),
    );
    if (uniqueMemberIds.length === 0) {
      setMemberError("Chọn ít nhất 1 thành viên");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await chatService.createGroupConversation({
        name: trimmedGroupName,
        memberIdentityUserIds: uniqueMemberIds,
      });
      Toast.show({
        type: "success",
        text1: "Tạo nhóm thành công",
      });
      router.replace(`/message/${response.data.idConversation}`);
    } catch (error) {
      Toast.show({
        type: "error",
        text1: getErrorMessage(error, "Tạo nhóm thất bại"),
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [groupName, router, selectedMemberList]);

  return (
    <View className="flex-1 bg-[#f3f4f6]">
      <SafeAreaView className="bg-[#1e98f3]" />
      <View className="flex-row items-center bg-[#1e98f3] px-3.5 pb-2.5 pt-2.5">
        <Pressable
          className="mr-1.5 h-9 w-9 items-center justify-center rounded-full"
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </Pressable>
        <Text
          allowFontScaling={false}
          className="flex-1 text-[17px] font-semibold text-white"
        >
          Tạo nhóm
        </Text>
      </View>

      <FlatList
        data={displayedMembers}
        keyExtractor={(item) => item.id}
        className="flex-1"
        contentContainerClassName="pb-32"
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View className="bg-white px-4 pb-3 pt-4">
            <TextInput
              value={groupName}
              onChangeText={(value) => {
                setGroupName(value);
                setNameError(null);
              }}
              placeholder="Nhập tên nhóm"
              className="h-11 rounded-xl border border-slate-300 px-3 text-[15px] text-slate-900"
            />
            {nameError ? (
              <Text className="mt-1 text-[12px] text-red-500">{nameError}</Text>
            ) : null}

            <TextInput
              value={searchKeyword}
              onChangeText={setSearchKeyword}
              placeholder="Tìm theo tên hoặc số điện thoại"
              className="mt-3 h-11 rounded-xl border border-slate-300 px-3 text-[15px] text-slate-900"
            />

            <View className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <Text className="text-[13px] font-medium text-slate-700">
                Đã chọn {selectedMemberList.length} thành viên
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                className="mt-2"
              >
                {selectedMemberList.length === 0 ? (
                  <Text className="text-[13px] text-slate-400">
                    Chưa chọn thành viên
                  </Text>
                ) : (
                  selectedMemberList.map((member) => (
                    <Pressable
                      key={`selected-${member.id}`}
                      onPress={() => toggleMember(member)}
                      className="mr-2 flex-row items-center rounded-full bg-blue-100 px-3 py-1.5"
                    >
                      <Text
                        numberOfLines={1}
                        className="max-w-[140px] text-[12px] font-medium text-blue-800"
                      >
                        {member.displayName}
                      </Text>
                      <View className="ml-1.5">
                        <Ionicons name="close" size={14} color="#1d4ed8" />
                      </View>
                    </Pressable>
                  ))
                )}
              </ScrollView>
            </View>

            {memberError ? (
              <Text className="mt-2 text-[12px] text-red-500">
                {memberError}
              </Text>
            ) : null}

            <Text className="mt-4 text-[14px] font-semibold text-slate-900">
              {debouncedKeyword ? "Kết quả tìm kiếm" : "Bạn bè gần đây"}
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View className="items-center justify-center py-10">
            {isInitializing || isSearchingFirstPage ? (
              <ActivityIndicator size="small" color="#1e98f3" />
            ) : (
              <Text className="text-[14px] text-slate-500">
                Không có thành viên phù hợp
              </Text>
            )}
          </View>
        }
        renderItem={({ item }) => {
          const isSelected = Boolean(selectedMembers[item.id]);
          return (
            <Pressable
              onPress={() => toggleMember(item)}
              className={`mx-3 mt-2 flex-row items-center rounded-xl border px-3 py-2.5 ${
                isSelected
                  ? "border-blue-500 bg-blue-50"
                  : "border-slate-200 bg-white"
              }`}
            >
              <View
                className={`h-5 w-5 items-center justify-center rounded-full border ${
                  isSelected
                    ? "border-blue-600 bg-blue-600"
                    : "border-slate-300 bg-white"
                }`}
              >
                {isSelected ? (
                  <Ionicons name="checkmark" size={14} color="#ffffff" />
                ) : null}
              </View>
              {item.avatar ? (
                <Image
                  source={{ uri: item.avatar }}
                  className="ml-3 h-10 w-10 rounded-full bg-slate-200"
                />
              ) : (
                <View className="ml-3 h-10 w-10 items-center justify-center rounded-full bg-slate-300">
                  <Text className="text-[14px] font-semibold text-white">
                    {item.fallback}
                  </Text>
                </View>
              )}
              <View className="ml-3 flex-1">
                <Text
                  numberOfLines={1}
                  className="text-[15px] font-medium text-slate-900"
                >
                  {item.displayName}
                </Text>
                {item.phoneNumber ? (
                  <Text
                    numberOfLines={1}
                    className="mt-0.5 text-[12px] text-slate-500"
                  >
                    {item.phoneNumber}
                  </Text>
                ) : null}
              </View>
            </Pressable>
          );
        }}
        ListFooterComponent={
          canLoadMore ? (
            <Pressable
              className="mx-3 mt-3 h-11 items-center justify-center rounded-xl border border-slate-300 bg-white"
              onPress={() => void runSearch(searchPage + 1, true)}
              disabled={isSearchingMore}
            >
              {isSearchingMore ? (
                <ActivityIndicator size="small" color="#1e98f3" />
              ) : (
                <Text className="text-[14px] font-medium text-slate-700">
                  Xem thêm
                </Text>
              )}
            </Pressable>
          ) : null
        }
      />

      <View className="absolute bottom-0 left-0 right-0 border-t border-slate-200 bg-white px-4 pb-5 pt-3">
        <Pressable
          className={`h-11 items-center justify-center rounded-xl ${
            isSubmitting ? "bg-blue-300" : "bg-[#1e98f3]"
          }`}
          onPress={() => void handleCreateGroup()}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text className="text-[15px] font-semibold text-white">
              Tạo nhóm
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

