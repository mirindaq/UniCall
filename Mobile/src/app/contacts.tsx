import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ConversationAvatar } from '@/components/messages/conversation-avatar';
import { MessagesBottomTabs } from '@/components/messages/messages-bottom-tabs';
import { AppStatusBarBlue } from '@/components/ui/app-status-bar-blue';
import {
  friendActions,
  friendContacts,
  groupItems,
  oaItems,
  type ContactsSubTab,
  type FriendActionItem,
  type FriendContactItem,
  type GroupContactItem,
  type OaContactItem,
} from '@/mock/contacts-data';

const CONTACTS_TABS: { key: ContactsSubTab; label: string }[] = [
  { key: 'friends', label: 'Bạn bè' },
  { key: 'groups', label: 'Nhóm' },
  { key: 'oa', label: 'OA' },
];

function ContactsTopHeader() {
  return (
    <View className="bg-[#1e98f3] px-5 pb-3.5 pt-2">
      <View className="flex-row items-center">
        <View className="mr-2 h-10 w-10 items-center justify-center rounded-full">
          <Ionicons name="search-outline" size={28} color="#ffffff" />
        </View>
        <Text allowFontScaling={false} className="flex-1 text-[18px] text-sky-100">
          Tìm kiếm
        </Text>
        <View className="h-10 w-10 items-center justify-center rounded-full">
          <Ionicons name="person-add-outline" size={27} color="#ffffff" />
        </View>
      </View>
    </View>
  );
}

function TabsBar({ activeTab, onChange }: { activeTab: ContactsSubTab; onChange: (tab: ContactsSubTab) => void }) {
  return (
    <View className="border-b border-slate-200 bg-white">
      <View className="flex-row">
        {CONTACTS_TABS.map((tab) => {
          const isActive = tab.key === activeTab;
          return (
            <Pressable key={tab.key} className="flex-1 items-center py-3" onPress={() => onChange(tab.key)}>
              <Text allowFontScaling={false} className={`text-[16px] ${isActive ? 'font-semibold text-slate-900' : 'text-slate-400'}`}>
                {tab.label}
              </Text>
              <View className={`mt-2 h-1 w-[52px] rounded-full ${isActive ? 'bg-[#1e98f3]' : 'bg-transparent'}`} />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function FriendActionRow({ action }: { action: FriendActionItem }) {
  return (
    <View className="flex-row items-center px-5 py-4">
      <View className="h-[42px] w-[42px] items-center justify-center rounded-full bg-[#1e98f3]">
        <Ionicons name={action.icon} size={23} color="#ffffff" />
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

function OaRow({ item }: { item: OaContactItem }) {
  return (
    <View className="flex-row items-center px-5 py-3.5">
      <ConversationAvatar avatar={item.avatar} isVerified={item.verified} />
      <Text allowFontScaling={false} className="ml-4 text-[17px] text-slate-900">
        {item.name}
      </Text>
    </View>
  );
}

function FriendsTabContent() {
  const sections = useMemo(() => {
    const bySection = new Map<string, FriendContactItem[]>();
    friendContacts.forEach((item) => {
      const section = item.section ?? '';
      const existing = bySection.get(section) ?? [];
      existing.push(item);
      bySection.set(section, existing);
    });
    return Array.from(bySection.entries());
  }, []);

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

function GroupsTabContent() {
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

function OaTabContent() {
  return (
    <View className="pb-4">
      <View className="bg-white px-5 py-4">
        <View className="flex-row items-center">
          <View className="h-[52px] w-[52px] items-center justify-center rounded-full bg-violet-500">
            <Ionicons name="radio-outline" size={25} color="#ffffff" />
          </View>
          <Text allowFontScaling={false} className="ml-4 text-[17px] text-slate-900">
            Tìm thêm Official Account
          </Text>
        </View>
      </View>

      <View className="my-2 h-2 bg-slate-100" />
      <Text allowFontScaling={false} className="px-5 py-2 text-[15px] font-semibold text-slate-700">
        Official Account đã quan tâm
      </Text>
      <View className="bg-white">
        {oaItems.map((item) => (
          <OaRow key={item.id} item={item} />
        ))}
      </View>
    </View>
  );
}

export default function ContactsScreen() {
  const [activeTab, setActiveTab] = useState<ContactsSubTab>('friends');

  return (
    <View className="flex-1 bg-[#f3f4f6]">
      <AppStatusBarBlue />
      <SafeAreaView edges={['top']} className="bg-[#1e98f3]" />
      <ContactsTopHeader />
      <TabsBar activeTab={activeTab} onChange={setActiveTab} />

      <ScrollView className="flex-1 bg-[#f3f4f6]" showsVerticalScrollIndicator={false}>
        {activeTab === 'friends' ? <FriendsTabContent /> : null}
        {activeTab === 'groups' ? <GroupsTabContent /> : null}
        {activeTab === 'oa' ? <OaTabContent /> : null}
      </ScrollView>

      <MessagesBottomTabs activeTab="contacts" />
      <SafeAreaView edges={['bottom']} className="bg-white" />
    </View>
  );
}
