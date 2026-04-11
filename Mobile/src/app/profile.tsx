import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

import { authTokenStore } from '@/configurations/axios.config';
import { MessagesBottomTabs } from '@/components/messages/messages-bottom-tabs';
import { ProfileHeader } from '@/components/profile/profile-header';
import { ProfileIdentity } from '@/components/profile/profile-identity';
import { ProfileMenuSection } from '@/components/profile/profile-menu-section';
import { userService } from '@/services/user.service';
import type { UserProfile } from '@/types/user';
import { AppStatusBarBlue } from '@/components/ui/app-status-bar-blue';

export default function ProfileScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      try {
        const response = await userService.getMyProfile();
        if (!mounted) {
          return;
        }
        setProfile(response.data);
      } catch {
        if (!mounted) {
          return;
        }
        Toast.show({
          type: 'error',
          text1: 'Không tải được thông tin cá nhân',
          text2: 'Vui lòng thử lại sau.',
        });
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const displayName = useMemo(() => {
    if (!profile) {
      return 'Tài khoản của tôi';
    }
    return `${profile.lastName ?? ''} ${profile.firstName ?? ''}`.trim() || profile.phoneNumber;
  }, [profile]);

  const initials = useMemo(() => {
    if (!profile) {
      return 'U';
    }
    const a = profile.firstName?.[0] ?? '';
    const b = profile.lastName?.[0] ?? '';
    return `${a}${b}`.toUpperCase() || profile.phoneNumber.slice(0, 1).toUpperCase();
  }, [profile]);

  return (
    <View className="flex-1 bg-[#f3f4f6]">
      <AppStatusBarBlue />
      <SafeAreaView edges={['top']} className="bg-[#1e98f3]" />
      <ProfileHeader />

      <ScrollView className="flex-1 bg-[#f3f4f6]" showsVerticalScrollIndicator={false}>
        <ProfileIdentity
          name={displayName}
          initials={initials}
          avatarUrl={profile?.avatar}
          onPress={() => {
            router.push('/user/me');
          }}
        />
        <ProfileMenuSection
          onOpenMyDocuments={() => {
            router.push('/message/my-documents');
          }}
          onOpenAccountSecurity={() => {
            router.push({
              pathname: '/account-security',
              params: { phone: profile?.phoneNumber ?? '' },
            });
          }}
          onLogout={() => {
            void (async () => {
              await authTokenStore.clear();
              router.replace('/login');
            })();
          }}
        />
      </ScrollView>

      <MessagesBottomTabs activeTab="profile" />
      <SafeAreaView edges={['bottom']} className="bg-white" />
    </View>
  );
}
