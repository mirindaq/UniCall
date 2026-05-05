import type { MockAvatar } from './chat-conversations';
import type { ChatAttachment, MessageType } from '@/types/chat';
import type {
  MessagePreviewData,
  MessageReactionSummaryItem,
} from '@/utils/chat-message-preview';

export type MockMessageSender = 'me' | 'other';
export type MockMessageKind = 'text' | 'sticker' | 'attachment';

export interface MockChatMessage {
  id: string;
  sender: MockMessageSender;
  kind: MockMessageKind;
  content: string;
  rawType?: MessageType;
  attachments?: ChatAttachment[];
  recalled?: boolean;
  replyPreview?: MessagePreviewData;
  replyPreviewText?: string;
  senderName?: string;
  senderAvatarUrl?: string | null;
  senderAvatarText?: string;
  timeLabel?: string;
  showAvatar?: boolean;
  reactionSummary?: MessageReactionSummaryItem[];
  reactionTotal?: number;
  reaction?: string;
  showDownloadButton?: boolean;
  pinned?: boolean;
  statusText?: string;
  callActionLabel?: string;
  callActionDisabled?: boolean;
}

export interface MockChatThread {
  conversationId: string;
  title: string;
  avatar: MockAvatar;
  messages: MockChatMessage[];
  inputPlaceholder?: string;
}

const hungThread: MockChatThread = {
  conversationId: 'hung',
  title: 'Nguyễn Đức Hùng',
  avatar: {
    type: 'initials',
    value: 'H',
    backgroundColor: '#3f5f4f',
  },
  inputPlaceholder: 'Tin nhắn',
  messages: [
    { id: 'm1', sender: 'other', kind: 'text', content: 'R', showAvatar: true },
    { id: 'm2', sender: 'other', kind: 'text', content: 'Thi hồi sáng' },
    { id: 'm3', sender: 'other', kind: 'text', content: 'Áp chót lớp' },
    { id: 'm4', sender: 'other', kind: 'text', content: 'Nhưng mà vẫn qua kk', timeLabel: '12:56' },
    { id: 'm5', sender: 'me', kind: 'text', content: ':)))' },
    { id: 'm6', sender: 'me', kind: 'text', content: 'Sao phong độ thất thường z' },
    { id: 'm7', sender: 'me', kind: 'text', content: 'Th tụi m chơi đi' },
    { id: 'm8', sender: 'me', kind: 'text', content: 'Còn chơi lâu ko t chs vs nè :)))', timeLabel: '12:57' },
    { id: 'm9', sender: 'other', kind: 'text', content: 'Tụi t chơi lol r', showAvatar: true, timeLabel: '12:59', reaction: '♡' },
    {
      id: 'm10',
      sender: 'me',
      kind: 'sticker',
      content: 'OK',
      showDownloadButton: true,
      timeLabel: '13:09',
      statusText: 'Đã nhận',
    },
  ],
};

const defaultThread: MockChatThread = {
  conversationId: 'default',
  title: 'Cuộc trò chuyện',
  avatar: {
    type: 'initials',
    value: 'C',
    backgroundColor: '#94a3b8',
  },
  inputPlaceholder: 'Tin nhắn',
  messages: [
    { id: 'd1', sender: 'other', kind: 'text', content: 'Chào bạn, đây là hội thoại mock.', showAvatar: true, timeLabel: '09:20' },
    { id: 'd2', sender: 'me', kind: 'text', content: 'Ok, mình đã vào được trang chat.', timeLabel: '09:21', statusText: 'Đã nhận' },
  ],
};

export const mockChatThreads: Record<string, MockChatThread> = {
  hung: hungThread,
};

export const getMockChatThread = (conversationId: string): MockChatThread => {
  return mockChatThreads[conversationId] ?? defaultThread;
};

