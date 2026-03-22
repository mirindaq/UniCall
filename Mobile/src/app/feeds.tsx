import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ConversationAvatar } from '@/components/messages/conversation-avatar';
import { MessagesBottomTabs } from '@/components/messages/messages-bottom-tabs';
import { AppStatusBarBlue } from '@/components/ui/app-status-bar-blue';
import { feedComposerActions, feedPosts, type FeedPost } from '@/mock/feeds-data';

function FeedsHeader() {
  return (
    <View className="bg-[#1e98f3] px-5 pb-3.5 pt-2">
      <View className="flex-row items-center">
        <View className="mr-2 h-10 w-10 items-center justify-center rounded-full">
          <Ionicons name="search-outline" size={28} color="#ffffff" />
        </View>
        <Text allowFontScaling={false} className="flex-1 text-[18px] text-sky-100">
          Tìm kiếm
        </Text>
        <View className="h-10 w-10 items-center justify-center rounded-full">
          <Ionicons name="images-outline" size={26} color="#ffffff" />
        </View>
        <View className="h-10 w-10 items-center justify-center rounded-full">
          <Ionicons name="notifications-outline" size={25} color="#ffffff" />
        </View>
      </View>
    </View>
  );
}

function ComposerCard() {
  return (
    <View className="bg-white pb-3">
      <View className="flex-row items-center px-5 py-4">
        <ConversationAvatar avatar={{ type: 'initials', value: 'U', backgroundColor: '#111827' }} />
        <Text allowFontScaling={false} className="ml-4 text-[16px] text-slate-400">
          Hôm nay bạn thế nào?
        </Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-4">
        {feedComposerActions.map((action) => (
          <Pressable key={action} className="mr-3 rounded-full bg-slate-100 px-5 py-2.5">
            <Text allowFontScaling={false} className="text-[15px] text-slate-900">
              {action}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

function MomentsCard() {
  return (
    <View className="mt-2 bg-white px-5 py-4">
      <Text allowFontScaling={false} className="text-[15px] font-semibold text-slate-900">
        Khoảnh khắc
      </Text>
      <View className="mt-3 h-[132px] w-[102px] items-center justify-end rounded-2xl bg-slate-800 pb-3">
        <View className="absolute top-8 h-[42px] w-[42px] items-center justify-center rounded-full border-2 border-white bg-black/30">
          <Ionicons name="add" size={26} color="#ffffff" />
        </View>
        <Text allowFontScaling={false} className="text-[15px] text-white">
          Tạo mới
        </Text>
      </View>
    </View>
  );
}

function GalleryStrip({ labels }: { labels: string[] }) {
  if (labels.length === 1) {
    return (
      <View className="mt-3 h-[190px] rounded-2xl bg-slate-300 items-center justify-center">
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

function PostCard({ post }: { post: FeedPost }) {
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

export default function FeedsScreen() {
  return (
    <View className="flex-1 bg-[#f3f4f6]">
      <AppStatusBarBlue />
      <SafeAreaView edges={['top']} className="bg-[#1e98f3]" />
      <FeedsHeader />

      <ScrollView className="flex-1 bg-[#f3f4f6]" showsVerticalScrollIndicator={false}>
        <View className="border-b border-slate-200 bg-white px-5 py-3">
          <Text allowFontScaling={false} className="text-[18px] font-semibold text-slate-900">
            Nhật Ký
          </Text>
          <View className="mt-2 h-[3px] w-[76px] rounded-full bg-slate-900" />
        </View>

        <ComposerCard />
        <MomentsCard />
        {feedPosts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </ScrollView>

      <MessagesBottomTabs activeTab="feeds" />
      <SafeAreaView edges={['bottom']} className="bg-white" />
    </View>
  );
}
