import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { Image, Linking, Pressable, Text, View } from 'react-native';

import { ConversationAvatar } from '@/components/messages/conversation-avatar';
import type { MockAvatar } from '@/mock/chat-conversations';
import type { MockChatMessage } from '@/mock/chat-thread-messages';
import {
  messagePreviewSnippetText,
  type MessagePreviewData,
} from '@/utils/chat-message-preview';

interface ChatMessageRowProps {
  message: MockChatMessage;
  otherAvatar: MockAvatar;
  otherAvatarUrl?: string | null;
  onOpenImageGallery?: (targetUrl: string) => void;
  onLongPressMessage?: (message: MockChatMessage) => void;
}

function StickerBlock({ url }: { url?: string }) {
  return (
    <View className="h-[142px] w-[118px] items-center justify-center overflow-hidden rounded-[18px] bg-[#e8ebf2]">
      {url ? (
        <Image source={{ uri: url }} className="h-full w-full" resizeMode="contain" />
      ) : (
        <>
          <Text allowFontScaling={false} className="text-[36px]">
            :)
          </Text>
          <Text allowFontScaling={false} className="-mt-2 text-[30px] font-semibold text-[#2f0d04]">
            ok
          </Text>
        </>
      )}
    </View>
  );
}

const UUID_FILE_PREFIX_REGEX =
  /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}[-_]+(.+)$/i;
const UUID_FILE_PREFIX_ANYWHERE_REGEX =
  /[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}[-_]+(.+)$/i;
const UUID_AT_START_REGEX =
  /^([0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12})(.*)$/i;
const LONG_HASH_PREFIX_REGEX = /^[0-9a-f]{20,}[-_]+(.+)$/i;
const ID_ONLY_FILENAME_REGEX = /^[0-9a-f-]{24,}(\.[a-z0-9]{1,8})?$/i;

const stripUuidPrefixFromFileName = (fileName: string) => {
  const normalized = fileName.trim();
  const directMatch = normalized.match(UUID_FILE_PREFIX_REGEX);
  if (directMatch?.[1]) {
    return directMatch[1].trim();
  }

  const anywhereMatch = normalized.match(UUID_FILE_PREFIX_ANYWHERE_REGEX);
  if (anywhereMatch?.[1]) {
    return anywhereMatch[1].trim();
  }

  const startsWithUuidMatch = normalized.match(UUID_AT_START_REGEX);
  if (startsWithUuidMatch) {
    const remainder = (startsWithUuidMatch[2] ?? '').replace(/^[-_]+/, '').trim();
    if (remainder) {
      return remainder;
    }
  }

  const longHashPrefixMatch = normalized.match(LONG_HASH_PREFIX_REGEX);
  if (longHashPrefixMatch?.[1]) {
    return longHashPrefixMatch[1].trim();
  }

  if (normalized.length > 37 && (normalized.charAt(36) === '-' || normalized.charAt(36) === '_')) {
    return normalized.substring(37).trim();
  }

  if (ID_ONLY_FILENAME_REGEX.test(normalized)) {
    const extensionMatch = normalized.match(/\.[a-z0-9]{1,8}$/i);
    return extensionMatch ? `file${extensionMatch[0]}` : 'file';
  }

  return normalized;
};

const getDisplayFileName = (url?: string) => {
  if (!url) {
    return 'Tệp đính kèm';
  }
  const withoutQuery = (url || '').split('?')[0].split('#')[0];
  const rawName = withoutQuery.split('/').pop() || 'file';
  let decoded = rawName;
  try {
    decoded = decodeURIComponent(rawName);
  } catch {
    decoded = rawName;
  }
  return stripUuidPrefixFromFileName(decoded);
};

const getFileExt = (fileName: string) => fileName.split('.').pop()?.toUpperCase().slice(0, 4) || 'FILE';

const normalizeCompareText = (value?: string) =>
  (value || '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ');

