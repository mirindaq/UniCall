import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import * as ImagePicker from 'expo-image-picker';

import { FeedsComposerCard, type ComposerMediaItem } from '@/components/feeds/feeds-composer-card';
import { FeedsHeader } from '@/components/feeds/feeds-header';
import { FeedsPostCard } from '@/components/feeds/feeds-post-card';
import { FeedsSectionTabs } from '@/components/feeds/feeds-section-tabs';
import { MessagesBottomTabs } from '@/components/messages/messages-bottom-tabs';
import { AppStatusBarBlue } from '@/components/ui/app-status-bar-blue';
import { postService } from '@/services/post.service';
import { userService } from '@/services/user.service';
import type { PostResponse } from '@/types/post.type';
import type { UserProfile } from '@/types/user';

type FeedsTabKey = 'feed' | 'my-posts';

type FeedPostViewItem = PostResponse & {
  authorName: string;
  authorAvatar?: string | null;
};

export default function FeedsScreen() {
  const [activeTab, setActiveTab] = useState<FeedsTabKey>('feed');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmittingPost, setIsSubmittingPost] = useState(false);
  const [reactingPostId, setReactingPostId] = useState<number | null>(null);
  const [myProfile, setMyProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<PostResponse[]>([]);
  const [postContent, setPostContent] = useState('');
  const [profileMap, setProfileMap] = useState<Record<string, UserProfile>>({});
  const [commentInputs, setCommentInputs] = useState<Record<number, string>>({});
  const [selectedMedia, setSelectedMedia] = useState<ComposerMediaItem[]>([]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const profileResponse = await userService.getMyProfile();
      const me = profileResponse.data;
      setMyProfile(me);

      const postResponse =
        activeTab === 'feed' ? await postService.getFeed(1, 20) : await postService.getMyPosts(1, 20);
      const fetchedPosts = postResponse.data?.items ?? [];
      setPosts(fetchedPosts);

      const authorIds = Array.from(new Set(fetchedPosts.map((post) => post.authorId).filter(Boolean)));
      if (authorIds.length === 0) {
        setProfileMap({});
        return;
      }
      const profiles = await Promise.all(
        authorIds.map(async (id) => {
          try {
            const response = await userService.getProfileByIdentityUserId(id);
            return [id, response.data] as const;
          } catch {
            return [id, null] as const;
          }
        })
      );
      const nextMap: Record<string, UserProfile> = {};
      profiles.forEach(([id, profile]) => {
        if (profile) {
          nextMap[id] = profile;
        }
      });
      setProfileMap(nextMap);
    } catch {
      Toast.show({
        type: 'error',
        text1: 'Không tải được Tường nhà',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [activeTab]);

  const feedPosts = useMemo<FeedPostViewItem[]>(() => {
    return posts.map((post) => {
      const authorProfile = profileMap[post.authorId];
      const authorName = authorProfile
        ? `${authorProfile.lastName ?? ''} ${authorProfile.firstName ?? ''}`.trim()
        : post.authorId;
      return {
        ...post,
        authorName: authorName || 'Người dùng',
        authorAvatar: authorProfile?.avatar ?? null,
      };
    });
  }, [posts, profileMap]);

  const handleCreatePost = async () => {
    if (!postContent.trim() && selectedMedia.length === 0) {
      Toast.show({ type: 'error', text1: 'Vui lòng nhập nội dung hoặc chọn ảnh/video' });
      return;
    }
    setIsSubmittingPost(true);
    try {
      if (selectedMedia.length > 0) {
        const formData = new FormData();
        formData.append('content', postContent.trim() || ' ');
        formData.append('privacy', 'PUBLIC');

        selectedMedia.forEach((media, index) => {
          const extension = media.type === 'video' ? 'mp4' : 'jpg';
          const mimeType = media.type === 'video' ? 'video/mp4' : 'image/jpeg';
          formData.append('files', {
            uri: media.uri,
            name: `upload-${Date.now()}-${index}.${extension}`,
            type: mimeType,
          } as unknown as Blob);
        });

        await postService.createPostWithFiles(formData);
      } else {
        await postService.createPost({
          content: postContent.trim(),
          privacy: 'PUBLIC',
        });
      }
      setPostContent('');
      setSelectedMedia([]);
      Toast.show({ type: 'success', text1: 'Đăng bài thành công' });
      await loadData();
    } catch {
      Toast.show({ type: 'error', text1: 'Đăng bài thất bại' });
    } finally {
      setIsSubmittingPost(false);
    }
  };

  const handlePickMedia = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Toast.show({ type: 'error', text1: 'Cần quyền thư viện ảnh để chọn media' });
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: 10,
    });

    if (result.canceled) {
      return;
    }

    const nextItems: ComposerMediaItem[] = result.assets
      .filter((asset) => asset.uri)
      .map((asset) => ({
        uri: asset.uri,
        type: asset.type === 'video' ? 'video' : 'image',
      }));

    if (nextItems.length === 0) {
      return;
    }
    setSelectedMedia((prev) => [...prev, ...nextItems].slice(0, 10));
  };

  const handleRemoveMedia = (index: number) => {
    setSelectedMedia((prev) => prev.filter((_, i) => i !== index));
  };

  const handleToggleLike = async (post: FeedPostViewItem) => {
    setReactingPostId(post.id);
    try {
      if (post.isLikedByCurrentUser) {
        await postService.unreactToPost(post.id);
      } else {
        await postService.reactToPost(post.id, 'LIKE');
      }
      await loadData();
    } catch {
      Toast.show({ type: 'error', text1: 'Không thể cập nhật cảm xúc' });
    } finally {
      setReactingPostId(null);
    }
  };

  const handleSubmitComment = async (postId: number) => {
    const content = commentInputs[postId]?.trim();
    if (!content) {
      return;
    }
    try {
      await postService.createComment({ postId, content });
      setCommentInputs((prev) => ({ ...prev, [postId]: '' }));
      Toast.show({ type: 'success', text1: 'Đã bình luận' });
      await loadData();
    } catch {
      Toast.show({ type: 'error', text1: 'Bình luận thất bại' });
    }
  };

  return (
    <View className="flex-1 bg-[#f3f4f6]">
      <AppStatusBarBlue />
      <SafeAreaView edges={['top']} className="bg-[#1e98f3]" />
      <FeedsHeader />

      <ScrollView className="flex-1 bg-[#f3f4f6]" showsVerticalScrollIndicator={false}>
        <FeedsSectionTabs activeTab={activeTab} onChangeTab={setActiveTab} />

        <FeedsComposerCard
          myAvatar={myProfile?.avatar}
          content={postContent}
          isSubmitting={isSubmittingPost}
          selectedMedia={selectedMedia}
          onChangeContent={setPostContent}
          onSubmit={() => void handleCreatePost()}
          onPickMedia={() => void handlePickMedia()}
          onRemoveMedia={handleRemoveMedia}
        />

        {isLoading ? (
          <Text className="px-5 py-8 text-center text-[14px] text-slate-500">Đang tải bài viết...</Text>
        ) : feedPosts.length === 0 ? (
          <Text className="px-5 py-8 text-center text-[14px] text-slate-500">
            Chưa có bài viết nào.
          </Text>
        ) : (
          feedPosts
            .filter((post) => post && typeof post.id === 'number')
            .map((post) => (
            <FeedsPostCard
              key={post.id}
              post={post}
              commentInput={commentInputs[post.id] ?? ''}
              isReacting={reactingPostId === post.id}
              onChangeCommentInput={(value) =>
                setCommentInputs((prev) => ({ ...prev, [post.id]: value }))
              }
              onToggleLike={() => void handleToggleLike(post)}
              onSubmitComment={() => void handleSubmitComment(post.id)}
            />
          ))
        )}
      </ScrollView>

      <MessagesBottomTabs activeTab="feeds" />
      <SafeAreaView edges={['bottom']} className="bg-white" />
    </View>
  );
}
