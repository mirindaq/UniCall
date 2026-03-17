import { Badge } from "@/components/ui/badge"
import { AdminDataPageTemplate } from "@/components/admin/AdminDataPageTemplate"
import { moderationQueue } from "@/mock/admin-data"
import { adminMockService } from "@/services/admin/admin.mock.service"
import { toast } from "sonner"

export function AdminModerationPage() {
  const handleAction = async () => {
    const response = await adminMockService.resolveModerationItem(moderationQueue[0].id)
    toast.success(response.message)
  }

  return (
    <AdminDataPageTemplate
      title="Hàng chờ kiểm duyệt"
      description="Duyệt nội dung vi phạm và phân công cho kiểm duyệt viên."
      tableTitle="Nội dung bị gắn cờ"
      tableDescription="Mức độ nghiêm trọng cao cần xử lý trước."
      actionLabel="Duyệt mục mẫu"
      onAction={handleAction}
      onExport={() => toast.success("Đã xuất hàng chờ kiểm duyệt (mock)")}
      rows={moderationQueue}
      columns={[
        { key: "id", title: "Mã kiểm duyệt", render: (row) => row.id },
        { key: "type", title: "Loại nội dung", render: (row) => <Badge variant="outline">{row.contentType}</Badge> },
        { key: "reporter", title: "Người báo cáo", render: (row) => row.reporter },
        { key: "reason", title: "Lý do", render: (row) => row.reason },
        {
          key: "severity",
          title: "Mức độ",
          render: (row) => <Badge variant={row.severity === "HIGH" ? "destructive" : "secondary"}>{row.severity === "HIGH" ? "Cao" : "Trung bình"}</Badge>,
        },
        { key: "createdAt", title: "Thời gian tạo", render: (row) => row.createdAt },
      ]}
    />
  )
}
