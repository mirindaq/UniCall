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
import type { ChatAttachment, ChatMessageResponse, ConversationResponse, MessageType } from '@/types/chat';

type UiMessage = {
  idMessage: string;
  idConversation: string;
  idAccountSent: string;
  content: string;
  type: MessageType;
  timeSent: string;
  attachments: ChatAttachment[];
  recalled: boolean;
  optimisticStatus?: 'SENDING' | 'SENT';
};

const toUiMessage = (message: ChatMessageResponse): UiMessage => ({
  idMessage: message.idMessage,
  idConversation: message.idConversation,
  idAccountSent: message.idAccountSent,
  content: message.content ?? '',
  type: message.type,
  timeSent: message.timeSent,
  attachments: message.attachments ?? [],
  recalled: message.recalled ?? false,
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

const MESSAGE_PAGE_SIZE = 20;

export default function ConversationDetailScreen() {
  const router = useRouter();
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
  const { startAudioCall, startVideoCall } = useCall();
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [conversation, setConversation] = useState<ConversationResponse | null>(null);
  const [headerTitle, setHeaderTitle] = useState('Cuộc trò chuyện');
  const [myIdentityId, setMyIdentityId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(false);
  const [shouldScrollToBottom, setShouldScrollToBottom] = useState(false);

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
        setIsInitialLoading(true);
        const [messagesResponse, myProfileResponse, conversationsResponse] = await Promise.all([
          chatService.listMessages(conversationId, 1, MESSAGE_PAGE_SIZE),
          userService.getMyProfile(),
          chatService.listConversations(),
        ]);
        if (!mounted) {
          return;
        }
        setMessages((messagesResponse.data.items ?? []).map(toUiMessage));
        setPage(1);
        setHasMore((messagesResponse.data.page ?? 1) < (messagesResponse.data.totalPage ?? 1));
        setMyIdentityId(myProfileResponse.data.identityUserId ?? null);
        setShouldScrollToBottom(true);

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
      } finally {
        if (!mounted) {
          return;
        }
        setIsInitialLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [conversationId]);

  const loadMoreMessages = async () => {
    if (!conversationId || !hasMore || isLoadingMore || isInitialLoading) {
      return;
    }
    
    setIsLoadingMore(true);
    try {
      const nextPage = page + 1;
      const res = await chatService.listMessages(conversationId, nextPage, MESSAGE_PAGE_SIZE);
      const moreItems = (res.data.items ?? []).map(toUiMessage);
      
      setMessages((prev) => [...prev, ...moreItems]);
      setPage(nextPage);
      setHasMore((res.data.page ?? nextPage) < (res.data.totalPage ?? nextPage));
    } catch {
      Toast.show({
        type: 'error',
        text1: 'Không tải thêm được tin nhắn',
      });
    } finally {
      setIsLoadingMore(false);
    }
  };

  useEffect(() => {
    if (!conversationId) {
      return;
    }

    let subscription: ReturnType<typeof chatSocketService.subscribeUserEvents>;
    let cancelled = false;

    const subscribeUserEvents = () => {
      if (cancelled) {
        return;
      }
      subscription?.unsubscribe();
      // Subscribe /user/queue/events và filter theo conversationId (giống web)
      subscription = chatSocketService.subscribeUserEvents((event) => {
        // Chỉ xử lý MESSAGE_UPSERT event cho conversation hiện tại
        if (event.eventType !== 'MESSAGE_UPSERT' || event.conversationId !== conversationId) {
          return;
        }
        const incoming = event.message;
        if (!incoming) {
          return;
        }
        const isMine = myIdentityId != null && incoming.idAccountSent === myIdentityId;
        setMessages((prev) => {
          if (prev.some((message) => message.idMessage === incoming.idMessage)) {
            return prev;
          }
          const incomingUi = toUiMessage(incoming);
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
            setShouldScrollToBottom(true);
          }
          return [incomingUi, ...prev];
        });
      });
    };

    void chatSocketService.connect(subscribeUserEvents, () => {
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
        kind: message.recalled
          ? 'text'
          : message.attachments.some((attachment) => attachment.type === 'STICKER')
            ? 'sticker'
            : message.attachments.length > 0 || message.type !== 'TEXT'
              ? 'attachment'
              : 'text',
        content: message.content || '',
        rawType: message.type,
        attachments: message.attachments,
        recalled: message.recalled,
        senderName: !isMine && (!prev || prev.idAccountSent !== message.idAccountSent) ? headerTitle : undefined,
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

  const conversationGalleryImages = useMemo(() => {
    return messages.flatMap((message) =>
      message.attachments
        .filter((attachment) => attachment.type === 'IMAGE')
        .map((attachment) => ({ url: attachment.url }))
    );
  }, [messages]);

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
      attachments: [],
      recalled: false,
      optimisticStatus: 'SENDING',
    };
    setMessages((prev) => [tempMessage, ...prev]);
    setShouldScrollToBottom(true);

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
        galleryImages={conversationGalleryImages}
        otherAvatar={avatar}
        otherAvatarUrl={conversation?.avatar ?? null}
        inputPlaceholder="Tin nhắn"
        isSending={false}
        isLoadingMore={isLoadingMore}
        hasMore={hasMore}
        shouldScrollToBottom={shouldScrollToBottom}
        onSend={handleSendMessage}
        onLoadMore={loadMoreMessages}
        onScrolledToBottom={() => setShouldScrollToBottom(false)}
      />
    </View>
  );
}
