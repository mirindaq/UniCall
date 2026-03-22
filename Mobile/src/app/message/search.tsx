import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ConversationAvatar } from '@/components/messages/conversation-avatar';
import { AppStatusBarBlue } from '@/components/ui/app-status-bar-blue';
import { searchContacts, searchKeyword, searchMessages, type SearchContactItem, type SearchMessageItem } from '@/mock/chat-search-data';

type SearchTab = 'all' | 'contacts' | 'messages';

function HighlightedText({ text, keyword, className }: { text: string; keyword: string; className: string }) {
  const lowerText = text.toLowerCase();
  const lowerKeyword = keyword.toLowerCase();
  const matchIndex = lowerText.indexOf(lowerKeyword);

  if (matchIndex < 0) {
    return (
      <Text allowFontScaling={false} className={className}>
        {text}
      </Text>
    );
  }

  const before = text.slice(0, matchIndex);
  const match = text.slice(matchIndex, matchIndex + keyword.length);
  const after = text.slice(matchIndex + keyword.length);

  return (
    <Text allowFontScaling={false} className={className}>
      {before}
      <Text className="text-[#1e98f3]">{match}</Text>
      {after}
    </Text>
  );
}

function SearchHeader({
  keyword,
  onChangeKeyword,
  onBack,
}: {
  keyword: string;
  onChangeKeyword: (value: string) => void;
  onBack: () => void;
}) {
  return (
    <View className="bg-[#1e98f3] px-3.5 pb-2.5 pt-2.5">
      <View className="flex-row items-center">
        <Pressable className="mr-1 h-9 w-9 items-center justify-center rounded-full" onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </Pressable>

        <View className="mr-2 h-[42px] flex-1 flex-row items-center rounded-2xl bg-white px-3.5">
          <Ionicons name="search-outline" size={23} color="#737373" />
          <TextInput
            value={keyword}
            onChangeText={onChangeKeyword}
            className="ml-2.5 flex-1 text-[18px] text-slate-900"
            placeholder="Tìm kiếm"
            placeholderTextColor="#9ca3af"
            autoFocus
            selectionColor="#1e98f3"
            allowFontScaling={false}
          />
          <Pressable
            className="h-7 w-7 items-center justify-center rounded-full bg-slate-400"
            onPress={() => {
              onChangeKeyword('');
            }}>
            <Ionicons name="close" size={17} color="#ffffff" />
          </Pressable>
        </View>

        <Pressable className="h-9 w-9 items-center justify-center rounded-full">
          <Ionicons name="qr-code-outline" size={25} color="#ffffff" />
        </Pressable>
      </View>
    </View>
  );
}

function SearchTabs({ activeTab, onChange }: { activeTab: SearchTab; onChange: (tab: SearchTab) => void }) {
  const tabs: { id: SearchTab; label: string }[] = [
    { id: 'all', label: 'Tất cả' },
    { id: 'contacts', label: 'Liên hệ' },
    { id: 'messages', label: 'Tin nhắn' },
  ];

  return (
    <View className="border-b border-slate-200 bg-white">
      <View className="flex-row px-5 pt-3">
        {tabs.map((tab) => {
          const active = tab.id === activeTab;
          return (
            <Pressable key={tab.id} className="mr-8 pb-3" onPress={() => onChange(tab.id)}>
              <Text allowFontScaling={false} className={active ? 'text-[17px] font-semibold text-slate-900' : 'text-[17px] text-slate-400'}>
                {tab.label}
              </Text>
              <View className={active ? 'mt-2 h-[3px] w-full rounded-full bg-slate-900' : 'mt-2 h-[3px] w-full'} />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function ContactRow({ item, keyword }: { item: SearchContactItem; keyword: string }) {
  return (
    <View className="flex-row items-center px-5 py-3.5">
      <ConversationAvatar avatar={item.avatar} size={46} />
      <View className="ml-4 flex-1">
        <HighlightedText text={item.name} keyword={keyword} className="text-[16px] text-slate-900" />
        {item.subtitle ? <HighlightedText text={item.subtitle} keyword={keyword} className="mt-0.5 text-[14px] text-slate-400" /> : null}
      </View>
      {item.canCall ? (
        <View className="h-[50px] w-[50px] items-center justify-center rounded-full bg-sky-100">
          <Ionicons name="call" size={22} color="#1e98f3" />
        </View>
      ) : null}
    </View>
  );
}

function MessageRow({ item, keyword }: { item: SearchMessageItem; keyword: string }) {
  return (
    <View className="px-5 py-3.5">
      <View className="flex-row">
        <ConversationAvatar avatar={item.avatar} size={46} />
        <View className="ml-4 flex-1">
          <View className="flex-row items-center">
            <Text allowFontScaling={false} className="flex-1 text-[16px] text-slate-900">
              {item.name}
            </Text>
            <Text allowFontScaling={false} className="text-[14px] text-slate-400">
              {item.timeLabel}
            </Text>
          </View>
          <HighlightedText text={item.excerpt} keyword={keyword} className="mt-0.5 text-[14px] text-slate-400" />
          <View className="mt-1 flex-row items-center">
            <Text allowFontScaling={false} className="text-[14px] font-semibold text-slate-900">
              {item.matchCount}
            </Text>
            <Ionicons name="chevron-forward" size={18} color="#6b7280" />
          </View>
        </View>
      </View>
    </View>
  );
}

export default function MessageSearchScreen() {
  const router = useRouter();
  const [keyword, setKeyword] = useState(searchKeyword);
  const [activeTab, setActiveTab] = useState<SearchTab>('all');

  const showContacts = activeTab === 'all' || activeTab === 'contacts';
  const showMessages = activeTab === 'all' || activeTab === 'messages';

  return (
    <View className="flex-1 bg-[#f3f4f6]">
      <AppStatusBarBlue />
      <SafeAreaView edges={['top']} className="bg-[#1e98f3]" />
      <SearchHeader
        keyword={keyword}
        onChangeKeyword={setKeyword}
        onBack={() => {
          router.back();
        }}
      />

      <SearchTabs activeTab={activeTab} onChange={setActiveTab} />

      <ScrollView className="flex-1 bg-white" showsVerticalScrollIndicator={false}>
        {showContacts ? (
          <View className="pb-2">
            <Text allowFontScaling={false} className="px-5 pb-2 pt-4 text-[17px] font-semibold text-slate-900">
              Liên hệ (47)
            </Text>
            {searchContacts.map((item, index) => (
              <View key={item.id}>
                <ContactRow item={item} keyword={keyword} />
                {index < searchContacts.length - 1 ? <View className="ml-[86px] h-px bg-slate-200" /> : null}
              </View>
            ))}
            {activeTab === 'all' ? (
              <View className="mt-2 border-t border-slate-200 py-3">
                <Text allowFontScaling={false} className="text-center text-[17px] font-semibold text-slate-900">
                  Xem thêm
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {showMessages ? (
          <View className="mt-2 border-t-8 border-[#f3f4f6] pb-2">
            <Text allowFontScaling={false} className="px-5 pb-2 pt-4 text-[17px] font-semibold text-slate-900">
              Tin nhắn (32)
            </Text>
            {searchMessages.map((item, index) => (
              <View key={item.id}>
                <MessageRow item={item} keyword={keyword} />
                {index < searchMessages.length - 1 ? <View className="ml-[86px] h-px bg-slate-200" /> : null}
              </View>
            ))}
            <View className="mt-2 border-t border-slate-200 py-3">
              <Text allowFontScaling={false} className="text-center text-[17px] font-semibold text-slate-900">
                Xem thêm
              </Text>
            </View>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}