import Ionicons from "@expo/vector-icons/Ionicons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

import { AppStatusBarBlue } from "@/components/ui/app-status-bar-blue";
import {
  fileService,
  type AttachmentResponse,
} from "@/services/file.service";

type StorageTab = "images" | "files";

function normalizeTab(value?: string | string[]): StorageTab {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw === "files" ? "files" : "images";
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

export default function MobileStorageScreen() {
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();
  const { conversationId: rawConversationId, tab } = useLocalSearchParams<{
    conversationId?: string | string[];
    tab?: string | string[];
  }>();
  const conversationId = Array.isArray(rawConversationId)
    ? rawConversationId[0]
    : rawConversationId;

  const [activeTab, setActiveTab] = useState<StorageTab>(normalizeTab(tab));
  const [isLoading, setIsLoading] = useState(false);
  const [attachments, setAttachments] = useState<AttachmentResponse[]>([]);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const viewerListRef = React.useRef<FlatList<AttachmentResponse> | null>(null);

  useEffect(() => {
    setActiveTab(normalizeTab(tab));
  }, [tab]);

  const openAttachmentUrl = useCallback(async (url: string) => {
    if (!url) {
      return;
    }
    try {
      const supported = await Linking.canOpenURL(url);
      if (!supported) {
        Toast.show({ type: "error", text1: "Không thể mở tệp này" });
        return;
      }
      await Linking.openURL(url);
    } catch {
      Toast.show({ type: "error", text1: "Mở tệp thất bại" });
    }
  }, []);

  useEffect(() => {
    if (!conversationId) {
      setAttachments([]);
      return;
    }

    let cancelled = false;
    const loadAttachments = async () => {
      setIsLoading(true);
      try {
        const response = await fileService.getAttachments(conversationId, activeTab);
        if (cancelled) {
          return;
        }
        const filtered = (response.data ?? []).filter((item) => {
          if (activeTab === "images") {
            return item.type === "IMAGE" || item.type === "VIDEO";
          }
          return item.type === "FILE" || item.type === "AUDIO";
        });
        const sorted = filtered.slice().sort((a, b) => {
          const right = new Date(b.timeSent ?? b.timeUpload).getTime();
          const left = new Date(a.timeSent ?? a.timeUpload).getTime();
          return right - left;
        });
        setAttachments(sorted);
      } catch {
        if (!cancelled) {
          Toast.show({ type: "error", text1: "Không tải được dữ liệu lưu trữ" });
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadAttachments();
    return () => {
      cancelled = true;
    };
  }, [activeTab, conversationId]);

  const imageItems = useMemo(
    () => attachments.filter((item) => item.type === "IMAGE"),
    [attachments]
  );

  const openImageViewer = useCallback(
    (attachmentId: string) => {
      const index = imageItems.findIndex(
        (item) => item.idAttachment === attachmentId
      );
      setViewerIndex(index >= 0 ? index : 0);
      setViewerOpen(true);
    },
    [imageItems]
  );

  return (
    <View className="flex-1 bg-[#f3f4f6]">
      <AppStatusBarBlue />
      <SafeAreaView edges={["top"]} className="bg-[#1e98f3]" />

      <View className="bg-[#1e98f3] px-3.5 pb-2.5 pt-2.5">
        <View className="flex-row items-center">
          <Pressable
            className="mr-1.5 h-9 w-9 items-center justify-center rounded-full"
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
          </Pressable>
          <Text className="flex-1 text-[17px] font-semibold text-white">
            Kho lưu trữ
          </Text>
        </View>
      </View>

      <View className="bg-white px-3 pt-3">
        <View className="flex-row rounded-full bg-slate-100 p-1">
          <Pressable
            className={`flex-1 items-center rounded-full py-2 ${
              activeTab === "images" ? "bg-white" : ""
            }`}
            onPress={() => setActiveTab("images")}
          >
            <Text
              className={`text-[13px] font-medium ${
                activeTab === "images" ? "text-slate-900" : "text-slate-500"
              }`}
            >
              Ảnh/Video
            </Text>
          </Pressable>
          <Pressable
            className={`flex-1 items-center rounded-full py-2 ${
              activeTab === "files" ? "bg-white" : ""
            }`}
            onPress={() => setActiveTab("files")}
          >
            <Text
              className={`text-[13px] font-medium ${
                activeTab === "files" ? "text-slate-900" : "text-slate-500"
              }`}
            >
              File
            </Text>
          </Pressable>
        </View>
      </View>

      <ScrollView className="flex-1 px-3 pt-3" showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <View className="py-8">
            <ActivityIndicator size="small" color="#1e98f3" />
          </View>
        ) : attachments.length === 0 ? (
          <View className="py-8">
            <Text className="text-center text-[13px] text-slate-500">
              {activeTab === "images"
                ? "Chưa có ảnh/video đã gửi"
                : "Chưa có file đã gửi"}
            </Text>
          </View>
        ) : activeTab === "images" ? (
          <View className="flex-row flex-wrap justify-between">
            {attachments.map((item) => (
              <Pressable
                key={item.idAttachment}
                className="mb-2 h-[112px] w-[32%] overflow-hidden rounded-md bg-slate-200"
                onPress={() => {
                  if (item.type === "VIDEO") {
                    void openAttachmentUrl(item.url);
                    return;
                  }
                  openImageViewer(item.idAttachment);
                }}
              >
                {item.type === "VIDEO" ? (
                  <View className="h-full w-full items-center justify-center bg-slate-700">
                    <Ionicons name="play-circle" size={28} color="#ffffff" />
                    <Text className="mt-1 text-[11px] text-white">Video</Text>
                  </View>
                ) : (
                  <Image
                    source={{ uri: item.url }}
                    className="h-full w-full"
                    resizeMode="cover"
                  />
                )}
              </Pressable>
            ))}
          </View>
        ) : (
          <View>
            {attachments.map((file) => {
              const fileName = getFileNameFromUrl(file.url);
              const ext = getFileExt(fileName);
              const extColor = getExtColor(ext);
              return (
                <Pressable
                  key={file.idAttachment}
                  className="mb-2 flex-row items-center rounded-lg bg-white px-3 py-2"
                  onPress={() => {
                    void openAttachmentUrl(file.url);
                  }}
                >
                  <View
                    className={`h-10 w-10 items-center justify-center rounded ${extColor}`}
                  >
                    <Text className="text-[10px] font-semibold text-white">
                      {ext}
                    </Text>
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
                        void openAttachmentUrl(file.url);
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
            })}
          </View>
        )}
        <View className="h-4" />
      </ScrollView>

      <Modal
        visible={viewerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setViewerOpen(false)}
      >
        <View className="flex-1 bg-black">
          <View className="flex-row items-center justify-between px-3 pb-2 pt-12">
            <Pressable
              className="h-9 w-9 items-center justify-center rounded-full bg-white/15"
              onPress={() => setViewerOpen(false)}
            >
              <Text className="text-lg text-white">✕</Text>
            </Pressable>
            <Text className="text-sm font-medium text-white">
              {imageItems.length > 0 ? `${viewerIndex + 1}/${imageItems.length}` : ""}
            </Text>
            <View className="h-9 w-9" />
          </View>

          <FlatList
            ref={viewerListRef}
            data={imageItems}
            horizontal
            pagingEnabled
            initialScrollIndex={viewerIndex}
            getItemLayout={(_, index) => ({
              length: screenWidth,
              offset: screenWidth * index,
              index,
            })}
            keyExtractor={(item) => item.idAttachment}
            onMomentumScrollEnd={(event) => {
              const nextIndex = Math.round(
                event.nativeEvent.contentOffset.x / screenWidth
              );
              setViewerIndex(nextIndex);
            }}
            renderItem={({ item }) => (
              <View
                style={{ width: screenWidth }}
                className="flex-1 items-center justify-center"
              >
                <Image
                  source={{ uri: item.url }}
                  className="h-[78%] w-full"
                  resizeMode="contain"
                />
              </View>
            )}
          />
        </View>
      </Modal>

      <SafeAreaView edges={["bottom"]} className="bg-white" />
    </View>
  );
}
