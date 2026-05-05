import type { ChatAttachment, ChatMessageResponse } from '@/types/chat';

export type MessagePreviewKind =
  | 'text'
  | 'call'
  | 'image'
  | 'video'
  | 'audio'
  | 'file'
  | 'gif'
  | 'sticker'
  | 'link';

export type MessageReactionSummaryItem = {
  emoji: string;
  count: number;
};

export type MessagePreviewData = {
  text: string;
  kind: MessagePreviewKind;
  mediaLabel?: string;
  thumbnailUrl?: string;
  fileExt?: string;
  hasCustomText: boolean;
  senderName?: string;
};

type PreviewSource = Pick<
  ChatMessageResponse,
  'type' | 'content' | 'attachments' | 'recalled'
>;

const getAttachmentFileName = (url?: string) => {
  if (!url) {
    return '';
  }
  try {
    const decoded = decodeURIComponent(url.split('?')[0] ?? '');
    return decoded.split('/').pop() || '';
  } catch {
    return '';
  }
};

const toAttachmentExt = (attachment?: ChatAttachment) => {
  const fileName = getAttachmentFileName(attachment?.url);
  if (!fileName) {
    return 'FILE';
  }
  return fileName.split('.').pop()?.toUpperCase().slice(0, 4) || 'FILE';
};

export const buildMessagePreviewData = (
  message: PreviewSource,
  senderName?: string
): MessagePreviewData => {
  const content = message.content ?? '';
  const normalizedContent = content.trim();
  const firstAttachment = message.attachments?.[0];

  if (message.recalled) {
    return {
      senderName,
      text: normalizedContent || 'Tin nhắn đã thu hồi',
      kind: 'text',
      hasCustomText: normalizedContent.length > 0,
    };
  }

  if (message.type === 'CALL') {
    return {
      senderName,
      text: 'Cuộc gọi',
      kind: 'call',
      mediaLabel: 'Cuộc gọi',
      hasCustomText: false,
    };
  }

  if (message.type === 'TEXT' && !firstAttachment) {
    return {
      senderName,
      text: normalizedContent || 'Tin nhắn',
      kind: 'text',
      hasCustomText: normalizedContent.length > 0,
    };
  }

  if (firstAttachment?.type === 'STICKER') {
    return {
      senderName,
      text: normalizedContent || '[Sticker]',
      kind: 'sticker',
      mediaLabel: 'Sticker',
      thumbnailUrl: firstAttachment.url,
      hasCustomText: normalizedContent.length > 0,
    };
  }

  if (firstAttachment?.type === 'GIF') {
    return {
      senderName,
      text: normalizedContent || '[GIF]',
      kind: 'gif',
      mediaLabel: 'GIF',
      thumbnailUrl: firstAttachment.url,
      hasCustomText: normalizedContent.length > 0,
    };
  }

  if (firstAttachment?.type === 'LINK') {
    const linkText = firstAttachment.url || normalizedContent || '[Liên kết]';
    return {
      senderName,
      text: linkText,
      kind: 'link',
      mediaLabel: 'Liên kết',
      hasCustomText: linkText !== '[Liên kết]',
    };
  }

  if (firstAttachment?.type === 'IMAGE') {
    return {
      senderName,
      text: normalizedContent || 'Đã gửi ảnh',
      kind: 'image',
      mediaLabel: 'Hình ảnh',
      thumbnailUrl: firstAttachment.url,
      hasCustomText: normalizedContent.length > 0,
    };
  }

  if (firstAttachment?.type === 'VIDEO') {
    return {
      senderName,
      text: normalizedContent || 'Đã gửi video',
      kind: 'video',
      mediaLabel: 'Video',
      thumbnailUrl: firstAttachment.url,
      hasCustomText: normalizedContent.length > 0,
    };
  }

  if (firstAttachment?.type === 'AUDIO') {
    return {
      senderName,
      text: normalizedContent || 'Đã gửi âm thanh',
      kind: 'audio',
      mediaLabel: 'Âm thanh',
      hasCustomText: normalizedContent.length > 0,
    };
  }

  if (firstAttachment?.type === 'FILE') {
    return {
      senderName,
      text: normalizedContent || 'Đã gửi tệp',
      kind: 'file',
      mediaLabel: 'Tệp',
      fileExt: toAttachmentExt(firstAttachment),
      hasCustomText: normalizedContent.length > 0,
    };
  }

  if (firstAttachment?.type) {
    return {
      senderName,
      text: normalizedContent || `[${firstAttachment.type}]`,
      kind: 'text',
      mediaLabel: firstAttachment.type,
      hasCustomText: normalizedContent.length > 0,
    };
  }

  return {
    senderName,
    text: normalizedContent || 'Tin nhắn',
    kind: 'text',
    hasCustomText: normalizedContent.length > 0,
  };
};

export const messagePreviewSnippetText = (preview: MessagePreviewData) => {
  if (!preview.mediaLabel) {
    return preview.text;
  }
  if (preview.hasCustomText) {
    return `[${preview.mediaLabel}] ${preview.text}`;
  }
  return `[${preview.mediaLabel}]`;
};

export const summarizeMessageReactions = (
  message: Pick<ChatMessageResponse, 'reactionStacks' | 'reactions'>
): { items: MessageReactionSummaryItem[]; total: number } => {
  const stacks = message.reactionStacks ?? {};
  const hasStacks = Object.keys(stacks).length > 0;
  const flattened = hasStacks
    ? Object.values(stacks)
        .flat()
        .filter((reaction): reaction is string => Boolean(reaction?.trim()))
    : Object.values(message.reactions ?? {}).filter((reaction): reaction is string =>
        Boolean(reaction?.trim())
      );

  const counts = flattened.reduce<Record<string, number>>((acc, reaction) => {
    acc[reaction] = (acc[reaction] ?? 0) + 1;
    return acc;
  }, {});

  const items = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([emoji, count]) => ({ emoji, count }));

  return {
    items,
    total: flattened.length,
  };
};

export const DEFAULT_CHAT_GIFS = [
  'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExYjV2Nm9nYzNod2VwM2lydjI5dGVvMWhqb3U3ZGpmMmlyMW5ib2hkZSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/xT9IgG50Fb7Mi0prBC/giphy.gif',
  'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExYjV2Nm9nYzNod2VwM2lydjI5dGVvMWhqb3U3ZGpmMmlyMW5ib2hkZSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/l0HUpt2s9Pclgt9Vm/giphy.gif',
  'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExYjV2Nm9nYzNod2VwM2lydjI5dGVvMWhqb3U3ZGpmMmlyMW5ib2hkZSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/26ufdipQqU2lhNA4g/giphy.gif',
  'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExYjV2Nm9nYzNod2VwM2lydjI5dGVvMWhqb3U3ZGpmMmlyMW5ib2hkZSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/3o7aD2saalBwwftBIY/giphy.gif',
];

export const QUICK_MESSAGE_REACTIONS = ['❤️', '👍', '😆', '😮', '😭', '😡'] as const;
