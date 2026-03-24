import { useRouter } from 'expo-router';
import React from 'react';
import { FlatList, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ConversationListItem } from '@/components/messages/conversation-list-item';
import { MessagesBottomTabs } from '@/components/messages/messages-bottom-tabs';
import { MessagesHeader } from '@/components/messages/messages-header';
import { AppStatusBarBlue } from '@/components/ui/app-status-bar-blue';
import { mockConversations } from '@/mock/chat-conversations';

export default function MessagesScreen() {
  const router = useRouter();

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
          data={mockConversations}
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
