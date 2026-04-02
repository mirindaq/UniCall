import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';

import { UserProfileScreen } from '@/components/user-profile/user-profile-screen';
import { getUserProfileById } from '@/mock/user-profile-data';

export default function UserProfileDetailScreen() {
  const router = useRouter();
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const profile = getUserProfileById(userId ?? 'hung');

  return (
    <UserProfileScreen
      profile={profile}
      onBack={() => {
        router.back();
      }}
    />
  );
}
