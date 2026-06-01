import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

import { MessagesBottomTabs } from '@/components/messages/messages-bottom-tabs';
import { AppStatusBarBlue } from '@/components/ui/app-status-bar-blue';
import { assistantService } from '@/services/assistant.service';
import type {
  AssistantAskResponse,
  AssistantIntent,
  AssistantThreadMessageResponse,
  AssistantToolCode,
} from '@/types/assistant';

type AssistantMessageRole = 'user' | 'assistant';

type AssistantMessageItem = {
  id: string;
  role: AssistantMessageRole;
  content: string;
  createdAt: string;
  intent?: AssistantIntent;
  toolsUsed?: AssistantToolCode[];
  data?: unknown;
};

const formatTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '--:--';
  }
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const toUiRole = (role?: AssistantThreadMessageResponse['role']): AssistantMessageRole =>
  role === 'USER' ? 'user' : 'assistant';

const fromHistoryMessage = (message: AssistantThreadMessageResponse): AssistantMessageItem => ({
  id: message.id || buildLocalId(),
  role: toUiRole(message.role),
  content: message.content || '',
  createdAt: message.createdAt || new Date().toISOString(),
  intent: message.intent,
  toolsUsed: message.toolsUsed,
  data: message.data,
});

const toAssistantMessage = (response: AssistantAskResponse): AssistantMessageItem => ({
  id: buildLocalId(),
  role: 'assistant',
  content: response.answer || 'Mình chưa có câu trả lời phù hợp.',
  createdAt: new Date().toISOString(),
  intent: response.intent,
  toolsUsed: response.toolsUsed,
  data: response.data,
});

const buildLocalId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

