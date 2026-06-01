import { useQuery } from "@/hooks/useQuery"
import { userService } from "@/services/user/user.service"
import type { AdminManagedPost } from "@/types/admin"
import { toast } from "sonner"
import { AdminDataPageTemplate } from "@/components/admin/AdminDataPageTemplate"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

const PAGE_SIZE = 20

export function AdminPostsPage() {
  const { data, isLoading, refetch } = useQuery(
    () => userService.getAdminPosts({ page: 1, limit: PAGE_SIZE }),
    { onError: () => toast.error("Khong tai duoc danh sach bai viet") }
  )

  const posts = (data?.data?.items ?? []) as AdminManagedPost[]

  return (
    <AdminDataPageTemplate
      title="Quan ly bai viet"
      description="Theo doi va kiem soat noi dung bai viet tren he thong."
      tableTitle="Danh sach bai viet"
      tableDescription="Loc theo ma bai viet, ten tac gia, trang thai."
      rows={posts}
      columns={[
        { key: "id", title: "Ma bai viet", render: (post) => post.id },
        {
          key: "authorName",
          title: "Tac gia",
          render: (post) => post.authorName,
        },
        {
          key: "content",
          title: "Noi dung",
          render: (post) => (
            <span className="line-clamp-1 max-w-[260px]">{post.content}</span>
          ),
        },
        {
          key: "status",
          title: "Trang thai",
          render: (post) => {
            const variant =
              post.status === "PUBLISHED"
                ? "default"
                : post.status === "HIDDEN"
                  ? "secondary"
                  : "destructive"
            const label =
              post.status === "PUBLISHED"
                ? "Dang hien"
                : post.status === "HIDDEN"
                  ? "An"
                  : "Da xoa"
            return <Badge variant={variant}>{label}</Badge>
          },
        },
        {
          key: "flaggedCount",
          title: "Bao cao",
          render: (post) => post.flaggedCount,
        },
        {
          key: "actions",
          title: "Thao tac",
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
              {post.status === "HIDDEN" ? "Hien lai" : "An bai viet"}
            </Button>
          ),
        },
      ]}
      actionLabel="Tao bai viet"
      onAction={() => toast.info("Chuc nang tao bai viet dang phat trien")}
    />
  )
}
