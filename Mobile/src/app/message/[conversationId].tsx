import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

import { ChatDetailContent } from '@/components/chat-detail/chat-detail-content';
import { ChatDetailHeader } from '@/components/chat-detail/chat-detail-header';
import { AppStatusBarBlue } from '@/components/ui/app-status-bar-blue';
import { useCall } from '@/contexts/call-context';
import { chatSocketService } from '@/services/chat-socket.service';
import { chatService } from '@/services/chat.service';
import { userService } from '@/services/user.service';
import type { MockChatMessage } from '@/mock/chat-thread-messages';
import type { ChatMessageResponse, ConversationResponse, MessageType } from '@/types/chat';

type UiMessage = {
  idMessage: string;
  idConversation: string;
  idAccountSent: string;
  content: string;
  type: MessageType;
  timeSent: string;
  optimisticStatus?: 'SENDING' | 'SENT';
};

const toUiMessage = (message: ChatMessageResponse): UiMessage => ({
  idMessage: message.idMessage,
  idConversation: message.idConversation,
  idAccountSent: message.idAccountSent,
  content: message.content ?? '',
  type: message.type,
  timeSent: message.timeSent,
});

const waitForSocketConnected = async (timeoutMs = 5000) => {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const client = chatSocketService.getClient();
    if (client?.connected) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, 80));
  }
  return false;
};