export default function AssistantScreen() {
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [messages, setMessages] = useState<AssistantMessageItem[]>([]);
  const scrollRef = useRef<ScrollView | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadHistory = async () => {
      setLoadingHistory(true);
      try {
        const threadRes = await assistantService.getDefaultThread();
        const threadId = threadRes.data?.threadId;
        const historyRes = await assistantService.listMessages(threadId, 1, 100);
        const historyItems = [...(historyRes.data?.items || [])].reverse().map(fromHistoryMessage);

        if (!cancelled) {
          setMessages(historyItems);
        }
      } catch {
        if (!cancelled) {
          Toast.show({
            type: 'error',
            text1: 'Không tải được lịch sử AI Assistant',
          });
        }
      } finally {
        if (!cancelled) {
          setLoadingHistory(false);
        }
      }
    };

    void loadHistory();
    return () => {
      cancelled = true;
    };
  }, []);

  const canSend = useMemo(() => input.trim().length > 0 && !sending, [input, sending]);

  const handleSend = async () => {
    const question = input.trim();
    if (!question || sending) {
      return;
    }

    const userMessage: AssistantMessageItem = {
      id: buildLocalId(),
      role: 'user',
      content: question,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setSending(true);

    try {
      const response = await assistantService.ask({ message: question });
      setMessages((prev) => [...prev, toAssistantMessage(response.data)]);
    } catch {
      Toast.show({
        type: 'error',
        text1: 'AI Assistant đang bận, vui lòng thử lại',
      });
      setMessages((prev) => [
        ...prev,
        {
          id: buildLocalId(),
          role: 'assistant',
          content: 'AI Assistant tạm thời chưa phản hồi. Bạn thử lại sau nhé.',
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  return (
    <View className="flex-1 bg-[#f3f4f6]">
      <AppStatusBarBlue />
      <SafeAreaView edges={['top']} className="bg-[#1e98f3]" />

      <View className="bg-[#1e98f3] px-4 pb-3 pt-1">
        <View className="flex-row items-center">
          <View className="mr-3 h-10 w-10 items-center justify-center rounded-xl bg-white/20">
            <Ionicons name="sparkles-outline" size={20} color="#fff" />
          </View>
          <View className="flex-1">
            <Text className="text-[18px] font-semibold text-white">AI Assistant</Text>
            <Text className="mt-0.5 text-xs text-blue-100">
              Hỏi đáp hội thoại, tra cứu chat và phân tích ngữ cảnh.
            </Text>
          </View>
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}>
        <ScrollView
          ref={scrollRef}
          className="flex-1 px-3"
          contentContainerClassName="gap-2.5 pb-4 pt-2.5"
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
          keyboardShouldPersistTaps="handled">
          {loadingHistory ? (
            <View className="mt-8 rounded-2xl border border-slate-300 bg-white p-5">
              <Text className="text-center text-sm text-slate-600">Đang tải lịch sử AI Assistant...</Text>
            </View>
          ) : null}

          {!loadingHistory && messages.length === 0 ? (
            <View className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white p-6">
              <Text className="text-center text-sm font-medium text-slate-700">
                Bắt đầu trò chuyện với AI Assistant
              </Text>
              <Text className="mt-1 text-center text-xs text-slate-500">
                Ví dụ: &quot;Tìm ai nói tin nhắn họp 9h&quot; hoặc &quot;Tóm tắt hội thoại gần đây&quot;.
              </Text>
            </View>
          ) : null}

          {messages.map((message) => (
            <View
              key={message.id}
              className={`flex ${message.role === 'user' ? 'items-end' : 'items-start'}`}>
              <View
                className={`max-w-[88%] rounded-2xl border px-3 py-2.5 ${
                  message.role === 'user'
                    ? 'border-blue-600 bg-blue-600'
                    : 'border-slate-200 bg-white'
                }`}>
                <Text
                  className={`text-[14px] leading-5 ${
                    message.role === 'user' ? 'text-white' : 'text-slate-800'
                  }`}>
                  {message.content}
                </Text>

                {message.role === 'assistant' && message.intent ? (
                  <View className="mt-2 flex-row flex-wrap items-center gap-1.5">
                    <View className="rounded-full bg-slate-100 px-2 py-1">
                      <Text className="text-[10px] font-semibold text-slate-600">
                        Intent: {message.intent}
                      </Text>
                    </View>
                    {(message.toolsUsed ?? []).slice(0, 2).map((tool) => (
                      <View key={`${message.id}-${tool}`} className="rounded-full bg-blue-50 px-2 py-1">
                        <Text className="text-[10px] font-semibold text-blue-700">{tool}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}

                <Text
                  className={`mt-1.5 text-[10px] ${
                    message.role === 'user' ? 'text-blue-100' : 'text-slate-400'
                  }`}>
                  {formatTime(message.createdAt)}
                </Text>
              </View>
            </View>
          ))}

          {sending ? (
            <View className="items-start">
              <View className="rounded-2xl border border-slate-200 bg-white px-3 py-2.5">
                <Text className="text-[13px] text-slate-600">AI Assistant đang phân tích...</Text>
              </View>
            </View>
          ) : null}
        </ScrollView>

        <View className="border-t border-slate-200 bg-white px-3 pb-3 pt-2.5">
          <View className="rounded-2xl border border-slate-300 bg-slate-50 px-3 py-2">
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder="Nhập câu hỏi cho AI Assistant..."
              placeholderTextColor="#94a3b8"
              multiline
              className="max-h-28 min-h-[72px] text-[14px] text-slate-900"
              textAlignVertical="top"
            />
          </View>

          <View className="mt-2 flex-row items-center justify-between">
            <Text className="text-[11px] text-slate-500">Enter để gửi nhanh trên bàn phím.</Text>
            <Pressable
              className={`flex-row items-center rounded-xl px-4 py-2.5 ${
                canSend ? 'bg-[#1e98f3]' : 'bg-slate-300'
              }`}
              disabled={!canSend}
              onPress={() => void handleSend()}>
              <Ionicons name="send" size={15} color="#fff" />
              <Text className="ml-2 text-sm font-semibold text-white">Gửi</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>

      <MessagesBottomTabs activeTab="assistant" />
      <SafeAreaView edges={['bottom']} className="bg-white" />
    </View>
  );
}
