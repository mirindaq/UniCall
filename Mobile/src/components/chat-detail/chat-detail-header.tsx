import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { Pressable, Text, View } from 'react-native';

interface ChatDetailHeaderProps {
  title: string;
  onBack: () => void;
  onOpenOptions: () => void;
  onStartAudioCall?: () => void;
  onStartVideoCall?: () => void;
  audioCallDisabled?: boolean;
  videoCallDisabled?: boolean;
}

function HeaderIconButton({
  icon,
  onPress,
  disabled,
  size = 22,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  disabled?: boolean;
  size?: number;
}) {
  return (
    <Pressable
      className="h-9 w-9 items-center justify-center rounded-full bg-white/18"
      onPress={onPress}
      disabled={disabled}
      style={disabled ? { opacity: 0.4 } : undefined}>
      <Ionicons name={icon} size={size} color="#ffffff" />
    </Pressable>
  );
}

export function ChatDetailHeader({
  title,
  onBack,
  onOpenOptions,
  onStartAudioCall,
  onStartVideoCall,
  audioCallDisabled = false,
  videoCallDisabled = false,
}: ChatDetailHeaderProps) {
  return (
    <View className="border-b border-sky-400/30 bg-[#1e98f3] px-3.5 pb-3 pt-2 shadow-sm shadow-sky-900/10">
      <View className="flex-row items-center">
        <HeaderIconButton icon="arrow-back" onPress={onBack} />

        <Text
          allowFontScaling={false}
          numberOfLines={1}
          className="mx-2 min-w-0 flex-1 text-[17px] font-semibold text-white">
          {title}
        </Text>

        <View className="flex-row items-center gap-1.5">
          <HeaderIconButton
            icon="call-outline"
            onPress={onStartAudioCall}
            disabled={audioCallDisabled}
          />
          <HeaderIconButton
            icon="videocam-outline"
            onPress={onStartVideoCall}
            disabled={videoCallDisabled}
            size={23}
          />
          <HeaderIconButton icon="ellipsis-horizontal" onPress={onOpenOptions} size={22} />
        </View>
      </View>
    </View>
  );
}
