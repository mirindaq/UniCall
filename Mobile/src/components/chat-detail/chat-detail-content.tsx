import React from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { MockAvatar } from '@/mock/chat-conversations';
import type { MockChatMessage } from '@/mock/chat-thread-messages';

import { ChatInputBar } from './chat-input-bar';
import { ChatMessageRow } from './chat-message-row';

interface ChatDetailContentProps {
  messages: MockChatMessage[];
  otherAvatar: MockAvatar;
  inputPlaceholder?: string;
}

export function ChatDetailContent({ messages, otherAvatar, inputPlaceholder }: ChatDetailContentProps) {
  return (
    <KeyboardAvoidingView
      className="flex-1"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 6 : 0}>
      <ScrollView
        className="flex-1"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerClassName="pt-3.5 pb-2">
        {messages.map((message, index) => (
          <View key={message.id} className={index === 0 ? 'mt-2' : 'mt-2'}>
            <ChatMessageRow message={message} otherAvatar={otherAvatar} />
          </View>
        ))}
      </ScrollView>

      <ChatInputBar placeholder={inputPlaceholder} />
      <SafeAreaView edges={['bottom']} className="bg-white" />
    </KeyboardAvoidingView>
  );
}
