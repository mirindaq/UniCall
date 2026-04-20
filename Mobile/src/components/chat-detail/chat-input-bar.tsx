import Ionicons from '@expo/vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import Toast from 'react-native-toast-message';

interface ChatInputBarProps {
  placeholder?: string;
  onHeightChange?: (height: number) => void;
  isSending?: boolean;
  replyPreviewText?: string | null;
  onCancelReply?: () => void;
  onSend?: (content: string) => Promise<void> | void;
  onSendImages?: (imageUris: string[], mixedText?: string) => Promise<void> | void;
}

const MIN_INPUT_HEIGHT = 24;
const MAX_INPUT_HEIGHT = 112;
const INPUT_VERTICAL_PADDING = 6;

export function ChatInputBar({
  placeholder = 'Tin nhan',
  onHeightChange,
  isSending = false,
  replyPreviewText,
  onCancelReply,
  onSend,
  onSendImages,
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

  const handlePickImages = async () => {
    if (isSending || !onSendImages) {
      return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Toast.show({
        type: 'error',
        text1: 'Thieu quyen truy cap anh',
        text2: 'Vui long cap quyen thu vien anh de gui anh.',
      });
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      allowsMultipleSelection: true,
      selectionLimit: 10,
      quality: 0.9,
    });

    if (result.canceled || result.assets.length === 0) {
      return;
    }

    const imageUris = result.assets.map((item) => item.uri).filter(Boolean);
    if (imageUris.length === 0) {
      return;
    }

    await onSendImages(imageUris, message.trim());
    setMessage('');
    setInputHeight(MIN_INPUT_HEIGHT);
  };

  return (
    <View
      className="border-t border-slate-300 bg-white px-3.5 py-2"
      onLayout={(event) => {
        onHeightChange?.(event.nativeEvent.layout.height);
      }}>
      {replyPreviewText ? (
        <View className="mb-2 flex-row items-start justify-between rounded-md border border-sky-200 bg-sky-50 px-2.5 py-2">
          <View className="mr-2 flex-1">
            <Text className="text-[11px] font-medium text-sky-700">Dang tra loi</Text>
            <Text numberOfLines={2} className="mt-0.5 text-[12px] text-slate-700">
              {replyPreviewText}
            </Text>
          </View>
          <Pressable onPress={onCancelReply} className="h-5 w-5 items-center justify-center rounded-full bg-sky-100">
            <Ionicons name="close" size={14} color="#0369a1" />
          </Pressable>
        </View>
      ) : null}
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
          <>
            <Pressable className="ml-1 h-9 w-9 items-center justify-center rounded-full" onPress={() => void handlePickImages()}>
              <Ionicons name="image-outline" size={24} color={isSending ? '#94a3b8' : '#6b7280'} />
            </Pressable>
            <Pressable className="h-9 w-9 items-center justify-center rounded-full" onPress={() => void handleSend()}>
              <Ionicons name="send" size={24} color={isSending ? '#94a3b8' : '#1e98f3'} />
            </Pressable>
          </>
        ) : (
          <>
            <View className="ml-1 h-9 w-9 items-center justify-center rounded-full">
              <Ionicons name="ellipsis-horizontal" size={26} color="#6b7280" />
            </View>
            <View className="h-9 w-9 items-center justify-center rounded-full">
              <Ionicons name="mic-outline" size={24} color="#6b7280" />
            </View>
            <Pressable className="h-9 w-9 items-center justify-center rounded-full" onPress={() => void handlePickImages()}>
              <Ionicons name="image-outline" size={24} color={isSending ? '#94a3b8' : '#6b7280'} />
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}
