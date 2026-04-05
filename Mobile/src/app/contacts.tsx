import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ContactsFriendsTab } from '@/components/contacts/contacts-friends-tab';
import { ContactsGroupsTab } from '@/components/contacts/contacts-groups-tab';
import { ContactsHeader } from '@/components/contacts/contacts-header';
import { ContactsOaTab } from '@/components/contacts/contacts-oa-tab';
import { ContactsTabs } from '@/components/contacts/contacts-tabs';
import { MessagesBottomTabs } from '@/components/messages/messages-bottom-tabs';
import { AppStatusBarBlue } from '@/components/ui/app-status-bar-blue';
import { friendActions, friendContacts, groupItems, oaItems, type ContactsSubTab } from '@/mock/contacts-data';

export default function ContactsScreen() {
  const [activeTab, setActiveTab] = useState<ContactsSubTab>('friends');

  return (
    <View className="flex-1 bg-[#f3f4f6]">
      <AppStatusBarBlue />
      <SafeAreaView edges={['top']} className="bg-[#1e98f3]" />
      <ContactsHeader />
      <ContactsTabs activeTab={activeTab} onChange={setActiveTab} />

      <ScrollView className="flex-1 bg-[#f3f4f6]" showsVerticalScrollIndicator={false}>
        {activeTab === 'friends' ? <ContactsFriendsTab friendActions={friendActions} friendContacts={friendContacts} /> : null}
        {activeTab === 'groups' ? <ContactsGroupsTab groupItems={groupItems} /> : null}
        {activeTab === 'oa' ? <ContactsOaTab oaItems={oaItems} /> : null}
      </ScrollView>

      <MessagesBottomTabs activeTab="contacts" />
      <SafeAreaView edges={['bottom']} className="bg-white" />
    </View>
  );
}

