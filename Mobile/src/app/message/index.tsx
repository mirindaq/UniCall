import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

import { ConversationListItem } from '@/components/messages/conversation-list-item';
import { MessagesBottomTabs } from '@/components/messages/messages-bottom-tabs';
import { MessagesHeader } from '@/components/messages/messages-header';
import { AppStatusBarBlue } from '@/components/ui/app-status-bar-blue';
import type { MockConversation } from '@/mock/chat-conversations';
import { chatSocketService } from '@/services/chat-socket.service';
import { chatService } from '@/services/chat.service';
import type { ConversationResponse } from '@/types/chat';

export default function MessagesScreen() {
  const router = useRouter();
  const [conversations, setConversations] = useState<ConversationResponse[]>([]);

  const loadConversations = React.useCallback(async (showError = true) => {
    try {
      const conversationResponse = await chatService.listConversations();
      setConversations(conversationResponse.data ?? []);
    } catch {
      if (!showError) {
        return;
      }
      Toast.show({
        type: 'error',
        text1: 'Không tải được danh sách chat',
      });
    }
  }, []);

  useEffect(() => {
    void loadConversations();
  }, [loadConversations]);

  useFocusEffect(
    React.useCallback(() => {
      void loadConversations(false);
    }, [loadConversations])
  );

  useEffect(() => {
    let cancelled = false;
    let subscription: { unsubscribe: () => void } | undefined;

    const bindRealtime = async () => {
      await chatSocketService.connect();
      if (cancelled) {
        return;
      }
      subscription = chatSocketService.subscribeUserEvents((event) => {
        if (event.eventType !== 'MESSAGE_UPSERT' || !event.message) {
          return;
        }

        const incoming = event.message;
        const preview = incoming.content?.trim() || 'Tin nhắn mới';
        const updatedAt = incoming.timeSent || new Date().toISOString();

        setConversations((prev) => {
          const found = prev.find((item) => item.idConversation === incoming.idConversation);
          if (!found) {
            void loadConversations(false);
            return prev;
          }
          const next = prev
            .map((item) =>
              item.idConversation === incoming.idConversation
                ? {
                    ...item,
                    lastMessageContent: preview,
                    dateUpdateMessage: updatedAt,
                  }
                : item
            )
            .sort(
              (a, b) =>
                new Date(b.dateUpdateMessage).getTime() - new Date(a.dateUpdateMessage).getTime()
            );
          return next;
        });
      });
    };

    void bindRealtime().catch(() => undefined);

    return () => {
      cancelled = true;
      subscription?.unsubscribe();
    };
  }, [loadConversations]);

  const uiConversations = useMemo(
    () =>
      conversations.map((conversation) => {
        const name = conversation.name?.trim() || 'Cuộc trò chuyện';
        const fallback = name
          .split(/\s+/)
          .filter(Boolean)
          .slice(0, 2)
          .map((word) => word[0]?.toUpperCase() ?? '')
          .join('') || 'C';
        const date = conversation.dateUpdateMessage ? new Date(conversation.dateUpdateMessage) : null;
        const timeLabel =
          date && !Number.isNaN(date.getTime())
            ? `${`${date.getHours()}`.padStart(2, '0')}:${`${date.getMinutes()}`.padStart(2, '0')}`
            : '';

        const item: MockConversation & { avatarUrl?: string | null } = {
          id: conversation.idConversation,
          name,
          preview: conversation.lastMessageContent || 'Chưa có tin nhắn',
          timeLabel,
          avatar: {
            type: 'initials',
            value: fallback,
            backgroundColor: '#94a3b8',
          },
          avatarUrl: conversation.avatar ?? null,
        };
        return item;
      }),
    [conversations]
  );

  return (
    <View className="flex-1 bg-[#f3f4f6]">
      <AppStatusBarBlue />
      <SafeAreaView edges={['top']} className="bg-[#1e98f3]" />
      <MessagesHeader
        onPressSearch={() => {
          router.push('/message/search');
        }}
        onPressCreateGroup={() => {
          router.push('/message/create-group');
        }}
      />

      <View className="flex-1">
        <FlatList
          data={uiConversations}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ConversationListItem
              conversation={item}
              onPress={() => {
                router.push(`/message/${item.id}`);
              }}
            />
          )}
          showsVerticalScrollIndicator={false}
        />
      </View>

      <MessagesBottomTabs activeTab="messages" />
      <SafeAreaView edges={['bottom']} className="bg-white" />
    </View>
  );
}
