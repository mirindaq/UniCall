import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import Toast from 'react-native-toast-message';

import { UserProfileScreen } from '@/components/user-profile/user-profile-screen';
import { userService } from '@/services/user.service';
import type { UpdateMyProfileRequest, UserProfile } from '@/types/user';

export default function UserProfileDetailScreen() {
  const router = useRouter();
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isSelf = useMemo(() => (userId ?? '').toLowerCase() === 'me', [userId]);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      setIsLoading(true);
      try {
        const response = isSelf
          ? await userService.getMyProfile()
          : await userService.getProfileByIdentityUserId(userId ?? '');
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
          text1: 'Không tải được thông tin người dùng',
        });
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, [isSelf, userId]);

  return (
    <UserProfileScreen
      profile={profile}
      isLoading={isLoading}
      isSelf={isSelf}
      onSaveProfile={async (payload: UpdateMyProfileRequest) => {
        const response = await userService.updateMyProfile(payload);
        setProfile(response.data);
      }}
      onUploadAvatar={async (fileUri: string) => {
        const response = await userService.updateMyAvatar(fileUri);
        setProfile(response.data);
      }}
      onBack={() => {
        router.back();
      }}
    />
  );
}
