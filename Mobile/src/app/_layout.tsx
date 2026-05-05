import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import React from "react";
import { useColorScheme } from "react-native";
import Toast from "react-native-toast-message";
import "../global.css";

import { GlobalCallOverlay } from "@/components/call/GlobalCallOverlay";
import { CallProvider } from "@/contexts/call-context";

const globalRef = globalThis as typeof globalThis & {
  TextEncoder?: typeof TextEncoder;
  TextDecoder?: typeof TextDecoder;
  DOMException?: typeof Error;
};

if (!globalRef.TextEncoder && typeof TextEncoder !== "undefined") {
  globalRef.TextEncoder = TextEncoder;
}

if (!globalRef.TextDecoder && typeof TextDecoder !== "undefined") {
  globalRef.TextDecoder = TextDecoder;
}

if (!globalRef.DOMException) {
  class DomExceptionPolyfill extends Error {
    code: number;

    constructor(message = "", name = "DOMException") {
      super(message);
      this.name = name;
      this.code = 0;
    }
  }
  globalRef.DOMException = DomExceptionPolyfill;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <CallProvider>
        <Stack screenOptions={{ headerShown: false }} />
        <GlobalCallOverlay />
      </CallProvider>
      <Toast />
    </ThemeProvider>
  );
}