const extractFileNameFromFileMessage = (messageContent?: string) => {
  const original = (messageContent || '').trim();
  if (!original) {
    return null;
  }
  const normalized = normalizeCompareText(original);
  if (!(normalized.startsWith('da gui file:') || normalized.startsWith('da gui tep:'))) {
    return null;
  }
  const colonIndex = original.indexOf(':');
  if (colonIndex < 0 || colonIndex === original.length - 1) {
    return null;
  }
  const fileName = original.slice(colonIndex + 1).trim();
  return fileName ? stripUuidPrefixFromFileName(fileName) : null;
};

const isFilePlaceholderContent = (value?: string) => {
  const normalized = normalizeCompareText(value);
  if (!normalized) {
    return true;
  }
  if (normalized === '[tep]' || normalized === '[file]' || normalized === '[tap tin]') {
    return true;
  }
  if (normalized === 'da gui file' || normalized === 'da gui tep') {
    return true;
  }
  if (normalized.startsWith('da gui file:') || normalized.startsWith('da gui tep:')) {
    return true;
  }
  return false;
};

const isExtensionOnlyName = (value: string) => /^\.[a-z0-9]{1,8}$/i.test(value.trim());

type FileNameAwareAttachment = {
  url?: string;
  fileName?: string;
  filename?: string;
  originalName?: string;
  name?: string;
};

const getAttachmentNameHint = (attachment?: FileNameAwareAttachment | null) => {
  if (!attachment) {
    return '';
  }
  const candidate =
    attachment.fileName ||
    attachment.filename ||
    attachment.originalName ||
    attachment.name ||
    '';
  return candidate.trim() ? stripUuidPrefixFromFileName(candidate) : '';
};

const fallbackNameFromExtension = (fileName: string) => {
  const ext = fileName.split('.').pop()?.trim();
  if (!ext) {
    return 'Tệp đính kèm';
  }
  return `Tệp ${ext.toUpperCase()}`;
};

const resolveFileDisplayName = (
  attachment: FileNameAwareAttachment | undefined,
  messageContent?: string
) => {
  const fromMessage = extractFileNameFromFileMessage(messageContent);
  const fromAttachmentMeta = getAttachmentNameHint(attachment);
  const fromUrl = getDisplayFileName(attachment?.url);

  const candidate = fromMessage || fromAttachmentMeta || fromUrl || 'Tệp đính kèm';
  if (isExtensionOnlyName(candidate)) {
    return fallbackNameFromExtension(candidate);
  }
  return candidate;
};

const toFallback = (fullName?: string) => {
  const text = (fullName || '').trim();
  if (!text) {
    return 'U';
  }
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }
  return `${words[0][0] ?? ''}${words[words.length - 1][0] ?? ''}`.toUpperCase();
};

const openAttachmentUrl = async (url?: string) => {
  if (!url) {
    return;
  }
  const supported = await Linking.canOpenURL(url);
  if (supported) {
    await Linking.openURL(url);
  }
};

function ReplyPreview({ preview }: { preview?: MessagePreviewData | null }) {
  if (!preview) {
    return null;
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
    <View className="mb-1 min-w-[190px] max-w-[280px] rounded-md border-l-2 border-sky-300 bg-sky-50 px-2 py-1.5">
      <Text allowFontScaling={false} numberOfLines={1} className="text-[10.5px] font-semibold text-sky-700">
        {preview.senderName || 'Tin nhắn'}
      </Text>
      <View className="mt-1 flex-row items-center">
        {preview.kind !== 'text' ? (
          preview.thumbnailUrl ? (
            <Image
              source={{ uri: preview.thumbnailUrl }}
              className="mr-1.5 h-6 w-6 rounded bg-slate-200"
              resizeMode="cover"
            />
          ) : (
            <View className="mr-1.5 h-6 w-6 items-center justify-center rounded bg-slate-200">
              <Ionicons name={iconName} size={13} color="#475569" />
            </View>
          )
        ) : null}
        <Text allowFontScaling={false} numberOfLines={2} className="flex-1 text-[11px] text-slate-600">
          {messagePreviewSnippetText(preview)}
        </Text>
      </View>
    </View>
  );
}

