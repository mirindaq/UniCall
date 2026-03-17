import { Badge } from "@/components/ui/badge"
import { AdminDataPageTemplate } from "@/components/admin/AdminDataPageTemplate"
import { groupOverviews } from "@/mock/admin-data"
import { adminMockService } from "@/services/admin/admin.mock.service"
import { toast } from "sonner"

export function AdminGroupsPage() {
  const handleAction = async () => {
    const response = await adminMockService.muteGroup(groupOverviews[1].id)
    toast.success(response.message)
  }

  return (
    <AdminDataPageTemplate
      title="Quản lý nhóm"
      description="Theo dõi nhóm cộng đồng lớn, yêu cầu chờ duyệt và mức rủi ro."
      tableTitle="Danh mục nhóm"
      tableDescription="Ưu tiên kiểm tra sớm các nhóm có rủi ro cao."
      actionLabel="Bật chế độ im lặng mẫu"
      onAction={handleAction}
      onExport={() => toast.success("Đã xuất danh sách nhóm (mock)")}
      rows={groupOverviews}
      columns={[
        { key: "id", title: "Mã nhóm", render: (row) => row.id },
        { key: "name", title: "Tên nhóm", render: (row) => row.name },
        { key: "members", title: "Thành viên", render: (row) => row.members },
        { key: "admins", title: "Quản trị viên", render: (row) => row.admins },
        { key: "pending", title: "Đơn chờ duyệt", render: (row) => row.pendingApprovals },
        {
          key: "risk",
          title: "Rủi ro",
          render: (row) => (
            <Badge variant={row.riskLevel === "HIGH" ? "destructive" : row.riskLevel === "MEDIUM" ? "outline" : "secondary"}>
              {row.riskLevel === "HIGH" ? "Cao" : row.riskLevel === "MEDIUM" ? "Trung bình" : "Thấp"}
            </Badge>
          ),
        },
      ]}
    />
  )
}
