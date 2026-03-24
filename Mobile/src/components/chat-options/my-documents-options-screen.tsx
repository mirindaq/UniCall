import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  myDocumentsActionCards,
  myDocumentsUsageParts,
  myDocumentsUsageText,
} from '@/mock/my-documents-options-data';

interface MyDocumentsOptionsScreenProps {
  onBack: () => void;
}

export function MyDocumentsOptionsScreen({ onBack }: MyDocumentsOptionsScreenProps) {
  const totalRatio = myDocumentsUsageParts.reduce((sum, part) => sum + part.ratio, 0);

  return (
    <View className="flex-1 bg-[#d8dde3]">
      <SafeAreaView edges={['top']} className="bg-[#1e98f3]" />

      <View className="bg-[#1e98f3] px-4 pb-3 pt-2">
        <View className="flex-row items-center">
          <Pressable className="mr-2 h-10 w-10 items-center justify-center rounded-full" onPress={onBack}>
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
          </Pressable>
          <Text allowFontScaling={false} className="flex-1 text-[18px] font-semibold text-white">
            My Documents
          </Text>
          <Pressable className="h-10 w-10 items-center justify-center rounded-full">
            <Ionicons name="help-circle-outline" size={30} color="#ffffff" />
          </Pressable>
          <Pressable className="h-10 w-10 items-center justify-center rounded-full">
            <Ionicons name="settings-outline" size={28} color="#ffffff" />
          </Pressable>
        </View>
      </View>

      <View className="flex-1 bg-[#f5f6f8]">
        <View className="items-center px-6 py-8">
          <View className="relative h-[94px] w-[94px] items-center justify-center rounded-full bg-[#3b82f6]">
            <Ionicons name="folder-open-outline" size={48} color="#dbeafe" />
            <View className="absolute -bottom-0.5 -right-0.5 h-[24px] w-[24px] items-center justify-center rounded-full bg-amber-400">
              <Ionicons name="checkmark" size={14} color="#ffffff" />
            </View>
          </View>

          <Text allowFontScaling={false} className="mt-5 text-[22px] font-semibold text-slate-900">
            My Documents
          </Text>
          <Text allowFontScaling={false} className="mt-3 text-center text-[17px] leading-7 text-slate-500">
            Lưu trữ và truy cập nhanh những nội dung quan trọng của bạn ngay trên Zalo
          </Text>
        </View>

        <View className="border-t border-slate-200 bg-white px-5 py-5">
          <View className="flex-row items-center">
            <Text allowFontScaling={false} className="text-[16px] font-semibold text-slate-900">
              Dung lượng
            </Text>
            <Text allowFontScaling={false} className="ml-auto text-[16px] font-semibold text-slate-400">
              {myDocumentsUsageText.used} / {myDocumentsUsageText.total}
            </Text>
          </View>

          <View className="mt-4 h-[36px] overflow-hidden rounded-md bg-slate-200">
            <View className="h-full flex-row">
              {myDocumentsUsageParts.map((part) => (
                <View
                  key={part.id}
                  style={{ width: `${(part.ratio / totalRatio) * 100}%`, backgroundColor: part.color }}
                />
              ))}
              <View className="flex-1 bg-slate-200" />
            </View>
          </View>

          <View className="mt-4 flex-row items-center">
            {myDocumentsUsageParts.map((part) => (
              <View key={part.id} className="mr-6 flex-row items-center">
                <View className="h-4 w-4 rounded-full" style={{ backgroundColor: part.color }} />
                <Text allowFontScaling={false} className="ml-2 text-[15px] text-slate-500">
                  {part.label}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {myDocumentsActionCards.map((card) => (
          <View key={card.id} className="mt-3 border-t border-slate-200 bg-white px-5 py-5">
            <Text allowFontScaling={false} className="text-[18px] font-semibold text-slate-900">
              {card.title}
            </Text>
            <Text allowFontScaling={false} className="mt-2 text-[17px] leading-7 text-slate-500">
              {card.description}
            </Text>
            <Pressable
              className={`mt-5 self-start rounded-full px-8 py-3 ${
                card.buttonVariant === 'blue' ? 'bg-sky-100' : 'bg-gray-200'
              }`}>
              <Text
                allowFontScaling={false}
                className={`text-[18px] font-semibold ${
                  card.buttonVariant === 'blue' ? 'text-[#1e66ef]' : 'text-slate-900'
                }`}>
                {card.buttonLabel}
              </Text>
            </Pressable>
          </View>
        ))}
      </View>

      <SafeAreaView edges={['bottom']} className="bg-[#d8dde3]" />
    </View>
  );
}

