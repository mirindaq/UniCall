import Ionicons from '@expo/vector-icons/Ionicons';
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
import { chatSocketService } from '@/services/chat-socket.service';
import { chatService } from '@/services/chat.service';
import { fileService } from '@/services/file.service';
import { userService } from '@/services/user.service';
import type {
  ChatAttachment,
  ChatMessageResponse,
  ConversationBlockStatusResponse,
  ConversationResponse,
  MessageEnum,
  MessageType,
} from '@/types/chat';
import type { UserProfile } from '@/types/user';
import {
  buildMessagePreviewData,
  messagePreviewSnippetText,
  QUICK_MESSAGE_REACTIONS,
  summarizeMessageReactions,
} from '@/utils/chat-message-preview';

type UiMessage = {
  idMessage: string;
  idConversation: string;
  idAccountSent: string;
  status: MessageEnum;
  content: string;
  type: MessageType;
  timeSent: string;
  attachments: ChatAttachment[];
  recalled: boolean;
  replyToMessageId?: string;
  reactions?: Record<string, string>;
  reactionStacks?: Record<string, string[]>;
  pinned?: boolean;
  pinnedByAccountId?: string;
  pinnedAt?: string;
  optimisticStatus?: 'SENDING' | 'SENT';
};

const MESSAGE_PAGE_SIZE = 20;

const toUiMessage = (message: ChatMessageResponse): UiMessage => ({
  idMessage: message.idMessage,
  idConversation: message.idConversation,
  idAccountSent: message.idAccountSent,
  status: message.status,
  content: message.content ?? '',
  type: message.type,
  timeSent: message.timeSent,
  attachments: message.attachments ?? [],
  recalled: message.recalled ?? false,
  replyToMessageId: message.replyToMessageId,
  reactions: message.reactions,
  reactionStacks: message.reactionStacks,
  pinned: message.pinned,
  pinnedByAccountId: message.pinnedByAccountId,
  pinnedAt: message.pinnedAt,
});

const normalizeId = (value?: string | number | null) => {
  if (value == null) {
    return null;
  }
  const text = String(value).trim().toLowerCase();
  return text || null;
};

const isMessageFromCurrentUser = (
  message:
    | Pick<UiMessage, 'idAccountSent' | 'status'>
    | Pick<ChatMessageResponse, 'idAccountSent' | 'status'>,
  myIdentityId: string | null,
  myNumericAccountId: string | null
) => {
  const senderId = normalizeId(message.idAccountSent);
  if (!senderId) {
    return message.status === 'SENT';
  }
  if (senderId === normalizeId(myIdentityId) || senderId === normalizeId(myNumericAccountId)) {
    return true;
  }
  return (
    message.status === 'SENT' &&
    normalizeId(myIdentityId) == null &&
    normalizeId(myNumericAccountId) == null
  );
};

const toDisplayName = (profile?: UserProfile | null, fallback?: string) => {
  if (!profile) {
    return fallback || '';
  }
  const fullName = `${profile.firstName ?? ''} ${profile.lastName ?? ''}`.trim();
  return fullName || fallback || profile.identityUserId;
};

const toInitials = (fullName: string) => {
  const words = fullName.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return 'U';
  }
  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }
  return `${words[0][0] ?? ''}${words[words.length - 1][0] ?? ''}`.toUpperCase();
};

const dedupeMessagesById = (items: UiMessage[]) => {
  const seen = new Set<string>();
  const next: UiMessage[] = [];
  items.forEach((item) => {
    if (seen.has(item.idMessage)) {
      return;
    }
    seen.add(item.idMessage);
    next.push(item);
  });
  return next;
};

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

type MessageActionItemProps = {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color?: string;
  danger?: boolean;
  onPress: () => void;
};

function MessageActionItem({
  label,
  icon,
  color = '#2563eb',
  danger = false,
  onPress,
}: MessageActionItemProps) {
  return (
    <Pressable
      className="mb-2 flex-row items-center rounded-xl border border-slate-200 bg-white px-3.5 py-3"
      onPress={onPress}>
      <View className="h-9 w-9 items-center justify-center rounded-full bg-slate-100">
        <Ionicons name={icon} size={19} color={danger ? '#dc2626' : color} />
      </View>
      <Text
        className={`ml-3 text-[15px] font-medium ${
          danger ? 'text-red-600' : 'text-slate-900'
        }`}>
        {label}
      </Text>
    </Pressable>
  );
}

