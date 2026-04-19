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

const getDisplayFileName = (url?: string) => {
  if (!url) {
    return 'Tệp đính kèm';
  }
  const decoded = decodeURIComponent(url.split('?')[0] ?? '');
  const base = decoded.split('/').pop() || 'Tệp đính kèm';
  const stripped = base.replace(/^[0-9a-f]{8}-[0-9a-f-]{27,}[_-]?/i, '').trim();
  return stripped || base || 'Tệp đính kèm';
};

const getFileExt = (fileName: string) =>
  fileName.split('.').pop()?.toUpperCase().slice(0, 4) || 'FILE';

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
    <View className="mb-1 min-w-[170px] max-w-[250px] rounded-md border-l-2 border-sky-300 bg-sky-50 px-2 py-1.5">
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
      <View className="w-[210px] rounded-[16px] border border-sky-100 bg-sky-50 px-3 py-2.5">
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
        className={`rounded-[16px] px-3.5 py-2.5 ${
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
      <View className="max-w-[290px]">
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
              className="h-[220px] w-[260px]"
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
                    ? 'h-[110px] w-full overflow-hidden rounded-md'
                    : 'h-[110px] w-[126px] overflow-hidden rounded-md'
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
            <View className="h-[180px] w-[260px] items-center justify-center">
              <Ionicons name="play-circle" size={44} color="#fff" />
              <Text allowFontScaling={false} className="mt-2 text-sm text-white">
                Video
              </Text>
            </View>
          </Pressable>
        ) : null}

        {fileAttachment ? (
          <Pressable
            className="mt-1 min-w-[220px] max-w-[280px] flex-row items-center rounded-2xl border border-slate-200 bg-white px-3 py-2.5"
            onLongPress={beginAttachmentLongPress}
            delayLongPress={260}
            onPress={() => guardAttachmentPress(() => void openAttachmentUrl(fileAttachment.url))}>
            <View className="mr-3 h-11 w-11 items-center justify-center rounded-lg bg-blue-500">
              <Text allowFontScaling={false} className="text-[10px] font-bold text-white">
                {getFileExt(getDisplayFileName(fileAttachment.url))}
              </Text>
            </View>
            <View className="min-w-0 flex-1">
              <Text
                allowFontScaling={false}
                className="text-[13px] font-medium text-slate-900"
                numberOfLines={2}>
                {getDisplayFileName(fileAttachment.url)}
              </Text>
              <Text allowFontScaling={false} className="mt-0.5 text-[11px] text-slate-500">
                {fileAttachment.size || 'Nhấn để mở tệp'}
              </Text>
            </View>
          </Pressable>
        ) : null}

        {message.content?.trim() ? (
          <View
            className={`mt-1 rounded-[16px] px-3.5 py-2.5 ${
              isMine ? 'rounded-br-[8px] bg-[#c8ebfb]' : 'rounded-bl-[8px] bg-white'
            }`}>
            <Text allowFontScaling={false} className="text-[13px] text-slate-900">
              {message.content}
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

        <View className={`max-w-[80%] ${isMine ? 'items-end' : 'items-start'}`}>
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
