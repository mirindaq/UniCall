import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { MockAvatar } from '@/mock/chat-conversations';
import type { ProfilePost, UserProfileData } from '@/mock/user-profile-data';

import { UserProfileTopBar } from './user-profile-top-bar';

function AvatarView({ avatar, size = 124 }: { avatar: MockAvatar; size?: number }) {
  const textColor = avatar.textColor ?? '#ffffff';
  return (
    <View className="items-center justify-center rounded-full border-4 border-white" style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: avatar.backgroundColor }}>
      <Text allowFontScaling={false} className={avatar.type === 'emoji' ? 'text-[40px]' : 'text-[34px] font-semibold'} style={{ color: textColor }}>
        {avatar.value}
      </Text>
    </View>
  );
}

function ShortcutRow({ shortcuts }: { shortcuts: UserProfileData['shortcuts'] }) {
  if (shortcuts.length === 0) return null;

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-4 px-5" contentContainerClassName="pr-5">
      {shortcuts.map((item) => (
        <View key={item.id} className="mr-3 min-w-[160px] flex-row items-center rounded-2xl bg-white px-4 py-3">
          <Ionicons name={item.icon} size={20} color="#1e98f3" />
          <Text allowFontScaling={false} className="ml-2 text-[15px] text-slate-900">
            {item.label}
            {item.countText ? ` ${item.countText}` : ''}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}

function PostCard({ post }: { post: ProfilePost }) {
  return (
    <View className="mt-3 px-5">
      <Text allowFontScaling={false} className="mb-2 self-start rounded-lg bg-slate-200 px-3 py-1.5 text-[14px] font-semibold text-slate-800">
        {post.dateLabel}
      </Text>

      <View className="rounded-2xl bg-white p-4">
        <Text allowFontScaling={false} className="text-[16px] text-slate-900">
          {post.caption}
        </Text>

        <View className="mt-3 flex-row">
          {post.imageLabels.map((label) => (
            <View key={label} className="mr-1.5 h-[96px] flex-1 items-center justify-center bg-slate-300">
              <Text allowFontScaling={false} className="text-[13px] text-slate-700">
                {label}
              </Text>
            </View>
          ))}
        </View>

        <View className="mt-3 flex-row items-center">
          <Text allowFontScaling={false} className="text-[14px] text-slate-600">
            ❤️ {post.reactionText}
          </Text>
          <Text allowFontScaling={false} className="ml-auto text-[14px] text-slate-600">
            {post.commentText}
          </Text>
        </View>

        <View className="mt-3 flex-row">
          <View className="mr-2 rounded-full bg-slate-100 px-4 py-2">
            <Text allowFontScaling={false} className="text-[14px] text-slate-800">♡ Thích</Text>
          </View>
          <View className="mr-2 rounded-full bg-slate-100 px-4 py-2">
            <Text allowFontScaling={false} className="text-[14px] text-slate-800">💬</Text>
          </View>
          <View className="ml-auto rounded-full bg-slate-100 px-4 py-2">
            <Text allowFontScaling={false} className="text-[14px] text-slate-800">⋯</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

function EmptyState({ profile }: { profile: UserProfileData }) {
  if (profile.isSelf) {
    return (
      <View className="mt-8 items-center px-8 pb-10">
        <View className="h-[110px] w-[110px] items-center justify-center rounded-full bg-slate-200">
          <Text allowFontScaling={false} className="text-[44px]">📱</Text>
        </View>
        <Text allowFontScaling={false} className="mt-6 text-center text-[22px] font-semibold text-slate-900">
          Hôm nay {profile.name} có gì vui?
        </Text>
        <Text allowFontScaling={false} className="mt-3 text-center text-[18px] leading-7 text-slate-400">
          Đây là Nhật ký của bạn - Hãy lấp đầy Nhật ký với những dấu ấn cuộc đời và kỷ niệm đáng nhớ nhé!
        </Text>
        <Pressable className="mt-8 rounded-full bg-[#1e66ef] px-10 py-3.5">
          <Text allowFontScaling={false} className="text-[20px] font-semibold text-white">Đăng lên Nhật ký</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="mt-14 px-8">
      <Text allowFontScaling={false} className="text-center text-[18px] leading-7 text-slate-500">
        {profile.name} chưa có hoạt động nào. Hãy trò chuyện để hiểu nhau hơn.
      </Text>
    </View>
  );
}

interface UserProfileScreenProps {
  profile: UserProfileData;
  showBottomTabs?: boolean;
  bottomTabs?: React.ReactNode;
  onBack: () => void;
}

const COVER_HEIGHT = 260;
const AVATAR_SIZE = 124;

export function UserProfileScreen({ profile, showBottomTabs = false, bottomTabs, onBack }: UserProfileScreenProps) {
  const hasPosts = profile.posts.length > 0;

  return (
    <View className="flex-1 bg-[#ececf3]">
      <View className="relative" style={{ height: COVER_HEIGHT }}>
        <SafeAreaView edges={['top']} className="absolute left-0 right-0 top-0 z-10" />

        <View className="h-full" style={{ backgroundColor: profile.coverTone }}>
          <View className="h-full items-center justify-center">
            <Text allowFontScaling={false} className="text-[20px] font-semibold text-white/85">
              {profile.coverTitle}
            </Text>
          </View>
        </View>

        <UserProfileTopBar title={hasPosts ? profile.name : ''} dark onBack={onBack} />

        <View className="absolute left-0 right-0 items-center" style={{ top: COVER_HEIGHT - AVATAR_SIZE / 2, zIndex: 30 }}>
          <AvatarView avatar={profile.avatar} size={AVATAR_SIZE} />
          {profile.statusBubble ? (
            <View className="absolute right-8 top-2 rounded-2xl bg-white px-4 py-2">
              <Text allowFontScaling={false} className="text-[14px] text-slate-500">
                {profile.statusBubble}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerClassName="pb-12" contentContainerStyle={{ paddingTop: AVATAR_SIZE / 2 + 20 }}>
        <View className="items-center px-5">
          <Text allowFontScaling={false} className="text-center text-[28px] font-semibold text-slate-900">
            {profile.name}
          </Text>

          {profile.isSelf ? (
            <Text allowFontScaling={false} className="mt-2.5 text-[17px] text-[#1e66ef]">
              ✎  Cập nhật giới thiệu bản thân
            </Text>
          ) : null}
        </View>

        <ShortcutRow shortcuts={profile.shortcuts} />

        {hasPosts ? profile.posts.map((post) => <PostCard key={post.id} post={post} />) : <EmptyState profile={profile} />}
      </ScrollView>

      {!profile.isSelf ? (
        <View className="absolute bottom-5 right-5 rounded-full bg-white px-6 py-3 shadow">
          <Text allowFontScaling={false} className="text-[17px] font-semibold text-[#1e66ef]">💬 Nhắn tin</Text>
        </View>
      ) : null}

      {showBottomTabs ? (
        <>
          {bottomTabs}
          <SafeAreaView edges={['bottom']} className="bg-white" />
        </>
      ) : (
        <SafeAreaView edges={['bottom']} className="bg-transparent" />
      )}
    </View>
  );
}
