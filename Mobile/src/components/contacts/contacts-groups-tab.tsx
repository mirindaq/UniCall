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
    <Pressable
      className="mx-3 mb-2 flex-row items-center rounded-2xl border border-slate-100 bg-white px-4 py-3.5 shadow-sm shadow-slate-200/50"
      style={({ pressed }) => ({ opacity: pressed ? 0.94 : 1 })}
      onPress={onPress}>
      <View className="h-[50px] w-[50px] items-center justify-center rounded-full bg-sky-50">
        <Ionicons name="people" size={24} color="#1e98f3" />
      </View>
      <View className="ml-3.5 min-w-0 flex-1">
        <View className="flex-row items-start justify-between gap-2">
          <Text
            allowFontScaling={false}
            numberOfLines={1}
            className="min-w-0 flex-1 text-[16px] font-semibold text-slate-900">
            {item.name}
          </Text>
          <Text allowFontScaling={false} className="shrink-0 text-[12px] text-slate-400">
            {item.timeLabel}
          </Text>
        </View>
        <Text allowFontScaling={false} numberOfLines={1} className="mt-0.5 text-[14px] text-slate-500">
          {item.subtitle}
        </Text>
        {item.birthdayText ? (
          <Text allowFontScaling={false} numberOfLines={1} className="mt-1 text-[12px] text-slate-400">
            {item.birthdayText}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

export function ContactsGroupsTab({
  groupItems,
  onPressCreateGroup,
  onPressGroup,
}: ContactsGroupsTabProps) {
  const groupCount = groupItems.length;

  return (
    <View className="pb-4 pt-2">
      <Pressable
        className="mx-3 mb-3 flex-row items-center rounded-2xl border border-slate-100 bg-white px-4 py-3.5 shadow-sm shadow-slate-200/50"
        style={({ pressed }) => ({ opacity: pressed ? 0.94 : 1 })}
        onPress={onPressCreateGroup}>
        <View className="h-[50px] w-[50px] items-center justify-center rounded-full bg-sky-100">
          <Ionicons name="add" size={28} color="#1e98f3" />
        </View>
        <Text allowFontScaling={false} className="ml-3.5 text-[16px] font-medium text-slate-900">
          Tạo nhóm mới
        </Text>
      </Pressable>

      <View className="mx-3 mb-2 flex-row items-center px-1">
        <Text allowFontScaling={false} className="text-[15px] font-semibold text-slate-800">
          Nhóm đang tham gia
        </Text>
        <View className="ml-2 rounded-full bg-sky-100 px-2 py-0.5">
          <Text className="text-[12px] font-semibold text-sky-700">{groupCount}</Text>
        </View>
      </View>

      {groupItems.length === 0 ? (
        <Text
          allowFontScaling={false}
          className="mx-3 rounded-2xl border border-dashed border-slate-200 bg-white px-5 py-10 text-center text-[14px] text-slate-500">
          Chưa có nhóm nào.
        </Text>
      ) : (
        groupItems.map((item) => (
          <GroupRow key={item.id} item={item} onPress={() => onPressGroup?.(item.id)} />
        ))
      )}
    </View>
  );
}