export default function ConversationDetailScreen() {
  const router = useRouter();
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
  const { startAudioCall, startVideoCall } = useCall();
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [conversation, setConversation] = useState<ConversationResponse | null>(null);
  const [headerTitle, setHeaderTitle] = useState('Cuộc trò chuyện');
  const [myIdentityId, setMyIdentityId] = useState<string | null>(null);

  const peerInfo = useMemo(() => {
    const participants = conversation?.participantInfos ?? [];
    if (participants.length === 0) {
      return null;
    }
    if (myIdentityId) {
      return participants.find((item) => item.idAccount !== myIdentityId) ?? participants[0];
    }
    return participants[0];
  }, [conversation, myIdentityId]);

  const peerUserId = peerInfo?.idAccount ?? null;

  useEffect(() => {
    if (!conversationId) {
      return;
    }

    let mounted = true;
    void (async () => {
      try {
        const [messagesResponse, myProfileResponse, conversationsResponse] = await Promise.all([
          chatService.listMessages(conversationId, 1, 100),
          userService.getMyProfile(),
          chatService.listConversations(),
        ]);
        if (!mounted) {
          return;
        }
        setMessages([...(messagesResponse.data.items ?? [])].reverse().map(toUiMessage));
        setMyIdentityId(myProfileResponse.data.identityUserId ?? null);

        const matched = (conversationsResponse.data ?? []).find(
          (conversation) => conversation.idConversation === conversationId
        );
        setConversation(matched ?? null);
        setHeaderTitle(matched?.name?.trim() || 'Cuộc trò chuyện');
      } catch {
        if (!mounted) {
          return;
        }
        Toast.show({
          type: 'error',
          text1: 'Không tải được hội thoại',
        });
      }
    })();

    return () => {
      mounted = false;
    };
  }, [conversationId]);

  useEffect(() => {
    if (!conversationId) {
      return;
    }

    let subscription: ReturnType<typeof chatSocketService.subscribeConversation>;
    let cancelled = false;

    const subscribeCurrentConversation = () => {
      if (cancelled) {
        return;
      }
      subscription?.unsubscribe();
      subscription = chatSocketService.subscribeConversation(conversationId, (incoming) => {
        setMessages((prev) => {
          if (prev.some((message) => message.idMessage === incoming.idMessage)) {
            return prev;
          }
          const incomingUi = toUiMessage(incoming);
          const isMine = myIdentityId != null && incoming.idAccountSent === myIdentityId;
          if (isMine) {
            const pendingIdx = prev.findIndex(
              (message) =>
                message.optimisticStatus === 'SENDING' &&
                message.idAccountSent === incoming.idAccountSent &&
                message.content === incoming.content
            );
            if (pendingIdx >= 0) {
              const cloned = [...prev];
              cloned[pendingIdx] = incomingUi;
              return cloned;
            }
          }
          return [...prev, incomingUi];
        });
      });
    };

    void chatSocketService.connect(subscribeCurrentConversation, () => {
      subscription?.unsubscribe();
      subscription = undefined;
    });

    return () => {
      cancelled = true;
      subscription?.unsubscribe();
    };
  }, [conversationId, myIdentityId]);

  const mappedMessages = useMemo<MockChatMessage[]>(() => {
    const lastMineIndex = [...messages]
      .map((message, index) => ({ message, index }))
      .filter(({ message }) => myIdentityId != null && message.idAccountSent === myIdentityId)
      .at(-1)?.index ?? -1;

    return messages.map((message, index) => {
      const prev = messages[index - 1];
      const isMine = myIdentityId != null && message.idAccountSent === myIdentityId;
      const date = message.timeSent ? new Date(message.timeSent) : null;
      const timeLabel =
        date && !Number.isNaN(date.getTime())
          ? `${`${date.getHours()}`.padStart(2, '0')}:${`${date.getMinutes()}`.padStart(2, '0')}`
          : undefined;

      return {
        id: message.idMessage,
        sender: isMine ? 'me' : 'other',
        kind: message.type === 'TEXT' ? 'text' : 'sticker',
        content: message.content || '',
        senderName: !isMine ? headerTitle : undefined,
        timeLabel,
        showAvatar: prev ? prev.idAccountSent !== message.idAccountSent && !isMine : !isMine,
        statusText: isMine && index === lastMineIndex
          ? message.optimisticStatus === 'SENDING'
            ? 'Đang gửi...'
            : 'Đã gửi'
          : undefined,
      };
    });
  }, [messages, myIdentityId, headerTitle]);

  const handleSendMessage = async (content: string) => {
    if (!conversationId || !myIdentityId) {
      return;
    }

    const nowIso = new Date().toISOString();
    const tempMessage: UiMessage = {
      idMessage: `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      idConversation: conversationId,
      idAccountSent: myIdentityId,
      content,
      type: 'TEXT',
      timeSent: nowIso,
      optimisticStatus: 'SENDING',
    };
    setMessages((prev) => [...prev, tempMessage]);

    try {
      await chatSocketService.connect();
      const connected = await waitForSocketConnected();
      if (!connected) {
        const response = await chatService.sendMessageRest(conversationId, content, 'TEXT');
        setMessages((prev) =>
          prev.map((item) =>
            item.idMessage === tempMessage.idMessage ? toUiMessage(response.data) : item
          )
        );
        return;
      }
      chatSocketService.sendMessage(conversationId, content, 'TEXT');
      setMessages((prev) =>
        prev.map((item) =>
          item.idMessage === tempMessage.idMessage ? { ...item, optimisticStatus: 'SENT' } : item
        )
      );
    } catch (e) {
      console.log(e)
      setMessages((prev) => prev.filter((item) => item.idMessage !== tempMessage.idMessage));
      Toast.show({
        type: 'error',
        text1: 'Gửi tin nhắn thất bại',
      });
    }
  };

  const avatar = {
    type: 'initials' as const,
    value: headerTitle.slice(0, 2).toUpperCase() || 'C',
    backgroundColor: '#94a3b8',
  };

  return (
    <View className="flex-1 bg-[#d9dde8]">
      <AppStatusBarBlue />
      <SafeAreaView edges={['top']} className="bg-[#1e98f3]" />
      <ChatDetailHeader
        title={headerTitle}
        onBack={() => {
          router.back();
        }}
        onStartAudioCall={() => {
          if (!conversationId || !peerUserId) {
            Toast.show({
              type: 'error',
              text1: 'Không thể bắt đầu cuộc gọi',
            });
            return;
          }
          void startAudioCall({
            conversationId,
            peerUserId,
            peerName: headerTitle,
            peerAvatar: conversation?.avatar ?? null,
          });
        }}
        onStartVideoCall={() => {
          if (!conversationId || !peerUserId) {
            Toast.show({
              type: 'error',
              text1: 'Không thể bắt đầu cuộc gọi',
            });
            return;
          }
          void startVideoCall({
            conversationId,
            peerUserId,
            peerName: headerTitle,
            peerAvatar: conversation?.avatar ?? null,
          });
        }}
        onOpenOptions={() => {
          if (conversationId) {
            router.push(`/message/options/${conversationId}`);
            return;
          }
          router.push('/message/options/hung');
        }}
      />

      <ChatDetailContent
        messages={mappedMessages}
        otherAvatar={avatar}
        otherAvatarUrl={conversation?.avatar ?? null}
        inputPlaceholder="Tin nhắn"
        isSending={false}
        onSend={handleSendMessage}
      />
    </View>
  );
}
