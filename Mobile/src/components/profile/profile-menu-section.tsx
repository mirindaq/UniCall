import Ionicons from "@expo/vector-icons/Ionicons";
import React from "react";
import { Pressable, Text, View } from "react-native";

interface StaticMenuItem {
  id: string;
  title: string;
  description: string;
}

const MAIN_ITEMS: StaticMenuItem[] = [
  {
    id: "documents",
    title: "My Documents",
    description: "Lưu trữ các tin nhắn quan trọng",
  },
];

const ACCOUNT_ITEMS: StaticMenuItem[] = [
  {
    id: "security",
    title: "Tài khoản và bảo mật",
    description: "",
  },
  {
    id: "privacy",
    title: "Quyền riêng tư",
    description: "",
  },
];

const iconByItemId: Record<string, keyof typeof Ionicons.glyphMap> = {
  documents: "folder-open-outline",
  security: "shield-checkmark-outline",
  privacy: "lock-closed-outline",
};

function MenuItem({
  item,
  showDivider,
}: {
  item: StaticMenuItem;
  showDivider: boolean;
}) {
  const iconName = iconByItemId[item.id] ?? "ellipse-outline";

  return (
    <View className="bg-white px-5">
      <View className="flex-row items-center py-4">
        <View className="h-9 w-9 items-center justify-center rounded-full">
          <Ionicons name={iconName} size={26} color="#1e64cc" />
        </View>

        <View className="ml-4 flex-1">
          <Text allowFontScaling={false} className="text-[17px] text-slate-900">
            {item.title}
          </Text>
          {item.description ? (
            <Text
              allowFontScaling={false}
              className="mt-0.5 text-[14px] text-slate-500"
            >
              {item.description}
            </Text>
          ) : null}
        </View>

        <Ionicons name="chevron-forward" size={24} color="#9ca3af" />
      </View>

      {showDivider ? <View className="ml-[54px] h-px bg-slate-200" /> : null}
    </View>
  );
}

function MenuGroup({ items }: { items: StaticMenuItem[] }) {
  return (
    <View className="mt-3">
      {items.map((item, itemIndex) => (
        <MenuItem
          key={item.id}
          item={item}
          showDivider={itemIndex < items.length - 1}
        />
      ))}
    </View>
  );
}

export function ProfileMenuSection() {
  return (
    <View>
      <MenuGroup items={MAIN_ITEMS} />
      <MenuGroup items={ACCOUNT_ITEMS} />

      <View className="mt-3 bg-white px-5 py-3">
        <Pressable className="h-[46px] items-center justify-center rounded-xl border border-gray-200 bg-gray-50">
          <Text
            allowFontScaling={false}
            className="text-[16px] font-semibold text-gray-600"
          >
            Đăng xuất
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
