import Ionicons from "@expo/vector-icons/Ionicons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  Switch,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

import { chatService } from "@/services/chat.service";
import { userService } from "@/services/user.service";
import type {
  GroupManagementSettings,
  GroupParticipantInfo,
  PendingMemberRequestInfo,
} from "@/types/chat";
import type { UserProfile } from "@/types/user";

const DEFAULT_SETTINGS: GroupManagementSettings = {
  allowMemberSendMessage: true,
  allowMemberPinMessage: true,
  allowMemberChangeAvatar: true,
  memberApprovalEnabled: false,
};

type ProfileMap = Record<string, UserProfile>;

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

function displayName(profile?: UserProfile | null, fallback?: string) {
  if (!profile) {
    return fallback || "";
  }
  const name = `${profile.firstName ?? ""} ${profile.lastName ?? ""}`.trim();
  return name || fallback || profile.identityUserId;
}

function getErrorMessage(error: unknown, fallback: string) {
  const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
  return message || fallback;
}

export default function GroupManageScreen() {
  const router = useRouter();
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();

  const [myIdentityUserId, setMyIdentityUserId] = useState<string | null>(null);
  const [participants, setParticipants] = useState<GroupParticipantInfo[]>([]);
  const [settings, setSettings] = useState<GroupManagementSettings>(DEFAULT_SETTINGS);
  const [pendingRequests, setPendingRequests] = useState<PendingMemberRequestInfo[]>([]);
  const [profileMap, setProfileMap] = useState<ProfileMap>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [processingRequestId, setProcessingRequestId] = useState<string | null>(null);

  const currentRole = useMemo(
    () => participants.find((item) => item.idAccount === myIdentityUserId)?.role ?? null,
    [myIdentityUserId, participants]
  );
  const canManageGroup = currentRole === "ADMIN" || currentRole === "DEPUTY";

  const pendingDisplay = useMemo(
    () =>
      pendingRequests.map((item) => {
        const requester = profileMap[item.requesterIdentityUserId];
        const target = profileMap[item.targetIdentityUserId];
        const targetName = displayName(target, item.targetIdentityUserId);
        return {
          ...item,
          requesterName: displayName(requester, item.requesterIdentityUserId),
          targetName,
          targetAvatar: target?.avatar ?? null,
          targetFallback: toFallback(targetName),
        };
      }),
    [pendingRequests, profileMap]
  );

  const loadData = useCallback(async () => {
    if (!conversationId) {
      return;
    }
    setIsLoading(true);
    try {
      const [myProfileResponse, detailsResponse] = await Promise.all([
        userService.getMyProfile(),
        chatService.getGroupConversationDetails(conversationId),
      ]);
      const myId = myProfileResponse.data.identityUserId ?? null;
      const detailData = detailsResponse.data;

      setMyIdentityUserId(myId);
      setParticipants(detailData.participantInfos ?? []);
      setSettings(detailData.groupManagementSettings ?? DEFAULT_SETTINGS);
      setPendingRequests(detailData.pendingMemberRequests ?? []);

      const role = detailData.participantInfos?.find((item) => item.idAccount === myId)?.role ?? null;
      if (role !== "ADMIN" && role !== "DEPUTY") {
        Toast.show({
          type: "error",
          text1: "Chỉ trưởng hoặc phó nhóm mới được quản lý nhóm",
        });
        router.back();
      }
    } catch (error) {
      Toast.show({
        type: "error",
        text1: getErrorMessage(error, "Không tải được dữ liệu quản lý nhóm"),
      });
    } finally {
      setIsLoading(false);
    }
  }, [conversationId, router]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    const ids = Array.from(
      new Set(
        pendingRequests
          .flatMap((item) => [item.requesterIdentityUserId, item.targetIdentityUserId])
          .filter(Boolean)
      )
    );
    if (ids.length === 0) {
      setProfileMap({});
      return;
    }

    let cancelled = false;
    void Promise.all(
      ids.map(async (id) => {
        try {
          const response = await userService.getProfileByIdentityUserId(id);
          return [id, response.data] as const;
        } catch {
          return null;
        }
      })
    ).then((items) => {
      if (cancelled) {
        return;
      }
      const nextMap: ProfileMap = {};
      items.forEach((item) => {
        if (!item) {
          return;
        }
        nextMap[item[0]] = item[1];
      });
      setProfileMap(nextMap);
    });

    return () => {
      cancelled = true;
    };
  }, [pendingRequests]);

  const updateSetting = (key: keyof GroupManagementSettings, value: boolean) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSaveSettings = useCallback(async () => {
    if (!conversationId || !canManageGroup || isSaving) {
      return;
    }
    setIsSaving(true);
    try {
      const response = await chatService.updateGroupManagementSettings(conversationId, settings);
      setSettings(response.data.groupManagementSettings ?? settings);
      setPendingRequests(response.data.pendingMemberRequests ?? pendingRequests);
      Toast.show({ type: "success", text1: "Đã cập nhật quản lý nhóm" });
    } catch (error) {
      Toast.show({
        type: "error",
        text1: getErrorMessage(error, "Cập nhật quản lý nhóm thất bại"),
      });
    } finally {
      setIsSaving(false);
    }
  }, [canManageGroup, conversationId, isSaving, pendingRequests, settings]);

  const handleApprove = useCallback(
    async (requestId: string) => {
      if (!conversationId || !canManageGroup || processingRequestId) {
        return;
      }
      setProcessingRequestId(requestId);
      try {
        const response = await chatService.approveGroupMemberRequest(conversationId, requestId);
        setPendingRequests(response.data.pendingMemberRequests ?? []);
        setParticipants(response.data.participantInfos ?? []);
        Toast.show({ type: "success", text1: "Đã duyệt thành viên" });
      } catch (error) {
        Toast.show({
          type: "error",
          text1: getErrorMessage(error, "Duyệt thành viên thất bại"),
        });
      } finally {
        setProcessingRequestId(null);
      }
    },
    [canManageGroup, conversationId, processingRequestId]
  );

  const handleReject = useCallback(
    async (requestId: string) => {
      if (!conversationId || !canManageGroup || processingRequestId) {
        return;
      }
      setProcessingRequestId(requestId);
      try {
        const response = await chatService.rejectGroupMemberRequest(conversationId, requestId);
        setPendingRequests(response.data.pendingMemberRequests ?? []);
        Toast.show({ type: "success", text1: "Đã từ chối yêu cầu" });
      } catch (error) {
        Toast.show({
          type: "error",
          text1: getErrorMessage(error, "Từ chối yêu cầu thất bại"),
        });
      } finally {
        setProcessingRequestId(null);
      }
    },
    [canManageGroup, conversationId, processingRequestId]
  );

  if (isLoading) {
    return (
      <View className="flex-1 bg-[#f3f4f6]">
        <SafeAreaView className="bg-[#1e98f3]" />
        <View className="flex-row items-center bg-[#1e98f3] px-3.5 pb-2.5 pt-2.5">
          <Pressable className="mr-1.5 h-9 w-9 items-center justify-center rounded-full" onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
          </Pressable>
          <Text className="text-[17px] font-semibold text-white">Quản lý nhóm</Text>
        </View>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="small" color="#1e98f3" />
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#f3f4f6]">
      <SafeAreaView className="bg-[#1e98f3]" />
      <View className="flex-row items-center bg-[#1e98f3] px-3.5 pb-2.5 pt-2.5">
        <Pressable className="mr-1.5 h-9 w-9 items-center justify-center rounded-full" onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </Pressable>
        <Text className="text-[17px] font-semibold text-white">Quản lý nhóm</Text>
      </View>

      <ScrollView className="flex-1 px-3" contentContainerStyle={{ paddingBottom: 20 }}>
        <View className="mt-3 rounded-xl bg-white px-4 py-4">
          <Text className="text-[15px] font-semibold text-slate-900">Cho phép các thành viên trong nhóm:</Text>
          <View className="mt-2.5">
            <SettingRow
              label="Gửi tin nhắn"
              value={settings.allowMemberSendMessage}
              onValueChange={(value) => updateSetting("allowMemberSendMessage", value)}
            />
            <SettingRow
              label="Ghim tin nhắn"
              value={settings.allowMemberPinMessage}
              onValueChange={(value) => updateSetting("allowMemberPinMessage", value)}
            />
            <SettingRow
              label="Thay đổi ảnh đại diện nhóm"
              value={settings.allowMemberChangeAvatar}
              onValueChange={(value) => updateSetting("allowMemberChangeAvatar", value)}
            />
          </View>
        </View>

        <View className="mt-3 rounded-xl bg-white px-4 py-4">
          <SettingRow
            label="Chế độ phê duyệt thành viên mới"
            value={settings.memberApprovalEnabled}
            onValueChange={(value) => updateSetting("memberApprovalEnabled", value)}
            description="Bật để trưởng/phó nhóm duyệt yêu cầu thêm thành viên"
          />
        </View>

        <Pressable
          className={`mt-3 h-11 items-center justify-center rounded-xl ${isSaving ? "bg-blue-300" : "bg-[#1e98f3]"}`}
          onPress={() => void handleSaveSettings()}
          disabled={isSaving || !canManageGroup}>
          {isSaving ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text className="text-[15px] font-semibold text-white">Lưu thay đổi</Text>
          )}
        </Pressable>

        <View className="mt-3 rounded-xl bg-white px-4 py-4">
          <View className="mb-2 flex-row items-center justify-between">
            <Text className="text-[15px] font-semibold text-slate-900">Yêu cầu chờ duyệt</Text>
            <Text className="text-[12px] text-slate-500">{pendingDisplay.length}</Text>
          </View>
          {pendingDisplay.length === 0 ? (
            <Text className="text-[13px] text-slate-500">Chưa có yêu cầu chờ duyệt</Text>
          ) : (
            <FlatList
              data={pendingDisplay}
              keyExtractor={(item) => item.idRequest}
              scrollEnabled={false}
              renderItem={({ item }) => (
                <View className="mb-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                  <View className="flex-row items-center">
                    {item.targetAvatar ? (
                      <Image source={{ uri: item.targetAvatar }} className="h-10 w-10 rounded-full bg-slate-200" />
                    ) : (
                      <View className="h-10 w-10 items-center justify-center rounded-full bg-slate-300">
                        <Text className="text-[13px] font-semibold text-white">{item.targetFallback}</Text>
                      </View>
                    )}
                    <View className="ml-3 flex-1">
                      <Text numberOfLines={1} className="text-[14px] font-semibold text-slate-900">
                        {item.targetName}
                      </Text>
                      <Text numberOfLines={1} className="mt-0.5 text-[12px] text-slate-500">
                        Người thêm: {item.requesterName}
                      </Text>
                    </View>
                  </View>
                  <View className="mt-3 flex-row gap-2">
                    <Pressable
                      className="h-9 flex-1 items-center justify-center rounded-lg border border-slate-300 bg-white"
                      onPress={() => void handleReject(item.idRequest)}
                      disabled={processingRequestId === item.idRequest}>
                      <Text className="text-[13px] font-semibold text-slate-700">Từ chối</Text>
                    </Pressable>
                    <Pressable
                      className="h-9 flex-1 items-center justify-center rounded-lg bg-[#1e98f3]"
                      onPress={() => void handleApprove(item.idRequest)}
                      disabled={processingRequestId === item.idRequest}>
                      {processingRequestId === item.idRequest ? (
                        <ActivityIndicator size="small" color="#ffffff" />
                      ) : (
                        <Text className="text-[13px] font-semibold text-white">Duyệt</Text>
                      )}
                    </Pressable>
                  </View>
                </View>
              )}
            />
          )}
        </View>
      </ScrollView>
    </View>
  );
}

type SettingRowProps = {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  description?: string;
};

function SettingRow({ label, value, onValueChange, description }: SettingRowProps) {
  return (
    <View className="mb-3 flex-row items-start justify-between">
      <View className="mr-3 flex-1">
        <Text className="text-[14px] text-slate-900">{label}</Text>
        {description ? <Text className="mt-0.5 text-[12px] text-slate-500">{description}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: "#e5e7eb", true: "#7cc9ff" }}
        thumbColor={value ? "#1e98f3" : "#ffffff"}
      />
    </View>
  );
}
