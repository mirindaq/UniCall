import Ionicons from '@expo/vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useMemo, useRef, useState } from 'react';
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
  prefillDraftText?: string | null;
  prefillDraftRequestId?: string | null;
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
  { label: 'Ghi nhớ sở thích', prompt: '@Unicall ghi nhớ: trả lời ngắn gọn, rõ ý' },
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

export function ChatInputBar({
  placeholder = 'Tin nhan',
  onHeightChange,
  isSending = false,
  replyPreviewText,
  onCancelReply,
  onSend,
  onSendImages,
  prefillDraftText,
  prefillDraftRequestId,
}: ChatInputBarProps) {
  const [message, setMessage] = useState('');
  const [inputHeight, setInputHeight] = useState(MIN_INPUT_HEIGHT);
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

  useEffect(() => {
    if (!showAiQuickPrompts) {
      return;
    }
    const normalizedDraft = message.trimStart().toLowerCase();
    if (!normalizedDraft.startsWith('@unicall')) {
      if (forceOpenAiQuickPrompts) {
        setForceOpenAiQuickPrompts(false);
      }
      return;
    }
    if (aiQuickPromptQuery && visibleAiQuickPrompts.length === 0) {
      setShowAiQuickPrompts(false);
      setForceOpenAiQuickPrompts(false);
    }
  }, [
    aiQuickPromptQuery,
    forceOpenAiQuickPrompts,
    message,
    showAiQuickPrompts,
    visibleAiQuickPrompts.length,
  ]);

  useEffect(() => {
    if (!prefillDraftRequestId || !prefillDraftText) {
      return;
    }
    if (message.trim().length > 0) {
      return;
    }
    const nextDraft = prefillDraftText;
    setMessage(nextDraft);
    setShowAiQuickPrompts(true);
    setForceOpenAiQuickPrompts(true);
    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  }, [message, prefillDraftRequestId, prefillDraftText]);

  const openAiQuickPromptPanel = () => {
    setShowAiQuickPrompts(true);
    const baseDraft = message.trimStart().toLowerCase().startsWith('@unicall')
      ? message
      : '@Unicall ';
    setMessage(baseDraft);
    setForceOpenAiQuickPrompts(true);
    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  };

  const applyAiQuickPrompt = (prompt: string) => {
    const nextDraft = prompt.trim();
    setMessage(nextDraft);
    setForceOpenAiQuickPrompts(false);
    setShowAiQuickPrompts(false);
    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  };

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
      {shouldShowAiQuickPromptPanel ? (
        <View className="mb-2 rounded-xl border border-slate-200 bg-white px-2 py-2">
          <View className="mb-1 flex-row items-center justify-between">
            <Text className="text-xs font-medium text-slate-500">Mẫu lệnh @Unicall</Text>
            <Pressable
              onPress={() => {
                setForceOpenAiQuickPrompts(false);
                setShowAiQuickPrompts(false);
              }}
              className="h-6 w-6 items-center justify-center rounded-full bg-slate-100">
              <Ionicons name="close" size={14} color="#475569" />
            </Pressable>
          </View>
          {visibleAiQuickPrompts.map((item) => (
            <Pressable
              key={item.prompt}
              onPress={() => applyAiQuickPrompt(item.prompt)}
              className="mb-1 rounded-lg px-2 py-2 active:bg-slate-100">
              <Text className="text-[13px] font-medium text-slate-800">{item.label}</Text>
              <Text numberOfLines={1} className="mt-0.5 text-[12px] text-slate-500">
                {item.prompt}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      <View className="flex-row items-center">
        <Pressable
          onPress={() => {
            if (shouldShowAiQuickPromptPanel) {
              setForceOpenAiQuickPrompts(false);
              setShowAiQuickPrompts(false);
              return;
            }
            openAiQuickPromptPanel();
          }}
          className="h-9 w-9 items-center justify-center rounded-full">
          <Ionicons name="sparkles-outline" size={22} color="#2563eb" />
        </Pressable>

        <View className="h-9 w-9 items-center justify-center rounded-full">
          <Ionicons name="happy-outline" size={23} color="#6b7280" />
        </View>

        <TextInput
          ref={inputRef}
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
