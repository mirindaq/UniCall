import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useMemo } from 'react';
import { Text, View } from 'react-native';

import { ConversationAvatar } from '@/components/messages/conversation-avatar';
import type { FriendActionItem, FriendContactItem } from '@/mock/contacts-data';

interface ContactsFriendsTabProps {
  friendActions: FriendActionItem[];
  friendContacts: FriendContactItem[];
}

function FriendActionRow({ action }: { action: FriendActionItem }) {
  const iconName = action.type === 'birthday' ? 'gift' : 'person-add';

  return (
    <View className="flex-row items-center px-5 py-4">
      <View className="h-[42px] w-[42px] items-center justify-center rounded-full bg-[#1e98f3]">
        <Ionicons name={iconName} size={23} color="#ffffff" />
      </View>
      <Text allowFontScaling={false} className="ml-4 text-[17px] text-slate-900">
        {action.title}
        {action.countText ? ` (${action.countText})` : ''}
      </Text>
    </View>
  );
}

function FriendContactRow({ item }: { item: FriendContactItem }) {
  return (
    <View className="flex-row items-center px-5 py-4">
      <ConversationAvatar avatar={item.avatar} />
      <Text allowFontScaling={false} className="ml-4 flex-1 text-[17px] text-slate-900">
        {item.name}
      </Text>
      <Ionicons name="call-outline" size={24} color="#374151" />
      <View className="ml-[22px]">
        <Ionicons name="videocam-outline" size={24} color="#374151" />
      </View>
    </View>
  );
}

export function ContactsFriendsTab({ friendActions, friendContacts }: ContactsFriendsTabProps) {
  const sections = useMemo(() => {
    const bySection = new Map<string, FriendContactItem[]>();
    friendContacts.forEach((item) => {
      const section = item.section ?? '';
      const existing = bySection.get(section) ?? [];
      existing.push(item);
      bySection.set(section, existing);
    });
    return Array.from(bySection.entries());
  }, [friendContacts]);

  return (
    <View className="pb-4">
      <View className="bg-white">
        {friendActions.map((action) => (
          <FriendActionRow key={action.id} action={action} />
        ))}
      </View>

      <View className="my-2 h-2 bg-slate-100" />

      <View className="flex-row items-center px-5 py-3">
        <View className="rounded-full bg-slate-200 px-4 py-2">
          <Text allowFontScaling={false} className="text-[14px] font-semibold text-slate-900">
            Tất cả 93
          </Text>
        </View>
        <View className="ml-3 rounded-full border border-slate-300 px-4 py-2">
          <Text allowFontScaling={false} className="text-[14px] text-slate-500">
            Mới truy cập 5
          </Text>
        </View>
      </View>

      {sections.map(([section, items]) => (
        <View key={section}>
          <View className="flex-row items-center border-b border-slate-100 px-5 py-2.5">
            <Text allowFontScaling={false} className="text-[15px] font-semibold text-slate-900">
              {section}
            </Text>
            {section === 'Bạn thân' ? (
              <Text allowFontScaling={false} className="ml-auto text-[15px] font-semibold text-[#1e98f3]">
                + Thêm
              </Text>
            ) : null}
          </View>
          {items.map((item) => (
            <FriendContactRow key={item.id} item={item} />
          ))}
        </View>
      ))}
    </View>
  );
}

