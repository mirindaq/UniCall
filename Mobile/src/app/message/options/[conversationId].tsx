import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ChatOptionsHeader } from '@/components/chat-options/chat-options-header';
import { ChatOptionsList } from '@/components/chat-options/chat-options-list';
import { ChatOptionsMediaStrip } from '@/components/chat-options/chat-options-media-strip';
import { ChatOptionsProfileCard } from '@/components/chat-options/chat-options-profile-card';
import { MyDocumentsOptionsScreen } from '@/components/chat-options/my-documents-options-screen';
import { AppStatusBarBlue } from '@/components/ui/app-status-bar-blue';
import { mockConversations } from '@/mock/chat-conversations';
import { chatOptionSections, chatQuickActions, mediaPreviewLabels } from '@/mock/chat-options-data';
import { getUserProfileByConversationId } from '@/mock/user-profile-data';

export default function ChatOptionsScreen() {
  const router = useRouter();
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
  const conversation = mockConversations.find((item) => item.id === conversationId) ?? mockConversations[1];
  const profile = getUserProfileByConversationId(conversationId ?? '');
  const isMyDocuments = conversation.id === 'my-documents';

  if (isMyDocuments) {
    return (
      <>
        <AppStatusBarBlue />
        <MyDocumentsOptionsScreen
          onBack={() => {
            router.back();
          }}
        />
      </>
    );
  }

  return (
    <View className="flex-1 bg-[#f3f4f6]">
      <AppStatusBarBlue />
      <SafeAreaView edges={['top']} className="bg-[#1e98f3]" />

      <ChatOptionsHeader
        onBack={() => {
          router.back();
        }}
      />

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <ChatOptionsProfileCard
          name={conversation.name}
          avatar={conversation.avatar}
          quickActions={chatQuickActions}
          onQuickActionPress={(actionId) => {
            if (actionId === 'profile') {
              router.push(`/user/${profile.id}`);
            }
          }}
        />
        <ChatOptionsList sections={chatOptionSections.slice(0, 1)} />
        <ChatOptionsMediaStrip labels={mediaPreviewLabels} />
        <ChatOptionsList sections={chatOptionSections.slice(1)} />
      </ScrollView>

      <SafeAreaView edges={['bottom']} className="bg-white" />
    </View>
  );
}
