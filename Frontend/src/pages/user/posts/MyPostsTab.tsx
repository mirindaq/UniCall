import { useState, useEffect } from "react"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

import { ScrollArea } from "@/components/ui/scroll-area"
import { PostCard } from "@/components/post/PostCard"
import type { ReactionType } from "@/components/post/ReactionPicker"
import { EditPostDialog } from "@/components/post/EditPostDialog"
import { useQuery } from "@/hooks/useQuery"
import { useMutation } from "@/hooks/useMutation"
import { postService } from "@/services/post/post.service"
import { userService } from "@/services/user/user.service"
import type { PostResponse } from "@/types/post.type"
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

export function MyPostsTab() {
  const [posts, setPosts] = useState<PostWithAuthor[]>([])
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; content: string } | null>(null)
  const [editingPost, setEditingPost] = useState<PostResponse | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)

  const { data: myProfileResponse } = useQuery(() => userService.getMyProfile(), {})
  const myProfile = (myProfileResponse as any)?.data
  const myAvatar = myProfile?.avatar ?? undefined
  const myName = myProfile
    ? `${myProfile.lastName ?? ""} ${myProfile.firstName ?? ""}`.trim()
    : "Bạn"

  const {
    data: myPostsResponse,
    isLoading: isLoadingPosts,
    refetch: refetchMyPosts,
  } = useQuery(
    () => postService.getMyPosts(1, 20),
    {
      enabled: true,
      onError: (error) => {
        console.error("Error loading my posts:", error)
        toast.error("Không thể tải bài viết")
      },
    }
  )

  const { mutate: deletePost, isLoading: isDeleting } = useMutation(
    (variables: any) => postService.deletePost(variables.postId),
    {
      onSuccess: () => {
        toast.success("Đã xóa bài viết")
        setDeleteTarget(null)
        refetchMyPosts()
      },
      onError: (error) => {
        console.error("Error deleting post:", error)
        toast.error("Không thể xóa bài viết")
      },
    }
  )

  // Map posts with author info
  useEffect(() => {
    const myPosts = (myPostsResponse as any)?.data?.items || []
    const postsWithAuthors: PostWithAuthor[] = myPosts.map((post: PostResponse) => ({
      ...post,
      author: {
        name: myName,
        avatar: myAvatar,
      },
      isLiked: post.isLikedByCurrentUser || false,
      userReaction: post.userReactionType,
    }))
    setPosts(postsWithAuthors)
  }, [myPostsResponse, myName, myAvatar])

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

  const handleReact = (postId: number, reaction: ReactionType) => {
    postService
      .reactToPost(postId, reaction)
      .then(() => {
        refetchMyPosts()
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
        refetchMyPosts()
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
        refetchMyPosts()
      })
      .catch((error) => {
        console.error("Error commenting on post:", error)
        toast.error("Không thể bình luận")
      })
  }

  return (
    <>
      <div className="flex h-full flex-col">
        <ScrollArea className="flex-1">
          <div className="mx-auto max-w-2xl space-y-4 p-4">
            {/* Loading State */}
            {isLoadingPosts && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="size-8 animate-spin text-primary" />
              </div>
            )}

            {/* Empty State */}
            {!isLoadingPosts && posts.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="rounded-full bg-muted p-6 mb-4">
                  <svg
                    className="size-12 text-muted-foreground"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
                <p className="text-lg font-medium text-muted-foreground">
                  Bạn chưa có bài viết nào
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Hãy tạo bài viết đầu tiên của bạn!
                </p>
              </div>
            )}

            {/* Posts List */}
            {!isLoadingPosts &&
              posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  showActions={true}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onReact={handleReact}
                  onUnreact={handleUnreact}
                  onComment={handleComment}
                />
              ))}
          </div>
        </ScrollArea>
      </div>

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

      {/* Edit Post Dialog */}
      <EditPostDialog
        post={editingPost}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSuccess={() => {
          setEditingPost(null)
          refetchMyPosts()
        }}
      />
    </>
  )
}
