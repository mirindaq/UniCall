import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { Image, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { ConversationAvatar } from '@/components/messages/conversation-avatar';

export interface ComposerMediaItem {
  uri: string;
  type: 'image' | 'video';
}

interface FeedsComposerCardProps {
  myAvatar?: string | null;
  content?: string;
  isSubmitting?: boolean;
  selectedMedia?: ComposerMediaItem[];
  onChangeContent?: (value: string) => void;
  onSubmit?: () => void;
  onPickMedia?: () => void;
  onRemoveMedia?: (index: number) => void;
}

export function FeedsComposerCard({
  myAvatar,
  content = '',
  isSubmitting = false,
  selectedMedia = [],
  onChangeContent = () => undefined,
  onSubmit = () => undefined,
  onPickMedia = () => undefined,
  onRemoveMedia = () => undefined,
}: FeedsComposerCardProps) {
  const normalizedContent = typeof content === 'string' ? content : '';
  const isSubmitDisabled = isSubmitting || (normalizedContent.trim().length === 0 && selectedMedia.length === 0);

  return (
    <View className="bg-white px-5 py-4">
      <View className="flex-row items-start">
        <ConversationAvatar
          avatar={{ type: 'initials', value: 'U', backgroundColor: '#111827' }}
          avatarUrl={myAvatar}
        />
        <View className="ml-3 flex-1">
          <TextInput
            value={normalizedContent}
            onChangeText={onChangeContent}
            placeholder="Hôm nay bạn thế nào?"
            placeholderTextColor="#9ca3af"
            multiline
            className="min-h-[72px] rounded-2xl bg-slate-100 px-4 py-3 text-[15px] text-slate-900"
          />

          {selectedMedia.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-3">
              {selectedMedia.map((item, index) => (
                <View key={`${item.uri}-${index}`} className="mr-2">
                  <Image source={{ uri: item.uri }} className="h-[100px] w-[100px] rounded-xl bg-slate-200" />
                  <Pressable
                    onPress={() => onRemoveMedia(index)}
                    className="absolute -right-1 -top-1 h-6 w-6 items-center justify-center rounded-full bg-black/70">
                    <Ionicons name="close" size={14} color="#ffffff" />
                  </Pressable>
                  {item.type === 'video' ? (
                    <View className="absolute bottom-1 right-1 rounded-full bg-black/70 px-2 py-0.5">
                      <Text className="text-[10px] text-white">VIDEO</Text>
                    </View>
                  ) : null}
                </View>
              ))}
            </ScrollView>
          ) : null}

          <View className="mt-3 flex-row">
            <Pressable onPress={onPickMedia} className="mr-2 flex-row items-center rounded-full bg-slate-100 px-4 py-2">
              <Ionicons name="image" size={16} color="#22c55e" />
              <Text className="ml-2 text-[13px] text-slate-800">Ảnh/Video</Text>
            </Pressable>
          </View>

          <View className="mt-3 flex-row justify-end">
            <Pressable
              disabled={isSubmitDisabled}
              onPress={onSubmit}
              className={`flex-row items-center rounded-full px-4 py-2.5 ${
                isSubmitDisabled ? 'bg-slate-300' : 'bg-[#1e98f3]'
              }`}>
              <Ionicons name="send" size={15} color="#ffffff" />
              <Text className="ml-2 text-[14px] font-semibold text-white">
                {isSubmitting ? 'Đang đăng...' : 'Đăng'}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}
