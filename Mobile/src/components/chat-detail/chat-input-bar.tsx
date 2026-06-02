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
const INPUT_VERTICAL_PADDING = 8;

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
        className="h-9 w-9 rounded-lg bg-slate-100"
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
    <View className="h-9 w-9 items-center justify-center rounded-lg bg-slate-100">
      <Ionicons name={iconName} size={16} color="#64748b" />
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
      className="border-t border-slate-100 bg-white px-3 py-2.5 shadow-[0_-6px_20px_rgba(15,23,42,0.06)]"
      onLayout={(event) => {
        onHeightChange?.(event.nativeEvent.layout.height);
      }}>
      {replyPreview ? (
        <View className="mb-2.5 flex-row items-start justify-between rounded-xl border border-sky-100 bg-sky-50/80 px-3 py-2.5">
          <View className="mr-2 min-w-0 flex-1">
            <Text className="text-[11px] font-semibold text-sky-700">
              Trả lời {replyPreview.senderName || 'tin nhắn'}
            </Text>
            <View className="mt-1.5 flex-row items-center">
              {replyPreview.kind !== 'text' ? (
                <View className="mr-2">
                  <ReplyPreviewThumb preview={replyPreview} />
                </View>
              ) : null}
              <Text numberOfLines={2} className="flex-1 text-[13px] leading-5 text-slate-600">
                {messagePreviewSnippetText(replyPreview)}
              </Text>
            </View>
          </View>
          <Pressable
            onPress={onCancelReply}
            className="h-7 w-7 items-center justify-center rounded-full bg-white">
            <Ionicons name="close" size={16} color="#64748b" />
          </Pressable>
        </View>
      ) : null}

      <View className="flex-row items-end gap-1">
        <Pressable
          className="mb-1 h-10 w-10 items-center justify-center rounded-full bg-slate-50"
          onPress={() => setIsGifPickerOpen(true)}>
          <Ionicons name="happy-outline" size={24} color="#64748b" />
        </Pressable>

        <View className="mb-0.5 min-h-[44px] flex-1 flex-row items-end rounded-2xl border border-slate-200 bg-slate-50 px-3">
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
                Math.min(MAX_INPUT_HEIGHT, event.nativeEvent.contentSize.height),
              );
              setInputHeight(nextHeight);
            }}
            placeholder={placeholder}
            placeholderTextColor="#94a3b8"
            className="flex-1 text-[16px] leading-[22px] text-slate-800"
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
        </View>

        {hasContent ? (
          <>
            <Pressable
              className="mb-1 h-10 w-10 items-center justify-center rounded-full bg-slate-50"
              onPress={() => void handlePickImages()}>
              <Ionicons
                name="image-outline"
                size={23}
                color={isSending ? '#cbd5e1' : '#64748b'}
              />
            </Pressable>
            <Pressable
              className="mb-1 h-10 w-10 items-center justify-center rounded-full bg-[#1e98f3]"
              onPress={() => void handleSend()}>
              <Ionicons name="send" size={20} color="#fff" />
            </Pressable>
          </>
        ) : (
          <>
            <Pressable
              className="mb-1 h-10 w-10 items-center justify-center rounded-full bg-slate-50"
              onPress={() => void handlePickImages()}>
              <Ionicons
                name="image-outline"
                size={23}
                color={isSending ? '#cbd5e1' : '#64748b'}
              />
            </Pressable>
            <View className="mb-1 h-10 w-10 items-center justify-center rounded-full bg-slate-50">
              <Ionicons name="mic-outline" size={23} color="#94a3b8" />
            </View>
          </>
        )}
      </View>

      <Modal
        visible={isGifPickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsGifPickerOpen(false)}>
        <Pressable
          className="flex-1 items-center justify-end bg-black/35"
          onPress={() => setIsGifPickerOpen(false)}>
          <Pressable
            className="w-full max-w-[540px] rounded-t-3xl bg-white px-4 pb-6 pt-4"
            onPress={(event) => event.stopPropagation()}>
            <View className="mb-3 flex-row items-center justify-between">
              <Text className="text-[16px] font-semibold text-slate-900">Chọn GIF</Text>
              <Pressable
                className="h-9 w-9 items-center justify-center rounded-full bg-slate-100"
                onPress={() => setIsGifPickerOpen(false)}>
                <Ionicons name="close" size={20} color="#475569" />
              </Pressable>
            </View>

            <View className="flex-row flex-wrap justify-between">
              {DEFAULT_CHAT_GIFS.map((gifUrl) => (
                <Pressable
                  key={gifUrl}
                  className="mb-2.5 h-[88px] w-[49%] overflow-hidden rounded-xl border border-slate-100 bg-slate-50"
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
