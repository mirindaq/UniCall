import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

import { chatService } from '@/services/chat.service';
import { friendService } from '@/services/friend.service';
import { userService } from '@/services/user.service';
import type { GroupParticipantInfo, GroupParticipantRole } from '@/types/chat';
import type { FriendItem } from '@/types/friendship';
import type { UserProfile } from '@/types/user';

type MemberOption = {
  id: string;
  displayName: string;
  phoneNumber?: string;
  avatar?: string | null;
  fallback: string;
};

type ResolvedMember = {
  id: string;
  role: GroupParticipantRole;
  displayName: string;
  roleLabel: string;
  avatar?: string | null;
  fallback: string;
};

const SEARCH_LIMIT = 20;

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

function getErrorMessage(error: unknown, fallback: string) {
  const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
  return message || fallback;
}

function mapFriendToMember(friend: FriendItem, myIdentityUserId: string): MemberOption | null {
  const peerIdentityUserId =
    friend.idAccountSent === myIdentityUserId ? friend.idAccountReceive : friend.idAccountSent;
  if (!peerIdentityUserId?.trim()) {
    return null;
  }
  const displayName =
    friend.fullName?.trim() ||
    `${friend.firstName ?? ''} ${friend.lastName ?? ''}`.trim() ||
    peerIdentityUserId;

  return {
    id: peerIdentityUserId,
    displayName,
    avatar: friend.avatar || friend.pathAvartar || null,
    fallback: toFallback(displayName),
  };
}

function dedupeMembers(items: MemberOption[]) {
  const unique = new Map<string, MemberOption>();
  items.forEach((item) => {
    if (!unique.has(item.id)) {
      unique.set(item.id, item);
    }
  });
  return Array.from(unique.values());
}

function roleLabel(role: GroupParticipantRole, isCurrentUser: boolean) {
  if (role === 'ADMIN') {
    return 'Trưởng nhóm';
  }
  if (role === 'DEPUTY') {
    return isCurrentUser ? 'Bạn (Phó nhóm)' : 'Phó nhóm';
  }
  return isCurrentUser ? 'Bạn' : '';
}

type MemberActionItemProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  danger?: boolean;
  onPress: () => void;
};

function MemberActionItem({ icon, label, danger = false, onPress }: MemberActionItemProps) {
  return (
    <Pressable
      className="mb-2 flex-row items-center rounded-xl border border-slate-200 bg-white px-3.5 py-3"
      onPress={onPress}>
      <View className="h-9 w-9 items-center justify-center rounded-full bg-slate-100">
        <Ionicons name={icon} size={19} color={danger ? '#dc2626' : '#1d4ed8'} />
      </View>
      <Text className={`ml-3 text-[15px] font-medium ${danger ? 'text-red-600' : 'text-slate-900'}`}>
        {label}
      </Text>
    </Pressable>
  );
}

