import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { Text, View } from 'react-native';

interface ChatOptionsMediaStripProps {
  labels: string[];
}

export function ChatOptionsMediaStrip({ labels }: ChatOptionsMediaStripProps) {
  return (
    <View className="bg-white px-5 py-4">
      <Text allowFontScaling={false} className="text-[17px] text-slate-900">
        Ảnh, file, link
      </Text>

      <View className="mt-3 flex-row">
        {labels.map((label, index) => (
          <View
            key={`${label}-${index}`}
            className="mr-1.5 h-[78px] w-[78px] items-center justify-center rounded-md bg-slate-300">
            <Text allowFontScaling={false} className="text-[13px] text-slate-700">
              {label}
            </Text>
          </View>
        ))}
        <View className="h-[78px] w-[78px] items-center justify-center rounded-md bg-sky-100">
          <Ionicons name="arrow-forward" size={30} color="#1e98f3" />
        </View>
      </View>
    </View>
  );
}

