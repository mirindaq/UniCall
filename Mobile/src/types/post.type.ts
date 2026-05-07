export type ReactionType = 'LIKE' | 'LOVE' | 'HAHA' | 'WOW' | 'SAD' | 'ANGRY';

export type PostPrivacy = 'PUBLIC' | 'PRIVATE';

export type PostStatus = 'ACTIVE' | 'DELETED' | 'HIDDEN';

export interface ReactionCounts {
  LIKE: number;
  LOVE: number;
  HAHA: number;
  WOW: number;
  SAD: number;
  ANGRY: number;
}

export interface PostResponse {
  id: number;
  authorId: string;
  content: string;
  mediaUrls: string[];
  privacy: PostPrivacy;
  status: PostStatus;
  likeCount: number;
  commentCount: number;
  createdAt: string;
  updatedAt: string;
  isLikedByCurrentUser?: boolean;
  userReactionType?: ReactionType;
  reactionCounts?: ReactionCounts;
}

export interface CreatePostRequest {
  content: string;
  mediaUrls?: string[];
  privacy?: PostPrivacy;
}

export interface CreateCommentRequest {
  postId: number;
  content: string;
  parentCommentId?: number;
}
