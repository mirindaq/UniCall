import { useMemo } from "react"

import { useQuery } from "@/hooks/useQuery"
import { userService } from "@/services/user/user.service"
import type { UserSearchItem } from "@/types/user.type"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { formatDateVi } from "@/utils/date.util"
import { mapGenderToLabel } from "@/utils/gender.util"

export function SearchUserAccountDialog({
  open,
  onOpenChange,
  selectedUser,
  currentIdentityUserId,
  onStartChat,
  isStartingChat = false,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedUser: UserSearchItem | null
  currentIdentityUserId: string | null
  onStartChat?: (user: UserSearchItem) => void | Promise<void>
  isStartingChat?: boolean
}) {
  const identityUserId = selectedUser?.identityUserId ?? ""
  const isSelf = currentIdentityUserId != null && currentIdentityUserId === identityUserId

  const { data: profileResponse, isLoading } = useQuery(
    () => userService.getProfileByIdentityUserId(identityUserId),
    {
      enabled: open && identityUserId.length > 0,
      deps: [identityUserId, open],
      onError: () => undefined,
    },
  )

  const profile = profileResponse?.data
  const fullName = useMemo(() => {
    if (!profile) {
      return selectedUser?.fullName ?? ""
    }
    return `${profile.firstName} ${profile.lastName}`.trim()
  }, [profile, selectedUser?.fullName])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="min-w-[480px] gap-0 overflow-hidden bg-white p-0" showCloseButton>
        <DialogHeader className="border-b border-slate-200 px-5 py-4">
          <DialogTitle className="text-lg leading-none font-semibold text-slate-800">
            Thông tin tài khoản
          </DialogTitle>
        </DialogHeader>

        <div className="h-36 bg-gradient-to-r from-slate-300 via-slate-200 to-sky-100" />

        <div className="border-b border-slate-200 bg-white px-5 pb-4">
          <div className="-mt-10 flex items-end gap-3">
            <Avatar className="size-20 border border-slate-200 ring-2 ring-white">
              <AvatarImage src={profile?.avatar ?? undefined} alt={fullName} />
              <AvatarFallback>{toFallback(fullName)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 pb-1">
              <p className="truncate text-xl font-semibold text-slate-900">{fullName}</p>
            </div>
          </div>

          {!isSelf ? (
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="secondary"
                className="h-10 rounded-xl bg-slate-100 text-sm font-semibold text-slate-700 hover:bg-slate-200"
              >
                Kết bạn
              </Button>
              <Button
                type="button"
                className="h-10 rounded-xl bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700"
                disabled={isStartingChat}
                onClick={
                  selectedUser && onStartChat ? () => void onStartChat(selectedUser) : undefined
                }
              >
                {isStartingChat ? "Đang mở…" : "Nhắn tin"}
              </Button>
            </div>
          ) : null}
        </div>

        <div className="bg-slate-50 px-5 py-4">
          <section className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
            <h4 className="text-base font-semibold text-slate-800">Thông tin cá nhân</h4>
            {isLoading ? (
              <p className="mt-3 text-sm text-slate-500">Đang tải thông tin...</p>
            ) : (
              <div className="mt-3 space-y-2 text-sm">
                <InfoRow label="Giới tính" value={mapGenderToLabel(profile?.gender)} />
                <InfoRow label="Ngày sinh" value={formatDateVi(profile?.dateOfBirth)} />
                <InfoRow label="Điện thoại" value={profile?.phoneNumber ?? selectedUser?.phoneNumber ?? "--"} />
              </div>
            )}
          </section>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[96px_1fr] items-start gap-3">
      <span className="text-slate-500">{label}</span>
      <span className="text-slate-700">{value}</span>
    </div>
  )
}

function toFallback(fullName: string) {
  const words = fullName
    .trim()
    .split(/\s+/)
    .filter(Boolean)

  if (words.length === 0) {
    return "U"
  }

  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase()
  }

  return `${words[0][0] ?? ""}${words[words.length - 1][0] ?? ""}`.toUpperCase()
}
