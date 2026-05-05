import Ionicons from "@expo/vector-icons/Ionicons";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Pressable,
  ScrollView,
  Switch,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

import { ChatOptionsHeader } from "@/components/chat-options/chat-options-header";
import { AppStatusBarBlue } from "@/components/ui/app-status-bar-blue";
import { chatService } from "@/services/chat.service";
import {
  fileService,
  type AttachmentResponse,
} from "@/services/file.service";
import { userService } from "@/services/user.service";
import type {
  ConversationBlockStatusResponse,
  ConversationResponse,
} from "@/types/chat";
import type { UserProfile } from "@/types/user";

type LinkPreviewItem = {
  id: string;
  url: string;
  domain: string;
  timeSent: string;
};

const PREVIEW_LIMIT = 3;
const IMAGE_PREVIEW_LIMIT = 4;
const LINK_PAGE_LIMIT = 100;
const LINK_MAX_PAGES = 6;

function toFallback(fullName: string) {
  const words = fullName
    .trim()
    .split(/\s+/)
    .filter(Boolean);
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

function fullName(profile?: UserProfile | null, fallback?: string) {
  if (!profile) {
    return fallback || "";
  }
  const name = `${profile.firstName ?? ""} ${profile.lastName ?? ""}`.trim();
  return name || fallback || profile.identityUserId;
}

function getDomainFromUrl(rawUrl: string) {
  try {
    return new URL(rawUrl).hostname;
  } catch {
    return rawUrl;
  }
}

function extractUrlsFromText(text?: string) {
  if (!text) {
    return [];
  }
  const matches = text.match(/https?:\/\/[^\s]+/g);
  return matches ?? [];
}

function getFileNameFromUrl(rawUrl: string) {
  try {
    const clean = decodeURIComponent(rawUrl.split("?")[0] ?? rawUrl);
    return clean.split("/").pop() || rawUrl;
  } catch {
    return rawUrl;
  }
}

function getFileExt(fileName: string) {
  return fileName.split(".").pop()?.toUpperCase().slice(0, 4) || "FILE";
}

function formatMessageTime(value?: string | null) {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getExtColor(ext: string) {
  const lower = ext.toLowerCase();
  if (lower.includes("pdf")) return "bg-red-500";
  if (lower.includes("doc")) return "bg-blue-500";
  if (lower.includes("xls")) return "bg-green-500";
  if (lower.includes("ppt")) return "bg-orange-500";
  if (lower.includes("zip") || lower.includes("rar")) return "bg-yellow-600";
  if (lower.includes("mp3") || lower.includes("wav")) return "bg-purple-500";
  return "bg-gray-500";
}

type SectionCardProps = {
  title: string;
  children: React.ReactNode;
};

function SectionCard({ title, children }: SectionCardProps) {
  return (
    <View className="mt-3 rounded-xl bg-white px-4 py-3">
      <Text className="text-[15px] font-semibold text-slate-900">{title}</Text>
      <View className="mt-2">{children}</View>
    </View>
  );
}

type ActionButtonProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  active?: boolean;
};

function ActionButton({
  icon,
  label,
  onPress,
  disabled = false,
  active = false,
}: ActionButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={`w-[23%] items-center ${disabled ? "opacity-50" : ""}`}
    >
      <View
        className={`h-12 w-12 items-center justify-center rounded-full ${
          active ? "bg-blue-600" : "bg-slate-100"
        }`}
      >
        <Ionicons name={icon} size={22} color={active ? "#ffffff" : "#334155"} />
      </View>
      <Text className="mt-1.5 text-center text-[12px] text-slate-600">{label}</Text>
    </Pressable>
  );
}

type SettingRowProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  subtitle?: string;
  right?: React.ReactNode;
  danger?: boolean;
  onPress?: () => void;
  disabled?: boolean;
};

