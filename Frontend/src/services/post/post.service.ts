import axiosClient from "@/configurations/axios.config"
import type { ResponseSuccess, PageResponse } from "@/types/api-response"
import type {
  CreatePostRequest,
  UpdatePostRequest,
  CreateCommentRequest,
  UpdateCommentRequest,
  ReactRequest,
  PostResponse,
  CommentResponse,
  ReactionResponse,
  ReactionType,
} from "@/types/post.type"

const BASE_URL = "/api/v1"

export const postService = {
  // Post CRUD
  createPost(data: CreatePostRequest) {
    return axiosClient.post<ResponseSuccess<PostResponse>>(`${BASE_URL}/posts`, data)
  },

  createPostWithFiles(formData: FormData) {
    return axiosClient.post<ResponseSuccess<PostResponse>>(`${BASE_URL}/posts`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    })
  },

  updatePost(postId: number, data: UpdatePostRequest) {
    return axiosClient.put<ResponseSuccess<PostResponse>>(`${BASE_URL}/posts/${postId}`, data)
  },

  deletePost(postId: number) {
    return axiosClient.delete<ResponseSuccess<void>>(`${BASE_URL}/posts/${postId}`)
  },

  getPost(postId: number) {
    return axiosClient.get<ResponseSuccess<PostResponse>>(`${BASE_URL}/posts/${postId}`)
  },

  getFeed(page: number = 1, limit: number = 10) {
    return axiosClient.get<ResponseSuccess<PageResponse<PostResponse>>>(`${BASE_URL}/posts/feed`, {
      params: { page, limit },
    })
  },

  getMyPosts(page: number = 1, limit: number = 10) {
    return axiosClient.get<ResponseSuccess<PageResponse<PostResponse>>>(`${BASE_URL}/posts/my-posts`, {
      params: { page, limit },
    })
  },

  getUserPosts(userId: string, page: number = 1, limit: number = 10) {
    return axiosClient.get<ResponseSuccess<PageResponse<PostResponse>>>(`${BASE_URL}/posts/user/${userId}`, {
      params: { page, limit },
    })
  },

  // Reactions
  reactToPost(postId: number, reactionType: ReactionType) {
    return axiosClient.post<ResponseSuccess<ReactionResponse>>(
      `${BASE_URL}/posts/${postId}/reactions`,
      { reactionType } as ReactRequest,
    )
  },

  unreactToPost(postId: number) {
    return axiosClient.delete<ResponseSuccess<void>>(`${BASE_URL}/posts/${postId}/reactions`)
  },

  getPostReactions(postId: number, page: number = 1, limit: number = 20) {
    return axiosClient.get<ResponseSuccess<PageResponse<ReactionResponse>>>(
      `${BASE_URL}/posts/${postId}/reactions/list`,
      {
        params: { page, limit },
      },
    )
  },

  // Comments
  createComment(data: CreateCommentRequest) {
    return axiosClient.post<ResponseSuccess<CommentResponse>>(`${BASE_URL}/comments`, data)
  },

  updateComment(commentId: number, data: UpdateCommentRequest) {
    return axiosClient.put<ResponseSuccess<CommentResponse>>(`${BASE_URL}/comments/${commentId}`, data)
  },

  deleteComment(commentId: number) {
    return axiosClient.delete<ResponseSuccess<void>>(`${BASE_URL}/comments/${commentId}`)
  },

  getPostComments(postId: number, page: number = 1, limit: number = 10) {
    return axiosClient.get<ResponseSuccess<PageResponse<CommentResponse>>>(
      `${BASE_URL}/comments/post/${postId}`,
      {
        params: { page, limit },
      },
    )
  },

  getCommentReplies(commentId: number, page: number = 1, limit: number = 10) {
    return axiosClient.get<ResponseSuccess<PageResponse<CommentResponse>>>(
      `${BASE_URL}/comments/${commentId}/replies`,
      {
        params: { page, limit },
      },
    )
  },

  // Comment Reactions
  reactToComment(commentId: number, reactionType: ReactionType) {
    return axiosClient.post<ResponseSuccess<ReactionResponse>>(
      `${BASE_URL}/comments/${commentId}/reactions`,
      { reactionType } as ReactRequest,
    )
  },

  unreactToComment(commentId: number) {
    return axiosClient.delete<ResponseSuccess<void>>(`${BASE_URL}/comments/${commentId}/reactions`)
  },

  getCommentReactions(commentId: number) {
    return axiosClient.get<ResponseSuccess<ReactionResponse>>(
      `${BASE_URL}/comments/${commentId}/reactions`,
    )
  },
}
