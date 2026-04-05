import React from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FeedsComposerCard } from '@/components/feeds/feeds-composer-card';
import { FeedsHeader } from '@/components/feeds/feeds-header';
import { FeedsMomentsCard } from '@/components/feeds/feeds-moments-card';
import { FeedsPostCard } from '@/components/feeds/feeds-post-card';
import { FeedsSectionTabs } from '@/components/feeds/feeds-section-tabs';
import { MessagesBottomTabs } from '@/components/messages/messages-bottom-tabs';
import { AppStatusBarBlue } from '@/components/ui/app-status-bar-blue';
import { feedPosts } from '@/mock/feeds-data';

export default function FeedsScreen() {
  return (
    <View className="flex-1 bg-[#f3f4f6]">
      <AppStatusBarBlue />
      <SafeAreaView edges={['top']} className="bg-[#1e98f3]" />
      <FeedsHeader />

      <ScrollView className="flex-1 bg-[#f3f4f6]" showsVerticalScrollIndicator={false}>
        <FeedsSectionTabs />
        <FeedsComposerCard />
        <FeedsMomentsCard />
        {feedPosts.map((post) => (
          <FeedsPostCard key={post.id} post={post} />
        ))}
      </ScrollView>

      <MessagesBottomTabs activeTab="feeds" />
      <SafeAreaView edges={['bottom']} className="bg-white" />
    </View>
  );
}
