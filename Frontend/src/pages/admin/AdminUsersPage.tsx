import { useEffect, useMemo, useState } from "react"
import { Search } from "lucide-react"
import { toast } from "sonner"

import { AdminPageHeader } from "@/components/admin/AdminPageHeader"
import { AdminSimpleTable } from "@/components/admin/AdminSimpleTable"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { userService } from "@/services/user/user.service"
import type { AdminManagedUser } from "@/types/admin"

const PAGE_SIZE = 10

export function AdminUsersPage() {
  const [keyword, setKeyword] = useState("")
  const [loading, setLoading] = useState(false)
  const [rows, setRows] = useState<AdminManagedUser[]>([])
  const [page, setPage] = useState(1)
  const [totalPage, setTotalPage] = useState(1)
  const [totalItem, setTotalItem] = useState(0)

  const loadUsers = async (nextPage = 1, nextKeyword?: string) => {
    setLoading(true)
    try {
      const response = await userService.getAdminUsers({
        page: nextPage,
        limit: PAGE_SIZE,
        keyword: nextKeyword?.trim() || undefined,
      })
      setRows(response.data.items)
      setPage(response.data.page)
      setTotalPage(Math.max(response.data.totalPage, 1))
      setTotalItem(response.data.totalItem)
    } catch {
      toast.error("Không thể tải danh sách người dùng")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadUsers()
  }, [])

  const handleSearch = async () => {
    await loadUsers(1, keyword)
  }

  const handleRefresh = async () => {
    await loadUsers(page, keyword)
  }

  const handlePageChange = async (nextPage: number) => {
    if (nextPage < 1 || nextPage > totalPage || nextPage === page || loading) {
      return
    }
    await loadUsers(nextPage, keyword)
  }

  const handleToggleUserStatus = async (user: AdminManagedUser) => {
    try {
      if (user.isActive) {
        await userService.blockUserByAdmin(user.identityUserId)
        toast.success("Đã chặn người dùng")
      } else {
        await userService.unblockUserByAdmin(user.identityUserId)
        toast.success("Đã mở chặn người dùng")
      }
      await loadUsers(page, keyword)
    } catch {
      toast.error("Không thể cập nhật trạng thái người dùng")
    }
  }

  const visiblePages = useMemo(() => {
    if (totalPage <= 5) {
      return Array.from({ length: totalPage }, (_, index) => index + 1)
    }

    if (page <= 3) {
      return [1, 2, 3, 4, 0, totalPage]
    }

    if (page >= totalPage - 2) {
      return [1, 0, totalPage - 3, totalPage - 2, totalPage - 1, totalPage]
    }

    return [1, 0, page - 1, page, page + 1, 0, totalPage]
  }, [page, totalPage])

  const columns = useMemo(
    () => [
      { key: "fullName", title: "Họ tên", render: (row: AdminManagedUser) => row.fullName },
      { key: "phoneNumber", title: "Số điện thoại", render: (row: AdminManagedUser) => row.phoneNumber },
      { key: "email", title: "Email", render: (row: AdminManagedUser) => row.email },
      {
        key: "status",
        title: "Trạng thái",
        render: (row: AdminManagedUser) => (
          <Badge variant={row.isActive ? "secondary" : "destructive"}>
            {row.isActive ? "Hoạt động" : "Bị chặn"}
          </Badge>
        ),
      },
      {
        key: "actions",
        title: "Thao tác",
        render: (row: AdminManagedUser) => (
          <Button
            variant={row.isActive ? "destructive" : "secondary"}
            size="sm"
            onClick={() => handleToggleUserStatus(row)}
          >
            {row.isActive ? "Chặn" : "Mở chặn"}
          </Button>
        ),
      },
    ],
    [page, keyword]
  )

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title="Quản lý người dùng"
        description="Danh sách tài khoản và thao tác chặn/mở chặn."
      />

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto_auto]">
          <div className="relative">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              className="pl-9"
              placeholder="Tìm theo user id, tên, số điện thoại, email..."
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
            />
          </div>
          <Button variant="outline" onClick={() => void handleSearch()} disabled={loading}>
            Tìm
          </Button>
          <Button onClick={() => void handleRefresh()} disabled={loading}>
            {loading ? "Đang tải..." : "Làm mới"}
          </Button>
        </div>
      </section>

      <AdminSimpleTable columns={columns} rows={rows} />

      <section className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-600">
            Hiển thị <span className="font-semibold text-slate-900">{rows.length}</span> /{" "}
            <span className="font-semibold text-slate-900">{totalItem}</span> tài khoản
          </p>

          <Pagination className="mx-0 w-auto justify-start sm:justify-end">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  text="Trước"
                  onClick={(event) => {
                    event.preventDefault()
                    void handlePageChange(page - 1)
                  }}
                  className={page <= 1 || loading ? "pointer-events-none opacity-50" : ""}
                />
              </PaginationItem>

              {visiblePages.map((pageNumber, index) => (
                <PaginationItem key={`${pageNumber}-${index}`}>
                  {pageNumber === 0 ? (
                    <PaginationEllipsis />
                  ) : (
                    <PaginationLink
                      href="#"
                      isActive={pageNumber === page}
                      onClick={(event) => {
                        event.preventDefault()
                        void handlePageChange(pageNumber)
                      }}
                    >
                      {pageNumber}
                    </PaginationLink>
                  )}
                </PaginationItem>
              ))}

              <PaginationItem>
                <PaginationNext
                  href="#"
                  text="Sau"
                  onClick={(event) => {
                    event.preventDefault()
                    void handlePageChange(page + 1)
                  }}
                  className={page >= totalPage || loading ? "pointer-events-none opacity-50" : ""}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      </section>
    </div>
  )
}
