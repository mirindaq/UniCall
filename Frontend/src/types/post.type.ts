export type ReactionType = "LIKE" | "LOVE" | "HAHA" | "WOW" | "SAD" | "ANGRY"

export type PostPrivacy = "PUBLIC" | "PRIVATE"

export type PostStatus = "ACTIVE" | "DELETED" | "HIDDEN"

export interface Post {
  id: number
  authorId: string
  content: string
  mediaUrls: string[]
  privacy: PostPrivacy
  status: PostStatus
  likeCount: number
  commentCount: number
  createdAt: string
  updatedAt: string
  isLikedByCurrentUser?: boolean
  userReactionType?: ReactionType
  reactionCounts?: ReactionCounts
}

export interface Comment {
  id: number
  postId: number
  authorId: string
  content: string
  parentCommentId?: number
  likeCount: number
  replyCount: number
  isDeleted: boolean
  createdAt: string
  updatedAt: string
  isLikedByCurrentUser?: boolean
  userReactionType?: ReactionType
}

export interface ReactionCounts {
  LIKE: number
  LOVE: number
  HAHA: number
  WOW: number
  SAD: number
  ANGRY: number
}

export interface CreatePostRequest {
  content: string
  mediaUrls?: string[]
  privacy?: PostPrivacy
}

export interface UpdatePostRequest {
  content?: string
  mediaUrls?: string[]
  privacy?: PostPrivacy
  status?: PostStatus
}

export interface CreateCommentRequest {
  postId: number
  content: string
  parentCommentId?: number
}

export interface UpdateCommentRequest {
  content: string
}

export interface ReactRequest {
  reactionType: ReactionType
}

export interface PostResponse extends Post {
  reactionCounts?: ReactionCounts
}

export interface CommentResponse extends Comment {
  reactionCounts?: ReactionCounts
  replies?: CommentResponse[]
}

export interface ReactionResponse {
  id: number
  userId: string
  userName?: string
  userAvatar?: string
  reactionType: ReactionType
  createdAt: string
}

export interface PostReactionSummary {
  isLiked: boolean
  userReaction?: ReactionType
  totalReactions: number
  reactionCounts: ReactionCounts
}
