import { useState } from "react"
import { toast } from "sonner"

import { AdminDataPageTemplate } from "@/components/admin/AdminDataPageTemplate"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useQuery } from "@/hooks/useQuery"
import { userService } from "@/services/user/user.service"
import type { AdminManagedPost, AdminManagedUser } from "@/types/admin"

const PAGE_SIZE = 20
const AUTHOR_SEARCH_LIMIT = 100

export function AdminPostsPage() {
  const [keyword, setKeyword] = useState("")
  const [submittedKeyword, setSubmittedKeyword] = useState("")
  const { data, refetch } = useQuery(
    async () => {
      const trimmedKeyword = submittedKeyword.trim()
      let authorIds: string[] | undefined

      if (trimmedKeyword) {
        const userResponse = await userService.getAdminUsers({
          keyword: trimmedKeyword,
          page: 1,
          limit: AUTHOR_SEARCH_LIMIT,
        })
        authorIds = ((userResponse.data.items ?? []) as AdminManagedUser[]).map(
          (user) => user.identityUserId
        )
      }

      return userService.getAdminPosts({
        page: 1,
        limit: PAGE_SIZE,
        authorIds,
        keyword: trimmedKeyword || undefined,
      })
    },
    {
      deps: [submittedKeyword],
      onError: () => toast.error("Không tải được danh sách bài viết"),
    }
  )

  const posts = (data?.data?.items ?? []) as AdminManagedPost[]

  const handleSearch = () => {
    setSubmittedKeyword(keyword)
  }

  return (
    <AdminDataPageTemplate
      title="Quản lý bài viết"
      description="Theo dõi và kiểm soát nội dung bài viết trên hệ thống."
      tableTitle="Danh sách bài viết"
      tableDescription="Lọc theo tên tác giả, nội dung hoặc trạng thái."
      rows={posts}
      searchValue={keyword}
      searchPlaceholder="Tìm theo tác giả, nội dung, trạng thái..."
      onSearchValueChange={setKeyword}
      onSearch={handleSearch}
      columns={[
        { key: "id", title: "Mã bài viết", render: (post) => post.id },
        {
          key: "authorName",
          title: "Tác giả",
          render: (post) => post.authorName || "Không rõ",
        },
        {
          key: "content",
          title: "Nội dung",
          render: (post) => (
            <span className="line-clamp-1 max-w-[260px]">{post.content}</span>
          ),
        },
        {
          key: "status",
          title: "Trạng thái",
          render: (post) => {
            const variant =
              post.status === "ACTIVE"
                ? "default"
                : post.status === "HIDDEN"
                  ? "secondary"
                  : "destructive"
            const label =
              post.status === "ACTIVE"
                ? "Đang hiển thị"
                : post.status === "HIDDEN"
                  ? "Đã ẩn"
                  : "Bị gỡ"
            return <Badge variant={variant}>{label}</Badge>
          },
        },
        {
          key: "flaggedCount",
          title: "Báo cáo",
          render: (post) => post.flaggedCount,
        },
        {
          key: "actions",
          title: "Thao tác",
          render: (post) => (
            <Button
              size="sm"
              variant={post.status === "HIDDEN" ? "default" : "destructive"}
              onClick={() => {
                const action =
                  post.status === "HIDDEN"
                    ? userService.restorePostByAdmin
                    : userService.hidePostByAdmin
                action(post.id).then(() => refetch())
              }}
            >
              {post.status === "HIDDEN" ? "Hiện lại" : "Ẩn bài viết"}
            </Button>
          ),
        },
      ]}
      actionLabel="Làm mới"
      onAction={() => {
        void refetch()
        toast.info("Đã làm mới")
      }}
    />
  )
}
