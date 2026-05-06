import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import { AppStatusBarBlue } from '@/components/ui/app-status-bar-blue';
import { notificationService } from '@/services/notification.service';
import type { NotificationItem } from '@/types/notification';

export default function UserNotificationsScreen() {
  const router = useRouter();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);

  const unreadCount = useMemo(() => items.filter((item) => !item.read).length, [items]);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const response = await notificationService.listMyNotifications(1, 30);
      setItems(response.data.items ?? []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadNotifications();
  }, []);

  const handleMarkAsRead = async (notificationId: number) => {
    await notificationService.markAsRead(notificationId);
    setItems((prev) =>
      prev.map((item) => (item.id === notificationId ? { ...item, read: true } : item))
    );
  };

  const handleMarkAllAsRead = async () => {
    setMarkingAll(true);
    try {
      await notificationService.markAllAsRead();
      setItems((prev) => prev.map((item) => ({ ...item, read: true })));
    } finally {
      setMarkingAll(false);
    }
  };

  return (
    <View className="flex-1 bg-[#f3f4f6]">
      <AppStatusBarBlue />
      <SafeAreaView edges={['top']} className="bg-[#1e98f3]" />

      <View className="flex-row items-center bg-[#1e98f3] px-4 pb-3 pt-1">
        <Pressable onPress={() => router.back()} className="mr-3 h-9 w-9 items-center justify-center rounded-full">
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </Pressable>
        <Text className="flex-1 text-[18px] font-semibold text-white">Thông báo</Text>
        <View className="rounded-full bg-white/20 px-2.5 py-1">
          <Text className="text-xs font-semibold text-white">Chưa đọc: {unreadCount}</Text>
        </View>
      </View>

      <View className="flex-row gap-2 px-4 py-3">
        <Pressable
          className="rounded-lg border border-slate-300 bg-white px-3 py-2"
          onPress={() => void loadNotifications()}
          disabled={loading}>
          <Text className="text-sm text-slate-700">{loading ? 'Đang tải...' : 'Làm mới'}</Text>
        </Pressable>
        <Pressable
          className={`rounded-lg px-3 py-2 ${unreadCount === 0 || markingAll ? 'bg-slate-300' : 'bg-[#1e98f3]'}`}
          onPress={() => void handleMarkAllAsRead()}
          disabled={markingAll || unreadCount === 0}>
          <Text className="text-sm font-medium text-white">Đánh dấu đã đọc tất cả</Text>
        </Pressable>
      </View>

      <ScrollView className="flex-1 px-4" contentContainerStyle={{ paddingBottom: 16 }}>
        {loading ? (
          <View className="rounded-xl border border-slate-200 bg-white p-4">
            <Text className="text-sm text-slate-600">Đang tải thông báo...</Text>
          </View>
        ) : null}

        {!loading && items.length === 0 ? (
          <View className="rounded-xl border border-dashed border-slate-300 bg-white p-6">
            <Text className="text-center text-sm text-slate-500">Chưa có thông báo nào.</Text>
          </View>
        ) : null}

        {!loading
          ? items.map((item) => (
              <View
                key={item.id}
                className={`mb-3 rounded-xl border p-4 ${
                  item.read ? 'border-slate-200 bg-white' : 'border-blue-200 bg-blue-50/60'
                }`}>
                <View className="flex-row items-start justify-between gap-3">
                  <View className="flex-1">
                    <Text className="text-sm font-semibold text-slate-800">{item.title}</Text>
                    <Text className="mt-1 text-sm text-slate-600">{item.content}</Text>
                    <Text className="mt-2 text-xs text-slate-400">
                      {new Date(item.createdAt).toLocaleString()}
                    </Text>
                  </View>
                  {!item.read ? (
                    <Pressable
                      className="rounded-md bg-slate-200 px-2 py-1"
                      onPress={() => void handleMarkAsRead(item.id)}>
                      <Text className="text-xs font-medium text-slate-700">Đã đọc</Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>
            ))
          : null}
      </ScrollView>
    </View>
  );
}
