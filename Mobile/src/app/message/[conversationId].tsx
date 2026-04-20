import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Modal, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

import { ChatDetailContent } from '@/components/chat-detail/chat-detail-content';
import { ChatDetailHeader } from '@/components/chat-detail/chat-detail-header';
import { AppStatusBarBlue } from '@/components/ui/app-status-bar-blue';
import { useCall } from '@/contexts/call-context';
import type { MockChatMessage } from '@/mock/chat-thread-messages';
import { fileService } from '@/services/file.service';
import { chatSocketService } from '@/services/chat-socket.service';
import { chatService } from '@/services/chat.service';
import { userService } from '@/services/user.service';
import type {
  ChatAttachment,
  ChatMessageResponse,
  ConversationBlockStatusResponse,
  ConversationResponse,
  MessageType,
} from '@/types/chat';

type UiMessage = {
  idMessage: string;
  idConversation: string;
  idAccountSent: string;
  content: string;
  type: MessageType;
  timeSent: string;
  attachments: ChatAttachment[];
  recalled: boolean;
  replyToMessageId?: string;
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
  replyToMessageId: message.replyToMessageId,
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
  const [conversationOptions, setConversationOptions] = useState<ConversationResponse[]>([]);
  const [headerTitle, setHeaderTitle] = useState('Cuoc tro chuyen');
  const [myIdentityId, setMyIdentityId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [shouldScrollToBottom, setShouldScrollToBottom] = useState(false);
  const [blockStatus, setBlockStatus] = useState<ConversationBlockStatusResponse | null>(null);
  const [replyingToMessageId, setReplyingToMessageId] = useState<string | null>(null);
  const [forwardSourceMessage, setForwardSourceMessage] = useState<UiMessage | null>(null);
  const [forwardPickerOpen, setForwardPickerOpen] = useState(false);

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
  const isDirectConversation = conversation?.type === 'DOUBLE';
  const isMessageBlocked = isDirectConversation && Boolean(blockStatus?.blocked);
  const blockedCallReasonText = blockStatus?.blockedByMe
    ? 'Ban da chan nguoi nay. Hay bo chan de tiep tuc.'
    : 'Khong the goi vi nguoi nay da chan ban.';
  const blockedComposerReasonText = blockStatus?.blockedByMe
    ? 'Ban da chan nguoi nay. Hay bo chan de tiep tuc nhan tin.'
    : 'Nguoi nay da chan ban. Ban khong the nhan tin trong luc nay.';

  const getMessagePreviewText = useCallback((message: UiMessage) => {
    if (message.recalled) {
      return 'Tin nhan da thu hoi';
    }
    if (message.content?.trim()) {
      return message.content.trim();
    }
    const firstAttachment = message.attachments[0];
    if (!firstAttachment) {
      return 'Tin nhan';
    }
    if (firstAttachment.type === 'IMAGE') {
      return 'Hinh anh';
    }
    if (firstAttachment.type === 'VIDEO') {
      return 'Video';
    }
    if (firstAttachment.type === 'AUDIO') {
      return 'Am thanh';
    }
    if (firstAttachment.type === 'STICKER' || firstAttachment.type === 'GIF') {
      return 'Sticker';
    }
    return 'Tep dinh kem';
  }, []);

  const refreshBlockStatus = useCallback(async () => {
    if (!conversationId || !isDirectConversation) {
      setBlockStatus(null);
      return;
    }
    try {
      const response = await chatService.getConversationBlockStatus(conversationId);
      setBlockStatus(response.data);
    } catch {
      setBlockStatus(null);
    }
  }, [conversationId, isDirectConversation]);

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
          (item) => item.idConversation === conversationId
        );
        setConversationOptions(conversationsResponse.data ?? []);
        setConversation(matched ?? null);
        setHeaderTitle(matched?.name?.trim() || 'Cuoc tro chuyen');
      } catch {
        if (!mounted) {
          return;
        }
        Toast.show({
          type: 'error',
          text1: 'Khong tai duoc hoi thoai',
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

  useEffect(() => {
    void refreshBlockStatus();
  }, [refreshBlockStatus]);

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
        text1: 'Khong tai them duoc tin nhan',
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
      subscription = chatSocketService.subscribeUserEvents((event) => {
        if (event.eventType !== 'MESSAGE_UPSERT' || event.conversationId !== conversationId) {
          return;
        }
        const incoming = event.message;
        if (!incoming) {
          return;
        }
        const isMine = myIdentityId != null && incoming.idAccountSent === myIdentityId;
        setMessages((prev) => {
          const incomingUi = toUiMessage(incoming);
          const existingIndex = prev.findIndex((message) => message.idMessage === incoming.idMessage);
          if (existingIndex >= 0) {
            const cloned = [...prev];
            cloned[existingIndex] = incomingUi;
            return cloned;
          }
          if (isMine) {
            const pendingIdx = prev.findIndex(
              (message) =>
                message.optimisticStatus != null &&
                message.idAccountSent === incoming.idAccountSent &&
                message.content === incoming.content
            );
            if (pendingIdx >= 0) {
              const cloned = [...prev];
              cloned[pendingIdx] = incomingUi;
              return cloned;
            }
          }
          setShouldScrollToBottom(true);
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

  const handleRecallMessage = useCallback(
    (messageId: string) => {
      if (!conversationId) {
        return;
      }
      Alert.alert('Thu hoi tin nhan', 'Ban co chac chan muon thu hoi tin nhan nay?', [
        { text: 'Huy', style: 'cancel' },
        {
          text: 'Thu hoi',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                const response = await chatService.recallMessage(conversationId, messageId);
                const recalledMessage = toUiMessage(response.data);
                setMessages((prev) =>
                  prev.map((item) => (item.idMessage === messageId ? recalledMessage : item))
                );
              } catch {
                Toast.show({
                  type: 'error',
                  text1: 'Thu hoi tin nhan that bai',
                });
              }
            })();
          },
        },
      ]);
    },
    [conversationId]
  );

  const handleStartReply = useCallback((messageId: string) => {
    setReplyingToMessageId(messageId);
  }, []);

  const handleOpenForwardPicker = useCallback((message: UiMessage) => {
    setForwardSourceMessage(message);
    setForwardPickerOpen(true);
  }, []);

  const handleForwardToConversation = useCallback(
    async (targetConversationId: string) => {
      if (!conversationId || !forwardSourceMessage) {
        return;
      }
      try {
        await chatService.forwardMessage(conversationId, forwardSourceMessage.idMessage, {
          targetConversationIds: [targetConversationId],
        });
        setForwardPickerOpen(false);
        setForwardSourceMessage(null);
        Toast.show({
          type: 'success',
          text1: 'Da chuyen tiep tin nhan',
        });
      } catch {
        Toast.show({
          type: 'error',
          text1: 'Chuyen tiep that bai',
        });
      }
    },
    [conversationId, forwardSourceMessage]
  );

  const mappedMessages = useMemo<MockChatMessage[]>(() => {
    const messageById = new Map(messages.map((item) => [item.idMessage, item] as const));
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
      const repliedMessage = message.replyToMessageId
        ? messageById.get(message.replyToMessageId)
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
        replyPreviewText: repliedMessage ? getMessagePreviewText(repliedMessage) : undefined,
        senderName: !isMine && (!prev || prev.idAccountSent !== message.idAccountSent) ? headerTitle : undefined,
        timeLabel,
        showAvatar: prev ? prev.idAccountSent !== message.idAccountSent && !isMine : !isMine,
        statusText:
          isMine && index === lastMineIndex
            ? message.optimisticStatus === 'SENDING'
              ? 'Dang gui...'
              : 'Da gui'
            : undefined,
      };
    });
  }, [messages, myIdentityId, headerTitle, getMessagePreviewText]);

  const conversationGalleryImages = useMemo(() => {
    return messages.flatMap((message) =>
      message.attachments
        .filter((attachment) => attachment.type === 'IMAGE')
        .map((attachment) => ({ url: attachment.url }))
    );
  }, [messages]);

  const replyingToMessage = useMemo(() => {
    if (!replyingToMessageId) {
      return null;
    }
    return messages.find((item) => item.idMessage === replyingToMessageId) ?? null;
  }, [messages, replyingToMessageId]);

  const forwardTargets = useMemo(() => {
    return conversationOptions.filter((item) => item.idConversation !== conversationId);
  }, [conversationId, conversationOptions]);

  const handleSendMessage = async (content: string) => {
    if (!conversationId || !myIdentityId || isSending) {
      return;
    }

    const replyToMessageId = replyingToMessageId;
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
      replyToMessageId: replyToMessageId ?? undefined,
      optimisticStatus: 'SENDING',
    };
    setMessages((prev) => [tempMessage, ...prev]);
    setShouldScrollToBottom(true);
    setIsSending(true);

    try {
      await chatSocketService.connect();
      const connected = await waitForSocketConnected();
      if (!connected) {
        const response = await chatService.sendMessageRest(
          conversationId,
          content,
          'TEXT',
          undefined,
          replyToMessageId ?? undefined
        );
        setMessages((prev) =>
          prev.map((item) =>
            item.idMessage === tempMessage.idMessage ? toUiMessage(response.data) : item
          )
        );
        setReplyingToMessageId(null);
        return;
      }
      chatSocketService.sendMessage(
        conversationId,
        content,
        'TEXT',
        undefined,
        replyToMessageId ?? undefined
      );
      setMessages((prev) =>
        prev.map((item) =>
          item.idMessage === tempMessage.idMessage ? { ...item, optimisticStatus: 'SENT' } : item
        )
      );
      setReplyingToMessageId(null);
    } catch (error) {
      console.log(error);
      setMessages((prev) => prev.filter((item) => item.idMessage !== tempMessage.idMessage));
      Toast.show({
        type: 'error',
        text1: 'Gui tin nhan that bai',
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleSendImages = async (imageUris: string[], mixedText?: string) => {
    if (!conversationId || !myIdentityId || isSending || imageUris.length === 0) {
      return;
    }

    const replyToMessageId = replyingToMessageId;
    setIsSending(true);
    try {
      const uploadedAttachments = await Promise.all(
        imageUris.map(async (imageUri, index) => {
          const uploaded = await fileService.uploadFileFromUri(imageUri);
          return {
            type: uploaded.data.type,
            url: uploaded.data.url,
            size: uploaded.data.fileSize ? `${uploaded.data.fileSize}` : undefined,
            order: index,
          } as Pick<ChatAttachment, 'type' | 'url' | 'size' | 'order'>;
        })
      );

      const content = mixedText?.trim() ?? '';
      const messageType: MessageType = content ? 'MIX' : 'NONTEXT';
      const response = await chatService.sendMessageRest(
        conversationId,
        content,
        messageType,
        uploadedAttachments,
        replyToMessageId ?? undefined
      );

      const incoming = toUiMessage(response.data);
      setMessages((prev) => {
        if (prev.some((message) => message.idMessage === incoming.idMessage)) {
          return prev;
        }
        return [incoming, ...prev];
      });
      setShouldScrollToBottom(true);
      setReplyingToMessageId(null);
    } catch (error) {
      console.log(error);
      Toast.show({
        type: 'error',
        text1: 'Gui anh that bai',
      });
    } finally {
      setIsSending(false);
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
          if (isMessageBlocked) {
            Toast.show({
              type: 'error',
              text1: blockedCallReasonText,
            });
            return;
          }
          if (!conversationId || !peerUserId) {
            Toast.show({
              type: 'error',
              text1: 'Khong the bat dau cuoc goi',
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
          if (isMessageBlocked) {
            Toast.show({
              type: 'error',
              text1: blockedCallReasonText,
            });
            return;
          }
          if (!conversationId || !peerUserId) {
            Toast.show({
              type: 'error',
              text1: 'Khong the bat dau cuoc goi',
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
        audioCallDisabled={isMessageBlocked || !peerUserId}
        videoCallDisabled={isMessageBlocked || !peerUserId}
      />

      <ChatDetailContent
        messages={mappedMessages}
        galleryImages={conversationGalleryImages}
        otherAvatar={avatar}
        otherAvatarUrl={conversation?.avatar ?? null}
        inputPlaceholder="Tin nhan"
        isSending={isSending}
        isLoadingMore={isLoadingMore}
        hasMore={hasMore}
        shouldScrollToBottom={shouldScrollToBottom}
        isInputBlocked={isMessageBlocked}
        blockedReasonText={blockedComposerReasonText}
        replyPreviewText={replyingToMessage ? getMessagePreviewText(replyingToMessage) : null}
        onCancelReply={() => setReplyingToMessageId(null)}
        onSend={handleSendMessage}
        onSendImages={handleSendImages}
        onLongPressMessage={(message) => {
          const isMyMessage = message.sender === 'me';
          if (message.recalled || message.rawType === 'CALL') {
            return;
          }
          const idMessage = message.id;
          if (!idMessage) {
            return;
          }
          const sourceMessage = messages.find((item) => item.idMessage === idMessage);
          if (!sourceMessage) {
            return;
          }
          const options: { text: string; style?: 'cancel' | 'destructive'; onPress?: () => void }[] = [
            {
              text: 'Tra loi',
              onPress: () => handleStartReply(idMessage),
            },
            {
              text: 'Chuyen tiep',
              onPress: () => handleOpenForwardPicker(sourceMessage),
            },
          ];
          if (isMyMessage) {
            options.push({
              text: 'Thu hoi',
              style: 'destructive',
              onPress: () => handleRecallMessage(idMessage),
            });
          }
          options.push({ text: 'Huy', style: 'cancel' });
          Alert.alert('Tuy chon tin nhan', 'Chon thao tac', options);
        }}
        onLoadMore={loadMoreMessages}
        onScrolledToBottom={() => setShouldScrollToBottom(false)}
      />

      <Modal
        visible={forwardPickerOpen}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setForwardPickerOpen(false);
          setForwardSourceMessage(null);
        }}>
        <View className="flex-1 justify-end bg-black/35">
          <View className="max-h-[70%] rounded-t-2xl bg-white px-4 pb-4 pt-3">
            <View className="mb-2 flex-row items-center justify-between">
              <Text className="text-base font-semibold text-slate-900">Chuyen tiep tin nhan</Text>
              <Pressable
                onPress={() => {
                  setForwardPickerOpen(false);
                  setForwardSourceMessage(null);
                }}
                className="h-8 w-8 items-center justify-center rounded-full bg-slate-100">
                <Text className="text-slate-600">x</Text>
              </Pressable>
            </View>
            <FlatList
              data={forwardTargets}
              keyExtractor={(item) => item.idConversation}
              ListEmptyComponent={
                <View className="py-8">
                  <Text className="text-center text-sm text-slate-500">Khong co cuoc tro chuyen de chuyen tiep</Text>
                </View>
              }
              renderItem={({ item }) => (
                <Pressable
                  className="mb-2 rounded-lg border border-slate-200 px-3 py-2.5"
                  onPress={() => void handleForwardToConversation(item.idConversation)}>
                  <Text numberOfLines={1} className="text-[14px] font-medium text-slate-900">
                    {item.name?.trim() || item.idConversation}
                  </Text>
                  <Text className="mt-0.5 text-xs text-slate-500">
                    {item.type === 'GROUP' ? 'Nhom' : 'Ca nhan'}
                  </Text>
                </Pressable>
              )}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}
