import { useRouter } from "expo-router";
import React, { useEffect } from "react";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { authTokenStore } from "@/configurations/axios.config";

const PAGE_DOTS = 5;
const ACTIVE_DOT_INDEX = 4;

export default function HomeScreen() {
  const router = useRouter();

  useEffect(() => {
    void (async () => {
      const accessToken = await authTokenStore.get();
      if (accessToken) {
        router.replace("/message");
      }
    })();
  }, [router]);

  return (
    <SafeAreaView
      className="flex-1 bg-slate-100 px-6 pb-5"
      edges={["top", "bottom"]}
    >
      <View className="mt-2 items-end">
        <Pressable className="flex-row items-center gap-2.5 rounded-full border border-slate-300 bg-slate-50 px-4 py-2">
          <Text className="text-base font-medium text-slate-800">
            Tiếng Việt
          </Text>
          <Text className="-mt-1 text-lg text-slate-800">v</Text>
        </Pressable>
      </View>

      <View className="relative flex-1 items-center justify-center">
        <View className="absolute left-[50px] top-[150px] h-[22px] w-[52px] rounded-full border border-slate-200" />
        <View className="absolute -left-3 top-[280px] h-[22px] w-[52px] rounded-full border border-slate-200" />
        <View className="absolute right-0 top-[250px] h-[22px] w-[52px] rounded-full border border-slate-200" />

        <Text className="mb-4 text-[82px] font-bold tracking-wide text-blue-600">
          Unicall
        </Text>

        <View className="absolute -left-8 -right-8 bottom-[72px] h-[84px] flex-row items-end justify-between border-t border-slate-200 px-4">
          <View className="h-[68px] w-[34px] rounded-t-sm border border-b-0 border-slate-200" />
          <View className="h-[52px] w-[34px] rounded-t-sm border border-b-0 border-slate-200" />
          <View className="h-[40px] w-[34px] rounded-t-sm border border-b-0 border-slate-200" />
          <View className="h-[46px] w-[48px] rounded-t-sm border border-b-0 border-slate-200" />
          <View className="h-[52px] w-[34px] rounded-t-sm border border-b-0 border-slate-200" />
          <View className="h-[68px] w-[34px] rounded-t-sm border border-b-0 border-slate-200" />
        </View>
      </View>

      <View className="mb-11 flex-row self-center gap-2.5">
        {Array.from({ length: PAGE_DOTS }).map((_, index) => (
          <View
            key={index}
            className={`h-2 w-2 rounded-full ${index === ACTIVE_DOT_INDEX ? "bg-blue-600" : "bg-slate-300"}`}
          />
        ))}
      </View>

      <View className="gap-3.5 mb-5">
        <Pressable
          className="items-center justify-center rounded-full bg-blue-600 py-4 mx-5"
          onPress={() => router.push("/login")}
        >
          <Text className="text-lg font-semibold text-white">Đăng nhập</Text>
        </Pressable>

        <Pressable
          className="items-center justify-center rounded-full bg-slate-200 py-4 mx-5"
          onPress={() => router.push("/register")}
        >
          <Text className="text-lg font-semibold text-slate-900">
            Tạo tài khoản mới
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
