import React from "react";
import { Text, View } from "react-native";

interface ProfileIdentityProps {
  name: string;
  initials: string;
}

export function ProfileIdentity({ name, initials }: ProfileIdentityProps) {
  return (
    <View className="bg-white px-5 py-4">
      <View className="flex-row items-center">
        <View className="h-[60] w-[60] items-center justify-center rounded-full bg-slate-800">
          <Text
            allowFontScaling={false}
            className="text-[30px] font-semibold text-white"
          >
            {initials}
          </Text>
        </View>
        <View className="ml-4">
          <Text allowFontScaling={false} className="text-[20px] text-slate-900">
            {name}
          </Text>
        </View>
      </View>
    </View>
  );
}
