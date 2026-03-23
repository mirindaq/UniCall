import React from 'react';
import { Pressable, Text, View } from 'react-native';

import type { ContactsSubTab } from '@/mock/contacts-data';

const CONTACTS_TABS: { key: ContactsSubTab; label: string }[] = [
  { key: 'friends', label: 'Bạn bè' },
  { key: 'groups', label: 'Nhóm' },
  { key: 'oa', label: 'OA' },
];

interface ContactsTabsProps {
  activeTab: ContactsSubTab;
  onChange: (tab: ContactsSubTab) => void;
}

export function ContactsTabs({ activeTab, onChange }: ContactsTabsProps) {
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

