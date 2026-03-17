import { Badge } from "@/components/ui/badge"
import { AdminDataPageTemplate } from "@/components/admin/AdminDataPageTemplate"
import { adminUsers } from "@/mock/admin-data"
import { adminMockService } from "@/services/admin/admin.mock.service"
import { toast } from "sonner"

export function AdminUsersPage() {
  const handleAction = async () => {
    const response = await adminMockService.suspendUser(adminUsers[1].id)
    toast.success(response.message)
  }

  return (
    <AdminDataPageTemplate
      title="Quản lý người dùng"
      description="Quản lý trạng thái tài khoản, xác minh và rủi ro vi phạm."
      tableTitle="Danh sách người dùng"
      tableDescription="Tìm theo số điện thoại, trạng thái và điểm báo cáo."
      actionLabel="Tạm khoá tài khoản mẫu"
      onAction={handleAction}
      onExport={() => toast.success("Đã xuất danh sách người dùng (mock)")}
      rows={adminUsers}
      columns={[
        { key: "id", title: "Mã người dùng", render: (row) => row.id },
        { key: "phone", title: "Số điện thoại", render: (row) => row.phoneNumber },
        { key: "name", title: "Họ tên", render: (row) => row.fullName },
        {
          key: "status",
          title: "Trạng thái",
          render: (row) => (
            <Badge
              variant={
                row.status === "SUSPENDED" ? "destructive" : row.status === "ACTIVE" ? "secondary" : "outline"
              }
            >
              {row.status === "ACTIVE" ? "Hoạt động" : row.status === "SUSPENDED" ? "Tạm khoá" : "Chờ duyệt"}
            </Badge>
          ),
        },
        { key: "verified", title: "Đã xác minh", render: (row) => (row.verified ? "Có" : "Chưa") },
        { key: "joinedAt", title: "Ngày tham gia", render: (row) => row.joinedAt },
        { key: "reports", title: "Số báo cáo", render: (row) => row.reports },
      ]}
    />
  )
}
