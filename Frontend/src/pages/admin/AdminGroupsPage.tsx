import { useState } from "react"
import { Eye, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { AdminDataPageTemplate } from "@/components/admin/AdminDataPageTemplate"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useQuery } from "@/hooks/useQuery"
import { userService } from "@/services/user/user.service"
import type { AdminGroupMember, AdminManagedGroup } from "@/types/admin"

const PAGE_SIZE = 20

function formatRole(role: string | null) {
  switch (role) {
    case "ADMIN":
      return "Trưởng nhóm"
    case "DEPUTY":
      return "Phó nhóm"
    case "MEMBER":
      return "Thành viên"
    default:
      return "Không rõ"
  }
}

function formatDate(value: string | null) {
  if (!value) {
    return "-"
  }
  return new Date(value).toLocaleString("vi-VN")
}

export function AdminGroupsPage() {
  const [keyword, setKeyword] = useState("")
  const [submittedKeyword, setSubmittedKeyword] = useState("")
  const [selectedGroup, setSelectedGroup] = useState<AdminManagedGroup | null>(null)
  const [members, setMembers] = useState<AdminGroupMember[]>([])
  const [isLoadingMembers, setIsLoadingMembers] = useState(false)

  const { data, refetch } = useQuery(
    () =>
      userService.getAdminGroups({
        page: 1,
        limit: PAGE_SIZE,
        keyword: submittedKeyword.trim() || undefined,
      }),
    {
      deps: [submittedKeyword],
      onError: () => toast.error("Không tải được danh sách hội nhóm"),
    }
  )

  const groups = (data?.data?.items ?? []) as AdminManagedGroup[]

  const handleViewMembers = async (group: AdminManagedGroup) => {
    setSelectedGroup(group)
    setMembers([])
    setIsLoadingMembers(true)
    try {
      const response = await userService.getAdminGroupMembers(group.id)
      setMembers(response.data ?? [])
    } catch {
      toast.error("Không tải được danh sách thành viên nhóm")
    } finally {
      setIsLoadingMembers(false)
    }
  }

  return (
    <>
      <AdminDataPageTemplate
        title="Quản lý hội nhóm"
        description="Theo dõi hội nhóm và quyền truy cập thành viên."
        tableTitle="Danh sách hội nhóm"
        tableDescription="Lọc theo tên nhóm hoặc chủ sở hữu."
        rows={groups}
        searchValue={keyword}
        searchPlaceholder="Tìm theo tên nhóm, chủ sở hữu..."
        onSearchValueChange={setKeyword}
        onSearch={() => setSubmittedKeyword(keyword)}
        columns={[
          { key: "index", title: "STT", render: (_group, index) => index + 1 },
          { key: "name", title: "Tên nhóm", render: (group) => group.name },
          {
            key: "ownerName",
            title: "Chủ sở hữu",
            render: (group) => group.ownerName || "Không rõ",
          },
          {
            key: "approval",
            title: "Phê duyệt",
            render: (group) => (
              <Badge variant={group.memberApprovalEnabled ? "default" : "secondary"}>
                {group.memberApprovalEnabled ? "Có" : "Không"}
              </Badge>
            ),
          },
          {
            key: "actions",
            title: "Thao tác",
            render: (group) => (
              <Button
                size="sm"
                variant="outline"
                onClick={() => void handleViewMembers(group)}
              >
                <Eye className="mr-2 size-4" />
                Xem thành viên
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

      <Dialog
        open={Boolean(selectedGroup)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedGroup(null)
            setMembers([])
          }
        }}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              Thành viên nhóm {selectedGroup?.name ? `"${selectedGroup.name}"` : ""}
            </DialogTitle>
          </DialogHeader>

          {isLoadingMembers ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-600">
              <Loader2 className="size-4 animate-spin" />
              Đang tải thành viên...
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-slate-200">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Tên thành viên</th>
                    <th className="px-4 py-3 font-semibold">Vai trò</th>
                    <th className="px-4 py-3 font-semibold">Biệt danh</th>
                    <th className="px-4 py-3 font-semibold">Ngày tham gia</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {members.length === 0 ? (
                    <tr>
                      <td className="px-4 py-6 text-center text-slate-500" colSpan={4}>
                        Chưa có thành viên.
                      </td>
                    </tr>
                  ) : (
                    members.map((member) => (
                      <tr key={member.identityUserId}>
                        <td className="px-4 py-3 font-medium text-slate-900">
                          {member.displayName}
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {formatRole(member.role)}
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {member.nickname || "-"}
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {formatDate(member.joinedAt)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
