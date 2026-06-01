import { useQuery } from "@/hooks/useQuery"
import { userService } from "@/services/user/user.service"
import type { AdminManagedGroup } from "@/types/admin"
import { toast } from "sonner"
import { AdminDataPageTemplate } from "@/components/admin/AdminDataPageTemplate"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

const PAGE_SIZE = 20

export function AdminGroupsPage() {
  const { data, isLoading, refetch } = useQuery(
    () => userService.getAdminGroups({ page: 1, limit: PAGE_SIZE }),
    { onError: () => toast.error("Khong tai duoc danh sach hoi nhom") }
  )

  const groups = (data?.data?.items ?? []) as AdminManagedGroup[]

  return (
    <AdminDataPageTemplate
      title="Quan ly hoi nhom"
      description="Theo doi, kiem soat hoi nhom va quyen truy cap thanh vien."
      tableTitle="Danh sach hoi nhom"
      tableDescription="Loc theo ten nhom, chu so huu, so luong thanh vien."
      rows={groups}
      columns={[
        { key: "id", title: "Ma nhom", render: (group) => group.id },
        { key: "name", title: "Ten nhom", render: (group) => group.name },
        {
          key: "ownerName",
          title: "Chu so huu",
          render: (group) => group.ownerName,
        },
        {
          key: "memberCount",
          title: "Thanh vien",
          render: (group) => group.memberCount,
        },
        {
          key: "pendingCount",
          title: "Cho duyet",
          render: (group) => group.pendingCount,
        },
        {
          key: "isPrivate",
          title: "Kieu",
          render: (group) => (
            <Badge variant={group.isPrivate ? "secondary" : "default"}>
              {group.isPrivate ? "Rieng tu" : "Cong khai"}
            </Badge>
          ),
        },
        {
          key: "actions",
          title: "Thao tac",
          render: (group) => (
            <Button
              size="sm"
              variant="destructive"
              onClick={() =>
                userService
                  .toggleGroupVisibilityByAdmin(group.id)
                  .then(() => refetch())
              }
            >
              {group.isPrivate ? "Mo cong khai" : "Chuyen rieng tu"}
            </Button>
          ),
        },
      ]}
      actionLabel="Tao nhom"
      onAction={() => toast.info("Chuc nang tao nhom dang phat trien")}
    />
  )
}
