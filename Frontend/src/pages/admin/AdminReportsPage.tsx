import { AdminDataPageTemplate } from "@/components/admin/AdminDataPageTemplate"
import { reportSummaries } from "@/mock/admin-data"
import { adminMockService } from "@/services/admin/admin.mock.service"
import { toast } from "sonner"

export function AdminReportsPage() {
  const handleAction = async () => {
    const response = await adminMockService.resolveModerationItem("R5001")
    toast.success(response.message)
  }

  return (
    <AdminDataPageTemplate
      title="Trung tâm báo cáo"
      description="Theo dõi các vụ việc vi phạm và lừa đảo theo danh mục."
      tableTitle="Tổng hợp vụ việc"
      tableDescription="Khối lượng xử lý và áp lực hàng chờ theo nhóm."
      actionLabel="Xử lý báo cáo mẫu"
      onAction={handleAction}
      onExport={() => toast.success("Đã xuất báo cáo vi phạm (mock)")}
      rows={reportSummaries}
      columns={[
        { key: "id", title: "Mã báo cáo", render: (row) => row.id },
        { key: "category", title: "Danh mục", render: (row) => row.category },
        { key: "open", title: "Đang mở", render: (row) => row.open },
        { key: "inProgress", title: "Đang xử lý", render: (row) => row.inProgress },
        { key: "resolvedToday", title: "Đã xử lý hôm nay", render: (row) => row.resolvedToday },
      ]}
    />
  )
}
