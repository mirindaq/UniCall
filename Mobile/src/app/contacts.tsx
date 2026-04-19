import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

import { AddFriendModal } from '@/components/contacts/add-friend-modal';
import { ContactsFriendsTab } from '@/components/contacts/contacts-friends-tab';
import { ContactsGroupsTab } from '@/components/contacts/contacts-groups-tab';
import { ContactsHeader } from '@/components/contacts/contacts-header';
import { ContactsOaTab } from '@/components/contacts/contacts-oa-tab';
import { ContactsTabs } from '@/components/contacts/contacts-tabs';
import { MessagesBottomTabs } from '@/components/messages/messages-bottom-tabs';
import { AppStatusBarBlue } from '@/components/ui/app-status-bar-blue';
import { friendService } from '@/services/friend.service';
import { userService } from '@/services/user.service';
import { friendActions, friendContacts, groupItems, oaItems, type ContactsSubTab } from '@/mock/contacts-data';
import type { FriendItem } from '@/types/friendship';

export default function ContactsScreen() {
  const [activeTab, setActiveTab] = useState<ContactsSubTab>('friends');
  const [apiFriends, setApiFriends] = useState<FriendItem[]>([]);
  const [isAddFriendModalOpen, setIsAddFriendModalOpen] = useState(false);
  const [myIdentityUserId, setMyIdentityUserId] = useState<string | null>(null);
  const [myFirstName, setMyFirstName] = useState('');
  const [myLastName, setMyLastName] = useState('');

  useEffect(() => {
    let mounted = true;
    void (async () => {
      try {
        const myProfile = await userService.getMyProfile();
        if (mounted) {
          setMyIdentityUserId(myProfile.data.identityUserId ?? null);
          setMyFirstName(myProfile.data.firstName ?? '');
          setMyLastName(myProfile.data.lastName ?? '');
        }
        const friendsResponse = await friendService.getAllFriends(myProfile.data.identityUserId);
        if (!mounted) {
          return;
        }
        setApiFriends(friendsResponse.data ?? []);
      } catch {
        if (!mounted) {
          return;
        }
        Toast.show({
          type: 'error',
          text1: 'Không tải được danh bạ bạn bè',
        });
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const mappedFriendContacts = useMemo(() => {
    if (apiFriends.length === 0) {
      return friendContacts;
    }
    return apiFriends.map((friend) => {
      const firstName = friend.firstName ?? '';
      const lastName = friend.lastName ?? '';
      const name = `${lastName} ${firstName}`.trim() || friend.fullName || friend.idAccount || 'Bạn bè';
      const fallback = `${lastName[0] ?? ''}${firstName[0] ?? ''}`.toUpperCase() || 'U';
      return {
        id: friend.id || friend.idAccount || `${friend.idAccountSent ?? ''}-${friend.idAccountReceive ?? ''}`,
        name,
        section: name.charAt(0).toUpperCase(),
        avatar: {
          type: 'initials' as const,
          value: fallback,
          backgroundColor: '#94a3b8',
        },
        avatarUrl: friend.avatar || friend.pathAvartar || null,
      };
    });
  }, [apiFriends]);

  return (
    <View className="flex-1 bg-[#f3f4f6]">
      <AppStatusBarBlue />
      <SafeAreaView edges={['top']} className="bg-[#1e98f3]" />
      <ContactsHeader
        onPressSearch={() => setIsAddFriendModalOpen(true)}
        onPressAddFriend={() => setIsAddFriendModalOpen(true)}
      />
      <ContactsTabs activeTab={activeTab} onChange={setActiveTab} />

      <ScrollView className="flex-1 bg-[#f3f4f6]" showsVerticalScrollIndicator={false}>
        {activeTab === 'friends' ? (
          <ContactsFriendsTab friendActions={friendActions} friendContacts={mappedFriendContacts} />
        ) : null}
        {activeTab === 'groups' ? <ContactsGroupsTab groupItems={groupItems} /> : null}
        {activeTab === 'oa' ? <ContactsOaTab oaItems={oaItems} /> : null}
      </ScrollView>

      <MessagesBottomTabs activeTab="contacts" />
      <SafeAreaView edges={['bottom']} className="bg-white" />

      <AddFriendModal
        visible={isAddFriendModalOpen}
        onClose={() => setIsAddFriendModalOpen(false)}
        myIdentityUserId={myIdentityUserId}
        myFirstName={myFirstName}
        myLastName={myLastName}
      />
    </View>
  );
}

