import Ionicons from '@expo/vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import { Image, Modal, Pressable, Text, TextInput, View } from 'react-native';
import Toast from 'react-native-toast-message';

import type { MessagePreviewData } from '@/utils/chat-message-preview';
import {
  DEFAULT_CHAT_GIFS,
  messagePreviewSnippetText,
} from '@/utils/chat-message-preview';

interface ChatInputBarProps {
  placeholder?: string;
  onHeightChange?: (height: number) => void;
  isSending?: boolean;
  replyPreview?: MessagePreviewData | null;
  onCancelReply?: () => void;
  onSend?: (content: string) => Promise<void> | void;
  onSendImages?: (imageUris: string[], mixedText?: string) => Promise<void> | void;
  onSendGif?: (gifUrl: string) => Promise<void> | void;
}

const MIN_INPUT_HEIGHT = 24;
const MAX_INPUT_HEIGHT = 112;
const INPUT_VERTICAL_PADDING = 6;

const ReplyPreviewThumb = ({ preview }: { preview: MessagePreviewData }) => {
  if (
    preview.thumbnailUrl &&
    (preview.kind === 'image' ||
      preview.kind === 'video' ||
      preview.kind === 'gif' ||
      preview.kind === 'sticker')
  ) {
    return (
      <Image
        source={{ uri: preview.thumbnailUrl }}
        className="h-8 w-8 rounded-md bg-slate-200"
        resizeMode="cover"
      />
    );
  }

  const iconName: keyof typeof Ionicons.glyphMap =
    preview.kind === 'file'
      ? 'document-text-outline'
      : preview.kind === 'audio'
      ? 'musical-notes-outline'
      : preview.kind === 'link'
      ? 'link-outline'
      : preview.kind === 'call'
      ? 'call-outline'
      : 'image-outline';

  return (
    <View className="h-8 w-8 items-center justify-center rounded-md bg-slate-200">
      <Ionicons name={iconName} size={16} color="#475569" />
    </View>
  );
};

export function ChatInputBar({
  placeholder = 'Tin nhắn',
  onHeightChange,
  isSending = false,
  replyPreview,
  onCancelReply,
  onSend,
  onSendImages,
  onSendGif,
}: ChatInputBarProps) {
  const [message, setMessage] = useState('');
  const [inputHeight, setInputHeight] = useState(MIN_INPUT_HEIGHT);
  const [isGifPickerOpen, setIsGifPickerOpen] = useState(false);

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
        text1: 'Thiếu quyền truy cập ảnh',
        text2: 'Vui lòng cấp quyền thư viện ảnh để gửi hình.',
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

  const handleSendGif = async (gifUrl: string) => {
    if (!onSendGif || isSending) {
      return;
    }
    await onSendGif(gifUrl);
    setIsGifPickerOpen(false);
  };

  return (
    <View
      className="border-t border-slate-300 bg-white px-3.5 py-2"
      onLayout={(event) => {
        onHeightChange?.(event.nativeEvent.layout.height);
      }}>
      {replyPreview ? (
        <View className="mb-2 flex-row items-start justify-between rounded-md border border-sky-200 bg-sky-50 px-2.5 py-2">
          <View className="mr-2 flex-1">
            <Text className="text-[11px] font-medium text-sky-700">
              Trả lời {replyPreview.senderName || 'tin nhắn'}
            </Text>
            <View className="mt-1 flex-row items-center">
              {replyPreview.kind !== 'text' ? (
                <View className="mr-1.5">
                  <ReplyPreviewThumb preview={replyPreview} />
                </View>
              ) : null}
              <Text numberOfLines={2} className="flex-1 text-[12px] text-slate-700">
                {messagePreviewSnippetText(replyPreview)}
              </Text>
            </View>
          </View>
          <Pressable
            onPress={onCancelReply}
            className="h-5 w-5 items-center justify-center rounded-full bg-sky-100">
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
            const nextHeight = Math.max(
              MIN_INPUT_HEIGHT,
              Math.min(MAX_INPUT_HEIGHT, event.nativeEvent.contentSize.height)
            );
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
            <Pressable
              className="ml-1 h-9 w-9 items-center justify-center rounded-full"
              onPress={() => void handlePickImages()}>
              <Ionicons
                name="image-outline"
                size={24}
                color={isSending ? '#94a3b8' : '#6b7280'}
              />
            </Pressable>
            <Pressable
              className="h-9 w-9 items-center justify-center rounded-full"
              onPress={() => void handleSend()}>
              <Ionicons name="send" size={24} color={isSending ? '#94a3b8' : '#1e98f3'} />
            </Pressable>
          </>
        ) : (
          <>
            <Pressable
              className="ml-1 h-9 w-9 items-center justify-center rounded-full"
              onPress={() => setIsGifPickerOpen(true)}>
              <Ionicons name="images-outline" size={23} color="#6b7280" />
            </Pressable>
            <View className="h-9 w-9 items-center justify-center rounded-full">
              <Ionicons name="mic-outline" size={24} color="#6b7280" />
            </View>
            <Pressable
              className="h-9 w-9 items-center justify-center rounded-full"
              onPress={() => void handlePickImages()}>
              <Ionicons
                name="image-outline"
                size={24}
                color={isSending ? '#94a3b8' : '#6b7280'}
              />
            </Pressable>
          </>
        )}
      </View>

      <Modal
        visible={isGifPickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsGifPickerOpen(false)}>
        <Pressable
          className="flex-1 items-center justify-end bg-black/40 px-3 pb-6"
          onPress={() => setIsGifPickerOpen(false)}>
          <Pressable
            className="w-full max-w-[540px] rounded-2xl bg-white px-3 pb-3 pt-3"
            onPress={(event) => event.stopPropagation()}>
            <View className="mb-2 flex-row items-center justify-between px-1">
              <Text className="text-[15px] font-semibold text-slate-900">Chọn GIF</Text>
              <Pressable
                className="h-8 w-8 items-center justify-center rounded-full bg-slate-100"
                onPress={() => setIsGifPickerOpen(false)}>
                <Ionicons name="close" size={18} color="#334155" />
              </Pressable>
            </View>

            <View className="flex-row flex-wrap justify-between">
              {DEFAULT_CHAT_GIFS.map((gifUrl) => (
                <Pressable
                  key={gifUrl}
                  className="mb-2 h-[86px] w-[49%] overflow-hidden rounded-xl border border-slate-200"
                  onPress={() => void handleSendGif(gifUrl)}>
                  <Image source={{ uri: gifUrl }} className="h-full w-full" resizeMode="cover" />
                </Pressable>
              ))}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
