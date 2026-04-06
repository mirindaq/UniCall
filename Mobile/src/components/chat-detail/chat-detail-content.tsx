import React from 'react';
import { Keyboard, Platform, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { MockAvatar } from '@/mock/chat-conversations';
import type { MockChatMessage } from '@/mock/chat-thread-messages';

import { ChatInputBar } from './chat-input-bar';
import { ChatMessageRow } from './chat-message-row';

interface ChatDetailContentProps {
  messages: MockChatMessage[];
  otherAvatar: MockAvatar;
  otherAvatarUrl?: string | null;
  inputPlaceholder?: string;
  isSending?: boolean;
  onSend?: (content: string) => Promise<void> | void;
}

export function ChatDetailContent({
  messages,
  otherAvatar,
  otherAvatarUrl,
  inputPlaceholder,
  isSending = false,
  onSend,
}: ChatDetailContentProps) {
  const insets = useSafeAreaInsets();
  const [inputAreaHeight, setInputAreaHeight] = React.useState(58);
  const [keyboardHeight, setKeyboardHeight] = React.useState(0);

  React.useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (event) => {
      const nextHeight = event.endCoordinates?.height ?? 0;
      setKeyboardHeight(nextHeight);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const keyboardOffset = Platform.OS === 'ios' ? Math.max(0, keyboardHeight - insets.bottom) : 0;
  const inputBottom = Platform.OS === 'ios' ? insets.bottom + keyboardOffset : 0;

  const listBottomPadding = inputAreaHeight + inputBottom + 8;

  return (
    <View className="flex-1">
      <KeyboardAwareScrollView
        className="flex-1"
        enableOnAndroid
        enableAutomaticScroll
        enableResetScrollToCoords={false}
        extraScrollHeight={16}
        keyboardShouldPersistTaps="always"
        keyboardDismissMode="none"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: 14, paddingBottom: listBottomPadding }}>
        <View className="pb-2">
          {messages.map((message, index) => (
            <View key={message.id} className={index === 0 ? 'mt-2' : 'mt-2'}>
              <ChatMessageRow message={message} otherAvatar={otherAvatar} otherAvatarUrl={otherAvatarUrl} />
            </View>
          ))}
        </View>
      </KeyboardAwareScrollView>

      <View style={{ position: 'absolute', left: 0, right: 0, bottom: inputBottom }}>
        <ChatInputBar
          placeholder={inputPlaceholder}
          isSending={isSending}
          onSend={onSend}
          onHeightChange={(height) => setInputAreaHeight(height)}
        />
      </View>
    </View>
  );
}
