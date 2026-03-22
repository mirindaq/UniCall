import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { Text, View } from 'react-native';

import { ConversationAvatar } from '@/components/messages/conversation-avatar';
import type { OaContactItem } from '@/mock/contacts-data';

interface ContactsOaTabProps {
  oaItems: OaContactItem[];
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

export function ContactsOaTab({ oaItems }: ContactsOaTabProps) {
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