export default function GroupMembersScreen() {
  const router = useRouter();
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();

  const [groupName, setGroupName] = useState('Nhóm chat');
  const [participants, setParticipants] = useState<GroupParticipantInfo[]>([]);
  const [profiles, setProfiles] = useState<Record<string, UserProfile>>({});
  const [myIdentityUserId, setMyIdentityUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  const [actionTargetMember, setActionTargetMember] = useState<ResolvedMember | null>(null);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [friendCandidates, setFriendCandidates] = useState<MemberOption[]>([]);
  const [isLoadingFriendCandidates, setIsLoadingFriendCandidates] = useState(false);
  const [addSelectedIds, setAddSelectedIds] = useState<Record<string, boolean>>({});
  const [addSearchKeyword, setAddSearchKeyword] = useState('');
  const [addDebouncedKeyword, setAddDebouncedKeyword] = useState('');
  const [addSearchResults, setAddSearchResults] = useState<MemberOption[]>([]);
  const [addSearchPage, setAddSearchPage] = useState(1);
  const [addSearchTotalPage, setAddSearchTotalPage] = useState(1);
  const [isSearchingAddFirstPage, setIsSearchingAddFirstPage] = useState(false);
  const [isSearchingAddMore, setIsSearchingAddMore] = useState(false);
  const [isSubmittingAddMembers, setIsSubmittingAddMembers] = useState(false);

  const existingMemberIds = useMemo(() => participants.map((item) => item.idAccount), [participants]);
  const existingMemberIdSet = useMemo(() => new Set(existingMemberIds), [existingMemberIds]);
  const currentUserRole = useMemo(
    () => participants.find((participant) => participant.idAccount === myIdentityUserId)?.role ?? null,
    [myIdentityUserId, participants]
  );

  const resolvedMembers = useMemo<ResolvedMember[]>(
    () =>
      participants.map((participant) => {
        const profile = profiles[participant.idAccount];
        const fullName = profile
          ? `${profile.firstName ?? ''} ${profile.lastName ?? ''}`.trim() || participant.idAccount
          : participant.idAccount;
        const isCurrentUser = participant.idAccount === myIdentityUserId;
        return {
          id: participant.idAccount,
          role: participant.role,
          displayName: isCurrentUser ? 'Bạn' : fullName,
          roleLabel: roleLabel(participant.role, isCurrentUser),
          avatar: profile?.avatar,
          fallback: toFallback(fullName),
        };
      }),
    [myIdentityUserId, participants, profiles]
  );

  const addDisplayedMembers = useMemo(
    () => (addDebouncedKeyword ? addSearchResults : friendCandidates),
    [addDebouncedKeyword, addSearchResults, friendCandidates]
  );
  const addCanLoadMore =
    addDebouncedKeyword.length > 0 && addSearchPage < addSearchTotalPage && !isSearchingAddMore;
  const addSelectedCount = useMemo(() => Object.keys(addSelectedIds).length, [addSelectedIds]);

  const loadGroupDetails = useCallback(
    async (showLoading = true) => {
      if (!conversationId) {
        return;
      }
      if (showLoading) {
        setIsLoading(true);
      }
      try {
        const response = await chatService.getGroupConversationDetails(conversationId);
        setGroupName(response.data.name?.trim() || 'Nhóm chat');
        setParticipants(response.data.participantInfos ?? []);
      } catch (error) {
        Toast.show({
          type: 'error',
          text1: getErrorMessage(error, 'Không tải được danh sách thành viên'),
        });
      } finally {
        if (showLoading) {
          setIsLoading(false);
        }
      }
    },
    [conversationId]
  );

  const loadFriendCandidates = useCallback(async () => {
    if (!myIdentityUserId) {
      return;
    }
    setIsLoadingFriendCandidates(true);
    try {
      const response = await friendService.getAllFriends(myIdentityUserId);
      const mapped = dedupeMembers(
        (response.data ?? [])
          .map((friend) => mapFriendToMember(friend, myIdentityUserId))
          .filter((item): item is MemberOption => Boolean(item))
      );
      setFriendCandidates(mapped);
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: getErrorMessage(error, 'Không tải được danh sách bạn bè'),
      });
    } finally {
      setIsLoadingFriendCandidates(false);
    }
  }, [myIdentityUserId]);

  const runAddMemberSearch = useCallback(
    async (pageToLoad: number, append: boolean) => {
      if (!myIdentityUserId || !addDebouncedKeyword.trim()) {
        setAddSearchResults([]);
        setAddSearchPage(1);
        setAddSearchTotalPage(1);
        return;
      }

      if (append) {
        setIsSearchingAddMore(true);
      } else {
        setIsSearchingAddFirstPage(true);
      }

      try {
        const response = await userService.searchUsers({
          keyword: addDebouncedKeyword.trim(),
          page: pageToLoad,
          limit: SEARCH_LIMIT,
        });
        const pageData = response.data;
        const mapped = (pageData.items ?? [])
          .filter((item) => item.identityUserId !== myIdentityUserId)
          .map<MemberOption>((item) => ({
            id: item.identityUserId,
            displayName:
              item.fullName ||
              `${item.firstName ?? ''} ${item.lastName ?? ''}`.trim() ||
              item.identityUserId,
            phoneNumber: item.phoneNumber,
            avatar: item.avatar ?? null,
            fallback: toFallback(item.fullName || `${item.firstName ?? ''} ${item.lastName ?? ''}`.trim()),
          }));
        setAddSearchPage(pageData.page ?? pageToLoad);
        setAddSearchTotalPage(pageData.totalPage ?? pageToLoad);
        setAddSearchResults((prev) => {
          if (!append) {
            return dedupeMembers(mapped);
          }
          return dedupeMembers([...prev, ...mapped]);
        });
      } catch (error) {
        if (!append) {
          Toast.show({
            type: 'error',
            text1: getErrorMessage(error, 'Không tìm được người dùng'),
          });
        }
      } finally {
        if (append) {
          setIsSearchingAddMore(false);
        } else {
          setIsSearchingAddFirstPage(false);
        }
      }
    },
    [addDebouncedKeyword, myIdentityUserId]
  );

  useEffect(() => {
    let mounted = true;
    void (async () => {
      try {
        const myProfile = await userService.getMyProfile();
        if (!mounted) {
          return;
        }
        setMyIdentityUserId(myProfile.data.identityUserId ?? null);
      } catch {
        if (!mounted) {
          return;
        }
        setMyIdentityUserId(null);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    void loadGroupDetails();
  }, [loadGroupDetails]);

  useEffect(() => {
    if (!isAddModalOpen) {
      return;
    }
    void loadFriendCandidates();
  }, [isAddModalOpen, loadFriendCandidates]);

  useEffect(() => {
    if (participants.length === 0) {
      setProfiles({});
      return;
    }

    let cancelled = false;
    void Promise.all(
      participants.map(async (participant) => {
        try {
          const response = await userService.getProfileByIdentityUserId(participant.idAccount);
          return [participant.idAccount, response.data] as const;
        } catch {
          return null;
        }
      })
    ).then((resolved) => {
      if (cancelled) {
        return;
      }
      const nextProfiles: Record<string, UserProfile> = {};
      resolved.forEach((item) => {
        if (!item) {
          return;
        }
        nextProfiles[item[0]] = item[1];
      });
      setProfiles(nextProfiles);
    });

    return () => {
      cancelled = true;
    };
  }, [participants]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setAddDebouncedKeyword(addSearchKeyword.trim());
    }, 400);
    return () => clearTimeout(timer);
  }, [addSearchKeyword]);

  useEffect(() => {
    if (!isAddModalOpen) {
      return;
    }
    if (!addDebouncedKeyword) {
      setAddSearchResults([]);
      setAddSearchPage(1);
      setAddSearchTotalPage(1);
      return;
    }
    void runAddMemberSearch(1, false);
  }, [addDebouncedKeyword, isAddModalOpen, runAddMemberSearch]);

  const openLeaveGroupDialog = useCallback(() => {
    Alert.alert('Rời nhóm', 'Bạn có chắc muốn rời nhóm này không?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Rời nhóm',
        style: 'destructive',
        onPress: () => {
          if (!conversationId || isProcessingAction) {
            return;
          }
          setIsProcessingAction(true);
          void (async () => {
            try {
              await chatService.leaveGroupConversation(conversationId);
              Toast.show({ type: 'success', text1: 'Đã rời nhóm' });
              router.replace('/message');
            } catch (error) {
              Toast.show({
                type: 'error',
                text1: getErrorMessage(error, 'Rời nhóm thất bại'),
              });
            } finally {
              setIsProcessingAction(false);
            }
          })();
        },
      },
    ]);
  }, [conversationId, isProcessingAction, router]);

  const handleTransferAdmin = useCallback(
    (targetMember: ResolvedMember) => {
      if (!conversationId || isProcessingAction) {
        return;
      }
      Alert.alert(
        'Chuyển quyền trưởng nhóm',
        `Bạn có chắc muốn chuyển quyền cho ${targetMember.displayName}?`,
        [
          { text: 'Hủy', style: 'cancel' },
          {
            text: 'Xác nhận',
            onPress: () => {
              setIsProcessingAction(true);
              void (async () => {
                try {
                  await chatService.transferGroupAdmin(conversationId, {
                    targetIdentityUserId: targetMember.id,
                  });
                  Toast.show({
                    type: 'success',
                    text1: 'Đã chuyển quyền trưởng nhóm',
                  });
                  await loadGroupDetails(false);
                } catch (error) {
                  Toast.show({
                    type: 'error',
                    text1: getErrorMessage(error, 'Chuyển quyền thất bại'),
                  });
                } finally {
                  setIsProcessingAction(false);
                }
              })();
            },
          },
        ]
      );
    },
    [conversationId, isProcessingAction, loadGroupDetails]
  );

  const handleToggleDeputy = useCallback(
    (targetMember: ResolvedMember) => {
      if (!conversationId || isProcessingAction) {
        return;
      }
      const nextRole: GroupParticipantRole = targetMember.role === 'DEPUTY' ? 'USER' : 'DEPUTY';
      setIsProcessingAction(true);
      void (async () => {
        try {
          await chatService.updateGroupMemberRole(conversationId, targetMember.id, {
            role: nextRole,
          });
          Toast.show({
            type: 'success',
            text1: nextRole === 'DEPUTY' ? 'Đã thêm phó nhóm' : 'Đã gỡ quyền phó nhóm',
          });
          await loadGroupDetails(false);
        } catch (error) {
          Toast.show({
            type: 'error',
            text1: getErrorMessage(error, 'Cập nhật quyền thất bại'),
          });
        } finally {
          setIsProcessingAction(false);
        }
      })();
    },
    [conversationId, isProcessingAction, loadGroupDetails]
  );

  const handleRemoveMember = useCallback(
    (targetMember: ResolvedMember) => {
      if (!conversationId || isProcessingAction) {
        return;
      }
      Alert.alert('Xóa thành viên', `Xóa ${targetMember.displayName} khỏi nhóm?`, [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: () => {
            setIsProcessingAction(true);
            void (async () => {
              try {
                await chatService.removeGroupMember(conversationId, targetMember.id);
                Toast.show({ type: 'success', text1: 'Đã xóa thành viên' });
                await loadGroupDetails(false);
              } catch (error) {
                Toast.show({
                  type: 'error',
                  text1: getErrorMessage(error, 'Xóa thành viên thất bại'),
                });
              } finally {
                setIsProcessingAction(false);
              }
            })();
          },
        },
      ]);
    },
    [conversationId, isProcessingAction, loadGroupDetails]
  );

  const openMemberActions = useCallback(
    (member: ResolvedMember) => {
      if (member.id !== myIdentityUserId && currentUserRole !== 'ADMIN') {
        Toast.show({
          type: 'error',
          text1: 'Bạn không có quyền quản lý thành viên này',
        });
        return;
      }
      setActionTargetMember(member);
    },
    [currentUserRole, myIdentityUserId]
  );

  const handleToggleAddSelection = useCallback(
    (memberId: string) => {
      if (existingMemberIdSet.has(memberId)) {
        return;
      }
      setAddSelectedIds((prev) => {
        if (prev[memberId]) {
          const next = { ...prev };
          delete next[memberId];
          return next;
        }
        return {
          ...prev,
          [memberId]: true,
        };
      });
    },
    [existingMemberIdSet]
  );

  const resetAddMemberModal = useCallback(() => {
    setAddSelectedIds({});
    setAddSearchKeyword('');
    setAddDebouncedKeyword('');
    setAddSearchResults([]);
    setAddSearchPage(1);
    setAddSearchTotalPage(1);
    setIsSearchingAddFirstPage(false);
    setIsSearchingAddMore(false);
  }, []);

  const closeAddMemberModal = useCallback(() => {
    setIsAddModalOpen(false);
    resetAddMemberModal();
  }, [resetAddMemberModal]);

  const handleConfirmAddMembers = useCallback(async () => {
    if (!conversationId || isSubmittingAddMembers) {
      return;
    }
    const memberIds = Object.keys(addSelectedIds);
    if (memberIds.length === 0) {
      return;
    }
    setIsSubmittingAddMembers(true);
    try {
      await chatService.addGroupMembers(conversationId, {
        memberIdentityUserIds: memberIds,
      });
      Toast.show({ type: 'success', text1: 'Đã thêm thành viên' });
      closeAddMemberModal();
      await loadGroupDetails(false);
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: getErrorMessage(error, 'Thêm thành viên thất bại'),
      });
    } finally {
      setIsSubmittingAddMembers(false);
    }
  }, [addSelectedIds, closeAddMemberModal, conversationId, isSubmittingAddMembers, loadGroupDetails]);

  return (
    <View className="flex-1 bg-[#f3f4f6]">
      <SafeAreaView className="bg-[#1e98f3]" />
      <View className="flex-row items-center bg-[#1e98f3] px-3.5 pb-2.5 pt-2.5">
        <Pressable
          className="mr-1.5 h-9 w-9 items-center justify-center rounded-full"
          onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </Pressable>
        <View className="flex-1">
          <Text numberOfLines={1} className="text-[17px] font-semibold text-white">
            Thành viên nhóm
          </Text>
          <Text numberOfLines={1} className="text-[12px] text-sky-100">
            {groupName}
          </Text>
        </View>
      </View>

      <View className="px-4 pb-3 pt-4">
        <Pressable
          className="h-11 flex-row items-center justify-center rounded-xl bg-[#1e98f3]"
          onPress={() => setIsAddModalOpen(true)}>
          <Ionicons name="person-add-outline" size={19} color="#ffffff" />
          <Text className="ml-2 text-[15px] font-semibold text-white">Thêm thành viên</Text>
        </Pressable>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="small" color="#1e98f3" />
        </View>
      ) : (
        <FlatList
          data={resolvedMembers}
          keyExtractor={(item) => item.id}
          contentContainerClassName="px-3 pb-8"
          ListHeaderComponent={
            <Text className="mb-2 px-2 text-[14px] font-semibold text-slate-700">
              Danh sách thành viên ({resolvedMembers.length})
            </Text>
          }
          ListEmptyComponent={
            <View className="items-center py-8">
              <Text className="text-[14px] text-slate-500">Nhóm chưa có thành viên</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View className="mb-2 flex-row items-center rounded-xl bg-white px-3 py-3">
              {item.avatar ? (
                <Image source={{ uri: item.avatar }} className="h-11 w-11 rounded-full bg-slate-200" />
              ) : (
                <View className="h-11 w-11 items-center justify-center rounded-full bg-slate-300">
                  <Text className="text-[14px] font-semibold text-white">{item.fallback}</Text>
                </View>
              )}
              <View className="ml-3 flex-1">
                <Text numberOfLines={1} className="text-[15px] font-medium text-slate-900">
                  {item.displayName}
                </Text>
                {item.roleLabel ? (
                  <Text className="mt-0.5 text-[12px] text-slate-500">{item.roleLabel}</Text>
                ) : null}
              </View>

              <Pressable
                onPress={() => openMemberActions(item)}
                disabled={isProcessingAction}
                className="h-9 w-9 items-center justify-center rounded-full bg-slate-100">
                <Ionicons name="ellipsis-horizontal" size={18} color="#334155" />
              </Pressable>
            </View>
          )}
        />
      )}

      <Modal
        visible={isAddModalOpen}
        transparent
        animationType="slide"
        onRequestClose={closeAddMemberModal}>
        <Pressable className="flex-1 justify-end bg-black/40" onPress={closeAddMemberModal}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}>
            <Pressable className="max-h-[88%] rounded-t-2xl bg-white pb-5" onPress={(e) => e.stopPropagation()}>
              <View className="flex-row items-center justify-between border-b border-slate-200 px-4 py-3">
                <Text className="text-[16px] font-semibold text-slate-900">Thêm thành viên</Text>
                <Pressable
                  onPress={closeAddMemberModal}
                  className="h-8 w-8 items-center justify-center rounded-full bg-slate-100">
                  <Ionicons name="close" size={20} color="#334155" />
                </Pressable>
              </View>

              <View className="px-4 pt-3">
                <TextInput
                  value={addSearchKeyword}
                  onChangeText={setAddSearchKeyword}
                  placeholder="Tìm theo tên hoặc số điện thoại"
                  className="h-11 rounded-xl border border-slate-300 px-3 text-[15px] text-slate-900"
                />
                <Text className="mt-2 text-[13px] text-slate-500">Đã chọn {addSelectedCount} thành viên</Text>
              </View>

              <FlatList
                data={addDisplayedMembers}
                keyExtractor={(item) => item.id}
                className="mt-3"
                contentContainerClassName="px-3 pb-2.5"
                keyboardShouldPersistTaps="handled"
                ListEmptyComponent={
                  <View className="items-center py-8">
                    {isLoadingFriendCandidates || isSearchingAddFirstPage ? (
                      <ActivityIndicator size="small" color="#1e98f3" />
                    ) : (
                      <Text className="text-[14px] text-slate-500">Không có thành viên phù hợp</Text>
                    )}
                  </View>
                }
                renderItem={({ item }) => {
                  const isExisting = existingMemberIdSet.has(item.id);
                  const isSelected = Boolean(addSelectedIds[item.id]);
                  return (
                    <Pressable
                      onPress={() => handleToggleAddSelection(item.id)}
                      disabled={isExisting}
                      className={`mb-2 flex-row items-center rounded-xl border px-3 py-2.5 ${
                        isExisting || isSelected
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-slate-200 bg-white'
                      } ${isExisting ? 'opacity-70' : ''}`}>
                      <View
                        className={`h-5 w-5 items-center justify-center rounded-full border ${
                          isExisting || isSelected
                            ? 'border-blue-600 bg-blue-600'
                            : 'border-slate-300 bg-white'
                        }`}>
                        {isExisting || isSelected ? <Ionicons name="checkmark" size={14} color="#ffffff" /> : null}
                      </View>

                      {item.avatar ? (
                        <Image source={{ uri: item.avatar }} className="ml-3 h-10 w-10 rounded-full bg-slate-200" />
                      ) : (
                        <View className="ml-3 h-10 w-10 items-center justify-center rounded-full bg-slate-300">
                          <Text className="text-[14px] font-semibold text-white">{item.fallback}</Text>
                        </View>
                      )}

                      <View className="ml-3 flex-1">
                        <Text numberOfLines={1} className="text-[15px] font-medium text-slate-900">
                          {item.displayName}
                        </Text>
                        <Text numberOfLines={1} className="mt-0.5 text-[12px] text-slate-500">
                          {isExisting ? 'Đã tham gia nhóm' : item.phoneNumber || ''}
                        </Text>
                      </View>
                    </Pressable>
                  );
                }}
                ListFooterComponent={
                  addCanLoadMore ? (
                    <Pressable
                      className="mb-2 mt-2 h-10 items-center justify-center rounded-xl border border-slate-300 bg-white"
                      onPress={() => void runAddMemberSearch(addSearchPage + 1, true)}
                      disabled={isSearchingAddMore}>
                      {isSearchingAddMore ? (
                        <ActivityIndicator size="small" color="#1e98f3" />
                      ) : (
                        <Text className="text-[14px] font-medium text-slate-700">Xem thêm</Text>
                      )}
                    </Pressable>
                  ) : null
                }
              />

              <View className="border-t border-slate-200 px-4 pt-3">
                <Pressable
                  className={`h-11 items-center justify-center rounded-xl ${
                    addSelectedCount === 0 || isSubmittingAddMembers ? 'bg-blue-300' : 'bg-[#1e98f3]'
                  }`}
                  onPress={() => void handleConfirmAddMembers()}
                  disabled={addSelectedCount === 0 || isSubmittingAddMembers}>
                  {isSubmittingAddMembers ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text className="text-[15px] font-semibold text-white">Xác nhận thêm</Text>
                  )}
                </Pressable>
              </View>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>

      <Modal
        visible={Boolean(actionTargetMember)}
        transparent
        animationType="fade"
        onRequestClose={() => setActionTargetMember(null)}>
        <Pressable className="flex-1 justify-end bg-black/45" onPress={() => setActionTargetMember(null)}>
          <Pressable
            className="rounded-t-3xl bg-white px-4 pb-5 pt-4"
            onPress={(event) => event.stopPropagation()}>
            {actionTargetMember ? (
              <>
                <View className="mb-3 rounded-xl bg-sky-50 px-3 py-2">
                  <Text className="text-[11px] font-semibold text-sky-700">Thành viên</Text>
                  <Text className="mt-1 text-[16px] font-semibold text-slate-900">
                    {actionTargetMember.displayName}
                  </Text>
                  {actionTargetMember.roleLabel ? (
                    <Text className="mt-0.5 text-[12px] text-slate-500">{actionTargetMember.roleLabel}</Text>
                  ) : null}
                </View>

                {actionTargetMember.id === myIdentityUserId ? (
                  <MemberActionItem
                    icon="log-out-outline"
                    label="Rời nhóm"
                    danger
                    onPress={() => {
                      setActionTargetMember(null);
                      openLeaveGroupDialog();
                    }}
                  />
                ) : (
                  <>
                    {currentUserRole === 'ADMIN' ? (
                      <>
                        <MemberActionItem
                          icon="swap-horizontal-outline"
                          label="Chuyển quyền trưởng nhóm"
                          onPress={() => {
                            const target = actionTargetMember;
                            setActionTargetMember(null);
                            handleTransferAdmin(target);
                          }}
                        />

                        {actionTargetMember.role !== 'ADMIN' ? (
                          <MemberActionItem
                            icon={actionTargetMember.role === 'DEPUTY' ? 'remove-circle-outline' : 'shield-outline'}
                            label={actionTargetMember.role === 'DEPUTY' ? 'Gỡ quyền phó nhóm' : 'Thêm phó nhóm'}
                            onPress={() => {
                              const target = actionTargetMember;
                              setActionTargetMember(null);
                              handleToggleDeputy(target);
                            }}
                          />
                        ) : null}

                        <MemberActionItem
                          icon="person-remove-outline"
                          label="Xóa khỏi nhóm"
                          danger
                          onPress={() => {
                            const target = actionTargetMember;
                            setActionTargetMember(null);
                            handleRemoveMember(target);
                          }}
                        />
                      </>
                    ) : (
                      <View className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                        <Text className="text-[13px] text-slate-600">
                          Bạn không có quyền quản lý thành viên này.
                        </Text>
                      </View>
                    )}
                  </>
                )}
              </>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
