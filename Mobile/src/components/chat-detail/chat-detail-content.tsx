import React from 'react';
import { ActivityIndicator, FlatList, Image, Keyboard, Modal, Platform, Pressable, Text, View, useWindowDimensions } from 'react-native';
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
  isLoadingMore?: boolean;
  hasMore?: boolean;
  shouldScrollToBottom?: boolean;
  onSend?: (content: string) => Promise<void> | void;
  onLoadMore?: () => void;
  onScrolledToBottom?: () => void;
}

export function ChatDetailContent({
  messages,
  otherAvatar,
  otherAvatarUrl,
  galleryImages = [],
  inputPlaceholder,
  isSending = false,
  isLoadingMore = false,
  hasMore = false,
  shouldScrollToBottom = false,
  onSend,
  onLoadMore,
  onScrolledToBottom,
}: ChatDetailContentProps) {
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const [inputAreaHeight, setInputAreaHeight] = React.useState(58);
  const [keyboardHeight, setKeyboardHeight] = React.useState(0);
  const [viewerOpen, setViewerOpen] = React.useState(false);
  const [viewerIndex, setViewerIndex] = React.useState(0);
  const viewerListRef = React.useRef<FlatList<{ url: string }> | null>(null);
  const flatListRef = React.useRef<FlatList<MockChatMessage> | null>(null);

  React.useEffect(() => {
    if (shouldScrollToBottom && messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
        onScrolledToBottom?.();
      }, 100);
    }
  }, [shouldScrollToBottom, messages.length, onScrolledToBottom]);

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

  const keyboardOffset = Platform.OS === 'ios' ? Math.max(0, keyboardHeight - insets.bottom) : keyboardHeight;
  const inputBottom = Platform.OS === 'ios' ? insets.bottom + keyboardOffset : Math.max(insets.bottom, 16) + keyboardOffset;

  const listTopPadding = inputAreaHeight + inputBottom + 8;

  const openImageViewer = React.useCallback((targetUrl: string) => {
    if (galleryImages.length === 0) {
      return;
    }
    const index = galleryImages.findIndex((item) => item.url === targetUrl);
    setViewerIndex(index >= 0 ? index : 0);
    setViewerOpen(true);
  }, [galleryImages]);

  const renderFooter = () => {
    if (!hasMore) {
      return null;
    }
    return (
      <View className="py-3 items-center">
        {isLoadingMore ? (
          <ActivityIndicator size="small" color="#1e98f3" />
        ) : null}
      </View>
    );
  };

  const renderItem = ({ item: message }: { item: MockChatMessage }) => (
    <View className="mt-2">
      <ChatMessageRow
        message={message}
        otherAvatar={otherAvatar}
        otherAvatarUrl={otherAvatarUrl}
        onOpenImageGallery={openImageViewer}
      />
    </View>
  );

  return (
    <View className="flex-1">
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        inverted
        onEndReached={() => {
          if (hasMore && !isLoadingMore) {
            onLoadMore?.();
          }
        }}
        onEndReachedThreshold={0.5}
        ListFooterComponent={renderFooter}
        keyboardShouldPersistTaps="always"
        keyboardDismissMode="interactive"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ 
          paddingTop: listTopPadding,
          paddingBottom: 14,
        }}
        maintainVisibleContentPosition={{
          minIndexForVisible: 0,
        }}
      />

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
