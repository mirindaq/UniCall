import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, Text, View } from 'react-native';

export type TabKey =
  | 'messages'
  | 'contacts'
  | 'assistant'
  | 'tasks'
  | 'feeds'
  | 'profile';

interface TabItem {
  key: TabKey;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  activeIcon: React.ComponentProps<typeof Ionicons>['name'];
  badgeText?: string;
}

const tabs: TabItem[] = [
  { key: 'messages', icon: 'chatbubble-ellipses-outline', activeIcon: 'chatbubble-ellipses' },
  { key: 'contacts', icon: 'person-add-outline', activeIcon: 'person-add' },
  { key: 'assistant', icon: 'sparkles-outline', activeIcon: 'sparkles' },
  { key: 'tasks', icon: 'checkmark-circle-outline', activeIcon: 'checkmark-circle' },
  { key: 'feeds', icon: 'card-outline', activeIcon: 'card' },
  { key: 'profile', icon: 'person-outline', activeIcon: 'person' },
];

interface MessagesBottomTabsProps {
  activeTab?: TabKey;
}

const getTabLabel = (key: TabKey) => {
  if (key === 'messages') return 'Tin nhắn';
  if (key === 'contacts') return 'Danh bạ';
  if (key === 'assistant') return 'AI';
  if (key === 'tasks') return 'Task';
  if (key === 'feeds') return 'Tường nhà';
  if (key === 'profile') return 'Cá nhân';
  return '';
};

const ACTIVE = '#1e98f3';
const INACTIVE = '#94a3b8';

export function MessagesBottomTabs({ activeTab = 'messages' }: MessagesBottomTabsProps) {
  const router = useRouter();

  const handleTabPress = (tab: TabKey) => {
    if (tab === 'messages') {
      router.replace('/message');
      return;
    }
    if (tab === 'contacts') {
      router.replace('/contacts');
      return;
    }
    if (tab === 'assistant') {
      router.replace('/assistant' as never);
      return;
    }
    if (tab === 'tasks') {
      router.replace('/tasks' as never);
      return;
    }
    if (tab === 'feeds') {
      router.replace('/feeds');
      return;
    }
    if (tab === 'profile') {
      router.replace('/profile');
    }
  };

  return (
    <View className="border-t border-slate-100 bg-white px-2 pb-1.5 pt-2 shadow-[0_-4px_16px_rgba(15,23,42,0.06)]">
      <View className="flex-row items-start justify-between">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <Pressable
              key={tab.key}
              className="flex-1 items-center py-0.5"
              onPress={() => handleTabPress(tab.key)}>
              <View
                className={`relative h-9 w-9 items-center justify-center rounded-2xl ${
                  isActive ? 'bg-sky-50' : ''
                }`}>
                <Ionicons
                  name={isActive ? tab.activeIcon : tab.icon}
                  size={23}
                  color={isActive ? ACTIVE : INACTIVE}
                />
                {tab.badgeText ? (
                  <View className="absolute -right-2 -top-1 rounded-full bg-red-500 px-1.5 py-0.5">
                    <Text allowFontScaling={false} className="text-[10px] font-semibold text-white">
                      {tab.badgeText}
                    </Text>
                  </View>
                ) : null}
              </View>
              <Text
                allowFontScaling={false}
                className={`mt-0.5 text-[10px] ${
                  isActive ? 'font-semibold text-[#1e98f3]' : 'text-slate-400'
                }`}>
                {getTabLabel(tab.key)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
