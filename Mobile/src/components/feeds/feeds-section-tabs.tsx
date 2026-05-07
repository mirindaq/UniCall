import React from 'react';
import { Pressable, Text, View } from 'react-native';

type FeedsTabKey = 'feed' | 'my-posts';

interface FeedsSectionTabsProps {
  activeTab: FeedsTabKey;
  onChangeTab: (tab: FeedsTabKey) => void;
}

export function FeedsSectionTabs({ activeTab, onChangeTab }: FeedsSectionTabsProps) {
  return (
    <View className="border-b border-slate-200 bg-white px-5 py-3">
      <View className="flex-row">
        <Pressable className="mr-8" onPress={() => onChangeTab('feed')}>
          <Text
            allowFontScaling={false}
            className={`text-[18px] ${activeTab === 'feed' ? 'font-semibold text-slate-900' : 'text-slate-400'}`}>
            Bảng tin
          </Text>
          <View className={`mt-2 h-[3px] w-[76px] rounded-full ${activeTab === 'feed' ? 'bg-slate-900' : 'bg-transparent'}`} />
        </Pressable>
        <Pressable onPress={() => onChangeTab('my-posts')}>
          <Text
            allowFontScaling={false}
            className={`text-[18px] ${activeTab === 'my-posts' ? 'font-semibold text-slate-900' : 'text-slate-400'}`}>
            Bài viết của tôi
          </Text>
          <View className={`mt-2 h-[3px] w-[130px] rounded-full ${activeTab === 'my-posts' ? 'bg-slate-900' : 'bg-transparent'}`} />
        </Pressable>
      </View>
    </View>
  );
}
