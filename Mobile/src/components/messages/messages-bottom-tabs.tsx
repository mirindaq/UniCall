import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, Text, View } from 'react-native';

export type TabKey = 'messages' | 'contacts' | 'feeds' | 'profile';

interface TabItem {
  key: TabKey;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  activeIcon: React.ComponentProps<typeof Ionicons>['name'];
  badgeText?: string;
}

const tabs: TabItem[] = [
  { key: 'messages', icon: 'chatbubble-ellipses-outline', activeIcon: 'chatbubble-ellipses' },
  { key: 'contacts', icon: 'person-add-outline', activeIcon: 'person-add' },
  { key: 'feeds', icon: 'newspaper-outline', activeIcon: 'newspaper', badgeText: 'N' },
  { key: 'profile', icon: 'person-outline', activeIcon: 'person' },
];

interface MessagesBottomTabsProps {
  activeTab?: TabKey;
}

const getTabLabel = (key: TabKey) => {
  if (key === 'messages') return 'Tin nhắn';
  if (key === 'contacts') return 'Danh bạ';
  return 'Ẩn';
};

export function MessagesBottomTabs({ activeTab = 'messages' }: MessagesBottomTabsProps) {
  const router = useRouter();

  const handleTabPress = (tab: TabKey) => {
    if (tab === 'messages') {
      router.replace('/message');
      return;
    }
    if (tab === 'contacts') {
      router.replace('/contacts');
    }
  };

  return (
    <View className="border-t border-slate-300 bg-white px-4 pb-2 pt-1.5">
      <View className="flex-row items-start justify-between">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <Pressable key={tab.key} className="w-[76px] items-center" onPress={() => handleTabPress(tab.key)}>
              <View className="relative h-8 items-center justify-center">
                <Ionicons name={isActive ? tab.activeIcon : tab.icon} size={27} color={isActive ? '#1d9bf0' : '#4b5563'} />
                {tab.badgeText ? (
                  <View className="absolute -right-3 -top-2 rounded-full bg-red-500 px-2 py-0.5">
                    <Text allowFontScaling={false} className="text-xs font-semibold text-white">
                      {tab.badgeText}
                    </Text>
                  </View>
                ) : null}
              </View>
              <View className="mt-1 h-[18px] items-center justify-center">
                <Text
                  allowFontScaling={false}
                  className={`text-[13px] ${isActive ? 'font-semibold text-[#1d9bf0]' : 'text-transparent'}`}>
                  {getTabLabel(tab.key)}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

