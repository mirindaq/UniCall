import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useState } from 'react';
import { TextInput, View } from 'react-native';

interface ChatInputBarProps {
  placeholder?: string;
  onHeightChange?: (height: number) => void;
  isSending?: boolean;
  onSend?: (content: string) => Promise<void> | void;
}

const MIN_INPUT_HEIGHT = 24;
const MAX_INPUT_HEIGHT = 112;
const INPUT_VERTICAL_PADDING = 6;

export function ChatInputBar({
  placeholder = 'Tin nhắn',
  onHeightChange,
  isSending = false,
  onSend,
}: ChatInputBarProps) {
  const [message, setMessage] = useState('');
  const [inputHeight, setInputHeight] = useState(MIN_INPUT_HEIGHT);

  const hasContent = message.trim().length > 0;

  const handleSend = async () => {
    const content = message.trim();
    if (!content || isSending) {
      return;
    }
    await onSend?.(content);
    setMessage('');
    setInputHeight(MIN_INPUT_HEIGHT);
  };

  return (
    <View
      className="border-t border-slate-300 bg-white px-3.5 py-2"
      onLayout={(event) => {
        onHeightChange?.(event.nativeEvent.layout.height);
      }}>
      <View className="flex-row items-center">
        <View className="h-9 w-9 items-center justify-center rounded-full">
          <Ionicons name="happy-outline" size={25} color="#6b7280" />
        </View>

        <TextInput
          value={message}
          onChangeText={(value) => {
            setMessage(value);
            if (!value) {
              setInputHeight(MIN_INPUT_HEIGHT);
            }
          }}
          multiline
          textAlignVertical="top"
          onContentSizeChange={(event) => {
            const nextHeight = Math.max(MIN_INPUT_HEIGHT, Math.min(MAX_INPUT_HEIGHT, event.nativeEvent.contentSize.height));
            setInputHeight(nextHeight);
          }}
          placeholder={placeholder}
          placeholderTextColor="#94a3b8"
          className="ml-2 flex-1 text-[16px] leading-6 text-slate-800"
          allowFontScaling={false}
          selectionColor="#1e98f3"
          disableFullscreenUI
          scrollEnabled={inputHeight >= MAX_INPUT_HEIGHT}
          style={{
            minHeight: MIN_INPUT_HEIGHT + INPUT_VERTICAL_PADDING * 2,
            height: inputHeight + INPUT_VERTICAL_PADDING * 2,
            paddingTop: INPUT_VERTICAL_PADDING,
            paddingBottom: INPUT_VERTICAL_PADDING,
          }}
        />

        {hasContent ? (
          <View className="ml-1 h-9 w-9 items-center justify-center rounded-full">
            <Ionicons name="send" size={24} color={isSending ? '#94a3b8' : '#1e98f3'} onPress={() => void handleSend()} />
          </View>
        ) : (
          <>
            <View className="ml-1 h-9 w-9 items-center justify-center rounded-full">
              <Ionicons name="ellipsis-horizontal" size={26} color="#6b7280" />
            </View>
            <View className="h-9 w-9 items-center justify-center rounded-full">
              <Ionicons name="mic-outline" size={24} color="#6b7280" />
            </View>
            <View className="h-9 w-9 items-center justify-center rounded-full">
              <Ionicons name="image-outline" size={24} color="#6b7280" />
            </View>
          </>
        )}
      </View>
    </View>
  );
}
