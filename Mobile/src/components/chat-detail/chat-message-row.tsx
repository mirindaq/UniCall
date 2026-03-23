import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { Text, View } from 'react-native';

import type { MockAvatar } from '@/mock/chat-conversations';
import type { MockChatMessage } from '@/mock/chat-thread-messages';

interface ChatMessageRowProps {
  message: MockChatMessage;
  otherAvatar: MockAvatar;
}

function MiniAvatar({ avatar }: { avatar: MockAvatar }) {
  const textColor = avatar.textColor ?? '#ffffff';

  return (
    <View className="h-[30px] w-[30px] items-center justify-center rounded-full" style={{ backgroundColor: avatar.backgroundColor }}>
      <Text
        allowFontScaling={false}
        className={avatar.type === 'emoji' ? 'text-[14px]' : 'text-[13px] font-semibold'}
        style={{ color: textColor }}>
        {avatar.value}
      </Text>
    </View>
  );
}

function StickerBlock() {
  return (
    <View className="h-[142px] w-[118px] items-center justify-center rounded-[18px] bg-[#e8ebf2]">
      <Text allowFontScaling={false} className="text-[36px]">
        🐱
      </Text>
      <Text allowFontScaling={false} className="-mt-2 text-[30px] font-semibold text-[#2f0d04]">
        ok
      </Text>
    </View>
  );
}

export function ChatMessageRow({ message, otherAvatar }: ChatMessageRowProps) {
  const isMine = message.sender === 'me';

  return (
    <View className={`px-3 ${isMine ? 'items-end' : 'items-start'}`}>
      <View className={`flex-row items-end ${isMine ? 'justify-end' : 'justify-start'}`}>
        {!isMine ? (
          <View className="mr-2 w-[30px] items-center">
            {message.showAvatar ? <MiniAvatar avatar={otherAvatar} /> : null}
          </View>
        ) : null}

        <View className={`max-w-[80%] ${isMine ? 'items-end' : 'items-start'}`}>
          {message.kind === 'text' ? (
            <View
              className={`rounded-[16px] px-3.5 py-2.5 ${
                isMine ? 'bg-[#c8ebfb] rounded-br-[8px]' : 'bg-white rounded-bl-[8px]'
              }`}>
              <Text allowFontScaling={false} className="text-[13px] text-slate-900">
                {message.content}
              </Text>
              {message.timeLabel ? (
                <Text allowFontScaling={false} className="mt-1 text-[10px] text-slate-400">
                  {message.timeLabel}
                </Text>
              ) : null}
            </View>
          ) : (
            <View className="flex-row items-end">
              {message.showDownloadButton ? (
                <View className="mr-2 h-10 w-10 items-center justify-center rounded-full bg-white">
                  <Ionicons name="download-outline" size={22} color="#111827" />
                </View>
              ) : null}
              <StickerBlock />
            </View>
          )}

          {message.reaction ? (
            <View className="-mt-2 ml-2 h-8 w-8 items-center justify-center rounded-full bg-white">
              <Text allowFontScaling={false} className="text-[20px] text-slate-700">
                {message.reaction}
              </Text>
            </View>
          ) : null}

          {message.kind === 'sticker' && (message.timeLabel || message.statusText) ? (
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
                    ✓✓ {message.statusText}
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
