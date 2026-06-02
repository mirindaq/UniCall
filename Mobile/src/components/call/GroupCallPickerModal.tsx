import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useMemo } from 'react';
import { FlatList, Modal, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ConversationAvatar } from '@/components/messages/conversation-avatar';
import { buildMockAvatar } from '@/utils/chat-avatar';

export type GroupCallMemberOption = {
  id: string;
  name: string;
  avatar?: string | null;
};

type GroupCallPickerModalProps = {
  visible: boolean;
  members: GroupCallMemberOption[];
  selectedUserIds: string[];
  maxMembers: number;
  maxTargets: number;
  onClose: () => void;
  onToggleMember: (userId: string) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onStartCall: () => void;
};

function MemberRow({
  item,
  isSelected,
  onToggle,
}: {
  item: GroupCallMemberOption;
  isSelected: boolean;
  onToggle: () => void;
}) {
  const avatar = buildMockAvatar(item.name, item.id);

  return (
    <Pressable
      onPress={onToggle}
      className={`mb-1.5 min-h-[58px] flex-row items-center rounded-2xl px-3 py-2 active:opacity-90 ${
        isSelected ? 'bg-sky-50' : 'bg-slate-50/80'
      }`}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: isSelected }}
      accessibilityLabel={`${item.name}${isSelected ? ', đã chọn' : ''}`}>
      <ConversationAvatar avatar={avatar} avatarUrl={item.avatar} size={44} />
      <Text className="ml-3 min-w-0 flex-1 text-[16px] font-medium text-slate-900" numberOfLines={1}>
        {item.name}
      </Text>
      <Ionicons
        name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
        size={28}
        color={isSelected ? '#1e98f3' : '#cbd5e1'}
      />
    </Pressable>
  );
}

export function GroupCallPickerModal({
  visible,
  members,
  selectedUserIds,
  maxMembers,
  maxTargets,
  onClose,
  onToggleMember,
  onSelectAll,
  onClearSelection,
  onStartCall,
}: GroupCallPickerModalProps) {
  const insets = useSafeAreaInsets();
  const selectedSet = useMemo(() => new Set(selectedUserIds), [selectedUserIds]);
  const canStart = selectedUserIds.length > 0;
  const allSelected = members.length > 0 && members.every((member) => selectedSet.has(member.id));

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/40">
        <Pressable className="flex-1" onPress={onClose} accessibilityLabel="Đóng" />

        <View
          className="max-h-[82%] rounded-t-3xl bg-white px-4 pt-2"
          style={{ paddingBottom: Math.max(insets.bottom, 12) + 8 }}>
          <View className="mb-3 h-1 w-12 self-center rounded-full bg-slate-200" />

          <View className="mb-1 flex-row items-start justify-between">
            <View className="min-w-0 flex-1 pr-3">
              <Text className="text-[18px] font-semibold text-slate-900">Chọn người tham gia</Text>
              <Text className="mt-1 text-[13px] leading-5 text-slate-500">
                Tối đa {maxMembers} người (gồm bạn). Chạm vào tên để chọn hoặc bỏ chọn.
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              className="h-10 w-10 items-center justify-center rounded-full bg-slate-100"
              hitSlop={8}>
              <Ionicons name="close" size={22} color="#64748b" />
            </Pressable>
          </View>

          {members.length > 0 ? (
            <View className="mb-2 flex-row items-center justify-end gap-3">
              <Pressable onPress={onSelectAll} disabled={allSelected} hitSlop={8}>
                <Text
                  className={`text-[13px] font-semibold ${
                    allSelected ? 'text-slate-300' : 'text-[#1e98f3]'
                  }`}>
                  Chọn tất cả
                </Text>
              </Pressable>
              <Pressable
                onPress={onClearSelection}
                disabled={selectedUserIds.length === 0}
                hitSlop={8}>
                <Text
                  className={`text-[13px] font-semibold ${
                    selectedUserIds.length === 0 ? 'text-slate-300' : 'text-slate-600'
                  }`}>
                  Bỏ chọn
                </Text>
              </Pressable>
            </View>
          ) : null}

          <FlatList
            data={members}
            keyExtractor={(item) => item.id}
            style={{ maxHeight: 340 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <View className="items-center py-10">
                <Ionicons name="people-outline" size={40} color="#cbd5e1" />
                <Text className="mt-3 text-center text-[14px] text-slate-500">
                  Không có thành viên phù hợp
                </Text>
              </View>
            }
            renderItem={({ item }) => (
              <MemberRow
                item={item}
                isSelected={selectedSet.has(item.id)}
                onToggle={() => onToggleMember(item.id)}
              />
            )}
          />

          <View className="mt-3 border-t border-slate-100 pt-3">
            <Text className="mb-3 text-center text-[13px] text-slate-500">
              Đã chọn {selectedUserIds.length}/{maxTargets}
            </Text>
            <View className="flex-row gap-2.5">
              <Pressable
                onPress={onClose}
                className="min-h-[48px] flex-1 items-center justify-center rounded-xl border border-slate-200 bg-white">
                <Text className="text-[15px] font-semibold text-slate-700">Hủy</Text>
              </Pressable>
              <Pressable
                onPress={onStartCall}
                disabled={!canStart}
                className={`min-h-[48px] flex-1 items-center justify-center rounded-xl ${
                  canStart ? 'bg-[#1e98f3]' : 'bg-slate-200'
                }`}>
                <Text
                  className={`text-[15px] font-semibold ${
                    canStart ? 'text-white' : 'text-slate-400'
                  }`}>
                  Bắt đầu gọi
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}
