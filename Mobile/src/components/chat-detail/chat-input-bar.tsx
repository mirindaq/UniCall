import Ionicons from '@expo/vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import React, { useMemo, useRef, useState } from 'react';
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

type AiQuickPrompt = {
  label: string;
  prompt: string;
};

const AI_QUICK_PROMPTS: AiQuickPrompt[] = [
  { label: 'Thống kê tổng quan', prompt: '@Unicall thống kê chat' },
  { label: 'Thống kê 7 ngày', prompt: '@Unicall thống kê chat 7 ngày' },
  { label: 'Thống kê 30 ngày', prompt: '@Unicall thống kê chat 30 ngày' },
  { label: 'Tóm tắt 7 ngày', prompt: '@Unicall tóm tắt chat 7 ngày' },
  { label: 'Tóm tắt 30 ngày', prompt: '@Unicall tóm tắt chat 30 ngày' },
  { label: 'Rút action items', prompt: '@Unicall rút action items 7 ngày' },
  { label: 'Bật ghi nhớ AI', prompt: '@Unicall bật ghi nhớ AI' },
  {
    label: 'Ghi nhớ sở thích',
    prompt: '@Unicall ghi nhớ: trả lời ngắn gọn, rõ ý',
  },
  { label: 'Tắt ghi nhớ AI', prompt: '@Unicall tắt ghi nhớ AI' },
  { label: 'Xóa ghi nhớ', prompt: '@Unicall xóa ghi nhớ' },
];

function normalizeQuickPromptText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

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
  const [showAiQuickPrompts, setShowAiQuickPrompts] = useState(true);
  const [forceOpenAiQuickPrompts, setForceOpenAiQuickPrompts] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const hasContent = message.trim().length > 0;
  const aiQuickPromptQuery = useMemo(() => {
    const normalizedDraft = message.trimStart();
    if (!normalizedDraft.toLowerCase().startsWith('@unicall')) {
      return '';
    }
    return normalizedDraft.slice('@unicall'.length).trim();
  }, [message]);

  const visibleAiQuickPrompts = useMemo(() => {
    const normalizedQuery = normalizeQuickPromptText(aiQuickPromptQuery);
    if (!normalizedQuery) {
      return AI_QUICK_PROMPTS;
    }
    return AI_QUICK_PROMPTS.filter((item) => {
      const normalizedLabel = normalizeQuickPromptText(item.label);
      const normalizedPrompt = normalizeQuickPromptText(
        item.prompt.replace(/^@unicall\s*/i, '')
      );
      return (
        normalizedLabel.includes(normalizedQuery) ||
        normalizedPrompt.includes(normalizedQuery)
      );
    });
  }, [aiQuickPromptQuery]);

  const shouldShowAiQuickPromptPanel = useMemo(() => {
    if (!showAiQuickPrompts) {
      return false;
    }
    const normalizedDraft = message.trimStart().toLowerCase();
    return (
      (forceOpenAiQuickPrompts ||
        normalizedDraft.startsWith('@unicall ') ||
        normalizedDraft === '@unicall') &&
      visibleAiQuickPrompts.length > 0
    );
  }, [forceOpenAiQuickPrompts, message, showAiQuickPrompts, visibleAiQuickPrompts.length]);

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

  const openAiQuickPromptPanel = () => {
    const baseDraft = message.trimStart().toLowerCase().startsWith('@unicall')
      ? message
      : '@Unicall ';
    setMessage(baseDraft);
    setShowAiQuickPrompts(true);
    setForceOpenAiQuickPrompts(true);
    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  };

  const applyAiQuickPrompt = (prompt: string) => {
    const nextDraft = prompt.trim();
    setMessage(nextDraft);
    setShowAiQuickPrompts(false);
    setForceOpenAiQuickPrompts(false);
    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  };

  return (
    <View
      className="border-t border-slate-300 bg-white px-3.5 py-2"
      onLayout={(event) => {
        onHeightChange?.(event.nativeEvent.layout.height);
      }}>
      {shouldShowAiQuickPromptPanel ? (
        <View className="mb-2 overflow-hidden rounded-xl border border-slate-200 bg-white">
          <View className="flex-row items-center justify-between border-b border-slate-200 px-3 py-2">
            <Text className="text-xs font-medium text-slate-500">Mẫu lệnh @Unicall</Text>
            <Pressable
              onPress={() => {
                setShowAiQuickPrompts(false);
                setForceOpenAiQuickPrompts(false);
              }}>
              <Ionicons name="close" size={16} color="#64748b" />
            </Pressable>
          </View>
          <View className="max-h-48">
            {visibleAiQuickPrompts.map((item) => (
              <Pressable
                key={item.prompt}
                className="border-b border-slate-100 px-3 py-2 active:bg-slate-100"
                onPress={() => applyAiQuickPrompt(item.prompt)}>
                <Text className="text-sm font-medium text-slate-900">{item.label}</Text>
                <Text numberOfLines={1} className="mt-0.5 text-xs text-slate-500">
                  {item.prompt}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

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
          ref={inputRef}
          value={message}
          onChangeText={(value) => {
            setMessage(value);
            const normalizedDraft = value.trimStart().toLowerCase();
            if (!normalizedDraft.startsWith('@unicall')) {
              setForceOpenAiQuickPrompts(false);
            }
            if (
              normalizedDraft.startsWith('@unicall') &&
              showAiQuickPrompts &&
              normalizeQuickPromptText(normalizedDraft.slice('@unicall'.length)).length > 0 &&
              visibleAiQuickPrompts.length === 0
            ) {
              setShowAiQuickPrompts(false);
              setForceOpenAiQuickPrompts(false);
            }
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
              onPress={openAiQuickPromptPanel}>
              <Ionicons name="sparkles-outline" size={22} color="#2563eb" />
            </Pressable>
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
              onPress={openAiQuickPromptPanel}>
              <Ionicons name="sparkles-outline" size={22} color="#2563eb" />
            </Pressable>
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
