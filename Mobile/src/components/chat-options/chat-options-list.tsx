import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useMemo, useState } from 'react';
import { Switch, Text, View } from 'react-native';

import type { ChatOptionItem } from '@/mock/chat-options-data';

interface ChatOptionsListProps {
  sections: ChatOptionItem[][];
}

function OptionRow({ item }: { item: ChatOptionItem }) {
  const [enabled, setEnabled] = useState(Boolean(item.switchValue));

  return (
    <View className="bg-white px-5">
      <View className="flex-row items-center py-4">
        <View className="h-9 w-9 items-center justify-center rounded-full">
          <Ionicons name={item.icon} size={27} color={item.danger ? '#ef4444' : '#9ca3af'} />
        </View>

        <View className="ml-4 flex-1">
          <View className="flex-row items-center">
            <Text allowFontScaling={false} className={item.danger ? 'text-[17px] text-red-500' : 'text-[17px] text-slate-900'}>
              {item.label}
            </Text>
            {item.trailingText ? (
              <Text allowFontScaling={false} className="ml-2 text-[17px] text-slate-400">
                {item.trailingText}
              </Text>
            ) : null}
          </View>
          {item.subtitle ? (
            <Text allowFontScaling={false} className="mt-1 text-[15px] text-slate-400">
              {item.subtitle}
            </Text>
          ) : null}
        </View>

        {item.hasSwitch ? (
          <Switch
            value={enabled}
            onValueChange={setEnabled}
            trackColor={{ false: '#e5e7eb', true: '#7cc9ff' }}
            thumbColor={enabled ? '#1e98f3' : '#ffffff'}
          />
        ) : null}

        {item.chevron ? <Ionicons name="chevron-forward" size={24} color="#111827" /> : null}
      </View>
    </View>
  );
}

export function ChatOptionsList({ sections }: ChatOptionsListProps) {
  const flatRows = useMemo(
    () =>
      sections.map((section, index) => ({
        id: `section-${index}`,
        rows: section,
      })),
    [sections]
  );

  return (
    <View className="pb-4">
      {flatRows.map((section, sectionIndex) => (
        <View key={section.id} className={sectionIndex === 0 ? 'mt-2' : 'mt-3'}>
          {section.rows.map((item, itemIndex) => (
            <View key={item.id}>
              <OptionRow item={item} />
              {itemIndex < section.rows.length - 1 ? <View className="ml-[74px] h-px bg-slate-200" /> : null}
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

