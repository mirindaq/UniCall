import React from 'react';
import { FlatList, Image, Keyboard, Modal, Platform, Pressable, Text, View, useWindowDimensions } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { MockAvatar } from '@/mock/chat-conversations';
import type { MockChatMessage } from '@/mock/chat-thread-messages';

import { ChatInputBar } from './chat-input-bar';
import { ChatMessageRow } from './chat-message-row';

interface ChatDetailContentProps {
  messages: MockChatMessage[];
  otherAvatar: MockAvatar;
  otherAvatarUrl?: string | null;
  galleryImages?: { url: string }[];
  inputPlaceholder?: string;
  isSending?: boolean;
  onSend?: (content: string) => Promise<void> | void;
}

export function ChatDetailContent({
  messages,
  otherAvatar,
  otherAvatarUrl,
  galleryImages = [],
  inputPlaceholder,
  isSending = false,
  onSend,
}: ChatDetailContentProps) {
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const [inputAreaHeight, setInputAreaHeight] = React.useState(58);
  const [keyboardHeight, setKeyboardHeight] = React.useState(0);
  const [viewerOpen, setViewerOpen] = React.useState(false);
  const [viewerIndex, setViewerIndex] = React.useState(0);
  const viewerListRef = React.useRef<FlatList<{ url: string }> | null>(null);

  React.useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (event) => {
      const nextHeight = event.endCoordinates?.height ?? 0;
      setKeyboardHeight(nextHeight);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const keyboardOffset = Platform.OS === 'ios' ? Math.max(0, keyboardHeight - insets.bottom) : 0;
  const inputBottom = Platform.OS === 'ios' ? insets.bottom + keyboardOffset : 0;

  const listBottomPadding = inputAreaHeight + inputBottom + 8;

  const openImageViewer = React.useCallback((targetUrl: string) => {
    if (galleryImages.length === 0) {
      return;
    }
    const index = galleryImages.findIndex((item) => item.url === targetUrl);
    setViewerIndex(index >= 0 ? index : 0);
    setViewerOpen(true);
  }, [galleryImages]);

  return (
    <View className="flex-1">
      <KeyboardAwareScrollView
        className="flex-1"
        enableOnAndroid
        enableAutomaticScroll
        enableResetScrollToCoords={false}
        extraScrollHeight={16}
        keyboardShouldPersistTaps="always"
        keyboardDismissMode="none"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: 14, paddingBottom: listBottomPadding }}>
        <View className="pb-2">
          {messages.map((message, index) => (
            <View key={message.id} className={index === 0 ? 'mt-2' : 'mt-2'}>
              <ChatMessageRow
                message={message}
                otherAvatar={otherAvatar}
                otherAvatarUrl={otherAvatarUrl}
                onOpenImageGallery={openImageViewer}
              />
            </View>
          ))}
        </View>
      </KeyboardAwareScrollView>

      <View style={{ position: 'absolute', left: 0, right: 0, bottom: inputBottom }}>
        <ChatInputBar
          placeholder={inputPlaceholder}
          isSending={isSending}
          onSend={onSend}
          onHeightChange={(height) => setInputAreaHeight(height)}
        />
      </View>

      <Modal visible={viewerOpen} transparent animationType="fade" onRequestClose={() => setViewerOpen(false)}>
        <View className="flex-1 bg-black">
          <View className="flex-row items-center justify-between px-3 pt-12 pb-2">
            <Pressable className="h-9 w-9 items-center justify-center rounded-full bg-white/15" onPress={() => setViewerOpen(false)}>
              <Text allowFontScaling={false} className="text-lg text-white">✕</Text>
            </Pressable>
            <Text allowFontScaling={false} className="text-sm font-medium text-white">
              {galleryImages.length > 0 ? `${viewerIndex + 1}/${galleryImages.length}` : ''}
            </Text>
            <View className="h-9 w-9" />
          </View>

          <FlatList
            ref={viewerListRef}
            data={galleryImages}
            horizontal
            pagingEnabled
            initialScrollIndex={viewerIndex}
            getItemLayout={(_, index) => ({ length: screenWidth, offset: screenWidth * index, index })}
            keyExtractor={(item, index) => `${item.url}-${index}`}
            onMomentumScrollEnd={(event) => {
              const nextIndex = Math.round(event.nativeEvent.contentOffset.x / screenWidth);
              setViewerIndex(nextIndex);
            }}
            renderItem={({ item }) => (
              <View style={{ width: screenWidth }} className="flex-1 items-center justify-center">
                <Image source={{ uri: item.url }} className="h-[78%] w-full" resizeMode="contain" />
              </View>
            )}
          />

          <View className="pb-8">
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={galleryImages}
              keyExtractor={(item, index) => `${item.url}-thumb-${index}`}
              contentContainerStyle={{ paddingHorizontal: 10, gap: 6 }}
              renderItem={({ item, index }) => (
                <Pressable
                  className={`h-12 w-12 overflow-hidden rounded border ${index === viewerIndex ? 'border-sky-400' : 'border-white/20'}`}
                  onPress={() => {
                    setViewerIndex(index);
                    viewerListRef.current?.scrollToIndex({ index, animated: true });
                  }}>
                  <Image source={{ uri: item.url }} className="h-full w-full" resizeMode="cover" />
                </Pressable>
              )}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}
