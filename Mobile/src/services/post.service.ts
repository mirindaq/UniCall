import axiosClient from '@/configurations/axios.config';
import type { PageResponse, ResponseSuccess } from '@/types/api-response';
import type {
  CreateCommentRequest,
  CreatePostRequest,
  PostResponse,
  ReactionType,
} from '@/types/post.type';

const BASE_URL = '/api/v1';

export const postService = {
  createPost: async (payload: CreatePostRequest): Promise<ResponseSuccess<PostResponse>> => {
    const response = await axiosClient.post<ResponseSuccess<PostResponse>>(`${BASE_URL}/posts`, payload);
    return response.data;
  },

  createPostWithFiles: async (formData: FormData): Promise<ResponseSuccess<PostResponse>> => {
    const response = await axiosClient.post<ResponseSuccess<PostResponse>>(`${BASE_URL}/posts`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  getFeed: async (page = 1, limit = 10): Promise<ResponseSuccess<PageResponse<PostResponse>>> => {
    const response = await axiosClient.get<ResponseSuccess<PageResponse<PostResponse>>>(`${BASE_URL}/posts/feed`, {
      params: { page, limit },
    });
    return response.data;
  },

  getMyPosts: async (page = 1, limit = 10): Promise<ResponseSuccess<PageResponse<PostResponse>>> => {
    const response = await axiosClient.get<ResponseSuccess<PageResponse<PostResponse>>>(`${BASE_URL}/posts/my-posts`, {
      params: { page, limit },
    });
    return response.data;
  },

  reactToPost: async (postId: number, reactionType: ReactionType): Promise<ResponseSuccess<unknown>> => {
    const response = await axiosClient.post<ResponseSuccess<unknown>>(
      `${BASE_URL}/posts/${postId}/reactions`,
      { reactionType }
    );
    return response.data;
  },

  unreactToPost: async (postId: number): Promise<ResponseSuccess<void>> => {
    const response = await axiosClient.delete<ResponseSuccess<void>>(`${BASE_URL}/posts/${postId}/reactions`);
    return response.data;
  },

  createComment: async (payload: CreateCommentRequest): Promise<ResponseSuccess<unknown>> => {
    const response = await axiosClient.post<ResponseSuccess<unknown>>(`${BASE_URL}/comments`, payload);
    return response.data;
  },
};
