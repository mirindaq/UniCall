import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { Alert, Image, Pressable, Text, TextInput, View } from 'react-native';

import { ConversationAvatar } from '@/components/messages/conversation-avatar';
import type { PostResponse } from '@/types/post.type';

interface FeedPostCardItem extends PostResponse {
  authorName: string;
  authorAvatar?: string | null;
}

interface FeedsPostCardProps {
  post: FeedPostCardItem;
  commentInput?: string;
  isReacting?: boolean;
  onChangeCommentInput?: (value: string) => void;
  onToggleLike?: () => void;
  onSubmitComment?: () => void;
}

export function FeedsPostCard({
  post,
  commentInput = '',
  isReacting = false,
  onChangeCommentInput = () => undefined,
  onToggleLike = () => undefined,
  onSubmitComment = () => undefined,
}: FeedsPostCardProps) {
  const normalizedCommentInput = typeof commentInput === 'string' ? commentInput : '';
  const isCommentSubmitDisabled = normalizedCommentInput.trim().length === 0;
  const createdAtLabel = post.createdAt ? new Date(post.createdAt).toLocaleString('vi-VN') : '';
  const firstMedia = post.mediaUrls?.[0];

  return (
    <View className="mt-2 bg-white px-5 py-4">
      <View className="flex-row items-center">
        <ConversationAvatar
          avatar={{ type: 'initials', value: 'U', backgroundColor: '#94a3b8' }}
          avatarUrl={post.authorAvatar}
        />
        <View className="ml-3 flex-1">
          <Text allowFontScaling={false} className="text-[16px] font-semibold text-slate-900">
            {post.authorName}
          </Text>
          <Text allowFontScaling={false} className="text-[13px] text-slate-500">
            {createdAtLabel}
          </Text>
        </View>
      </View>

      {post.content ? (
        <Text allowFontScaling={false} className="mt-3 text-[15px] leading-6 text-slate-900">
          {post.content}
        </Text>
      ) : null}

      {firstMedia ? (
        <Pressable
          onPress={() => Alert.alert('Media', 'Hiện mobile đang hiển thị ảnh/video đầu tiên của bài viết.')}
          className="mt-3 overflow-hidden rounded-2xl bg-slate-200">
          <Image source={{ uri: firstMedia }} className="h-[220px] w-full" resizeMode="cover" />
        </Pressable>
      ) : null}

      <View className="mt-3 flex-row">
        <Pressable
          disabled={isReacting}
          onPress={onToggleLike}
          className={`mr-2 rounded-full px-4 py-2 ${post.isLikedByCurrentUser ? 'bg-blue-100' : 'bg-slate-100'}`}>
          <Text allowFontScaling={false} className={`text-[14px] ${post.isLikedByCurrentUser ? 'text-blue-700' : 'text-slate-700'}`}>
            {post.isLikedByCurrentUser ? 'Đã thích' : 'Thích'}
          </Text>
        </Pressable>
        <View className="mr-2 rounded-full bg-slate-100 px-4 py-2">
          <Text allowFontScaling={false} className="text-[14px] text-slate-700">
            ❤️ {post.likeCount}
          </Text>
        </View>
        <View className="rounded-full bg-slate-100 px-4 py-2">
          <Text allowFontScaling={false} className="text-[14px] text-slate-700">
            💬 {post.commentCount}
          </Text>
        </View>
      </View>

      <View className="mt-3 flex-row items-center">
        <TextInput
          value={normalizedCommentInput}
          onChangeText={onChangeCommentInput}
          placeholder="Viết bình luận..."
          placeholderTextColor="#9ca3af"
          className="flex-1 rounded-full bg-slate-100 px-4 py-2.5 text-[14px] text-slate-900"
        />
        <Pressable
          onPress={onSubmitComment}
          className="ml-2 rounded-full bg-slate-800 p-2.5"
          disabled={isCommentSubmitDisabled}>
          <Ionicons name="send" size={14} color="#ffffff" />
        </Pressable>
      </View>
    </View>
  );
}
