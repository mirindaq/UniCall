import { Badge } from "@/components/ui/badge"
import { AdminDataPageTemplate } from "@/components/admin/AdminDataPageTemplate"
import { supportTickets } from "@/mock/admin-data"
import { adminMockService } from "@/services/admin/admin.mock.service"
import { toast } from "sonner"

export function AdminSupportPage() {
  const handleAction = async () => {
    const response = await adminMockService.resolveSupportTicket(supportTickets[0].id)
    toast.success(response.message)
  }

  return (
    <AdminDataPageTemplate
      title="Vận hành hỗ trợ"
      description="Xử lý ticket về OTP, khôi phục và vấn đề tài khoản."
      tableTitle="Hàng chờ hỗ trợ"
      tableDescription="Ưu tiên theo mức độ ảnh hưởng và SLA."
      actionLabel="Đóng ticket mẫu"
      onAction={handleAction}
      onExport={() => toast.success("Đã xuất dữ liệu hỗ trợ (mock)")}
      rows={supportTickets}
      columns={[
        { key: "id", title: "Mã ticket", render: (row) => row.id },
        { key: "requester", title: "Người gửi", render: (row) => row.requester },
        { key: "subject", title: "Chủ đề", render: (row) => row.subject },
        {
          key: "priority",
          title: "Mức ưu tiên",
          render: (row) => <Badge variant={row.priority === "HIGH" ? "destructive" : "outline"}>{row.priority === "HIGH" ? "Cao" : row.priority === "MEDIUM" ? "Trung bình" : "Thấp"}</Badge>,
        },
        { key: "status", title: "Trạng thái", render: (row) => (row.status === "OPEN" ? "Mới" : row.status === "IN_PROGRESS" ? "Đang xử lý" : "Đã hoàn tất") },
        { key: "created", title: "Thời gian tạo", render: (row) => row.createdAt },
      ]}
    />
  )
}
