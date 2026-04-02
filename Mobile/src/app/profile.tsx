import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { authTokenStore } from '@/configurations/axios.config';
import { MessagesBottomTabs } from '@/components/messages/messages-bottom-tabs';
import { ProfileHeader } from '@/components/profile/profile-header';
import { ProfileIdentity } from '@/components/profile/profile-identity';
import { ProfileMenuSection } from '@/components/profile/profile-menu-section';
import { AppStatusBarBlue } from '@/components/ui/app-status-bar-blue';
import { profileUser } from '@/mock/profile-data';

export default function ProfileScreen() {
  const router = useRouter();

  return (
    <View className="flex-1 bg-[#f3f4f6]">
      <AppStatusBarBlue />
      <SafeAreaView edges={['top']} className="bg-[#1e98f3]" />
      <ProfileHeader />

      <ScrollView className="flex-1 bg-[#f3f4f6]" showsVerticalScrollIndicator={false}>
        <ProfileIdentity
          name={profileUser.name}
          initials={profileUser.initials}
          onPress={() => {
            router.push('/user/me');
          }}
        />
        <ProfileMenuSection
          onOpenMyDocuments={() => {
            router.push('/message/my-documents');
          }}
          onLogout={() => {
            authTokenStore.clear();
            router.replace('/login');
          }}
        />
      </ScrollView>

      <MessagesBottomTabs activeTab="profile" />
      <SafeAreaView edges={['bottom']} className="bg-white" />
    </View>
  );
}
