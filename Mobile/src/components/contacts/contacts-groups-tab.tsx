import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { Text, View } from 'react-native';

import type { GroupContactItem } from '@/mock/contacts-data';

interface ContactsGroupsTabProps {
  groupItems: GroupContactItem[];
}

function GroupRow({ item }: { item: GroupContactItem }) {
  return (
    <View className="border-b border-slate-100 px-5 py-3">
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
    </View>
  );
}

export function ContactsGroupsTab({ groupItems }: ContactsGroupsTabProps) {
  return (
    <View className="pb-4">
      <View className="bg-white px-5 py-4">
        <View className="flex-row items-center">
          <View className="h-[52px] w-[52px] items-center justify-center rounded-full bg-sky-100">
            <Ionicons name="person-add-outline" size={28} color="#1e98f3" />
          </View>
          <Text allowFontScaling={false} className="ml-4 text-[17px] text-slate-900">
            Tạo nhóm mới
          </Text>
        </View>
      </View>

      <View className="my-2 h-2 bg-slate-100" />

      <View className="flex-row items-center px-5 py-3">
        <Text allowFontScaling={false} className="text-[17px] font-semibold text-slate-900">
          Nhóm đang tham gia (62)
        </Text>
        <View className="ml-auto flex-row items-center">
          <Ionicons name="swap-vertical-outline" size={18} color="#9ca3af" />
          <Text allowFontScaling={false} className="ml-1 text-[16px] text-slate-400">
            Sắp xếp
          </Text>
        </View>
      </View>

      <View className="bg-white">
        {groupItems.map((item) => (
          <GroupRow key={item.id} item={item} />
        ))}
      </View>
    </View>
  );
}

