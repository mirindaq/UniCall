import Ionicons from "@expo/vector-icons/Ionicons";
import React from "react";
import { Pressable, Text, View } from "react-native";

interface ChatDetailHeaderProps {
  title: string;
  onBack: () => void;
  onOpenOptions: () => void;
  onStartAudioCall?: () => void;
  onStartVideoCall?: () => void;
  audioCallDisabled?: boolean;
  videoCallDisabled?: boolean;
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
    <View className="bg-[#1e98f3] px-3.5 pb-2.5 pt-2.5">
      <View className="flex-row items-center">
        <Pressable
          className="mr-1.5 h-9 w-9 items-center justify-center rounded-full"
          onPress={onBack}
        >
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </Pressable>

        <Text
          allowFontScaling={false}
          numberOfLines={1}
          className="flex-1 text-[17px] font-semibold text-white"
        >
          {title}
        </Text>

        <Pressable
          className="h-9 w-9 items-center justify-center rounded-full"
          onPress={onStartAudioCall}
          disabled={audioCallDisabled}
          style={audioCallDisabled ? { opacity: 0.45 } : undefined}
        >
          <Ionicons name="call-outline" size={22} color="#ffffff" />
        </Pressable>
        <Pressable
          className="ml-2.5 h-9 w-9 items-center justify-center rounded-full"
          onPress={onStartVideoCall}
          disabled={videoCallDisabled}
          style={videoCallDisabled ? { opacity: 0.45 } : undefined}
        >
          <Ionicons name="videocam-outline" size={24} color="#ffffff" />
        </Pressable>
        <Pressable className="ml-2.5 h-9 w-9 items-center justify-center rounded-full" onPress={onOpenOptions}>
          <Ionicons name="list-outline" size={25} color="#ffffff" />
        </Pressable>
      </View>
    </View>
  );
}
