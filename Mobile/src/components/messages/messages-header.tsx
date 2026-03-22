import Ionicons from "@expo/vector-icons/Ionicons";
import React from "react";
import { Pressable, Text, View } from "react-native";

export function MessagesHeader() {
  return (
    <View className="bg-[#1e98f3] px-5 pb-2.5 pt-2.5">
      <View className="flex-row items-center">
        <Pressable className="mr-2 h-10 w-10 items-center justify-center rounded-full">
          <Ionicons name="search-outline" size={28} color="#ffffff" />
        </Pressable>

        <View className="flex-1">
          <Text className="text-[18px] text-sky-100">Tìm kiếm</Text>
        </View>

        <Pressable className="h-10 w-10 items-center justify-center rounded-full">
          <Ionicons name="qr-code-outline" size={24} color="#ffffff" />
        </Pressable>
        <Pressable className="ml-1 h-10 w-10 items-center justify-center rounded-full">
          <Ionicons name="add" size={32} color="#ffffff" />
        </Pressable>
      </View>
    </View>
  );
}
