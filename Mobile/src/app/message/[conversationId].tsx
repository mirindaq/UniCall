import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ChatDetailContent } from '@/components/chat-detail/chat-detail-content';
import { ChatDetailHeader } from '@/components/chat-detail/chat-detail-header';
import { AppStatusBarBlue } from '@/components/ui/app-status-bar-blue';
import { mockConversations } from '@/mock/chat-conversations';
import { getMockChatThread } from '@/mock/chat-thread-messages';

export default function ConversationDetailScreen() {
  const router = useRouter();
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
  const thread = getMockChatThread(conversationId ?? '');

  const matchedConversation = mockConversations.find((item) => item.id === conversationId);
  const headerTitle = matchedConversation?.name ?? thread.title;
  const avatar = matchedConversation?.avatar ?? thread.avatar;

  return (
    <View className="flex-1 bg-[#d9dde8]">
      <AppStatusBarBlue />
      <SafeAreaView edges={['top']} className="bg-[#1e98f3]" />
      <ChatDetailHeader
        title={headerTitle}
        onBack={() => {
          router.back();
        }}
      />

      <ChatDetailContent messages={thread.messages} otherAvatar={avatar} inputPlaceholder={thread.inputPlaceholder} />
    </View>
  );
}
