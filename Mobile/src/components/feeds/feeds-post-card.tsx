import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { Text, View } from 'react-native';

import { ConversationAvatar } from '@/components/messages/conversation-avatar';
import type { FeedPost } from '@/mock/feeds-data';

function GalleryStrip({ labels }: { labels: string[] }) {
  if (labels.length === 1) {
    return (
      <View className="mt-3 h-[190px] items-center justify-center rounded-2xl bg-slate-300">
        <Text allowFontScaling={false} className="text-[14px] text-slate-700">
          {labels[0]}
        </Text>
      </View>
    );
  }

  return (
    <View className="mt-3 flex-row">
      {labels.map((label) => (
        <View key={label} className="mr-2 h-[176px] flex-1 items-center justify-center rounded-2xl bg-slate-300">
          <Text allowFontScaling={false} className="text-[14px] text-slate-700">
            {label}
          </Text>
        </View>
      ))}
    </View>
  );
}

export function FeedsPostCard({ post }: { post: FeedPost }) {
  return (
    <View className="mt-2 bg-white px-5 py-4">
      <View className="flex-row items-center">
        <ConversationAvatar avatar={post.authorAvatar} />
        <View className="ml-3 flex-1">
          <Text allowFontScaling={false} className="text-[16px] font-semibold text-slate-900">
            {post.authorName}
          </Text>
          <Text allowFontScaling={false} className="text-[13px] text-slate-500">
            {post.timeLabel}
          </Text>
        </View>
        <Ionicons name="ellipsis-horizontal" size={22} color="#6b7280" />
      </View>

      {post.content ? (
        <Text allowFontScaling={false} className="mt-3 text-[16px] leading-6 text-slate-900">
          {post.content}
        </Text>
      ) : null}

      {post.galleryLabels ? <GalleryStrip labels={post.galleryLabels} /> : null}

      <View className="mt-3 flex-row">
        <View className="mr-2 rounded-full bg-slate-100 px-4 py-2">
          <Text allowFontScaling={false} className="text-[14px] text-slate-700">
            ♡ Thích
          </Text>
        </View>
        <View className="mr-2 rounded-full bg-slate-100 px-4 py-2">
          <Text allowFontScaling={false} className="text-[14px] text-slate-700">
            ❤️ {post.reactionCount}
          </Text>
        </View>
        <View className="rounded-full bg-slate-100 px-4 py-2">
          <Text allowFontScaling={false} className="text-[14px] text-slate-700">
            💬 {post.commentCount}
          </Text>
        </View>
      </View>
    </View>
  );
}