import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { useRouter } from 'expo-router';

import { AddFriendModal } from '@/components/contacts/add-friend-modal';
import { ContactsFriendsTab } from '@/components/contacts/contacts-friends-tab';
import { ContactsGroupsTab } from '@/components/contacts/contacts-groups-tab';
import { ContactsHeader } from '@/components/contacts/contacts-header';
import { ContactsTabs } from '@/components/contacts/contacts-tabs';
import { MessagesBottomTabs } from '@/components/messages/messages-bottom-tabs';
import { AppStatusBarBlue } from '@/components/ui/app-status-bar-blue';
import { chatService } from '@/services/chat.service';
import {
  friendRequestService,
  friendService,
  type FriendRequestItem,
  type FriendRequestStatus,
} from '@/services/friend.service';
import { userService } from '@/services/user.service';
import type { FriendItem } from '@/types/friendship';
import type {
  ContactsSubTab,
  FriendActionItem,
  GroupContactItem,
} from '@/types/contacts';

export default function ContactsScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<ContactsSubTab>('friends');
  const [apiFriends, setApiFriends] = useState<FriendItem[]>([]);
  const [isAddFriendModalOpen, setIsAddFriendModalOpen] = useState(false);
  const [myIdentityUserId, setMyIdentityUserId] = useState<string | null>(null);
  const [myFirstName, setMyFirstName] = useState('');
  const [myLastName, setMyLastName] = useState('');
  const [groupItems, setGroupItems] = useState<GroupContactItem[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequestItem[]>([]);
  const [showFriendInvitations, setShowFriendInvitations] = useState(false);
  const [processingMap, setProcessingMap] = useState<Record<string, boolean>>({});
  const [profileMap, setProfileMap] = useState<Record<string, { fullName: string; avatar?: string | null }>>({});

  const formatRelativeTime = (isoDate?: string) => {
    if (!isoDate) {
      return '';
    }
    const date = new Date(isoDate);
    if (Number.isNaN(date.getTime())) {
      return '';
    }
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    if (diffMs < 60 * 60 * 1000) {
      return `${Math.max(1, Math.floor(diffMs / (60 * 1000)))} phút`;
    }
    if (diffMs < 24 * 60 * 60 * 1000) {
      return `${Math.floor(diffMs / (60 * 60 * 1000))} giờ`;
    }
    return `${Math.floor(diffMs / (24 * 60 * 60 * 1000))} ngày`;
  };

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
        const identityUserId = myProfile.data.identityUserId;
        const friendsResponse = await friendService.getAllFriends(identityUserId);
        if (!mounted) {
          return;
        }
        setApiFriends(friendsResponse.data ?? []);

        const [friendRequestsResponse, conversationsResponse] = await Promise.all([
          friendRequestService.getAllFriendRequests(identityUserId, 0, 100, 'desc'),
          chatService.listConversations(),
        ]);
        if (!mounted) {
          return;
        }

        setFriendRequests(friendRequestsResponse.data?.items ?? []);

        const mappedGroups: GroupContactItem[] = (conversationsResponse.data ?? [])
          .filter((conversation) => conversation.type === 'GROUP')
          .map((conversation) => ({
            id: conversation.idConversation,
            name: conversation.name?.trim() || 'Nhóm',
            subtitle: conversation.lastMessageContent?.trim() || 'Chưa có tin nhắn',
            timeLabel: formatRelativeTime(conversation.dateUpdateMessage) || '',
          }));
        setGroupItems(mappedGroups);
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

  useEffect(() => {
    if (activeTab !== 'friends') {
      setShowFriendInvitations(false);
    }
  }, [activeTab]);

  const mappedFriendContacts = useMemo(() => {
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

  const friendActions = useMemo<FriendActionItem[]>(
    () => [
      {
        id: 'invite',
        type: 'invite',
        title: 'Lời mời kết bạn',
        countText:
          friendRequests.filter(
            (item) => item.status === 'SENT' && item.idAccountReceive === myIdentityUserId
          ).length > 0
            ? String(
                friendRequests.filter(
                  (item) => item.status === 'SENT' && item.idAccountReceive === myIdentityUserId
                ).length
              )
            : undefined,
      },
    ],
    [friendRequests, myIdentityUserId]
  );

  const receivedInvitations = useMemo(() => {
    if (!myIdentityUserId) {
      return [];
    }
    return friendRequests
      .filter((item) => item.status === 'SENT' && item.idAccountReceive === myIdentityUserId)
      .map((item) => {
        const profile = profileMap[item.idAccountSent];
        const displayName =
          profile?.fullName ||
          `${item.lastName ?? ''} ${item.firstName ?? ''}`.trim() ||
          item.idAccountSent;
        const fallback = toFallback(displayName);
        return {
          idFriendRequest: item.idFriendRequest,
          displayName,
          avatarUrl: profile?.avatar ?? item.pathAvartar ?? null,
          fallback,
          content: item.content?.trim() || 'Không có lời nhắn.',
          timeRequest: item.timeRequest,
        };
      });
  }, [friendRequests, myIdentityUserId, profileMap]);

  const sentInvitations = useMemo(() => {
    if (!myIdentityUserId) {
      return [];
    }
    return friendRequests
      .filter((item) => item.status === 'SENT' && item.idAccountSent === myIdentityUserId)
      .map((item) => {
        const profile = profileMap[item.idAccountReceive];
        const displayName =
          profile?.fullName ||
          `${item.lastName ?? ''} ${item.firstName ?? ''}`.trim() ||
          item.idAccountReceive;
        const fallback = toFallback(displayName);
        return {
          idFriendRequest: item.idFriendRequest,
          displayName,
          avatarUrl: profile?.avatar ?? item.pathAvartar ?? null,
          fallback,
          content: item.content?.trim() || 'Không có lời nhắn.',
          timeRequest: item.timeRequest,
        };
      });
  }, [friendRequests, myIdentityUserId, profileMap]);

  useEffect(() => {
    const peerIds = new Set<string>();
    friendRequests.forEach((item) => {
      if (item.idAccountSent) {
        peerIds.add(item.idAccountSent);
      }
      if (item.idAccountReceive) {
        peerIds.add(item.idAccountReceive);
      }
    });
    if (peerIds.size === 0) {
      setProfileMap({});
      return;
    }
    let canceled = false;
    void Promise.all(
      [...peerIds].map(async (identityUserId) => {
        try {
          const response = await userService.getProfileByIdentityUserId(identityUserId);
          const profile = response.data;
          const fullName = `${profile.lastName ?? ''} ${profile.firstName ?? ''}`.trim() || identityUserId;
          return [identityUserId, { fullName, avatar: profile.avatar ?? null }] as const;
        } catch {
          return [identityUserId, { fullName: identityUserId, avatar: null }] as const;
        }
      })
    ).then((entries) => {
      if (canceled) {
        return;
      }
      setProfileMap(Object.fromEntries(entries));
    });

    return () => {
      canceled = true;
    };
  }, [friendRequests]);

  const reloadFriendRequests = async () => {
    if (!myIdentityUserId) {
      return;
    }
    const response = await friendRequestService.getAllFriendRequests(myIdentityUserId, 0, 100, 'desc');
    setFriendRequests(response.data?.items ?? []);
  };

  const handleUpdateInvitationStatus = async (idFriendRequest: string, status: FriendRequestStatus) => {
    if (!idFriendRequest || processingMap[idFriendRequest]) {
      return;
    }
    setProcessingMap((prev) => ({ ...prev, [idFriendRequest]: true }));
    try {
      await friendRequestService.updateFriendRequestStatus(idFriendRequest, { status });
      await reloadFriendRequests();
      Toast.show({
        type: 'success',
        text1:
          status === 'ACCEPTED'
            ? 'Đã đồng ý kết bạn'
            : status === 'REJECTED'
              ? 'Đã từ chối lời mời'
              : 'Đã thu hồi lời mời',
      });
    } catch {
      Toast.show({
        type: 'error',
        text1: 'Cập nhật lời mời thất bại',
      });
    } finally {
      setProcessingMap((prev) => ({ ...prev, [idFriendRequest]: false }));
    }
  };

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
          <ContactsFriendsTab
            friendActions={friendActions}
            friendContacts={mappedFriendContacts}
            showInvitations={showFriendInvitations}
            receivedInvitations={receivedInvitations}
            sentInvitations={sentInvitations}
            processingMap={processingMap}
            onOpenInvitations={() => setShowFriendInvitations(true)}
            onBackToFriends={() => setShowFriendInvitations(false)}
            onUpdateInvitationStatus={handleUpdateInvitationStatus}
          />
        ) : null}
        {activeTab === 'groups' ? (
          <ContactsGroupsTab
            groupItems={groupItems}
            onPressCreateGroup={() => router.push('/message/create-group')}
            onPressGroup={(conversationId) => router.push(`/message/${conversationId}`)}
          />
        ) : null}
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

function toFallback(fullName: string) {
  const words = fullName.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return 'U';
  }
  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }
  return `${words[0][0] ?? ''}${words[words.length - 1][0] ?? ''}`.toUpperCase();
}