export default function ConversationDetailScreen() {
  const router = useRouter();
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
  const { startAudioCall, startVideoCall } = useCall();

  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [conversation, setConversation] = useState<ConversationResponse | null>(null);
  const [conversationOptions, setConversationOptions] = useState<ConversationResponse[]>([]);
  const [headerTitle, setHeaderTitle] = useState('Cuộc trò chuyện');
  const [myIdentityId, setMyIdentityId] = useState<string | null>(null);
  const [myAccountNumericId, setMyAccountNumericId] = useState<string | null>(null);
  const [senderProfiles, setSenderProfiles] = useState<Record<string, UserProfile>>({});
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
  const [messageActionTargetId, setMessageActionTargetId] = useState<string | null>(null);
  const [activePinnedMessageId, setActivePinnedMessageId] = useState<string | null>(null);
  const [isPinnedListExpanded, setIsPinnedListExpanded] = useState(false);

  const peerInfo = useMemo(() => {
    const participants = conversation?.participantInfos ?? [];
    if (participants.length === 0) {
      return null;
    }
    if (myIdentityId || myAccountNumericId) {
      return (
        participants.find(
          (item) =>
            normalizeId(item.idAccount) !== normalizeId(myIdentityId) &&
            normalizeId(item.idAccount) !== normalizeId(myAccountNumericId)
        ) ?? participants[0]
      );
    }
    return participants[0];
  }, [conversation, myIdentityId, myAccountNumericId]);

  const peerUserId = peerInfo?.idAccount ?? null;
  const isDirectConversation = conversation?.type === 'DOUBLE';
  const isMessageBlocked = isDirectConversation && Boolean(blockStatus?.blocked);
  const blockedCallReasonText = blockStatus?.blockedByMe
    ? 'Bạn đã chặn người này. Hãy bỏ chặn để tiếp tục.'
    : 'Không thể gọi vì người này đã chặn bạn.';
  const blockedComposerReasonText = blockStatus?.blockedByMe
    ? 'Bạn đã chặn người này. Hãy bỏ chặn để tiếp tục nhắn tin.'
    : 'Người này đã chặn bạn. Bạn không thể nhắn tin lúc này.';

  const resolveSenderName = useCallback(
    (message: UiMessage) => {
      if (isMessageFromCurrentUser(message, myIdentityId, myAccountNumericId)) {
        return 'Bạn';
      }
      const senderProfile = senderProfiles[message.idAccountSent];
      const fallback =
        conversation?.type === 'GROUP' ? message.idAccountSent : headerTitle || message.idAccountSent;
      return toDisplayName(senderProfile, fallback);
    },
    [conversation?.type, headerTitle, myAccountNumericId, myIdentityId, senderProfiles]
  );

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
        setMessages(dedupeMessagesById((messagesResponse.data.items ?? []).map(toUiMessage)));
        setPage(1);
        setHasMore((messagesResponse.data.page ?? 1) < (messagesResponse.data.totalPage ?? 1));
        setMyIdentityId(myProfileResponse.data.identityUserId ?? null);
        setMyAccountNumericId(myProfileResponse.data.id != null ? String(myProfileResponse.data.id) : null);
        setShouldScrollToBottom(true);

        const matched =
          (conversationsResponse.data ?? []).find((item) => item.idConversation === conversationId) ??
          null;
        setConversationOptions(conversationsResponse.data ?? []);
        setConversation(matched);

        if (!matched) {
          setHeaderTitle('Cuộc trò chuyện');
          setSenderProfiles({});
          return;
        }

        if (matched.type === 'GROUP') {
          setHeaderTitle(matched.name?.trim() || 'Nhóm chat');
          setSenderProfiles({});
          return;
        }

        const peerIdentityId =
          matched.participantInfos.find(
            (item) => item.idAccount !== (myProfileResponse.data.identityUserId ?? '')
          )?.idAccount ?? null;
        if (!peerIdentityId) {
          setHeaderTitle(matched.name?.trim() || 'Cuộc trò chuyện');
          setSenderProfiles({});
          return;
        }

        try {
          const peerProfileResponse = await userService.getProfileByIdentityUserId(peerIdentityId);
          const peerName = toDisplayName(peerProfileResponse.data, matched.name?.trim() || peerIdentityId);
          setHeaderTitle(peerName || 'Cuộc trò chuyện');
          setSenderProfiles((prev) => ({
            ...prev,
            [peerIdentityId]: peerProfileResponse.data,
          }));
        } catch {
          setHeaderTitle(matched.name?.trim() || 'Cuộc trò chuyện');
        }
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
      setMessages((prev) => dedupeMessagesById([...prev, ...moreItems]));
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
      subscription = chatSocketService.subscribeUserEvents((event) => {
        if (event.eventType !== 'MESSAGE_UPSERT' || event.conversationId !== conversationId) {
          return;
        }
        const incoming = event.message;
        if (!incoming) {
          return;
        }
        const isMine = isMessageFromCurrentUser(incoming, myIdentityId, myAccountNumericId);
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
                isMessageFromCurrentUser(message, myIdentityId, myAccountNumericId) &&
                message.content === incoming.content
            );
            if (pendingIdx >= 0) {
              const cloned = [...prev];
              cloned[pendingIdx] = incomingUi;
              return cloned;
            }
          }
          setShouldScrollToBottom(true);
          return dedupeMessagesById([incomingUi, ...prev]);
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
  }, [conversationId, myIdentityId, myAccountNumericId]);

  useEffect(() => {
    if (conversation?.type !== 'GROUP' || messages.length === 0) {
      return;
    }

    const missingSenderIds = Array.from(
      new Set(
        messages
          .filter((message) => !isMessageFromCurrentUser(message, myIdentityId, myAccountNumericId))
          .map((message) => message.idAccountSent)
          .filter((senderId) => Boolean(senderId?.trim()))
      )
    ).filter((senderId) => !senderProfiles[senderId]);

    if (missingSenderIds.length === 0) {
      return;
    }

    let cancelled = false;
    void Promise.all(
      missingSenderIds.map(async (senderId) => {
        try {
          const response = await userService.getProfileByIdentityUserId(senderId);
          return [senderId, response.data] as const;
        } catch {
          return null;
        }
      })
    ).then((resolved) => {
      if (cancelled) {
        return;
      }
      const next: Record<string, UserProfile> = {};
      resolved.forEach((item) => {
        if (!item) {
          return;
        }
        next[item[0]] = item[1];
      });
      if (Object.keys(next).length === 0) {
        return;
      }
      setSenderProfiles((prev) => ({
        ...prev,
        ...next,
      }));
    });

    return () => {
      cancelled = true;
    };
  }, [conversation?.type, messages, myIdentityId, myAccountNumericId, senderProfiles]);

  const handleOpenForwardPicker = useCallback((message: UiMessage) => {
    setForwardSourceMessage(message);
    setForwardPickerOpen(true);
  }, []);

  const handleRecallMessage = useCallback(
    (messageId: string) => {
      if (!conversationId) {
        return;
      }
      Alert.alert('Thu hồi tin nhắn', 'Bạn có chắc chắn muốn thu hồi tin nhắn này?', [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Thu hồi',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                const response = await chatService.recallMessage(conversationId, messageId);
                const recalledMessage = toUiMessage(response.data);
                setMessages((prev) =>
                  prev.map((item) => (item.idMessage === messageId ? recalledMessage : item))
                );
                setMessageActionTargetId(null);
              } catch {
                Toast.show({
                  type: 'error',
                  text1: 'Thu hồi tin nhắn thất bại',
                });
              }
            })();
          },
        },
      ]);
    },
    [conversationId]
  );

  const handleTogglePinMessage = useCallback(
    async (message: UiMessage) => {
      if (!conversationId) {
        return;
      }
      try {
        const response = message.pinned
          ? await chatService.unpinMessage(conversationId, message.idMessage)
          : await chatService.pinMessage(conversationId, message.idMessage);
        const updated = toUiMessage(response.data);
        setMessages((prev) => prev.map((item) => (item.idMessage === message.idMessage ? updated : item)));
        setMessageActionTargetId(null);
        Toast.show({
          type: 'success',
          text1: message.pinned ? 'Đã bỏ ghim tin nhắn' : 'Đã ghim tin nhắn',
        });
      } catch {
        Toast.show({
          type: 'error',
          text1: message.pinned ? 'Bỏ ghim tin nhắn thất bại' : 'Ghim tin nhắn thất bại',
        });
      }
    },
    [conversationId]
  );

  const handleReactMessage = useCallback(
    async (messageId: string, reaction: string | null) => {
      if (!conversationId) {
        return;
      }
      try {
        const response = reaction
          ? await chatService.reactMessage(conversationId, messageId, reaction)
          : await chatService.clearReaction(conversationId, messageId);
        const updated = toUiMessage(response.data);
        setMessages((prev) => prev.map((item) => (item.idMessage === messageId ? updated : item)));
        setMessageActionTargetId(null);
      } catch {
        Toast.show({
          type: 'error',
          text1: 'Cập nhật cảm xúc thất bại',
        });
      }
    },
    [conversationId]
  );

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
          text1: 'Đã chuyển tiếp tin nhắn',
        });
      } catch {
        Toast.show({
          type: 'error',
          text1: 'Chuyển tiếp thất bại',
        });
      }
    },
    [conversationId, forwardSourceMessage]
  );

  const mappedMessages = useMemo<MockChatMessage[]>(() => {
    const messageById = new Map(messages.map((item) => [item.idMessage, item] as const));
    const lastMineIndex =
      [...messages]
        .map((message, index) => ({ message, index }))
        .filter(({ message }) => isMessageFromCurrentUser(message, myIdentityId, myAccountNumericId))
        .at(-1)?.index ?? -1;

    return messages.map((message, index) => {
      const prev = messages[index - 1];
      const isMine = isMessageFromCurrentUser(message, myIdentityId, myAccountNumericId);
      const senderProfile = senderProfiles[message.idAccountSent];
      const senderDisplayName = resolveSenderName(message);
      const date = message.timeSent ? new Date(message.timeSent) : null;
      const timeLabel =
        date && !Number.isNaN(date.getTime())
          ? `${`${date.getHours()}`.padStart(2, '0')}:${`${date.getMinutes()}`.padStart(2, '0')}`
          : undefined;
      const repliedMessage = message.replyToMessageId ? messageById.get(message.replyToMessageId) : undefined;
      const repliedSenderName = repliedMessage ? resolveSenderName(repliedMessage) : undefined;
      const replyPreview = repliedMessage
        ? buildMessagePreviewData(
            {
              type: repliedMessage.type,
              content: repliedMessage.content,
              attachments: repliedMessage.attachments,
              recalled: repliedMessage.recalled,
            },
            repliedSenderName
          )
        : undefined;

      const reactionSummary = summarizeMessageReactions({
        reactionStacks: message.reactionStacks,
        reactions: message.reactions,
      });

      return {
        id: message.idMessage,
        sender: isMine ? 'me' : 'other',
        kind: message.recalled
          ? 'text'
          : message.attachments.some(
              (attachment) => attachment.type === 'STICKER' || attachment.type === 'GIF'
            )
          ? 'sticker'
          : message.attachments.length > 0 || message.type !== 'TEXT'
          ? 'attachment'
          : 'text',
        content: message.content || '',
        rawType: message.type,
        attachments: message.attachments,
        recalled: message.recalled,
        replyPreview,
        senderName:
          !isMine && (!prev || prev.idAccountSent !== message.idAccountSent)
            ? conversation?.type === 'GROUP'
              ? senderDisplayName
              : headerTitle
            : undefined,
        senderAvatarUrl: !isMine ? senderProfile?.avatar ?? conversation?.avatar ?? null : null,
        senderAvatarText: !isMine ? toInitials(senderDisplayName || headerTitle) : undefined,
        timeLabel,
        showAvatar: prev ? prev.idAccountSent !== message.idAccountSent && !isMine : !isMine,
        reactionSummary: reactionSummary.items,
        reactionTotal: reactionSummary.total,
        pinned: message.pinned,
        statusText:
          isMine && index === lastMineIndex
            ? message.optimisticStatus === 'SENDING'
              ? 'Đang gửi...'
              : 'Đã gửi'
            : undefined,
      };
    });
  }, [
    conversation?.avatar,
    conversation?.type,
    headerTitle,
    messages,
    myAccountNumericId,
    myIdentityId,
    resolveSenderName,
    senderProfiles,
  ]);

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

  const replyingPreview = useMemo(() => {
    if (!replyingToMessage) {
      return null;
    }
    return buildMessagePreviewData(
      {
        type: replyingToMessage.type,
        content: replyingToMessage.content,
        recalled: replyingToMessage.recalled,
        attachments: replyingToMessage.attachments,
      },
      resolveSenderName(replyingToMessage)
    );
  }, [replyingToMessage, resolveSenderName]);

  const forwardTargets = useMemo(
    () => conversationOptions.filter((item) => item.idConversation !== conversationId),
    [conversationId, conversationOptions]
  );

  const selectedActionMessage = useMemo(
    () => messages.find((item) => item.idMessage === messageActionTargetId) ?? null,
    [messageActionTargetId, messages]
  );

  const selectedActionPreview = useMemo(() => {
    if (!selectedActionMessage) {
      return null;
    }
    return buildMessagePreviewData(
      {
        type: selectedActionMessage.type,
        content: selectedActionMessage.content,
        recalled: selectedActionMessage.recalled,
        attachments: selectedActionMessage.attachments,
      },
      resolveSenderName(selectedActionMessage)
    );
  }, [resolveSenderName, selectedActionMessage]);

  const pinnedMessages = useMemo(() => {
    return [...messages]
      .filter((item) => item.pinned && !item.recalled)
      .sort((a, b) => {
        const timeA = new Date(a.pinnedAt ?? a.timeSent).getTime();
        const timeB = new Date(b.pinnedAt ?? b.timeSent).getTime();
        return timeB - timeA;
      });
  }, [messages]);

  useEffect(() => {
    if (pinnedMessages.length === 0) {
      setActivePinnedMessageId(null);
      setIsPinnedListExpanded(false);
      return;
    }
    setActivePinnedMessageId((prev) => {
      if (prev && pinnedMessages.some((item) => item.idMessage === prev)) {
        return prev;
      }
      return pinnedMessages[0]?.idMessage ?? null;
    });
  }, [pinnedMessages]);

  const activePinnedMessage = useMemo(() => {
    if (pinnedMessages.length === 0) {
      return null;
    }
    return (
      pinnedMessages.find((item) => item.idMessage === activePinnedMessageId) ??
      pinnedMessages[0] ??
      null
    );
  }, [activePinnedMessageId, pinnedMessages]);

  const pinnedPreviewMap = useMemo(() => {
    const map = new Map<string, ReturnType<typeof buildMessagePreviewData>>();
    pinnedMessages.forEach((item) => {
      map.set(
        item.idMessage,
        buildMessagePreviewData(
          {
            type: item.type,
            content: item.content,
            recalled: item.recalled,
            attachments: item.attachments,
          },
          resolveSenderName(item)
        )
      );
    });
    return map;
  }, [pinnedMessages, resolveSenderName]);

  const activePinnedPreview = useMemo(() => {
    if (!activePinnedMessage) {
      return null;
    }
    return pinnedPreviewMap.get(activePinnedMessage.idMessage) ?? null;
  }, [activePinnedMessage, pinnedPreviewMap]);

  const handleSendMessage = async (content: string) => {
    const mySenderId = myIdentityId ?? myAccountNumericId;
    if (!conversationId || !mySenderId || isSending) {
      return;
    }

    const replyToMessageId = replyingToMessageId;
    const nowIso = new Date().toISOString();
    const tempMessage: UiMessage = {
      idMessage: `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      idConversation: conversationId,
      idAccountSent: mySenderId,
      status: 'SENT',
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
          prev.map((item) => (item.idMessage === tempMessage.idMessage ? toUiMessage(response.data) : item))
        );
        setReplyingToMessageId(null);
        return;
      }
      chatSocketService.sendMessage(conversationId, content, 'TEXT', undefined, replyToMessageId ?? undefined);
      setMessages((prev) =>
        prev.map((item) =>
          item.idMessage === tempMessage.idMessage ? { ...item, optimisticStatus: 'SENT' } : item
        )
      );
      setReplyingToMessageId(null);
    } catch {
      setMessages((prev) => prev.filter((item) => item.idMessage !== tempMessage.idMessage));
      Toast.show({
        type: 'error',
        text1: 'Gửi tin nhắn thất bại',
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleSendImages = async (imageUris: string[], mixedText?: string) => {
    const mySenderId = myIdentityId ?? myAccountNumericId;
    if (!conversationId || !mySenderId || isSending || imageUris.length === 0) {
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
    } catch {
      Toast.show({
        type: 'error',
        text1: 'Gửi ảnh thất bại',
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleSendGif = async (gifUrl: string) => {
    const mySenderId = myIdentityId ?? myAccountNumericId;
    if (!conversationId || !mySenderId || isSending || !gifUrl) {
      return;
    }

    setIsSending(true);
    try {
      const response = await chatService.sendMessageRest(
        conversationId,
        'Đã gửi GIF',
        'NONTEXT',
        [{ type: 'GIF', url: gifUrl, order: 0 }],
        replyingToMessageId ?? undefined
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
    } catch {
      Toast.show({
        type: 'error',
        text1: 'Gửi GIF thất bại',
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

  const closeForwardPicker = () => {
    setForwardPickerOpen(false);
    setForwardSourceMessage(null);
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
          if (!conversationId) {
            return;
          }
          router.push(`/message/options/${conversationId}`);
        }}
        audioCallDisabled={isMessageBlocked || !peerUserId}
        videoCallDisabled={isMessageBlocked || !peerUserId}
      />

      {activePinnedMessage && activePinnedPreview ? (
        <View className="mx-3 mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
          <View className="flex-row items-center justify-between">
            <Pressable
              className="flex-row items-center"
              disabled={pinnedMessages.length <= 1}
              onPress={() => {
                if (pinnedMessages.length <= 1) {
                  return;
                }
                setIsPinnedListExpanded((prev) => !prev);
              }}>
              <Ionicons name="pin" size={14} color="#b45309" />
              <Text className="ml-1 text-[12px] font-semibold text-amber-700">
                {`Tin nh?n ghim${pinnedMessages.length > 1 ? ` (${pinnedMessages.length})` : ''}`}
              </Text>
              {pinnedMessages.length > 1 ? (
                <Ionicons
                  name={isPinnedListExpanded ? 'chevron-up' : 'chevron-down'}
                  size={14}
                  color="#92400e"
                />
              ) : null}
            </Pressable>
            <Pressable
              className="h-7 w-7 items-center justify-center rounded-full bg-amber-100"
              onPress={() => void handleTogglePinMessage(activePinnedMessage)}>
              <Ionicons name="close" size={14} color="#92400e" />
            </Pressable>
          </View>
          <Pressable
            className="mt-1"
            disabled={pinnedMessages.length <= 1}
            onPress={() => {
              if (pinnedMessages.length > 1) {
                setIsPinnedListExpanded((prev) => !prev);
              }
            }}>
            <Text className="text-[12px] text-amber-800" numberOfLines={1}>
              {messagePreviewSnippetText(activePinnedPreview)}
            </Text>
          </Pressable>

          {isPinnedListExpanded && pinnedMessages.length > 1 ? (
            <View className="mt-2 border-t border-amber-200 pt-2">
              {pinnedMessages.map((item) => {
                const preview = pinnedPreviewMap.get(item.idMessage);
                if (!preview) {
                  return null;
                }
                return (
                  <Pressable
                    key={`pinned-item-${item.idMessage}`}
                    className={`mb-1 rounded-lg px-2 py-1.5 ${
                      item.idMessage === activePinnedMessage.idMessage ? 'bg-amber-100' : 'bg-transparent'
                    }`}
                    onPress={() => {
                      setActivePinnedMessageId(item.idMessage);
                      setIsPinnedListExpanded(false);
                    }}>
                    <Text className="text-[11px] font-medium text-amber-900" numberOfLines={1}>
                      {preview.senderName || 'Tin nh?n'}
                    </Text>
                    <Text className="text-[11px] text-amber-700" numberOfLines={1}>
                      {messagePreviewSnippetText(preview)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}
        </View>
      ) : null}

      <ChatDetailContent
        messages={mappedMessages}
        galleryImages={conversationGalleryImages}
        otherAvatar={avatar}
        otherAvatarUrl={conversation?.avatar ?? null}
        inputPlaceholder="Tin nhắn"
        isSending={isSending}
        isLoadingMore={isLoadingMore}
        hasMore={hasMore}
        shouldScrollToBottom={shouldScrollToBottom}
        isInputBlocked={isMessageBlocked}
        blockedReasonText={blockedComposerReasonText}
        replyPreview={replyingPreview}
        onCancelReply={() => setReplyingToMessageId(null)}
        onSend={handleSendMessage}
        onSendImages={handleSendImages}
        onSendGif={handleSendGif}
        onLongPressMessage={(message) => {
          if (message.recalled || message.rawType === 'CALL') {
            return;
          }
          const idMessage = message.id;
          if (!idMessage) {
            return;
          }
          setMessageActionTargetId(idMessage);
        }}
        onLoadMore={loadMoreMessages}
        onScrolledToBottom={() => setShouldScrollToBottom(false)}
      />

      <Modal
        visible={Boolean(selectedActionMessage)}
        transparent
        animationType="fade"
        onRequestClose={() => setMessageActionTargetId(null)}>
        <Pressable
          className="flex-1 justify-end bg-black/45"
          onPress={() => setMessageActionTargetId(null)}>
          <Pressable
            className="rounded-t-3xl bg-white px-4 pb-5 pt-4"
            onPress={(event) => event.stopPropagation()}>
            {selectedActionPreview ? (
              <View className="mb-3 rounded-xl bg-sky-50 px-3 py-2">
                <Text className="text-[11px] font-semibold text-sky-700">
                  {selectedActionPreview.senderName || 'Tin nhắn'}
                </Text>
                <Text className="mt-1 text-[13px] text-slate-700" numberOfLines={2}>
                  {messagePreviewSnippetText(selectedActionPreview)}
                </Text>
              </View>
            ) : null}

            <View className="mb-3 rounded-2xl bg-slate-100 px-2 py-2">
              <View className="flex-row items-center justify-between">
                {QUICK_MESSAGE_REACTIONS.map((emoji) => (
                  <Pressable
                    key={`message-action-reaction-${emoji}`}
                    className="h-10 w-10 items-center justify-center rounded-full bg-white"
                    onPress={() => {
                      if (!selectedActionMessage) {
                        return;
                      }
                      void handleReactMessage(selectedActionMessage.idMessage, emoji);
                    }}>
                    <Text className="text-[22px]">{emoji}</Text>
                  </Pressable>
                ))}
                <Pressable
                  className="h-10 w-10 items-center justify-center rounded-full bg-white"
                  onPress={() => {
                    if (!selectedActionMessage) {
                      return;
                    }
                    void handleReactMessage(selectedActionMessage.idMessage, null);
                  }}>
                  <Ionicons name="close" size={18} color="#475569" />
                </Pressable>
              </View>
            </View>

            <MessageActionItem
              icon="return-up-back-outline"
              label="Trả lời"
              onPress={() => {
                if (!selectedActionMessage) {
                  return;
                }
                setReplyingToMessageId(selectedActionMessage.idMessage);
                setMessageActionTargetId(null);
              }}
            />
            <MessageActionItem
              icon="arrow-redo-outline"
              label="Chuyển tiếp"
              onPress={() => {
                if (!selectedActionMessage) {
                  return;
                }
                handleOpenForwardPicker(selectedActionMessage);
                setMessageActionTargetId(null);
              }}
            />
            <MessageActionItem
              icon={selectedActionMessage?.pinned ? 'pin-outline' : 'pin'}
              label={selectedActionMessage?.pinned ? 'Bỏ ghim tin nhắn' : 'Ghim tin nhắn'}
              onPress={() => {
                if (!selectedActionMessage) {
                  return;
                }
                void handleTogglePinMessage(selectedActionMessage);
              }}
            />
            {selectedActionMessage &&
            isMessageFromCurrentUser(selectedActionMessage, myIdentityId, myAccountNumericId) ? (
              <MessageActionItem
                icon="trash-outline"
                label="Thu hồi"
                danger
                onPress={() => handleRecallMessage(selectedActionMessage.idMessage)}
              />
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={forwardPickerOpen}
        transparent
        animationType="slide"
        onRequestClose={closeForwardPicker}>
        <Pressable className="flex-1 justify-end bg-black/35" onPress={closeForwardPicker}>
          <Pressable
            className="max-h-[70%] rounded-t-2xl bg-white px-4 pb-4 pt-3"
            onPress={(event) => event.stopPropagation()}>
            <View className="mb-2 flex-row items-center justify-between">
              <Text className="text-base font-semibold text-slate-900">Chuyển tiếp tin nhắn</Text>
              <Pressable
                onPress={closeForwardPicker}
                className="h-8 w-8 items-center justify-center rounded-full bg-slate-100">
                <Text className="text-slate-600">x</Text>
              </Pressable>
            </View>
            <FlatList
              data={forwardTargets}
              keyExtractor={(item) => item.idConversation}
              ListEmptyComponent={
                <View className="py-8">
                  <Text className="text-center text-sm text-slate-500">
                    Không có cuộc trò chuyện để chuyển tiếp
                  </Text>
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
                    {item.type === 'GROUP' ? 'Nhóm' : 'Cá nhân'}
                  </Text>
                </Pressable>
              )}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
