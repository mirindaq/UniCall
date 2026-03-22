import Ionicons from "@expo/vector-icons/Ionicons";
import React from "react";
import { Text, View } from "react-native";

import type { MockAvatar } from "@/mock/chat-conversations";
import type { ChatQuickAction } from "@/mock/chat-options-data";

interface ChatOptionsProfileCardProps {
  name: string;
  avatar: MockAvatar;
  quickActions: ChatQuickAction[];
}

function BigAvatar({ avatar }: { avatar: MockAvatar }) {
  const textColor = avatar.textColor ?? "#ffffff";

  return (
    <View
      className="h-[80px] w-[80px] items-center justify-center rounded-full"
      style={{ backgroundColor: avatar.backgroundColor }}
    >
      <Text
        allowFontScaling={false}
        className={
          avatar.type === "emoji" ? "text-[62px]" : "text-[50px] font-semibold"
        }
        style={{ color: textColor }}
      >
        {avatar.value}
      </Text>
    </View>
  );
}

export function ChatOptionsProfileCard({
  name,
  avatar,
  quickActions,
}: ChatOptionsProfileCardProps) {
  return (
    <View className="bg-white px-5 py-6">
      <View className="items-center">
        <BigAvatar avatar={avatar} />
        <Text
          allowFontScaling={false}
          className="mt-5 text-[24px] font-semibold text-slate-900"
        >
          {name}
        </Text>
      </View>

      <View className="mt-5 flex-row justify-between">
        {quickActions.map((action) => (
          <View key={action.id} className="w-[66px] items-center">
            <View className="h-[46px] w-[46px] items-center justify-center rounded-full bg-slate-100">
              <Ionicons name={action.icon} size={24} color="#111827" />
            </View>
            <Text
              allowFontScaling={false}
              className="mt-1.5 text-center text-[13px] leading-[18px] text-slate-900"
            >
              {action.label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
