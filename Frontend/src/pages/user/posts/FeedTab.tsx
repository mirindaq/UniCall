import { useState, useEffect, useRef } from "react"
import { Loader2, Image, Video, Globe, Lock, X } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardFooter, CardHeader } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Textarea } from "@/components/ui/textarea"
import { PostCard } from "@/components/post/PostCard"
import { EditPostDialog } from "@/components/post/EditPostDialog"
import type { ReactionType } from "@/components/post/ReactionPicker"
import { useQuery } from "@/hooks/useQuery"
import { useMutation } from "@/hooks/useMutation"
import { postService } from "@/services/post/post.service"
import { userService } from "@/services/user/user.service"
import type { PostResponse, PostPrivacy } from "@/types/post.type"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface PostWithAuthor extends PostResponse {
  author: {
    name: string
    avatar?: string
  }
  isLiked: boolean
  userReaction?: ReactionType
}

export function FeedTab() {
  const [newPostContent, setNewPostContent] = useState("")
  const [postPrivacy, setPostPrivacy] = useState<PostPrivacy>("PUBLIC")
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [previewUrls, setPreviewUrls] = useState<Array<{ url: string; type: string }>>([])
  const [posts, setPosts] = useState<PostWithAuthor[]>([])
  const [userProfiles, setUserProfiles] = useState<Record<string, { firstName: string; lastName: string; avatar?: string | null }>>({})
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [editingPost, setEditingPost] = useState<PostResponse | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; content: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { data: myProfileResponse } = useQuery(() => userService.getMyProfile(), {})

  const {
    data: feedResponse,
    isLoading: isLoadingFeed,
    refetch: refetchFeed,
  } = useQuery(
    () => postService.getFeed(currentPage, 10),
    {
      enabled: true,
      onSuccess: (response) => {
        const pageData = (response as any)?.data
        if (pageData) {
          setTotalPages(pageData.totalPages || 1)
        }
      },
      onError: (error) => {
        console.error("Error loading feed:", error)
        toast.error("Không thể tải bảng tin")
      },
    }
  )

  // Refetch when currentPage changes
  useEffect(() => {
    void refetchFeed()
  }, [currentPage, refetchFeed])

  const { mutate: createPost, isLoading: isCreating } = useMutation(
    (formData) => postService.createPostWithFiles(formData as FormData),
    {
      onSuccess: () => {
        toast.success("Đăng bài thành công!")
        setNewPostContent("")
        setSelectedFiles([])
        setPreviewUrls([])
        setCurrentPage(1)
        refetchFeed()
      },
      onError: (error) => {
        console.error("Error creating post:", error)
        toast.error("Không thể đăng bài")
      },
    }
  )

  const { mutate: deletePost, isLoading: isDeleting } = useMutation(
    (variables: any) => postService.deletePost(variables.postId),
    {
      onSuccess: () => {
        toast.success("Đã xóa bài viết")
        setDeleteTarget(null)
        refetchFeed()
      },
      onError: (error) => {
        console.error("Error deleting post:", error)
        toast.error("Không thể xóa bài viết")
      },
    }
  )

  // Fetch user profiles for post authors
  useEffect(() => {
    const feedPosts = (feedResponse as any)?.data?.items || []
    if (feedPosts.length === 0) return

    const authorIds = Array.from(new Set(feedPosts.map((post: PostResponse) => post.authorId)))

    let cancelled = false
    void Promise.all(
      authorIds.map(async (authorId) => {
        try {
          const response = await userService.getProfileByIdentityUserId(authorId as string)
          const profile = response.data
          return {
            id: authorId,
            firstName: profile.firstName ?? "",
            lastName: profile.lastName ?? "",
            avatar: profile.avatar ?? null,
          }
        } catch {
          return {
            id: authorId,
            firstName: "",
            lastName: "",
            avatar: null,
          }
        }
      })
    ).then((profiles) => {
      if (cancelled) return
      const nextMap: Record<string, { firstName: string; lastName: string; avatar?: string | null }> = {}
      for (const item of profiles) {
        nextMap[item.id as string] = {
          firstName: item.firstName,
          lastName: item.lastName,
          avatar: item.avatar,
        }
      }
      setUserProfiles(nextMap)
    })

    return () => {
      cancelled = true
    }
  }, [feedResponse])

  // Map posts with author info
  useEffect(() => {
    const feedPosts = (feedResponse as any)?.data?.items || []
    const postsWithAuthors: PostWithAuthor[] = feedPosts.map((post: PostResponse) => {
      const profile = userProfiles[post.authorId]
      const authorName = profile
        ? `${profile.lastName} ${profile.firstName}`.trim()
        : post.authorId

      return {
        ...post,
        author: {
          name: authorName || "Người dùng",
          avatar: profile?.avatar ?? undefined,
        },
        isLiked: post.isLikedByCurrentUser || false,
        userReaction: post.userReactionType,
      }
    })
    setPosts(postsWithAuthors)
  }, [feedResponse, userProfiles])

  // Cleanup preview URLs on unmount
  useEffect(() => {
    return () => {
      previewUrls.forEach(preview => URL.revokeObjectURL(preview.url))
    }
  }, [])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const validFiles = files.filter(file =>
      file.type.startsWith("image/") || file.type.startsWith("video/")
    )

    if (validFiles.length !== files.length) {
      toast.error("Chỉ chấp nhận file ảnh và video")
    }

    setSelectedFiles(prev => [...prev, ...validFiles])

    // Create preview URLs with type info
    const newPreviews = validFiles.map(file => ({
      url: URL.createObjectURL(file),
      type: file.type
    }))
    setPreviewUrls(prev => [...prev, ...newPreviews])
  }

  const handleRemoveFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index))
    setPreviewUrls(prev => {
      URL.revokeObjectURL(prev[index].url)
      return prev.filter((_, i) => i !== index)
    })
  }

  const handleCreatePost = () => {
    if (!newPostContent.trim() && selectedFiles.length === 0) {
      toast.error("Vui lòng nhập nội dung hoặc chọn ảnh/video")
      return
    }

    // Create FormData
    const formData = new FormData()
    formData.append("content", newPostContent.trim() || " ")
    formData.append("privacy", postPrivacy)

    selectedFiles.forEach(file => {
      formData.append("files", file)
    })

    createPost(formData)
  }

  const handleReact = (postId: number, reaction: ReactionType) => {
    postService
      .reactToPost(postId, reaction)
      .then(() => {
        refetchFeed()
      })
      .catch((error) => {
        console.error("Error reacting to post:", error)
        toast.error("Không thể thả cảm xúc")
      })
  }

  const handleUnreact = (postId: number) => {
    postService
      .unreactToPost(postId)
      .then(() => {
        refetchFeed()
      })
      .catch((error) => {
        console.error("Error unreacting to post:", error)
        toast.error("Không thể bỏ cảm xúc")
      })
  }

  const handleComment = (postId: number, content: string) => {
    postService
      .createComment({ postId, content })
      .then(() => {
        toast.success("Đã bình luận")
        refetchFeed()
      })
      .catch((error) => {
        console.error("Error commenting on post:", error)
        toast.error("Không thể bình luận")
      })
  }

  const handleEdit = (postId: number) => {
    const post = posts.find((p) => p.id === postId)
    if (post) {
      setEditingPost(post as PostResponse)
      setEditDialogOpen(true)
    }
  }

  const handleDelete = (postId: number) => {
    const post = posts.find((p) => p.id === postId)
    if (post) {
      setDeleteTarget({
        id: postId,
        content: post.content.substring(0, 50) + (post.content.length > 50 ? "..." : ""),
      })
    }
  }

  const handleConfirmDelete = () => {
    if (deleteTarget) {
      deletePost({ postId: deleteTarget.id })
    }
  }

  const handleLoadMore = async () => {
    if (currentPage >= totalPages || isLoadingMore) return

    setIsLoadingMore(true)
    try {
      const nextPage = currentPage + 1
      const response = await postService.getFeed(nextPage, 10)
      const pageData = (response as any)?.data

      if (pageData?.items) {
        setCurrentPage(nextPage)
      }
    } catch (error) {
      console.error("Error loading more:", error)
      toast.error("Không thể tải thêm bài viết")
    } finally {
      setIsLoadingMore(false)
    }
  }

  const myProfile = (myProfileResponse as any)?.data
  const myAvatar = myProfile?.avatar ?? undefined
  const myName = myProfile
    ? `${myProfile.firstName ?? ""}${myProfile.lastName ?? ""}`.trim()
    : "Me"
  console.log('my profile: ', myProfile);

  const currentUserId = myProfile?.identityUserId

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl space-y-4 p-4">        {/* Create Post Card */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-start gap-3">
                <Avatar className="size-10">
                  <AvatarImage src={myAvatar} />
                  <AvatarFallback>{myName[0]}</AvatarFallback>
                </Avatar>
                <Textarea
                  placeholder="Hôm nay bạn thế nào?"
                  value={newPostContent}
                  onChange={(e) => setNewPostContent(e.target.value)}
                  className="min-h-20 resize-none border-none shadow-none focus-visible:ring-0 text-base"
                  disabled={isCreating}
                />
              </div>
            </CardHeader>

            {/* File Previews */}
            {previewUrls.length > 0 && (
              <div className="px-4 pb-3">
                <div className="grid grid-cols-2 gap-2">
                  {previewUrls.map((preview, index) => (
                    <div key={index} className="relative group">
                      {preview.type.startsWith("video/") ? (
                        <video
                          src={preview.url}
                          className="w-full h-32 object-cover rounded-lg"
                          controls
                        />
                      ) : (
                        <img
                          src={preview.url}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-32 object-cover rounded-lg"
                        />
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemoveFile(index)}
                        className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="size-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Separator className="mx-4" />
            <CardFooter className="pt-3 flex items-center justify-between">
              <div className="flex gap-2 items-center">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  className="hidden"
                  onChange={handleFileSelect}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-green-600 hover:text-green-700 hover:bg-green-50"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isCreating}
                >
                  <Image className="mr-2 size-4" />
                  Ảnh
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-pink-600 hover:text-pink-700 hover:bg-pink-50"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isCreating}
                >
                  <Video className="mr-2 size-4" />
                  Video
                </Button>
                <Select value={postPrivacy} onValueChange={(value) => setPostPrivacy(value as PostPrivacy)}>
                  <SelectTrigger className="w-35 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PUBLIC">
                      <div className="flex items-center gap-2">
                        <Globe className="size-3" />
                        <span>Bạn bè</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="PRIVATE">
                      <div className="flex items-center gap-2">
                        <Lock className="size-3" />
                        <span>Chỉ mình tôi</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={handleCreatePost}
                disabled={(!newPostContent.trim() && selectedFiles.length === 0) || isCreating}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isCreating ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : null}
                Đăng
              </Button>
            </CardFooter>
          </Card>

          {/* Loading State */}
          {isLoadingFeed && (
            <div className="flex items-center justify-center py-12">

              {/* Load More Button */}
              {!isLoadingFeed && currentPage < totalPages && (
                <div className="flex justify-center pt-4">
                  <Button
                    variant="secondary"
                    onClick={handleLoadMore}
                    disabled={isLoadingMore}
                    className="h-10 rounded-xl bg-slate-100 px-6 text-sm font-semibold text-slate-700 hover:bg-slate-200"
                  >
                    {isLoadingMore ? "Đang tải..." : "Xem thêm"}
                  </Button>
                </div>
              )}
              <Loader2 className="size-8 animate-spin text-primary" />
            </div>
          )}

          {/* Posts Feed */}
          {!isLoadingFeed && posts.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="rounded-full bg-muted p-6 mb-4">
                <Image className="size-12 text-muted-foreground" />
              </div>
              <p className="text-lg font-medium text-muted-foreground">Chưa có bài viết nào</p>
              <p className="text-sm text-muted-foreground mt-1">
                Hãy tạo bài viết đầu tiên của bạn!
              </p>
            </div>
          )}

          {!isLoadingFeed &&
            posts.map((post) => {
              const isMyPost = post.authorId === currentUserId
              {
                console.log('isMyPost: ', isMyPost, '. ', post.authorId, '. ', currentUserId);
              }
              return (
                <PostCard
                  key={post.id}
                  post={post}
                  showActions={isMyPost}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onReact={handleReact}
                  onUnreact={handleUnreact}
                  onComment={handleComment}
                />
              )
            })}
        </div>
      </div>

      {/* Edit Post Dialog */}
      <EditPostDialog
        post={editingPost}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSuccess={() => {
          setEditingPost(null)
          refetchFeed()
        }}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa bài viết</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn xóa bài viết này không?
              {deleteTarget && (
                <span className="mt-2 block font-medium text-foreground">
                  &quot;{deleteTarget.content}&quot;
                </span>
              )}
              <span className="mt-2 block text-destructive">
                Hành động này không thể hoàn tác.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Đang xóa...
                </>
              ) : (
                "Xóa"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}