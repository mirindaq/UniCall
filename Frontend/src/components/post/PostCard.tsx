import { useState, useEffect } from "react"
import { MoreHorizontal, MessageCircle, Send, Edit, Trash2, Globe, Lock } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ReactionPicker, REACTION_ICONS, type ReactionType } from "@/components/post/ReactionPicker"
import { formatRelativeTime } from "@/utils/date.util"
import type { PostPrivacy, CommentResponse, ReactionResponse } from "@/types/post.type"
import { postService } from "@/services/post/post.service"
import { userService } from "@/services/user/user.service"
import { toast } from "sonner"

interface PostAuthor {
  name: string
  avatar?: string
}

interface Post {
  id: number
  author: PostAuthor
  content: string
  mediaUrls: string[]
  likeCount: number
  commentCount: number
  createdAt: string
  privacy: PostPrivacy
  isLiked: boolean
  userReaction?: ReactionType
  reactionCounts?: Record<ReactionType, number>
}

interface PostCardProps {
  post: Post
  showActions?: boolean
  onEdit?: (postId: number) => void
  onDelete?: (postId: number) => void
  onReact?: (postId: number, reaction: ReactionType) => void
  onUnreact?: (postId: number) => void
  onComment?: (postId: number, content: string) => void
}

export function PostCard({
  post,
  showActions = false,
  onEdit,
  onDelete,
  onReact,
  onUnreact,
  onComment,
}: PostCardProps) {
  const [showComments, setShowComments] = useState(false)
  const [commentText, setCommentText] = useState("")
  const [expandedContent, setExpandedContent] = useState(false)
  const [showReactionsDialog, setShowReactionsDialog] = useState(false)
  const [comments, setComments] = useState<CommentResponse[]>([])
  const [reactions, setReactions] = useState<ReactionResponse[]>([])
  const [userProfiles, setUserProfiles] = useState<Record<string, { firstName: string; lastName: string; avatar?: string | null }>>({})
  const [isLoadingComments, setIsLoadingComments] = useState(false)
  const [isLoadingReactions, setIsLoadingReactions] = useState(false)
  const [myProfile, setMyProfile] = useState<any>(null)

  // Fetch current user profile
  useEffect(() => {
    userService.getMyProfile()
      .then(response => {
        setMyProfile((response as any)?.data)
      })
      .catch(error => {
        console.error("Error loading profile:", error)
      })
  }, [])

  // Fetch comments when showComments is toggled
  useEffect(() => {
    if (showComments && comments.length === 0) {
      setIsLoadingComments(true)
      postService.getPostComments(post.id, 1, 20)
        .then(response => {
          const commentList = (response as any)?.data?.items || []
          setComments(commentList)
          
          // Fetch user profiles for comment authors
          const authorIds = [...new Set(commentList.map((c: CommentResponse) => c.authorId))] as string[]
          return Promise.all(
            authorIds.map((authorId) =>
              userService.getProfileByIdentityUserId(authorId)
                .then((res: any) => ({ id: authorId, profile: res?.data }))
                .catch(() => ({ id: authorId, profile: null }))
            )
          )
        })
        .then((profiles: any[]) => {
          const profileMap: Record<string, any> = {}
          profiles.forEach(({ id, profile }: { id: string; profile: any }) => {
            if (profile) profileMap[id] = profile
          })
          setUserProfiles(prev => ({ ...prev, ...profileMap }))
        })
        .catch(error => {
          console.error("Error loading comments:", error)
        })
        .finally(() => {
          setIsLoadingComments(false)
        })
    }
  }, [showComments, post.id, comments.length])

  // Fetch reactions when dialog is opened
  useEffect(() => {
    if (showReactionsDialog && reactions.length === 0) {
      setIsLoadingReactions(true)
      postService.getPostReactions(post.id, 1, 50)
        .then(response => {
          const reactionList = (response as any)?.data?.items || []
          setReactions(reactionList)
          
          // Fetch user profiles for reactors
          const userIds = [...new Set(reactionList.map((r: ReactionResponse) => r.userId))] as string[]
          return Promise.all(
            userIds.map((userId) =>
              userService.getProfileByIdentityUserId(userId)
                .then((res: any) => ({ id: userId, profile: res?.data }))
                .catch(() => ({ id: userId, profile: null }))
            )
          )
        })
        .then((profiles: any[]) => {
          const profileMap: Record<string, any> = {}
          profiles.forEach(({ id, profile }: { id: string; profile: any }) => {
            if (profile) profileMap[id] = profile
          })
          setUserProfiles(prev => ({ ...prev, ...profileMap }))
        })
        .catch(error => {
          console.error("Error loading reactions:", error)
        })
        .finally(() => {
          setIsLoadingReactions(false)
        })
    }
  }, [showReactionsDialog, post.id, reactions.length])

  const handleReact = (reaction: ReactionType) => {
    onReact?.(post.id, reaction)
  }

  const handleUnreact = () => {
    onUnreact?.(post.id)
  }

  const handleComment = async () => {
    if (!commentText.trim()) return
    
    const content = commentText.trim()
    setCommentText("")
    
    try {
      // Call API to create comment
      const response = await postService.createComment({
        postId: post.id,
        content,
      })
      
      const newComment = (response as any)?.data
      if (newComment) {
        // Append new comment to list
        setComments(prev => [newComment, ...prev])
        
        // Also call parent handler if exists
        onComment?.(post.id, content)
        
        toast.success("Đã bình luận")
      }
    } catch (error) {
      console.error("Error creating comment:", error)
      toast.error("Không thể bình luận")
      // Restore comment text on error
      setCommentText(content)
    }
  }

  // Calculate top reactions for display
  const reactionEntries = post.reactionCounts
    ? Object.entries(post.reactionCounts)
        .filter(([_, count]) => count > 0)
        .sort(([_, a], [__, b]) => (b as number) - (a as number))
    : []

  const topReactions = reactionEntries.slice(0, 3)
  const totalReactions = reactionEntries.reduce((sum, [_, count]) => sum + (count as number), 0)

  // Helper function to check if URL is a video
  const isVideo = (url: string) => {
    const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.avi', '.mkv']
    return videoExtensions.some(ext => url.toLowerCase().includes(ext))
  }

  // Helper function to render media item
  const renderMedia = (url: string, index: number, className: string) => {
    if (isVideo(url)) {
      return (
        <video
          key={index}
          src={url}
          className={className}
          controls
          preload="metadata"
        />
      )
    }
    return (
      <img
        key={index}
        src={url}
        alt={`Post media ${index + 1}`}
        className={className}
      />
    )
  }

  return (
    <Card className="shadow-sm hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarImage src={post.author.avatar} />
              <AvatarFallback>{post.author.name[0]}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold text-sm">{post.author.name}</p>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <span>{formatRelativeTime(post.createdAt)}</span>
                <span>·</span>
                {post.privacy === "PUBLIC" ? (
                  <Globe className="size-3" />
                ) : (
                  <Lock className="size-3" />
                )}
              </div>
            </div>
          </div>
          {showActions && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="size-8">
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit?.(post.id)}>
                  <Edit className="mr-2 size-4" />
                  Chỉnh sửa
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onDelete?.(post.id)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 size-4" />
                  Xóa
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-[15px] leading-relaxed">
          {post.content && post.content.length > 300 && !expandedContent ? (
            <>
              <p className="whitespace-pre-wrap">
                {post.content.slice(0, 300)}...
              </p>
              <button
                onClick={() => setExpandedContent(true)}
                className="text-blue-600 hover:text-blue-700 font-medium text-sm mt-1"
              >
                Xem thêm
              </button>
            </>
          ) : (
            <p className="whitespace-pre-wrap">{post.content}</p>
          )}
        </div>
        {post.mediaUrls.length > 0 && (
          <div className="mt-3">
            {post.mediaUrls.length === 1 && renderMedia(
              post.mediaUrls[0],
              0,
              "w-full rounded-lg object-cover max-h-96"
            )}
            {post.mediaUrls.length === 2 && (
              <div className="grid grid-cols-2 gap-1">
                {post.mediaUrls.map((url, index) => renderMedia(
                  url,
                  index,
                  "w-full rounded-lg object-cover aspect-square max-h-80"
                ))}
              </div>
            )}
            {post.mediaUrls.length === 3 && (
              <div className="grid grid-cols-2 gap-1">
                {renderMedia(
                  post.mediaUrls[0],
                  0,
                  "w-full rounded-lg object-cover row-span-2 h-full max-h-96"
                )}
                {renderMedia(
                  post.mediaUrls[1],
                  1,
                  "w-full rounded-lg object-cover aspect-square max-h-48"
                )}
                {renderMedia(
                  post.mediaUrls[2],
                  2,
                  "w-full rounded-lg object-cover aspect-square max-h-48"
                )}
              </div>
            )}
            {post.mediaUrls.length >= 4 && (
              <div className="grid grid-cols-2 gap-1">
                {post.mediaUrls.slice(0, 4).map((url, index) => (
                  <div key={index} className="relative">
                    {renderMedia(
                      url,
                      index,
                      "w-full rounded-lg object-cover aspect-square max-h-64"
                    )}
                    {index === 3 && post.mediaUrls.length > 4 && (
                      <div className="absolute inset-0 bg-black/60 rounded-lg flex items-center justify-center">
                        <span className="text-white text-2xl font-semibold">
                          +{post.mediaUrls.length - 4}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
      <CardFooter className="flex-col gap-3 pt-0">
        {/* Reaction Summary */}
        {topReactions.length > 0 && (
          <div className="flex w-full items-center justify-between text-sm border-b pb-2">
            <button 
              className="flex items-center gap-1 hover:underline cursor-pointer"
              onClick={() => setShowReactionsDialog(true)}
            >
              <div className="flex -space-x-1">
                {topReactions.map(([reaction]) => (
                  <span
                    key={reaction}
                    className="text-lg bg-white rounded-full border border-background"
                  >
                    {REACTION_ICONS[reaction as ReactionType].icon}
                  </span>
                ))}
              </div>
              <span className="ml-1 text-muted-foreground font-medium">{totalReactions}</span>
            </button>
            <div className="flex gap-4 text-muted-foreground">
              <button className="hover:underline" onClick={() => setShowComments(!showComments)}>
                {post.commentCount} bình luận
              </button>
            </div>
          </div>
        )}

        {topReactions.length === 0 && (post.likeCount > 0 || post.commentCount > 0) && (
          <div className="flex w-full items-center justify-between text-sm text-muted-foreground border-b pb-2">
            <button onClick={() => setShowReactionsDialog(true)} className="hover:underline">
              {post.likeCount} lượt thích
            </button>
            <div className="flex gap-4">
              <button className="hover:underline" onClick={() => setShowComments(!showComments)}>
                {post.commentCount} bình luận
              </button>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex w-full gap-2">
          <ReactionPicker
            currentReaction={post.userReaction}
            onReact={handleReact}
            onUnreact={handleUnreact}
          />
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 hover:bg-slate-100"
            onClick={() => setShowComments(!showComments)}
          >
            <MessageCircle className="mr-2 size-4 text-slate-600" />
            <span className="text-slate-600 font-medium">Bình luận</span>
          </Button>
        </div>

        {/* Comment Section */}
        {showComments && (
          <div className="w-full space-y-3 pt-3 border-t">
            {/* Comment Input */}
            <div className="flex gap-2">
              <Avatar className="size-8">
                <AvatarImage src={myProfile?.avatar ?? undefined} />
                <AvatarFallback>
                  {myProfile ? `${myProfile.firstName?.[0] ?? ''}${myProfile.lastName?.[0] ?? ''}` : 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 flex gap-2">
                <Textarea
                  placeholder="Viết bình luận..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  className="min-h-15 resize-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleComment()
                    }
                  }}
                />
                <Button 
                  size="icon" 
                  onClick={handleComment} 
                  disabled={!commentText.trim()}
                  className="bg-primary hover:bg-primary/90"
                >
                  <Send className="size-4" />
                </Button>
              </div>
            </div>

            {/* Comments List */}
            <div className="space-y-3">
              {isLoadingComments && (
                <div className="flex justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                </div>
              )}
              
              {!isLoadingComments && comments.length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-2">
                  Chưa có bình luận nào
                </p>
              )}
              
              {!isLoadingComments && comments.map((comment) => {
                const profile = userProfiles[comment.authorId]
                const authorName = profile
                  ? `${profile.lastName} ${profile.firstName}`.trim()
                  : comment.authorId
                
                return (
                  <div key={comment.id} className="flex gap-2">
                    <Avatar className="size-8">
                      <AvatarImage src={profile?.avatar ?? undefined} />
                      <AvatarFallback>{authorName[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="bg-muted px-3 py-2 rounded-2xl">
                        <p className="font-semibold text-sm">{authorName}</p>
                        <p className="text-sm">{comment.content}</p>
                      </div>
                      <div className="flex gap-3 mt-1 px-3 text-xs text-muted-foreground">
                        <span>{formatRelativeTime(comment.createdAt)}</span>
                        <button className="hover:underline font-medium">Thích</button>
                        <button className="hover:underline font-medium">Trả lời</button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </CardFooter>
      
      {/* Reactions Dialog */}
      <Dialog open={showReactionsDialog} onOpenChange={setShowReactionsDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reactions</DialogTitle>
          </DialogHeader>
          <div className="max-h-96 overflow-y-auto">
            {isLoadingReactions && (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            )}
            
            {!isLoadingReactions && reactions.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-8">
                Chưa có reactions
              </p>
            )}
            
            {!isLoadingReactions && reactions.length > 0 && (
              <div className="space-y-2">
                {reactions.map((reaction) => {
                  const profile = userProfiles[reaction.userId]
                  const userName = profile
                    ? `${profile.lastName} ${profile.firstName}`.trim()
                    : reaction.userId
                  
                  return (
                    <div key={reaction.id} className="flex items-center gap-3 p-2 hover:bg-muted rounded-lg">
                      <Avatar>
                        <AvatarImage src={profile?.avatar ?? undefined} />
                        <AvatarFallback>{userName[0]}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-medium text-sm">{userName}</p>
                      </div>
                      <span className="text-2xl">
                        {REACTION_ICONS[reaction.reactionType]?.icon || "👍"}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