export function ChatMessageRow({
  message,
  otherAvatar,
  otherAvatarUrl,
  onOpenImageGallery,
  onLongPressMessage,
}: ChatMessageRowProps) {
  const isMine = message.sender === 'me';
  const rowAvatar: MockAvatar = {
    type: 'initials',
    value: message.senderAvatarText || toFallback(message.senderName),
    backgroundColor: '#94a3b8',
  };
  const rowAvatarUrl = message.senderAvatarUrl ?? otherAvatarUrl ?? null;
  const attachments = message.attachments ?? [];
  const stickerAttachment = attachments.find(
    (attachment) => attachment.type === 'STICKER' || attachment.type === 'GIF'
  );
  const imageAttachments = attachments.filter((attachment) => attachment.type === 'IMAGE');
  const videoAttachment = attachments.find((attachment) => attachment.type === 'VIDEO');
  const fileAttachment = attachments.find(
    (attachment) => attachment.type === 'FILE' || attachment.type === 'AUDIO'
  );
  const hasAttachment = message.kind === 'attachment' || attachments.length > 0;
  const fileDisplayName = fileAttachment ? resolveFileDisplayName(fileAttachment, message.content) : undefined;
  const trimmedContent = message.content?.trim() || '';
  const shouldRenderCaption = fileAttachment
    ? Boolean(trimmedContent) && !isFilePlaceholderContent(trimmedContent)
    : Boolean(trimmedContent);
  const attachmentLongPressRef = React.useRef(false);
  const handleAttachmentLongPress = () => {
    onLongPressMessage?.(message);
  };
  const beginAttachmentLongPress = () => {
    attachmentLongPressRef.current = true;
    handleAttachmentLongPress();
  };
  const guardAttachmentPress = (openAction: () => void) => {
    if (attachmentLongPressRef.current) {
      attachmentLongPressRef.current = false;
      return;
    }
    openAction();
  };

  let messageBody: React.ReactNode = null;

  if (message.rawType === 'CALL') {
    messageBody = (
      <View className="w-[230px] rounded-[16px] border border-sky-100 bg-sky-50 px-3 py-2.5">
        <Text allowFontScaling={false} className="text-[12px] font-semibold text-slate-700">
          {message.content || 'Cuộc gọi'}
        </Text>
        <Text allowFontScaling={false} className="mt-0.5 text-[11px] text-slate-500">
          {message.timeLabel || ''}
        </Text>
        <Pressable className="mt-2 self-start rounded-full bg-sky-100 px-3 py-1">
          <Text allowFontScaling={false} className="text-[11px] font-semibold text-sky-700">
            GỌI LẠI
          </Text>
        </Pressable>
      </View>
    );
  } else if (message.kind === 'text' && !hasAttachment) {
    messageBody = (
      <View
        className={`min-w-[110px] rounded-[16px] px-3.5 py-2.5 ${
          message.replyPreview ? 'min-w-[180px]' : ''
        } ${isMine ? 'rounded-br-[8px] bg-[#c8ebfb]' : 'rounded-bl-[8px] bg-white'}`}>
        <ReplyPreview preview={message.replyPreview} />
        <Text allowFontScaling={false} className="text-[13px] text-slate-900">
          {message.recalled ? 'Tin nhắn đã thu hồi' : message.content}
        </Text>
        {message.timeLabel ? (
          <Text allowFontScaling={false} className="mt-1 text-[10px] text-slate-400">
            {message.timeLabel}
          </Text>
        ) : null}
      </View>
    );
  } else if (message.kind === 'sticker') {
    messageBody = (
      <View className="flex-row items-end">
        {message.showDownloadButton ? (
          <View className="mr-2 h-10 w-10 items-center justify-center rounded-full bg-white">
            <Ionicons name="download-outline" size={22} color="#111827" />
          </View>
        ) : null}
        <StickerBlock url={stickerAttachment?.url} />
      </View>
    );
  } else {
    messageBody = (
      <View className="max-w-[320px]">
        <ReplyPreview preview={message.replyPreview} />

        {imageAttachments.length === 1 ? (
          <Pressable
            className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
            onLongPress={beginAttachmentLongPress}
            delayLongPress={260}
            onPress={() =>
              guardAttachmentPress(() => {
                const url = imageAttachments[0]?.url;
                if (!url) {
                  return;
                }
                if (onOpenImageGallery) {
                  onOpenImageGallery(url);
                  return;
                }
                void openAttachmentUrl(url);
              })
            }>
            <Image
              source={{ uri: imageAttachments[0]?.url }}
              className="h-[230px] w-[280px]"
              resizeMode="cover"
            />
          </Pressable>
        ) : null}

        {imageAttachments.length > 1 ? (
          <View className="flex-row flex-wrap gap-1 overflow-hidden rounded-2xl border border-slate-200 bg-white p-1">
            {imageAttachments.slice(0, 4).map((attachment, index) => (
              <Pressable
                key={`${attachment.url}-${index}`}
                className={
                  imageAttachments.length === 3 && index === 0
                    ? 'h-[118px] w-full overflow-hidden rounded-md'
                    : 'h-[118px] w-[136px] overflow-hidden rounded-md'
                }
                onLongPress={beginAttachmentLongPress}
                delayLongPress={260}
                onPress={() =>
                  guardAttachmentPress(() => {
                    if (onOpenImageGallery) {
                      onOpenImageGallery(attachment.url);
                      return;
                    }
                    void openAttachmentUrl(attachment.url);
                  })
                }>
                <Image source={{ uri: attachment.url }} className="h-full w-full" resizeMode="cover" />
                {index === 3 && imageAttachments.length > 4 ? (
                  <View className="absolute inset-0 items-center justify-center bg-black/50">
                    <Text allowFontScaling={false} className="text-xl font-semibold text-white">
                      +{imageAttachments.length - 4}
                    </Text>
                  </View>
                ) : null}
              </Pressable>
            ))}
          </View>
        ) : null}

        {videoAttachment ? (
          <Pressable
            className="mt-1 overflow-hidden rounded-2xl border border-slate-200 bg-slate-900"
            onLongPress={beginAttachmentLongPress}
            delayLongPress={260}
            onPress={() => guardAttachmentPress(() => void openAttachmentUrl(videoAttachment.url))}>
            <View className="h-[190px] w-[280px] items-center justify-center">
              <Ionicons name="play-circle" size={44} color="#fff" />
              <Text allowFontScaling={false} className="mt-2 text-sm text-white">
                Video
              </Text>
            </View>
          </Pressable>
        ) : null}

        {fileAttachment ? (
          <Pressable
            className="mt-1 w-[268px] flex-row items-center rounded-2xl border border-slate-200 bg-white px-3 py-2.5"
            onLongPress={beginAttachmentLongPress}
            delayLongPress={260}
            onPress={() => guardAttachmentPress(() => void openAttachmentUrl(fileAttachment.url))}>
            <View className="mr-3 h-12 w-12 items-center justify-center rounded-xl bg-blue-500">
              <Text allowFontScaling={false} className="text-[10px] font-bold text-white">
                {getFileExt(fileDisplayName || getDisplayFileName(fileAttachment.url))}
              </Text>
            </View>
            <View className="min-w-0 flex-1">
              <Text
                allowFontScaling={false}
                className="text-[13px] font-semibold text-slate-900"
                numberOfLines={2}>
                {fileDisplayName || getDisplayFileName(fileAttachment.url)}
              </Text>
              <Text allowFontScaling={false} className="mt-0.5 text-[11px] text-slate-500">
                {fileAttachment.size || 'Nhấn để mở tệp'}
              </Text>
            </View>
          </Pressable>
        ) : null}

        {shouldRenderCaption ? (
          <View
            className={`mt-1 min-w-[110px] rounded-[16px] px-3.5 py-2.5 ${
              isMine ? 'rounded-br-[8px] bg-[#c8ebfb]' : 'rounded-bl-[8px] bg-white'
            }`}>
            <Text allowFontScaling={false} className="text-[13px] text-slate-900">
              {trimmedContent}
            </Text>
          </View>
        ) : null}

        {message.timeLabel ? (
          <Text allowFontScaling={false} className="mt-1 text-[10px] text-slate-400">
            {message.timeLabel}
          </Text>
        ) : null}
      </View>
    );
  }

  return (
    <View className={`px-3 ${isMine ? 'items-end' : 'items-start'}`}>
      <View className={`flex-row items-end ${isMine ? 'justify-end' : 'justify-start'}`}>
        {!isMine && (
          <View className="mr-2 w-[30px] items-center">
            {message.showAvatar ? (
              <ConversationAvatar avatar={rowAvatar || otherAvatar} avatarUrl={rowAvatarUrl} size={30} />
            ) : null}
          </View>
        )}

        <View className={`max-w-[86%] ${isMine ? 'items-end' : 'items-start'}`}>
          {!isMine && message.senderName ? (
            <Text allowFontScaling={false} className="mb-1 ml-1 text-[11px] font-medium text-slate-500">
              {message.senderName}
            </Text>
          ) : null}

          <Pressable
            disabled={!onLongPressMessage}
            onLongPress={() => onLongPressMessage?.(message)}
            delayLongPress={280}>
            {messageBody}
          </Pressable>

          {(message.kind === 'text' || message.kind === 'attachment') && (message.pinned || message.statusText) ? (
            <View className={`mt-1 w-full ${isMine ? 'items-end' : 'items-start'}`}>
              {message.pinned ? (
                <View className="mb-1 flex-row items-center rounded-full bg-amber-100 px-2 py-[2px]">
                  <Ionicons name="pin" size={11} color="#b45309" />
                  <Text allowFontScaling={false} className="ml-1 text-[10px] font-medium text-amber-700">
                    Đã ghim
                  </Text>
                </View>
              ) : null}
              {isMine && message.statusText ? (
                <Text allowFontScaling={false} className="text-[11px] text-slate-500">
                  {message.statusText}
                </Text>
              ) : null}
            </View>
          ) : null}

          {(message.reactionSummary?.length ?? 0) > 0 && (message.reactionTotal ?? 0) > 0 ? (
            <View className="-mt-1 ml-2 inline-flex flex-row items-center rounded-full border border-slate-200 bg-white px-2 py-[1px]">
              <Text allowFontScaling={false} className="text-[12px] text-slate-700">
                {message.reactionSummary?.map((item) => item.emoji).join(' ')}
              </Text>
              <Text allowFontScaling={false} className="ml-1 text-[11px] text-slate-500">
                {message.reactionTotal}
              </Text>
            </View>
          ) : null}

          {message.kind === 'sticker' && (message.timeLabel || message.statusText || message.pinned) ? (
            <View className="mt-2 items-end">
              {message.timeLabel ? (
                <View className="rounded-full bg-slate-300 px-3 py-[1px]">
                  <Text allowFontScaling={false} className="text-[12px] text-white">
                    {message.timeLabel}
                  </Text>
                </View>
              ) : null}
              {message.statusText ? (
                <View className="mt-1 rounded-full bg-slate-300 px-3 py-[1px]">
                  <Text allowFontScaling={false} className="text-[12px] text-white">
                    {message.statusText}
                  </Text>
                </View>
              ) : null}
              {message.pinned ? (
                <View className="mt-1 rounded-full bg-amber-100 px-3 py-[1px]">
                  <Text allowFontScaling={false} className="text-[11px] font-medium text-amber-700">
                    Đã ghim
                  </Text>
                </View>
              ) : null}
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}
