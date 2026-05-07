import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { Pressable, Text, View } from 'react-native';

import type { GroupContactItem } from '@/types/contacts';

interface ContactsGroupsTabProps {
  groupItems: GroupContactItem[];
  onPressCreateGroup?: () => void;
  onPressGroup?: (groupId: string) => void;
}

function GroupRow({ item, onPress }: { item: GroupContactItem; onPress?: () => void }) {
  return (
    <Pressable className="border-b border-slate-100 px-5 py-3" onPress={onPress}>
      <View className="flex-row items-start">
        <View className="h-[52px] w-[52px] items-center justify-center rounded-full bg-sky-100">
          <Ionicons name="people-outline" size={22} color="#3b82f6" />
        </View>
        <View className="ml-3 flex-1">
          <View className="flex-row items-start justify-between">
            <Text allowFontScaling={false} numberOfLines={1} className="mr-3 flex-1 text-[17px] font-medium text-slate-900">
              {item.name}
            </Text>
            <Text allowFontScaling={false} className="text-[14px] text-slate-400">
              {item.timeLabel}
            </Text>
          </View>
          <Text allowFontScaling={false} numberOfLines={1} className="mt-0.5 text-[14px] text-slate-500">
            {item.subtitle}
          </Text>
          {item.birthdayText ? (
            <Text allowFontScaling={false} numberOfLines={1} className="mt-1 text-[13px] text-slate-400">
              {item.birthdayText}
            </Text>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

export function ContactsGroupsTab({ groupItems, onPressCreateGroup, onPressGroup }: ContactsGroupsTabProps) {
  const groupCount = groupItems.length;

  return (
    <View className="pb-4">
      <View className="bg-white px-5 py-4">
        <Pressable className="flex-row items-center" onPress={onPressCreateGroup}>
          <View className="h-[52px] w-[52px] items-center justify-center rounded-full bg-sky-100">
            <Ionicons name="person-add-outline" size={28} color="#1e98f3" />
          </View>
          <Text allowFontScaling={false} className="ml-4 text-[17px] text-slate-900">
            Tạo nhóm mới
          </Text>
        </Pressable>
      </View>

      <View className="my-2 h-2 bg-slate-100" />

      <View className="flex-row items-center px-5 py-3">
        <Text allowFontScaling={false} className="text-[17px] font-semibold text-slate-900">
          Nhóm đang tham gia ({groupCount})
        </Text>
        <View className="ml-auto flex-row items-center">
          <Ionicons name="swap-vertical-outline" size={18} color="#9ca3af" />
          <Text allowFontScaling={false} className="ml-1 text-[16px] text-slate-400">
            Sắp xếp
          </Text>
        </View>
      </View>

      <View className="bg-white">
        {groupItems.length === 0 ? (
          <Text allowFontScaling={false} className="px-5 py-6 text-center text-[14px] text-slate-500">
            Chưa có nhóm nào.
          </Text>
        ) : (
          groupItems.map((item) => (
            <GroupRow key={item.id} item={item} onPress={() => onPressGroup?.(item.id)} />
          ))
        )}
      </View>
    </View>
  );
}

