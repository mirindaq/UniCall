import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

import { ConversationListItem } from '@/components/messages/conversation-list-item';
import { MessagesBottomTabs } from '@/components/messages/messages-bottom-tabs';
import { MessagesHeader } from '@/components/messages/messages-header';
import { AppStatusBarBlue } from '@/components/ui/app-status-bar-blue';
import type { MockConversation } from '@/mock/chat-conversations';
import { chatService } from '@/services/chat.service';
import type { ConversationResponse } from '@/types/chat';

export default function MessagesScreen() {
  const router = useRouter();
  const [conversations, setConversations] = useState<ConversationResponse[]>([]);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      try {
        const conversationResponse = await chatService.listConversations();
        if (!mounted) {
          return;
        }
        setConversations(conversationResponse.data ?? []);
      } catch {
        if (!mounted) {
          return;
        }
        Toast.show({
          type: 'error',
          text1: 'Không tải được danh sách chat',
        });
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

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