function SettingRow({
  icon,
  label,
  subtitle,
  right,
  danger = false,
  onPress,
  disabled = false,
}: SettingRowProps) {
  const content = (
    <View
      className={`flex-row items-center py-2 ${disabled ? "opacity-50" : ""}`}
    >
      <View className="h-9 w-9 items-center justify-center rounded-full bg-slate-100">
        <Ionicons name={icon} size={19} color={danger ? "#dc2626" : "#334155"} />
      </View>
      <View className="ml-3 flex-1">
        <Text className={`text-[14px] ${danger ? "text-red-600" : "text-slate-900"}`}>
          {label}
        </Text>
        {subtitle ? (
          <Text className="mt-0.5 text-[12px] text-slate-500">{subtitle}</Text>
        ) : null}
      </View>
      {right ?? <Ionicons name="chevron-forward" size={18} color="#94a3b8" />}
    </View>
  );

  if (!onPress) {
    return content;
  }

  return (
    <Pressable onPress={onPress} disabled={disabled}>
      {content}
    </Pressable>
  );
}

export default function ChatOptionsScreen() {
  const router = useRouter();
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();

  const [conversation, setConversation] = useState<ConversationResponse | null>(null);
  const [myIdentityUserId, setMyIdentityUserId] = useState<string | null>(null);
  const [peerProfile, setPeerProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  const [isUpdatingAvatar, setIsUpdatingAvatar] = useState(false);

  const [isMuted, setIsMuted] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const [isPinningConversation, setIsPinningConversation] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [imagesPreview, setImagesPreview] = useState<AttachmentResponse[]>([]);
  const [filesPreview, setFilesPreview] = useState<AttachmentResponse[]>([]);
  const [linksPreview, setLinksPreview] = useState<LinkPreviewItem[]>([]);
  const [blockStatus, setBlockStatus] =
    useState<ConversationBlockStatusResponse | null>(null);
  const [isUpdatingBlock, setIsUpdatingBlock] = useState(false);

  const isGroupConversation = conversation?.type === "GROUP";
  const currentUserRole = useMemo(
    () =>
      conversation?.participantInfos.find(
        (item) => item.idAccount === myIdentityUserId
      )?.role ?? null,
    [conversation?.participantInfos, myIdentityUserId]
  );
  const canDissolveGroup = Boolean(
    isGroupConversation && currentUserRole === "ADMIN"
  );
  const canManageGroup = Boolean(
    isGroupConversation &&
      (currentUserRole === "ADMIN" || currentUserRole === "DEPUTY")
  );
  const allowMemberChangeAvatar =
    conversation?.groupManagementSettings?.allowMemberChangeAvatar ?? true;
  const canChangeGroupAvatar = Boolean(
    isGroupConversation && (canManageGroup || allowMemberChangeAvatar)
  );

  const peerIdentityUserId = useMemo(() => {
    if (!conversation || conversation.type !== "DOUBLE" || !myIdentityUserId) {
      return null;
    }
    return (
      conversation.participantInfos.find(
        (item) => item.idAccount !== myIdentityUserId
      )?.idAccount ?? null
    );
  }, [conversation, myIdentityUserId]);

  const conversationTitle = useMemo(() => {
    if (!conversation) {
      return "Thông tin hội thoại";
    }
    if (conversation.type === "GROUP") {
      return conversation.name?.trim() || "Nhóm chat";
    }
    return (
      fullName(peerProfile, conversation.name?.trim() || "Cuộc trò chuyện") ||
      "Cuộc trò chuyện"
    );
  }, [conversation, peerProfile]);

  const conversationAvatarUrl = useMemo(() => {
    if (conversation?.type === "GROUP") {
      return conversation.avatar ?? null;
    }
    return peerProfile?.avatar ?? conversation?.avatar ?? null;
  }, [conversation?.avatar, conversation?.type, peerProfile?.avatar]);

  const conversationFallback = useMemo(
    () => toFallback(conversationTitle),
    [conversationTitle]
  );

  const loadConversation = useCallback(async () => {
    if (!conversationId) {
      return;
    }
    setIsLoading(true);
    try {
      const [myProfileResponse, listResponse] = await Promise.all([
        userService.getMyProfile(),
        chatService.listConversations(),
      ]);
      const myId = myProfileResponse.data.identityUserId ?? null;
      setMyIdentityUserId(myId);

      const foundConversation =
        (listResponse.data ?? []).find(
          (item) => item.idConversation === conversationId
        ) ?? null;
      setConversation(foundConversation);

      if (!foundConversation) {
        setPeerProfile(null);
        return;
      }

      if (foundConversation.type !== "DOUBLE" || !myId) {
        setPeerProfile(null);
        return;
      }

      const peerId =
        foundConversation.participantInfos.find(
          (participant) => participant.idAccount !== myId
        )?.idAccount ?? null;
      if (!peerId) {
        setPeerProfile(null);
        return;
      }
      try {
        const peerProfileResponse = await userService.getProfileByIdentityUserId(peerId);
        setPeerProfile(peerProfileResponse.data);
      } catch {
        setPeerProfile(null);
      }
    } catch (error) {
      Toast.show({
        type: "error",
        text1: getErrorMessage(error, "Không tải được thông tin hội thoại"),
      });
    } finally {
      setIsLoading(false);
    }
  }, [conversationId]);

  const loadAttachmentsPreview = useCallback(async () => {
    if (!conversationId) {
      return;
    }
    setPreviewLoading(true);
    try {
      const [imagesRes, filesRes, linksRes] = await Promise.all([
        fileService.getAttachments(conversationId, "images"),
        fileService.getAttachments(conversationId, "files"),
        fileService.getAttachments(conversationId, "links"),
      ]);

      const sortedImages = (imagesRes.data ?? [])
        .filter((item) => item.type === "IMAGE" || item.type === "VIDEO")
        .slice()
        .sort(
          (a, b) =>
            new Date(b.timeSent ?? b.timeUpload).getTime() -
            new Date(a.timeSent ?? a.timeUpload).getTime()
        );
      const sortedFiles = (filesRes.data ?? [])
        .slice()
        .sort(
          (a, b) =>
            new Date(b.timeSent ?? b.timeUpload).getTime() -
            new Date(a.timeSent ?? a.timeUpload).getTime()
        );

      let linksCollected: LinkPreviewItem[] = (linksRes.data ?? [])
        .filter((item) => item.type === "LINK" && Boolean(item.url))
        .map((item) => ({
          id: item.idAttachment,
          url: item.url,
          domain: getDomainFromUrl(item.url),
          timeSent: item.timeSent ?? item.timeUpload,
        }));

      if (linksCollected.length === 0) {
        let page = 1;
        let totalPage = 1;
        do {
          const response = await chatService.listMessages(
            conversationId,
            page,
            LINK_PAGE_LIMIT
          );
          const items = response.data.items ?? [];
          totalPage = response.data.totalPage ?? page;

          items.forEach((message) => {
            if (message.recalled) {
              return;
            }
            extractUrlsFromText(message.content).forEach((url, index) => {
              linksCollected.push({
                id: `${message.idMessage}-${index}`,
                url,
                domain: getDomainFromUrl(url),
                timeSent: message.timeSent,
              });
            });
          });

          page += 1;
        } while (page <= totalPage && page <= LINK_MAX_PAGES);
      }

      linksCollected = linksCollected.sort(
        (a, b) => new Date(b.timeSent).getTime() - new Date(a.timeSent).getTime()
      );

      setImagesPreview(sortedImages.slice(0, IMAGE_PREVIEW_LIMIT));
      setFilesPreview(sortedFiles.slice(0, PREVIEW_LIMIT));
      setLinksPreview(linksCollected.slice(0, PREVIEW_LIMIT));
    } catch (error) {
      Toast.show({
        type: "error",
        text1: getErrorMessage(error, "Không tải được dữ liệu ảnh, file, link"),
      });
    } finally {
      setPreviewLoading(false);
    }
  }, [conversationId]);

  const handleOpenStorage = useCallback(
    (tab: "images" | "files") => {
      if (!conversationId) {
        return;
      }
      router.push(`/message/options/storage/${conversationId}?tab=${tab}`);
    },
    [conversationId, router]
  );

  const handleOpenAttachmentUrl = useCallback(async (url: string) => {
    if (!url) {
      return;
    }
    try {
      const supported = await Linking.canOpenURL(url);
      if (!supported) {
        Toast.show({
          type: "error",
          text1: "Không thể mở tệp này",
        });
        return;
      }
      await Linking.openURL(url);
    } catch {
      Toast.show({
        type: "error",
        text1: "Mở tệp thất bại",
      });
    }
  }, []);

  const refreshBlockStatus = useCallback(async () => {
    if (!conversationId || conversation?.type !== "DOUBLE") {
      setBlockStatus(null);
      return;
    }
    try {
      const response = await chatService.getConversationBlockStatus(conversationId);
      setBlockStatus(response.data);
    } catch {
      setBlockStatus(null);
    }
  }, [conversation?.type, conversationId]);

  useEffect(() => {
    void loadConversation();
  }, [loadConversation]);

  useEffect(() => {
    void loadAttachmentsPreview();
  }, [loadAttachmentsPreview]);

  useEffect(() => {
    void refreshBlockStatus();
  }, [refreshBlockStatus]);

  const handleTogglePinConversation = useCallback(async () => {
    if (!conversationId || !conversation || isPinningConversation) {
      return;
    }
    setIsPinningConversation(true);
    try {
      if (conversation.pinned) {
        await chatService.unpinConversation(conversationId);
      } else {
        await chatService.pinConversation(conversationId);
      }
      await loadConversation();
      Toast.show({
        type: "success",
        text1: conversation.pinned
          ? "Đã bỏ ghim hội thoại"
          : "Đã ghim hội thoại",
      });
    } catch (error) {
      Toast.show({
        type: "error",
        text1: getErrorMessage(error, "Cập nhật ghim hội thoại thất bại"),
      });
    } finally {
      setIsPinningConversation(false);
    }
  }, [conversation, conversationId, isPinningConversation, loadConversation]);

  const handleToggleBlockMessaging = useCallback(async () => {
    if (!conversationId || conversation?.type !== "DOUBLE" || isUpdatingBlock) {
      return;
    }
    setIsUpdatingBlock(true);
    try {
      if (blockStatus?.blockedByMe) {
        await chatService.unblockConversation(conversationId);
      } else {
        await chatService.blockConversation(conversationId);
      }
      await refreshBlockStatus();
      Toast.show({
        type: "success",
        text1: blockStatus?.blockedByMe
          ? "Đã bỏ chặn nhắn tin"
          : "Đã chặn nhắn tin",
      });
    } catch (error) {
      Toast.show({
        type: "error",
        text1: getErrorMessage(error, "Cập nhật trạng thái chặn thất bại"),
      });
    } finally {
      setIsUpdatingBlock(false);
    }
  }, [
    blockStatus?.blockedByMe,
    conversation?.type,
    conversationId,
    isUpdatingBlock,
    refreshBlockStatus,
  ]);

  const handleLeaveGroup = useCallback(() => {
    if (!conversationId || isProcessingAction) {
      return;
    }
    Alert.alert("Rời nhóm", "Bạn có chắc muốn rời nhóm này không?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Rời nhóm",
        style: "destructive",
        onPress: () => {
          setIsProcessingAction(true);
          void (async () => {
            try {
              await chatService.leaveGroupConversation(conversationId);
              Toast.show({ type: "success", text1: "Bạn đã rời nhóm" });
              router.replace("/message");
            } catch (error) {
              Toast.show({
                type: "error",
                text1: getErrorMessage(error, "Rời nhóm thất bại"),
              });
            } finally {
              setIsProcessingAction(false);
            }
          })();
        },
      },
    ]);
  }, [conversationId, isProcessingAction, router]);

  const handleDissolveGroup = useCallback(() => {
    if (!conversationId || isProcessingAction) {
      return;
    }
    Alert.alert(
      "Giải tán nhóm",
      "Nhóm sẽ bị xóa và không thể khôi phục. Bạn có chắc muốn tiếp tục?",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Giải tán",
          style: "destructive",
          onPress: () => {
            setIsProcessingAction(true);
            void (async () => {
              try {
                await chatService.dissolveGroupConversation(conversationId);
                Toast.show({ type: "success", text1: "Đã giải tán nhóm" });
                router.replace("/message");
              } catch (error) {
                Toast.show({
                  type: "error",
                  text1: getErrorMessage(error, "Giải tán nhóm thất bại"),
                });
              } finally {
                setIsProcessingAction(false);
              }
            })();
          },
        },
      ]
    );
  }, [conversationId, isProcessingAction, router]);

  const handleCreateGroupFromDirect = useCallback(() => {
    if (!peerIdentityUserId) {
      Toast.show({
        type: "error",
        text1: "Không tìm thấy thông tin người dùng",
      });
      return;
    }
    const params = new URLSearchParams();
    params.append("presetMemberId", peerIdentityUserId);
    params.append("presetMemberName", conversationTitle);
    if (conversationAvatarUrl) {
      params.append("presetMemberAvatar", conversationAvatarUrl);
    }
    router.push(`/message/create-group?${params.toString()}`);
  }, [conversationAvatarUrl, conversationTitle, peerIdentityUserId, router]);

  const handleChangeGroupAvatar = useCallback(async () => {
    if (!conversationId || !canChangeGroupAvatar || isUpdatingAvatar) {
      return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Toast.show({
        type: "error",
        text1: "Thiếu quyền truy cập ảnh",
        text2: "Vui lòng cấp quyền thư viện ảnh để đổi ảnh nhóm.",
      });
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: false,
      allowsMultipleSelection: false,
      quality: 0.9,
    });

    if (result.canceled || result.assets.length === 0) {
      return;
    }

    const selected = result.assets[0];
    if (!selected?.uri) {
      return;
    }

    setIsUpdatingAvatar(true);
    try {
      const uploadResponse = await fileService.uploadFileFromUri(selected.uri, {
        fileName: selected.fileName ?? undefined,
        mimeType: selected.mimeType ?? undefined,
      });
      const avatarUrl = uploadResponse.data.url;
      await chatService.updateGroupAvatar(conversationId, { avatar: avatarUrl });
      setConversation((prev) =>
        prev
          ? {
              ...prev,
              avatar: avatarUrl,
            }
          : prev
      );
      Toast.show({
        type: "success",
        text1: "Đã cập nhật ảnh đại diện nhóm",
      });
    } catch (error) {
      Toast.show({
        type: "error",
        text1: getErrorMessage(error, "Không thể cập nhật ảnh đại diện nhóm"),
      });
    } finally {
      setIsUpdatingAvatar(false);
    }
  }, [canChangeGroupAvatar, conversationId, isUpdatingAvatar]);

  const quickActions = useMemo(() => {
    if (isGroupConversation) {
      const groupActions = [
        {
          id: "mute",
          icon: "notifications-off-outline" as const,
          label: "Tắt thông báo",
          onPress: () => setIsMuted((prev) => !prev),
          active: isMuted,
          disabled: false,
        },
        {
          id: "pin",
          icon: "pin-outline" as const,
          label: conversation?.pinned ? "Bỏ ghim" : "Ghim",
          onPress: () => void handleTogglePinConversation(),
          active: Boolean(conversation?.pinned),
          disabled: isPinningConversation,
        },
        {
          id: "add-member",
          icon: "person-add-outline" as const,
          label: "Thành viên",
          onPress: () => {
            if (!conversationId) {
              return;
            }
            router.push(`/message/group-members/${conversationId}`);
          },
          active: false,
          disabled: false,
        },
        {
          id: "group-manage",
          icon: "settings-outline" as const,
          label: "Quản lý nhóm",
          onPress: () => {
            if (!conversationId) {
              return;
            }
            router.push(`/message/group-manage/${conversationId}`);
          },
          active: false,
          disabled: false,
        },
      ];
      return canManageGroup
        ? groupActions
        : groupActions.filter((action) => action.id !== "group-manage");
    }

    return [
      {
        id: "mute",
        icon: "notifications-off-outline" as const,
        label: "Tắt thông báo",
        onPress: () => setIsMuted((prev) => !prev),
        active: isMuted,
        disabled: false,
      },
      {
        id: "pin",
        icon: "pin-outline" as const,
        label: conversation?.pinned ? "Bỏ ghim" : "Ghim",
        onPress: () => void handleTogglePinConversation(),
        active: Boolean(conversation?.pinned),
        disabled: isPinningConversation,
      },
      {
        id: "create-group",
        icon: "people-outline" as const,
        label: "Tạo nhóm",
        onPress: handleCreateGroupFromDirect,
        active: false,
        disabled: false,
      },
    ];
  }, [
    conversation?.pinned,
    conversationId,
    handleCreateGroupFromDirect,
    handleTogglePinConversation,
    isGroupConversation,
    canManageGroup,
    isMuted,
    isPinningConversation,
    router,
  ]);

  if (isLoading) {
    return (
      <View className="flex-1 bg-[#f3f4f6]">
        <AppStatusBarBlue />
        <SafeAreaView edges={["top"]} className="bg-[#1e98f3]" />
        <ChatOptionsHeader
          onBack={() => {
            router.back();
          }}
        />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="small" color="#1e98f3" />
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#f3f4f6]">
      <AppStatusBarBlue />
      <SafeAreaView edges={["top"]} className="bg-[#1e98f3]" />

      <ChatOptionsHeader
        onBack={() => {
          router.back();
        }}
      />

      <ScrollView className="flex-1 px-3" showsVerticalScrollIndicator={false}>
        <View className="mt-3 items-center rounded-xl bg-white px-5 py-6">
          {canChangeGroupAvatar ? (
            <Pressable
              className="relative"
              onPress={() => void handleChangeGroupAvatar()}
              disabled={isUpdatingAvatar}
            >
              {conversationAvatarUrl ? (
                <Image
                  source={{ uri: conversationAvatarUrl }}
                  className="h-20 w-20 rounded-full bg-slate-200"
                />
              ) : (
                <View className="h-20 w-20 items-center justify-center rounded-full bg-slate-400">
                  <Text className="text-[27px] font-semibold text-white">
                    {conversationFallback}
                  </Text>
                </View>
              )}
              <View className="absolute bottom-0 right-0 h-7 w-7 items-center justify-center rounded-full border border-white bg-white">
                {isUpdatingAvatar ? (
                  <ActivityIndicator size="small" color="#1e98f3" />
                ) : (
                  <Ionicons name="camera-outline" size={15} color="#1e98f3" />
                )}
              </View>
            </Pressable>
          ) : conversationAvatarUrl ? (
            <Image
              source={{ uri: conversationAvatarUrl }}
              className="h-20 w-20 rounded-full bg-slate-200"
            />
          ) : (
            <View className="h-20 w-20 items-center justify-center rounded-full bg-slate-400">
              <Text className="text-[27px] font-semibold text-white">
                {conversationFallback}
              </Text>
            </View>
          )}
          {canChangeGroupAvatar ? (
            <Text className="mt-2 text-[11px] text-slate-500">
              Chạm vào ảnh để đổi ảnh đại diện nhóm
            </Text>
          ) : null}
          <Text className="mt-4 text-center text-[22px] font-semibold text-slate-900">
            {conversationTitle}
          </Text>
          <Text className="mt-1 text-[13px] text-slate-500">
            {isGroupConversation
              ? `${conversation?.numberMember ?? 0} thành viên`
              : "Cuộc trò chuyện 1-1"}
          </Text>

          <View className="mt-5 w-full flex-row justify-between">
            {quickActions.map((action) => (
              <ActionButton
                key={action.id}
                icon={action.icon}
                label={action.label}
                onPress={action.onPress}
                active={action.active}
                disabled={action.disabled}
              />
            ))}
          </View>
        </View>

        <SectionCard title="Ảnh/Video">
          {previewLoading ? (
            <View className="py-4">
              <ActivityIndicator size="small" color="#1e98f3" />
            </View>
          ) : imagesPreview.length === 0 ? (
            <Text className="text-[13px] text-slate-500">Chưa có ảnh/video</Text>
          ) : (
            <View className="flex-row flex-wrap justify-between">
              {imagesPreview.map((item) => (
                <View
                  key={item.idAttachment}
                  className="mb-2 h-[72px] w-[23.5%] overflow-hidden rounded-md bg-slate-200"
                >
                  {item.type === "VIDEO" ? (
                    <View className="h-full w-full items-center justify-center bg-slate-700">
                      <Ionicons name="play-circle" size={24} color="#ffffff" />
                    </View>
                  ) : (
                    <Image
                      source={{ uri: item.url }}
                      className="h-full w-full"
                      resizeMode="cover"
                    />
                  )}
                </View>
              ))}
            </View>
          )}
          <Pressable
            className="mt-3 self-start rounded-full bg-slate-100 px-3 py-1.5"
            onPress={() => handleOpenStorage("images")}
          >
            <Text className="text-[12px] font-medium text-slate-700">Xem tất cả</Text>
          </Pressable>
        </SectionCard>

        <SectionCard title="File">
          {previewLoading ? (
            <View className="py-4">
              <ActivityIndicator size="small" color="#1e98f3" />
            </View>
          ) : filesPreview.length === 0 ? (
            <Text className="text-[13px] text-slate-500">Chưa có file</Text>
          ) : (
            filesPreview.map((file) => {
              const fileName = getFileNameFromUrl(file.url);
              const ext = getFileExt(fileName);
              const extColor = getExtColor(ext);
              return (
                <Pressable
                  key={file.idAttachment}
                  className="mb-2 flex-row items-center rounded-lg bg-slate-50 px-2 py-2"
                  onPress={() => {
                    void handleOpenAttachmentUrl(file.url);
                  }}
                >
                  <View
                    className={`h-9 w-9 items-center justify-center rounded ${extColor}`}
                  >
                    <Text className="text-[10px] font-semibold text-white">{ext}</Text>
                  </View>
                  <View className="ml-2 flex-1">
                    <Text numberOfLines={1} className="text-[13px] text-slate-800">
                      {fileName}
                    </Text>
                    <Text className="text-[11px] text-slate-500">
                      {file.size || "Không xác định dung lượng"}
                    </Text>
                  </View>
                  <View className="ml-2 items-end">
                    <Pressable
                      className="mb-1 rounded-full bg-blue-50 p-1"
                      onPress={() => {
                        void handleOpenAttachmentUrl(file.url);
                      }}
                    >
                      <Ionicons name="download-outline" size={14} color="#2563eb" />
                    </Pressable>
                    <Text className="text-[11px] text-slate-500">
                      {formatMessageTime(file.timeSent ?? file.timeUpload)}
                    </Text>
                  </View>
                </Pressable>
              );
            })
          )}
          <Pressable
            className="mt-2 self-start rounded-full bg-slate-100 px-3 py-1.5"
            onPress={() => handleOpenStorage("files")}
          >
            <Text className="text-[12px] font-medium text-slate-700">Xem tất cả</Text>
          </Pressable>
        </SectionCard>

        <SectionCard title="Link">
          {previewLoading ? (
            <View className="py-4">
              <ActivityIndicator size="small" color="#1e98f3" />
            </View>
          ) : linksPreview.length === 0 ? (
            <Text className="text-[13px] text-slate-500">Chưa có link</Text>
          ) : (
            linksPreview.map((link) => (
              <View
                key={link.id}
                className="mb-2 rounded-lg bg-slate-50 px-2 py-2"
              >
                <Text numberOfLines={1} className="text-[13px] text-sky-700">
                  {link.url}
                </Text>
                <View className="mt-1 flex-row items-center justify-between">
                  <Text className="text-[11px] text-slate-500">{link.domain}</Text>
                  <Text className="text-[11px] text-slate-500">
                    {formatMessageTime(link.timeSent)}
                  </Text>
                </View>
              </View>
            ))
          )}
        </SectionCard>

        <SectionCard title="Thiết lập bảo mật">
          <SettingRow
            icon="timer-outline"
            label="Tin nhắn tự xóa"
            subtitle="Không bao giờ"
            right={<Text className="text-[12px] text-slate-500">Sắp có</Text>}
          />
          <SettingRow
            icon="eye-off-outline"
            label="Ẩn cuộc trò chuyện"
            right={
              <Switch
                value={isHidden}
                onValueChange={setIsHidden}
                trackColor={{ false: "#e5e7eb", true: "#7cc9ff" }}
                thumbColor={isHidden ? "#1e98f3" : "#ffffff"}
              />
            }
          />
          {conversation?.type === "DOUBLE" ? (
            <SettingRow
              icon="ban-outline"
              label={blockStatus?.blockedByMe ? "Đã chặn nhắn tin" : "Chặn nhắn tin"}
              subtitle={
                blockStatus?.blockedByMe
                  ? "Bạn đã chặn người này trong hội thoại 1-1."
                  : blockStatus?.blockedByOther
                  ? "Bạn đang bị người này chặn nhắn tin."
                  : "Chặn người này nhắn tin trong hội thoại này."
              }
              onPress={() => void handleToggleBlockMessaging()}
              disabled={isUpdatingBlock}
              right={
                isUpdatingBlock ? (
                  <ActivityIndicator size="small" color="#1e98f3" />
                ) : (
                  <Text
                    className={`text-[12px] font-semibold ${
                      blockStatus?.blockedByMe ? "text-slate-600" : "text-red-600"
                    }`}
                  >
                    {blockStatus?.blockedByMe ? "Bỏ chặn" : "Chặn"}
                  </Text>
                )
              }
            />
          ) : null}
        </SectionCard>

        <SectionCard title="Khác">
          <SettingRow
            icon="warning-outline"
            label="Báo xấu"
            onPress={() => {
              Toast.show({
                type: "info",
                text1: "Tính năng báo xấu sẽ được cập nhật sớm",
              });
            }}
          />
          <SettingRow
            icon="trash-outline"
            label="Xóa lịch sử trò chuyện"
            danger
            onPress={() => {
              Toast.show({
                type: "info",
                text1: "Tính năng xóa lịch sử sẽ được cập nhật sớm",
              });
            }}
          />
          {isGroupConversation ? (
            <SettingRow
              icon="log-out-outline"
              label="Rời nhóm"
              subtitle="Bạn sẽ không còn nhận tin nhắn từ nhóm này"
              danger
              onPress={handleLeaveGroup}
              disabled={isProcessingAction}
            />
          ) : null}
          {isGroupConversation && canDissolveGroup ? (
            <SettingRow
              icon="trash-outline"
              label="Giải tán nhóm"
              subtitle="Chỉ trưởng nhóm mới có quyền này"
              danger
              onPress={handleDissolveGroup}
              disabled={isProcessingAction}
            />
          ) : null}
        </SectionCard>

        <View className="h-4" />
      </ScrollView>

      <SafeAreaView edges={["bottom"]} className="bg-white" />
    </View>
  );
}
